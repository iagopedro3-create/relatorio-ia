import { useState, useMemo } from 'react';
import { Printer, Search, TrendingUp, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { mockStudents, mockClasses } from '../store/mockDb';

const SUBJECTS = [
  'Português',
  'Matemática',
  'História',
  'Ciências',
  'Geografia',
  'Inglês',
  'Projeto de Vida',
];

function getMockGrades(studentId: string) {
  const seed = studentId.charCodeAt(studentId.length - 1);
  return SUBJECTS.map((subject, si) => {
    const bims = [1, 2, 3, 4].map(bi => {
      // Mock grade generation
      const base = ((seed + si * 7 + bi * 13) % 40) + 50; 
      return bi < 4 ? Math.min(100, base) : 0; // bim4 is pending (0) for simulation
    });
    
    // Semestre 1
    const sem1 = (bims[0] > 0 && bims[1] > 0) ? (bims[0] + bims[1]) / 2 : 0;
    const recSem1 = (sem1 > 0 && sem1 < 70) ? Math.min(100, sem1 + 25) : 0;
    const finalSem1 = recSem1 > 0 ? Math.max(sem1, recSem1) : sem1;

    // Semestre 2
    const sem2 = (bims[2] > 0 && bims[3] > 0) ? (bims[2] + bims[3]) / 2 : 0;
    const recSem2 = (sem2 > 0 && sem2 < 70) ? Math.min(100, sem2 + 20) : 0;
    const finalSem2 = recSem2 > 0 ? Math.max(sem2, recSem2) : sem2;

    // Media Final (Annual)
    let mediaFinal = 0;
    if (finalSem1 > 0 && finalSem2 > 0) {
      mediaFinal = (finalSem1 + finalSem2) / 2;
    } else if (finalSem1 > 0) {
      mediaFinal = finalSem1;
    }

    return { 
      subject, bims, 
      sem1, recSem1, finalSem1, 
      sem2, recSem2, finalSem2, 
      mediaFinal 
    };
  });
}

export function Bulletin() {
  const numericClasses = useMemo(() => mockClasses.filter(c => c.evaluationType === 'numeric'), []);
  const filteredStudents = useMemo(() => {
    const classIds = numericClasses.map(c => c.id);
    return mockStudents.filter(s => classIds.includes(s.classId));
  }, [numericClasses]);

  const [selectedStudentId, setSelectedStudentId] = useState(filteredStudents[0]?.id || '');

  const student = filteredStudents.find(s => s.id === selectedStudentId);
  const studentClass = mockClasses.find(c => c.id === student?.classId);

  const grades = useMemo(() => student ? getMockGrades(student.id) : [], [student]);
  const validGrades = grades.filter(g => g.mediaFinal > 0);
  const mediaGeral = validGrades.length > 0
    ? validGrades.reduce((acc, g) => acc + g.mediaFinal, 0) / validGrades.length
    : 0;
  
  const recSem1List = grades.filter(g => g.sem1 > 0 && g.sem1 < 70);
  const recSem2List = grades.filter(g => g.sem2 > 0 && g.sem2 < 70);
  const reprovadas = grades.filter(g => g.mediaFinal > 0 && g.mediaFinal < 70);
  
  const sem1Completed = grades.every(g => g.sem1 > 0);
  const sem2Completed = grades.every(g => g.sem2 > 0);
  
  // Generate mock attendance per bimester
  const attendance = useMemo(() => {
    if (!student) return [0, 0, 0, 0];
    const seed = student.id.charCodeAt(0);
    return [1, 2, 3, 4].map(bi => {
      const hasGrades = grades.some(g => g.bims[bi - 1] > 0);
      if (!hasGrades) return 0;
      return Math.min(100, 65 + (seed * bi % 35)); // Random between 65 and 100
    });
  }, [student, grades]);

  const activeAttendance = attendance.filter(a => a > 0);
  const freqAnual = activeAttendance.length > 0 
    ? activeAttendance.reduce((a, b) => a + b, 0) / activeAttendance.length 
    : 0;

  const reprovadoPorFalta = freqAnual > 0 && freqAnual < 75;

  let status = 'CURSANDO';
  if (validGrades.length > 0) {
    if (reprovadoPorFalta) {
      status = 'REPROVADO POR FALTA';
    } else if (reprovadas.length > 0) {
      status = 'EM RECUPERAÇÃO';
    } else {
      status = 'APROVADO';
    }
  }

  const mediaColor = (val: number) => {
    if (val === 0) return { color: '#94a3b8' };
    if (val >= 70) return { color: '#166534', fontWeight: 800 };
    return { color: '#991b1b', fontWeight: 800 };
  };

  return (
    <div>
      <div className="screen-only">
        <div className="flex justify-between items-center mb-6">
        <div>
          <h2 style={{ margin: 0 }}>Boletim Escolar</h2>
          <p className="text-muted">Ensino Fundamental — Ano Letivo 2026</p>
        </div>
        <button className="btn btn-secondary" onClick={() => window.print()}>
          <Printer size={20} /> Imprimir Boletim
        </button>
      </div>

      {/* Student Selector */}
      <div className="card mb-6 no-print" style={{ padding: '1.5rem' }}>
        <div className="flex items-center gap-4">
          <Search size={20} style={{ color: 'var(--color-text-muted)', flexShrink: 0 }} />
          <select
            value={selectedStudentId}
            onChange={e => setSelectedStudentId(e.target.value)}
            style={{ width: '100%', maxWidth: '420px' }}
          >
            {filteredStudents.map(s => {
              const cls = mockClasses.find(c => c.id === s.classId);
              return <option key={s.id} value={s.id}>{s.name} — {cls?.name}</option>;
            })}
            {filteredStudents.length === 0 && <option value="">Nenhuma turma numérica disponível</option>}
          </select>
        </div>
      </div>

      {filteredStudents.length === 0 && (
        <div className="card p-12 text-center">
          <TrendingUp size={48} style={{ opacity: 0.3, margin: '0 auto 1rem' }} />
          <h3>Nenhum Aluno com Avaliação Numérica</h3>
          <p className="text-muted">Apenas alunos de turmas com Notas Numéricas aparecem nesta seção.</p>
        </div>
      )}

      {student && (
        <>
          {/* Student Info Bar */}
          <div className="card mb-6 p-4 grid grid-cols-2 md:grid-cols-4 gap-4 items-center" style={{ backgroundColor: 'var(--color-surface)' }}>
            <div>
              <span className="text-muted" style={{ fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 700 }}>Aluno(a)</span>
              <p style={{ margin: 0, fontWeight: 700, fontSize: '1.1rem' }}>{student.name}</p>
            </div>
            <div>
              <span className="text-muted" style={{ fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 700 }}>Turma</span>
              <p style={{ margin: 0, fontWeight: 600 }}>{studentClass?.name}</p>
            </div>
            <div>
              <span className="text-muted" style={{ fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 700 }}>Segmento</span>
              <p style={{ margin: 0, fontWeight: 600 }}>Ensino Fundamental I</p>
            </div>
            <div className="md:text-right">
              <span style={{
                padding: '0.4rem 1.2rem', borderRadius: '20px', fontWeight: 700, fontSize: '0.85rem',
                backgroundColor: status === 'APROVADO' ? '#dcfce7' : '#fee2e2',
                color: status === 'APROVADO' ? '#166534' : '#991b1b',
              }}>
                {status === 'CURSANDO' ? <TrendingUp size={14} style={{ display: 'inline', marginRight: 4 }} /> : 
                 status === 'APROVADO' ? <CheckCircle2 size={14} style={{ display: 'inline', marginRight: 4 }} /> : 
                 <AlertTriangle size={14} style={{ display: 'inline', marginRight: 4 }} />}
                {status}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 print-grid">
            {/* Grades Table */}
            <div className="xl:col-span-3 card p-0 overflow-hidden">
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid var(--color-border)' }}>
                      <th style={{ padding: '1rem 1.25rem', textAlign: 'left', fontWeight: 700, color: '#334155' }}>Disciplina</th>
                      <th style={{ padding: '1rem', textAlign: 'center', fontWeight: 700, color: '#334155' }}>1º Bim</th>
                      <th style={{ padding: '1rem', textAlign: 'center', fontWeight: 700, color: '#334155' }}>2º Bim</th>
                      <th style={{ padding: '1rem', textAlign: 'center', fontWeight: 700, color: '#1e3a8a', backgroundColor: '#eff6ff' }}>1º Sem</th>
                      <th style={{ padding: '1rem', textAlign: 'center', fontWeight: 700, color: '#991b1b', backgroundColor: '#fef2f2' }}>Rec. 1</th>
                      <th style={{ padding: '1rem', textAlign: 'center', fontWeight: 700, color: '#334155' }}>3º Bim</th>
                      <th style={{ padding: '1rem', textAlign: 'center', fontWeight: 700, color: '#334155' }}>4º Bim</th>
                      <th style={{ padding: '1rem', textAlign: 'center', fontWeight: 700, color: '#1e3a8a', backgroundColor: '#eff6ff' }}>2º Sem</th>
                      <th style={{ padding: '1rem', textAlign: 'center', fontWeight: 700, color: '#991b1b', backgroundColor: '#fef2f2' }}>Rec. 2</th>
                      <th style={{ padding: '1rem', textAlign: 'center', fontWeight: 700, color: '#334155', backgroundColor: '#f1f5f9' }}>Média Final</th>
                      <th style={{ padding: '1rem', textAlign: 'center', fontWeight: 700, color: '#334155' }}>Situação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {grades.map((g, i) => {
                      const aprovado = g.mediaFinal >= 70;
                      return (
                        <tr key={g.subject} style={{ borderBottom: '1px solid var(--color-border)', backgroundColor: i % 2 === 0 ? 'white' : '#fafafa' }}>
                          <td style={{ padding: '0.85rem 1.25rem', fontWeight: 600, color: '#1e293b' }}>{g.subject}</td>
                          <td style={{ padding: '0.85rem', textAlign: 'center', ...mediaColor(g.bims[0]) }}>{g.bims[0] > 0 ? g.bims[0].toFixed(1) : '—'}</td>
                          <td style={{ padding: '0.85rem', textAlign: 'center', ...mediaColor(g.bims[1]) }}>{g.bims[1] > 0 ? g.bims[1].toFixed(1) : '—'}</td>
                          <td style={{ padding: '0.85rem', textAlign: 'center', backgroundColor: '#eff6ff', ...mediaColor(g.sem1) }}>{g.sem1 > 0 ? g.sem1.toFixed(1) : '—'}</td>
                          <td style={{ padding: '0.85rem', textAlign: 'center', backgroundColor: '#fef2f2', ...mediaColor(g.recSem1) }}>{g.recSem1 > 0 ? g.recSem1.toFixed(1) : '—'}</td>
                          
                          <td style={{ padding: '0.85rem', textAlign: 'center', ...mediaColor(g.bims[2]) }}>{g.bims[2] > 0 ? g.bims[2].toFixed(1) : '—'}</td>
                          <td style={{ padding: '0.85rem', textAlign: 'center', ...mediaColor(g.bims[3]) }}>{g.bims[3] > 0 ? g.bims[3].toFixed(1) : '—'}</td>
                          <td style={{ padding: '0.85rem', textAlign: 'center', backgroundColor: '#eff6ff', ...mediaColor(g.sem2) }}>{g.sem2 > 0 ? g.sem2.toFixed(1) : '—'}</td>
                          <td style={{ padding: '0.85rem', textAlign: 'center', backgroundColor: '#fef2f2', ...mediaColor(g.recSem2) }}>{g.recSem2 > 0 ? g.recSem2.toFixed(1) : '—'}</td>
                          
                          <td style={{ padding: '0.85rem', textAlign: 'center', backgroundColor: '#f1f5f9', ...mediaColor(g.mediaFinal) }}>
                            {g.mediaFinal > 0 ? g.mediaFinal.toFixed(1) : '—'}
                          </td>
                          <td style={{ padding: '0.85rem', textAlign: 'center' }}>
                            {g.mediaFinal > 0 ? (
                              <span style={{
                                padding: '0.2rem 0.6rem', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 700,
                                backgroundColor: aprovado ? '#dcfce7' : '#fee2e2',
                                color: aprovado ? '#166534' : '#991b1b'
                              }}>
                                {aprovado ? 'APROVADO' : 'RECUPERAÇÃO'}
                              </span>
                            ) : (
                              <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                    <tr style={{ backgroundColor: '#f8fafc', borderTop: '2px solid #cbd5e1' }}>
                      <td style={{ padding: '0.85rem 1.25rem', fontWeight: 800, color: '#334155' }}>Frequência (%)</td>
                      <td style={{ padding: '0.85rem', textAlign: 'center', fontWeight: 700, color: '#475569' }}>{attendance[0] > 0 ? `${attendance[0]}%` : '—'}</td>
                      <td style={{ padding: '0.85rem', textAlign: 'center', fontWeight: 700, color: '#475569' }}>{attendance[1] > 0 ? `${attendance[1]}%` : '—'}</td>
                      <td style={{ padding: '0.85rem', textAlign: 'center', backgroundColor: '#eff6ff' }}>—</td>
                      <td style={{ padding: '0.85rem', textAlign: 'center', backgroundColor: '#fef2f2' }}>—</td>
                      <td style={{ padding: '0.85rem', textAlign: 'center', fontWeight: 700, color: '#475569' }}>{attendance[2] > 0 ? `${attendance[2]}%` : '—'}</td>
                      <td style={{ padding: '0.85rem', textAlign: 'center', fontWeight: 700, color: '#475569' }}>{attendance[3] > 0 ? `${attendance[3]}%` : '—'}</td>
                      <td style={{ padding: '0.85rem', textAlign: 'center', backgroundColor: '#eff6ff' }}>—</td>
                      <td style={{ padding: '0.85rem', textAlign: 'center', backgroundColor: '#fef2f2' }}>—</td>
                      <td style={{ padding: '0.85rem', textAlign: 'center', backgroundColor: '#e2e8f0', fontWeight: 800, color: '#1e293b' }}>
                        {freqAnual > 0 ? `${freqAnual.toFixed(1)}%` : '—'}
                      </td>
                      <td style={{ padding: '0.85rem', textAlign: 'center', fontWeight: 800, color: freqAnual >= 75 ? '#166534' : (freqAnual > 0 ? '#991b1b' : '#475569') }}>
                        {freqAnual > 0 ? (freqAnual >= 75 ? 'Suficiente' : 'Insuficiente') : '—'}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Sidebar Summary */}
            <div className="xl:col-span-1 flex flex-col gap-6">
              <div className="card p-5" style={{
                background: validGrades.length === 0 ? 'linear-gradient(135deg, #f1f5f9, #e2e8f0)' :
                  status === 'APROVADO'
                  ? 'linear-gradient(135deg, #dcfce7, #bbf7d0)'
                  : 'linear-gradient(135deg, #fee2e2, #fecaca)',
                border: 'none',
                color: validGrades.length === 0 ? '#475569' : (status === 'APROVADO' ? '#14532d' : '#7f1d1d')
              }}>
                <p style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', opacity: 0.7, margin: 0 }}>Média Geral</p>
                <h1 style={{ fontSize: '3rem', margin: '0.25rem 0', fontWeight: 900 }}>{mediaGeral.toFixed(1)}</h1>
                <p style={{ margin: 0, fontWeight: 700 }}>{status}</p>
              </div>

              <div className="card p-5">
                <h4 className="mb-4">Frequência Geral</h4>
                <div style={{ fontSize: '2rem', fontWeight: 800, color: freqAnual >= 75 ? 'var(--color-primary)' : '#ef4444' }}>
                  {freqAnual > 0 ? `${freqAnual.toFixed(1)}%` : '—'}
                </div>
                <p className="text-muted" style={{ fontSize: '0.8rem' }}>Mínimo exigido: 75%</p>
                {freqAnual > 0 && (
                  <div style={{ height: '8px', backgroundColor: '#e2e8f0', borderRadius: '4px', marginTop: '0.75rem', overflow: 'hidden' }}>
                    <div style={{ width: `${freqAnual}%`, height: '100%', backgroundColor: freqAnual >= 75 ? 'var(--color-primary)' : '#ef4444', borderRadius: '4px' }} />
                  </div>
                )}
              </div>

              {recSem1List.length > 0 && (
                <div className="card p-5" style={{ borderTop: '4px solid #f59e0b', backgroundColor: '#fffbeb' }}>
                  <h4 className="mb-3 flex items-center gap-2" style={{ color: '#b45309' }}>
                    <AlertTriangle size={16} /> Recup. 1º Semestre
                  </h4>
                  <div className="flex flex-col gap-2">
                    {recSem1List.map(g => (
                      <div key={g.subject} style={{ fontSize: '0.85rem', padding: '0.4rem 0.75rem', backgroundColor: '#fef3c7', borderRadius: '4px', color: '#b45309', fontWeight: 600 }}>
                        {g.subject} — {g.sem1.toFixed(1)}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {recSem2List.length > 0 && (
                <div className="card p-5" style={{ borderTop: '4px solid #f59e0b', backgroundColor: '#fffbeb' }}>
                  <h4 className="mb-3 flex items-center gap-2" style={{ color: '#b45309' }}>
                    <AlertTriangle size={16} /> Recup. 2º Semestre
                  </h4>
                  <div className="flex flex-col gap-2">
                    {recSem2List.map(g => (
                      <div key={g.subject} style={{ fontSize: '0.85rem', padding: '0.4rem 0.75rem', backgroundColor: '#fef3c7', borderRadius: '4px', color: '#b45309', fontWeight: 600 }}>
                        {g.subject} — {g.sem2.toFixed(1)}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {sem1Completed && recSem1List.length === 0 && !sem2Completed && (
                <div className="card p-5" style={{ borderTop: '4px solid #10b981' }}>
                  <p style={{ margin: 0, fontWeight: 600, color: '#166534', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem' }}>
                    <CheckCircle2 size={18} /> Aprovado no 1º Semestre!
                  </p>
                </div>
              )}

              {sem2Completed && reprovadas.length === 0 && (
                <div className="card p-5" style={{ borderTop: '4px solid #10b981' }}>
                  <p style={{ margin: 0, fontWeight: 600, color: '#166534', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem' }}>
                    <CheckCircle2 size={18} /> Aprovado no Ano Letivo!
                  </p>
                </div>
              )}
            </div>
          </div>
        </>
      )}
      </div>

      {/* Printable Document (Hidden on screen) */}
      {student && (
        <div className="print-only" style={{ color: 'black', fontFamily: 'serif' }}>
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <img src="/logo.png" alt="Vida de Aprendiz" style={{ height: '60px', margin: '0 auto 1rem', display: 'block', filter: 'grayscale(100%) brightness(0)' }} />
            <h1 style={{ fontSize: '20px', textTransform: 'uppercase', margin: '0 0 0.25rem 0', fontWeight: 'bold' }}>Escola Vida de Aprendiz</h1>
            <h2 style={{ fontSize: '16px', fontWeight: 'normal', margin: '0' }}>Boletim de Desempenho Escolar — Ano Letivo 2026</h2>
          </div>
          
          <div style={{ border: '2px solid #000', padding: '1rem', marginBottom: '2rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', fontSize: '12px' }}>
              <div><strong style={{ textTransform: 'uppercase' }}>Aluno(a):</strong> {student.name}</div>
              <div><strong style={{ textTransform: 'uppercase' }}>Data de Nascimento:</strong> {student.birthDate ? new Date(student.birthDate).toLocaleDateString('pt-BR', {timeZone: 'UTC'}) : '—'}</div>
              <div><strong style={{ textTransform: 'uppercase' }}>Turma:</strong> {studentClass?.name}</div>
              <div><strong style={{ textTransform: 'uppercase' }}>Segmento:</strong> Ensino Fundamental I</div>
              <div style={{ gridColumn: 'span 2' }}>
                <strong style={{ textTransform: 'uppercase' }}>Responsável:</strong> {student.parent1} {student.parent2 ? ` e ${student.parent2}` : ''}
              </div>
            </div>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', border: '2px solid #000', fontSize: '11px', marginBottom: '2rem' }}>
            <thead>
              <tr style={{ backgroundColor: '#f0f0f0' }}>
                <th style={{ border: '1px solid #000', padding: '0.4rem', textAlign: 'left', width: '25%' }}>Componente Curricular</th>
                <th style={{ border: '1px solid #000', padding: '0.4rem', textAlign: 'center' }}>1º Bim</th>
                <th style={{ border: '1px solid #000', padding: '0.4rem', textAlign: 'center' }}>2º Bim</th>
                <th style={{ border: '1px solid #000', padding: '0.4rem', textAlign: 'center', backgroundColor: '#e2e8f0' }}>1º Sem</th>
                <th style={{ border: '1px solid #000', padding: '0.4rem', textAlign: 'center' }}>Rec. 1</th>
                <th style={{ border: '1px solid #000', padding: '0.4rem', textAlign: 'center' }}>3º Bim</th>
                <th style={{ border: '1px solid #000', padding: '0.4rem', textAlign: 'center' }}>4º Bim</th>
                <th style={{ border: '1px solid #000', padding: '0.4rem', textAlign: 'center', backgroundColor: '#e2e8f0' }}>2º Sem</th>
                <th style={{ border: '1px solid #000', padding: '0.4rem', textAlign: 'center' }}>Rec. 2</th>
                <th style={{ border: '1px solid #000', padding: '0.4rem', textAlign: 'center', backgroundColor: '#cbd5e1' }}>Média Final</th>
                <th style={{ border: '1px solid #000', padding: '0.4rem', textAlign: 'center' }}>Situação</th>
              </tr>
            </thead>
            <tbody>
              {grades.map(g => {
                const isAprovado = g.mediaFinal >= 70;
                return (
                  <tr key={g.subject}>
                    <td style={{ border: '1px solid #000', padding: '0.4rem', fontWeight: 'bold' }}>{g.subject}</td>
                    <td style={{ border: '1px solid #000', padding: '0.4rem', textAlign: 'center' }}>{g.bims[0] > 0 ? g.bims[0].toFixed(1) : '—'}</td>
                    <td style={{ border: '1px solid #000', padding: '0.4rem', textAlign: 'center' }}>{g.bims[1] > 0 ? g.bims[1].toFixed(1) : '—'}</td>
                    <td style={{ border: '1px solid #000', padding: '0.4rem', textAlign: 'center', fontWeight: 'bold', backgroundColor: '#f8fafc' }}>{g.sem1 > 0 ? g.sem1.toFixed(1) : '—'}</td>
                    <td style={{ border: '1px solid #000', padding: '0.4rem', textAlign: 'center' }}>{g.recSem1 > 0 ? g.recSem1.toFixed(1) : '—'}</td>
                    <td style={{ border: '1px solid #000', padding: '0.4rem', textAlign: 'center' }}>{g.bims[2] > 0 ? g.bims[2].toFixed(1) : '—'}</td>
                    <td style={{ border: '1px solid #000', padding: '0.4rem', textAlign: 'center' }}>{g.bims[3] > 0 ? g.bims[3].toFixed(1) : '—'}</td>
                    <td style={{ border: '1px solid #000', padding: '0.4rem', textAlign: 'center', fontWeight: 'bold', backgroundColor: '#f8fafc' }}>{g.sem2 > 0 ? g.sem2.toFixed(1) : '—'}</td>
                    <td style={{ border: '1px solid #000', padding: '0.4rem', textAlign: 'center' }}>{g.recSem2 > 0 ? g.recSem2.toFixed(1) : '—'}</td>
                    <td style={{ border: '1px solid #000', padding: '0.4rem', textAlign: 'center', fontWeight: 'bold', backgroundColor: '#f1f5f9' }}>{g.mediaFinal > 0 ? g.mediaFinal.toFixed(1) : '—'}</td>
                    <td style={{ border: '1px solid #000', padding: '0.4rem', textAlign: 'center' }}>{g.mediaFinal > 0 ? (isAprovado ? 'Aprovado' : 'Recuperação') : '—'}</td>
                  </tr>
                );
              })}
              <tr style={{ backgroundColor: '#f8fafc', borderTop: '2px solid #000' }}>
                <td style={{ border: '1px solid #000', padding: '0.4rem', fontWeight: 'bold' }}>Frequência (%)</td>
                <td style={{ border: '1px solid #000', padding: '0.4rem', textAlign: 'center', fontWeight: 'bold' }}>{attendance[0] > 0 ? `${attendance[0]}%` : '—'}</td>
                <td style={{ border: '1px solid #000', padding: '0.4rem', textAlign: 'center', fontWeight: 'bold' }}>{attendance[1] > 0 ? `${attendance[1]}%` : '—'}</td>
                <td style={{ border: '1px solid #000', padding: '0.4rem', textAlign: 'center', backgroundColor: '#e2e8f0' }}>—</td>
                <td style={{ border: '1px solid #000', padding: '0.4rem', textAlign: 'center' }}>—</td>
                <td style={{ border: '1px solid #000', padding: '0.4rem', textAlign: 'center', fontWeight: 'bold' }}>{attendance[2] > 0 ? `${attendance[2]}%` : '—'}</td>
                <td style={{ border: '1px solid #000', padding: '0.4rem', textAlign: 'center', fontWeight: 'bold' }}>{attendance[3] > 0 ? `${attendance[3]}%` : '—'}</td>
                <td style={{ border: '1px solid #000', padding: '0.4rem', textAlign: 'center', backgroundColor: '#e2e8f0' }}>—</td>
                <td style={{ border: '1px solid #000', padding: '0.4rem', textAlign: 'center' }}>—</td>
                <td style={{ border: '1px solid #000', padding: '0.4rem', textAlign: 'center', fontWeight: 'bold', backgroundColor: '#cbd5e1' }}>{freqAnual > 0 ? `${freqAnual.toFixed(1)}%` : '—'}</td>
                <td style={{ border: '1px solid #000', padding: '0.4rem', textAlign: 'center', fontWeight: 'bold' }}>{freqAnual > 0 ? (freqAnual >= 75 ? 'Suficiente' : 'Insuficiente') : '—'}</td>
              </tr>
            </tbody>
          </table>

          <div style={{ border: '2px solid #000', padding: '1rem', marginBottom: '3rem', fontSize: '13px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div><strong style={{ textTransform: 'uppercase' }}>Frequência Anual:</strong> {freqAnual > 0 ? `${freqAnual.toFixed(1)}%` : '—'}</div>
              <div><strong style={{ textTransform: 'uppercase' }}>Situação Final:</strong> {status}</div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3rem', fontSize: '13px', marginTop: '5rem' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ borderBottom: '1px solid #000', marginBottom: '0.5rem', width: '90%', margin: '0 auto' }}></div>
              <p style={{ margin: 0 }}>Assinatura da Coordenação/Direção</p>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ borderBottom: '1px solid #000', marginBottom: '0.5rem', width: '90%', margin: '0 auto' }}></div>
              <p style={{ margin: 0 }}>Assinatura do Responsável</p>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .print-only { display: none; }
        
        @media print {
          @page { size: A4; margin: 1.5cm; }
          .screen-only, aside { display: none !important; }
          .print-only { display: block !important; }
          
          body, main { 
            background: white !important; 
            margin: 0 !important; 
            padding: 0 !important;
          }
          
          /* Force black/white for best printing */
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}</style>
    </div>
  );
}
