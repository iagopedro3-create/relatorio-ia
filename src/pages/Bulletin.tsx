import { useState, useMemo } from 'react';
import { Printer, Search, TrendingUp, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useSchool } from '../contexts/SchoolContext';
import { useAsync } from '../lib/useAsync';
import { listEnrollments, listStudents, listGrades, listAttendanceOfEnrollments } from '../data';
import { gradedSubjects } from '../store/gradingConfig';
import { buildGradeBook, calcStudentOutcome, attendanceRate, roundGrade, STATUS_LABEL } from '../lib/gradeEngine';
import type { SubjectResult } from '../lib/gradeEngine';
import { logoUrl } from '../lib/branding';
import type { Student } from '../types/db';

/** Frequência (%) por bimestre, aproximando períodos por trimestre de meses (fev-abr, mai-jul, ago-set, out-dez). */
const PERIOD_MONTHS = [[1, 2, 3], [4, 5, 6], [7, 8], [9, 10, 11]];

export function Bulletin() {
  const { user } = useAuth();
  const { school, classes, grading, selectedYear } = useSchool();
  const { policy, periods } = grading;
  const isGuardian = user?.role === 'guardian';

  const numericClasses = useMemo(() => classes.filter(c => c.evaluation_type === 'numeric'), [classes]);
  const numericIds = useMemo(() => numericClasses.map(c => c.id), [numericClasses]);

  const enrollQ = useAsync(() => listEnrollments(numericIds), [numericIds.join(',')], []);
  const studentsQ = useAsync(() => school ? listStudents(school.id) : Promise.resolve([] as Student[]), [school?.id], [] as Student[]);

  const students = useMemo(() => {
    const ids = new Set(enrollQ.data.map(e => e.student_id));
    return studentsQ.data.filter(s => ids.has(s.id));
  }, [enrollQ.data, studentsQ.data]);

  const [chosenStudentId, setSelectedStudentId] = useState('');
  const selectedStudentId = students.some(s => s.id === chosenStudentId) ? chosenStudentId : (students[0]?.id ?? '');

  const student = students.find(s => s.id === selectedStudentId);
  const enrollment = enrollQ.data.find(e => e.student_id === selectedStudentId);
  const studentClass = classes.find(c => c.id === enrollment?.class_id);

  const gradesQ = useAsync(() => enrollment ? listGrades([enrollment.id]) : Promise.resolve([]), [enrollment?.id], []);
  const attQ = useAsync(() => enrollment ? listAttendanceOfEnrollments([enrollment.id]) : Promise.resolve([]), [enrollment?.id], []);

  const subjects = useMemo(() => gradedSubjects(grading.subjects), [grading]);

  const outcome = useMemo(() => {
    const entries = gradesQ.data.map(g => ({ subject_id: g.subject_id, period: g.period, component_id: g.component_id, value: Number(g.value) }));
    const books = subjects.map(s => buildGradeBook(entries, s.id));
    return calcStudentOutcome(books, subjects, attendanceRate(attQ.data), policy);
  }, [gradesQ.data, attQ.data, subjects, policy]);

  const attendanceByPeriod = useMemo(() => PERIOD_MONTHS.map(months => {
    const recs = attQ.data.filter(r => months.includes(new Date(r.date + 'T00:00:00').getMonth()));
    return attendanceRate(recs);
  }), [attQ.data]);

  const freqAnual = outcome.attendance;
  const fmt = (v: number | null) => v === null ? '—' : roundGrade(v, policy).toFixed(policy.decimals);
  const pct = (v: number | null) => v === null ? '—' : `${v.toFixed(1)}%`;
  const color = (v: number | null): React.CSSProperties => v === null ? { color: 'var(--color-text-subtle)' } : v >= policy.passingGrade ? { color: 'var(--color-success-text)', fontWeight: 800 } : { color: 'var(--color-danger-text)', fontWeight: 800 };
  const subjectName = (r: SubjectResult) => subjects.find(s => s.id === r.subjectId)?.name ?? r.subjectId;

  const statusLabel = STATUS_LABEL[outcome.status];
  const isApproved = outcome.status === 'APROVADO';
  const isOpen = outcome.status === 'CURSANDO';
  const recS1 = outcome.subjects.filter(r => r.s1.needsRecovery);
  const recS2 = outcome.subjects.filter(r => r.s2.needsRecovery);
  const mediaGeral = outcome.overall;

  return (
    <div>
      <div className="screen-only">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 style={{ margin: 0 }}>Boletim Escolar</h2>
            <p className="text-muted">Ensino Fundamental — Ano Letivo {selectedYear?.label ?? ''}</p>
          </div>
          <button className="btn btn-secondary" onClick={() => window.print()} disabled={!student}>
            <Printer size={20} /> Imprimir Boletim
          </button>
        </div>

        {!isGuardian && students.length > 0 && (
          <div className="card mb-6 no-print" style={{ padding: '1.5rem' }}>
            <div className="flex items-center gap-4">
              <Search size={20} style={{ color: 'var(--color-text-muted)', flexShrink: 0 }} />
              <select value={selectedStudentId} onChange={e => setSelectedStudentId(e.target.value)} style={{ width: '100%', maxWidth: '420px' }}>
                {students.map(s => {
                  const cls = classes.find(c => c.id === enrollQ.data.find(e => e.student_id === s.id)?.class_id);
                  return <option key={s.id} value={s.id}>{s.name} — {cls?.name}</option>;
                })}
              </select>
            </div>
          </div>
        )}

        {!enrollQ.loading && students.length === 0 && (
          <div className="card p-12 text-center">
            <TrendingUp size={48} style={{ opacity: 0.3, margin: '0 auto 1rem' }} />
            <h3>Nenhum Aluno com Avaliação Numérica</h3>
            <p className="text-muted">Apenas alunos de turmas com Notas Numéricas aparecem nesta seção.</p>
          </div>
        )}

        {student && (
          <>
            <div className="card mb-6 p-4 grid grid-cols-2 md:grid-cols-4 gap-4 items-center">
              <div>
                <span className="text-muted" style={{ fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 700 }}>Aluno(a)</span>
                <p style={{ margin: 0, fontWeight: 700, fontSize: '1.1rem' }}>{student.name}</p>
              </div>
              <div>
                <span className="text-muted" style={{ fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 700 }}>Turma</span>
                <p style={{ margin: 0, fontWeight: 600 }}>{studentClass?.name}</p>
              </div>
              <div>
                <span className="text-muted" style={{ fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 700 }}>Média de aprovação</span>
                <p style={{ margin: 0, fontWeight: 600 }}>{policy.passingGrade} · freq. mín. {policy.minAttendance}%</p>
              </div>
              <div className="md:text-right">
                <span style={{ padding: '0.4rem 1.2rem', borderRadius: '20px', fontWeight: 700, fontSize: '0.85rem', backgroundColor: isApproved ? 'var(--color-success-soft)' : isOpen ? 'var(--color-border-soft)' : 'var(--color-danger-soft)', color: isApproved ? 'var(--color-success-text)' : isOpen ? 'var(--color-text-muted)' : 'var(--color-danger-text)' }}>
                  {isOpen ? <TrendingUp size={14} style={{ display: 'inline', marginRight: 4 }} /> : isApproved ? <CheckCircle2 size={14} style={{ display: 'inline', marginRight: 4 }} /> : <AlertTriangle size={14} style={{ display: 'inline', marginRight: 4 }} />}
                  {statusLabel.toUpperCase()}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
              <div className="xl:col-span-3 card p-0 overflow-hidden">
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ backgroundColor: 'var(--color-surface-2)', borderBottom: '2px solid var(--color-border)' }}>
                        <th style={{ padding: '1rem 1.25rem', textAlign: 'left' }}>Disciplina</th>
                        <th style={{ padding: '1rem', textAlign: 'center' }}>{periods[0]}</th>
                        <th style={{ padding: '1rem', textAlign: 'center' }}>{periods[1]}</th>
                        <th style={{ padding: '1rem', textAlign: 'center', color: 'var(--color-primary-text)', backgroundColor: 'var(--color-primary-soft)' }}>1º Sem</th>
                        <th style={{ padding: '1rem', textAlign: 'center', color: 'var(--color-danger-text)', backgroundColor: 'var(--color-danger-soft)' }}>Rec. 1</th>
                        <th style={{ padding: '1rem', textAlign: 'center' }}>{periods[2]}</th>
                        <th style={{ padding: '1rem', textAlign: 'center' }}>{periods[3]}</th>
                        <th style={{ padding: '1rem', textAlign: 'center', color: 'var(--color-primary-text)', backgroundColor: 'var(--color-primary-soft)' }}>2º Sem</th>
                        <th style={{ padding: '1rem', textAlign: 'center', color: 'var(--color-danger-text)', backgroundColor: 'var(--color-danger-soft)' }}>Rec. 2</th>
                        <th style={{ padding: '1rem', textAlign: 'center', backgroundColor: 'var(--color-border-soft)' }}>Média Final</th>
                        <th style={{ padding: '1rem', textAlign: 'center' }}>Situação</th>
                      </tr>
                    </thead>
                    <tbody>
                      {outcome.subjects.map((r, i) => (
                        <tr key={r.subjectId} style={{ borderBottom: '1px solid var(--color-border)', backgroundColor: i % 2 === 0 ? 'white' : 'var(--color-surface-2)' }}>
                          <td style={{ padding: '0.85rem 1.25rem', fontWeight: 600 }}>{subjectName(r)}</td>
                          <td style={{ padding: '0.85rem', textAlign: 'center', ...color(r.bimesters[0].media) }}>{fmt(r.bimesters[0].media)}</td>
                          <td style={{ padding: '0.85rem', textAlign: 'center', ...color(r.bimesters[1].media) }}>{fmt(r.bimesters[1].media)}</td>
                          <td style={{ padding: '0.85rem', textAlign: 'center', backgroundColor: 'var(--color-primary-soft)', ...color(r.s1.media) }}>{fmt(r.s1.media)}</td>
                          <td style={{ padding: '0.85rem', textAlign: 'center', backgroundColor: 'var(--color-danger-soft)', ...color(r.s1.recovery) }}>{fmt(r.s1.recovery)}</td>
                          <td style={{ padding: '0.85rem', textAlign: 'center', ...color(r.bimesters[2].media) }}>{fmt(r.bimesters[2].media)}</td>
                          <td style={{ padding: '0.85rem', textAlign: 'center', ...color(r.bimesters[3].media) }}>{fmt(r.bimesters[3].media)}</td>
                          <td style={{ padding: '0.85rem', textAlign: 'center', backgroundColor: 'var(--color-primary-soft)', ...color(r.s2.media) }}>{fmt(r.s2.media)}</td>
                          <td style={{ padding: '0.85rem', textAlign: 'center', backgroundColor: 'var(--color-danger-soft)', ...color(r.s2.recovery) }}>{fmt(r.s2.recovery)}</td>
                          <td style={{ padding: '0.85rem', textAlign: 'center', backgroundColor: 'var(--color-border-soft)', ...color(r.final) }}>{fmt(r.final)}</td>
                          <td style={{ padding: '0.85rem', textAlign: 'center' }}>
                            {r.passed === null ? <span style={{ fontSize: '0.75rem', color: 'var(--color-text-subtle)' }}>—</span> : (
                              <span style={{ padding: '0.2rem 0.6rem', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 700, backgroundColor: r.passed ? 'var(--color-success-soft)' : 'var(--color-danger-soft)', color: r.passed ? 'var(--color-success-text)' : 'var(--color-danger-text)' }}>
                                {r.passed ? 'APROVADO' : 'ABAIXO DA MÉDIA'}
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                      <tr style={{ backgroundColor: 'var(--color-surface-2)', borderTop: '2px solid var(--color-border-strong)' }}>
                        <td style={{ padding: '0.85rem 1.25rem', fontWeight: 800 }}>Frequência (%)</td>
                        <td style={{ padding: '0.85rem', textAlign: 'center', fontWeight: 700 }}>{pct(attendanceByPeriod[0])}</td>
                        <td style={{ padding: '0.85rem', textAlign: 'center', fontWeight: 700 }}>{pct(attendanceByPeriod[1])}</td>
                        <td style={{ padding: '0.85rem', textAlign: 'center', backgroundColor: 'var(--color-primary-soft)' }}>—</td>
                        <td style={{ padding: '0.85rem', textAlign: 'center', backgroundColor: 'var(--color-danger-soft)' }}>—</td>
                        <td style={{ padding: '0.85rem', textAlign: 'center', fontWeight: 700 }}>{pct(attendanceByPeriod[2])}</td>
                        <td style={{ padding: '0.85rem', textAlign: 'center', fontWeight: 700 }}>{pct(attendanceByPeriod[3])}</td>
                        <td style={{ padding: '0.85rem', textAlign: 'center', backgroundColor: 'var(--color-primary-soft)' }}>—</td>
                        <td style={{ padding: '0.85rem', textAlign: 'center', backgroundColor: 'var(--color-danger-soft)' }}>—</td>
                        <td style={{ padding: '0.85rem', textAlign: 'center', backgroundColor: 'var(--color-border)', fontWeight: 800 }}>{pct(freqAnual)}</td>
                        <td style={{ padding: '0.85rem', textAlign: 'center', fontWeight: 800, color: freqAnual === null ? 'var(--color-text-muted)' : freqAnual >= policy.minAttendance ? 'var(--color-success-text)' : 'var(--color-danger-text)' }}>
                          {freqAnual === null ? '—' : freqAnual >= policy.minAttendance ? 'Suficiente' : 'Insuficiente'}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="xl:col-span-1 flex flex-col gap-6">
                <div className="card p-5" style={{ background: mediaGeral === null ? 'linear-gradient(135deg, var(--color-border-soft), var(--color-border))' : isApproved || isOpen ? 'linear-gradient(135deg, var(--color-success-soft), var(--color-success-border))' : 'linear-gradient(135deg, var(--color-danger-soft), var(--color-danger-border))', border: 'none', color: mediaGeral === null ? 'var(--color-text-muted)' : isApproved || isOpen ? 'var(--color-success-text)' : 'var(--color-danger-text)' }}>
                  <p style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', opacity: 0.7, margin: 0 }}>Média Geral</p>
                  <h1 style={{ fontSize: '3rem', margin: '0.25rem 0', fontWeight: 900, color: 'inherit' }}>{fmt(mediaGeral)}</h1>
                  <p style={{ margin: 0, fontWeight: 700 }}>{statusLabel}</p>
                </div>

                <div className="card p-5">
                  <h4 className="mb-4">Frequência Geral</h4>
                  <div style={{ fontSize: '2rem', fontWeight: 800, color: freqAnual === null || freqAnual >= policy.minAttendance ? 'var(--color-primary)' : 'var(--color-danger)' }}>{pct(freqAnual)}</div>
                  <p className="text-muted" style={{ fontSize: '0.8rem' }}>Mínimo exigido: {policy.minAttendance}%</p>
                  {freqAnual !== null && (
                    <div style={{ height: '8px', backgroundColor: 'var(--color-border)', borderRadius: '4px', marginTop: '0.75rem', overflow: 'hidden' }}>
                      <div style={{ width: `${freqAnual}%`, height: '100%', backgroundColor: freqAnual >= policy.minAttendance ? 'var(--color-primary)' : 'var(--color-danger)' }} />
                    </div>
                  )}
                </div>

                {recS1.length > 0 && (
                  <div className="card p-5" style={{ borderTop: '4px solid var(--color-warning)', backgroundColor: 'var(--color-warning-soft)' }}>
                    <h4 className="mb-3 flex items-center gap-2" style={{ color: 'var(--color-warning-text)' }}><AlertTriangle size={16} /> Recup. 1º Semestre</h4>
                    <div className="flex flex-col gap-2">
                      {recS1.map(r => <div key={r.subjectId} style={{ fontSize: '0.85rem', padding: '0.4rem 0.75rem', backgroundColor: 'var(--color-warning-soft)', borderRadius: '4px', color: 'var(--color-warning-text)', fontWeight: 600 }}>{subjectName(r)} — {fmt(r.s1.media)}</div>)}
                    </div>
                  </div>
                )}
                {recS2.length > 0 && (
                  <div className="card p-5" style={{ borderTop: '4px solid var(--color-warning)', backgroundColor: 'var(--color-warning-soft)' }}>
                    <h4 className="mb-3 flex items-center gap-2" style={{ color: 'var(--color-warning-text)' }}><AlertTriangle size={16} /> Recup. 2º Semestre</h4>
                    <div className="flex flex-col gap-2">
                      {recS2.map(r => <div key={r.subjectId} style={{ fontSize: '0.85rem', padding: '0.4rem 0.75rem', backgroundColor: 'var(--color-warning-soft)', borderRadius: '4px', color: 'var(--color-warning-text)', fontWeight: 600 }}>{subjectName(r)} — {fmt(r.s2.media)}</div>)}
                    </div>
                  </div>
                )}
                {isApproved && (
                  <div className="card p-5" style={{ borderTop: '4px solid var(--color-success)' }}>
                    <p style={{ margin: 0, fontWeight: 600, color: 'var(--color-success-text)', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem' }}><CheckCircle2 size={18} /> Aprovado no Ano Letivo!</p>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {student && (
        <div className="print-only" style={{ color: 'black', fontFamily: 'serif' }}>
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <img src={logoUrl(school)} alt={school?.name} style={{ height: '60px', margin: '0 auto 1rem', display: 'block' }} />
            <h1 style={{ fontSize: '20px', textTransform: 'uppercase', margin: '0 0 0.25rem 0', fontWeight: 'bold', color: '#000' }}>{school?.legal_name || school?.name}</h1>
            <h2 style={{ fontSize: '16px', fontWeight: 'normal', margin: 0, color: '#000' }}>Boletim de Desempenho Escolar — Ano Letivo {selectedYear?.label}</h2>
          </div>
          <div style={{ border: '2px solid #000', padding: '1rem', marginBottom: '2rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', fontSize: '12px' }}>
              <div><strong>ALUNO(A):</strong> {student.name}</div>
              <div><strong>DATA DE NASCIMENTO:</strong> {student.birth_date ? new Date(student.birth_date + 'T00:00:00').toLocaleDateString('pt-BR') : '—'}</div>
              <div><strong>TURMA:</strong> {studentClass?.name}</div>
              <div><strong>SEGMENTO:</strong> Ensino Fundamental</div>
              <div style={{ gridColumn: 'span 2' }}><strong>RESPONSÁVEL:</strong> {student.guardian1}{student.guardian2 ? ` e ${student.guardian2}` : ''}</div>
            </div>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', border: '2px solid #000', fontSize: '11px', marginBottom: '2rem' }}>
            <thead>
              <tr style={{ backgroundColor: 'var(--color-surface-2)' }}>
                {['Componente Curricular', periods[0], periods[1], '1º Sem', 'Rec. 1', periods[2], periods[3], '2º Sem', 'Rec. 2', 'Média Final', 'Situação'].map((h, i) => (
                  <th key={h} style={{ border: '1px solid #000', padding: '0.4rem', textAlign: i === 0 ? 'left' : 'center', width: i === 0 ? '25%' : undefined }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {outcome.subjects.map(r => (
                <tr key={r.subjectId}>
                  <td style={{ border: '1px solid #000', padding: '0.4rem', fontWeight: 'bold' }}>{subjectName(r)}</td>
                  {[r.bimesters[0].media, r.bimesters[1].media, r.s1.media, r.s1.recovery, r.bimesters[2].media, r.bimesters[3].media, r.s2.media, r.s2.recovery, r.final].map((v, i) => (
                    <td key={i} style={{ border: '1px solid #000', padding: '0.4rem', textAlign: 'center', fontWeight: [2, 6, 8].includes(i) ? 'bold' : 'normal' }}>{fmt(v)}</td>
                  ))}
                  <td style={{ border: '1px solid #000', padding: '0.4rem', textAlign: 'center' }}>{r.passed === null ? '—' : r.passed ? 'Aprovado' : 'Abaixo da média'}</td>
                </tr>
              ))}
              <tr style={{ backgroundColor: 'var(--color-surface-2)', borderTop: '2px solid #000' }}>
                <td style={{ border: '1px solid #000', padding: '0.4rem', fontWeight: 'bold' }}>Frequência (%)</td>
                {[attendanceByPeriod[0], attendanceByPeriod[1], null, null, attendanceByPeriod[2], attendanceByPeriod[3], null, null, freqAnual].map((v, i) => (
                  <td key={i} style={{ border: '1px solid #000', padding: '0.4rem', textAlign: 'center', fontWeight: 'bold' }}>{[2, 3, 6, 7].includes(i) ? '—' : pct(v)}</td>
                ))}
                <td style={{ border: '1px solid #000', padding: '0.4rem', textAlign: 'center', fontWeight: 'bold' }}>{freqAnual === null ? '—' : freqAnual >= policy.minAttendance ? 'Suficiente' : 'Insuficiente'}</td>
              </tr>
            </tbody>
          </table>
          <div style={{ border: '2px solid #000', padding: '1rem', marginBottom: '3rem', fontSize: '13px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div><strong>FREQUÊNCIA ANUAL:</strong> {pct(freqAnual)}</div>
              <div><strong>SITUAÇÃO FINAL:</strong> {statusLabel.toUpperCase()}</div>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3rem', fontSize: '13px', marginTop: '5rem' }}>
            <div style={{ textAlign: 'center' }}><div style={{ borderBottom: '1px solid #000', width: '90%', margin: '0 auto 0.5rem' }}></div><p style={{ margin: 0 }}>Assinatura da Coordenação/Direção</p></div>
            <div style={{ textAlign: 'center' }}><div style={{ borderBottom: '1px solid #000', width: '90%', margin: '0 auto 0.5rem' }}></div><p style={{ margin: 0 }}>Assinatura do Responsável</p></div>
          </div>
        </div>
      )}

      <style>{`
        .print-only { display: none; }
        @media print {
          @page { size: A4; margin: 1.5cm; }
          .screen-only, aside { display: none !important; }
          .print-only { display: block !important; }
          body, main { background: white !important; margin: 0 !important; padding: 0 !important; }
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        }
      `}</style>
    </div>
  );
}
