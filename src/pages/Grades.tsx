import { Fragment, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { FileText, Save, BookOpen } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';
import { useSchool } from '../contexts/SchoolContext';
import { useAsync } from '../lib/useAsync';
import { listClassRoster, listGrades, saveGrades } from '../data';
import {
  subjectsFor, gradedSubjects, schemeFields, RECOVERY_COMPONENT, FINAL_RECOVERY_COMPONENT, FINAL_RECOVERY_PERIOD,
} from '../store/gradingConfig';
import { buildGradeBook, calcSubject, clampGrade, roundGrade } from '../lib/gradeEngine';

type EditKey = string; // `${enrollmentId}|${period}|${component}`

export function Grades() {
  const { user } = useAuth();
  const { school, classes, grading, selectedYear } = useSchool();
  const { policy, periods } = grading;
  const [selectedPeriod, setSelectedPeriod] = useState(1);
  const [chosenClassId, setChosenClassId] = useState('');
  const [chosenSubjectId, setChosenSubjectId] = useState('');
  const [edits, setEdits] = useState<Record<EditKey, number | null>>({});
  const [saving, setSaving] = useState(false);

  const numericClasses = useMemo(() => classes.filter(c => c.evaluation_type === 'numeric'), [classes]);
  const reportClasses = useMemo(() => classes.filter(c => c.evaluation_type === 'report'), [classes]);

  // Disciplinas que este usuário lança: especialista só a dele; gestão e regente, todas com nota.
  const subjects = useMemo(() => {
    const base = user?.role === 'teacher' && user.specialty ? subjectsFor(user.specialty) : grading.subjects;
    return gradedSubjects(base.filter(s => grading.subjects.some(g => g.id === s.id)));
  }, [user, grading]);

  const selectedClassId = numericClasses.some(c => c.id === chosenClassId) ? chosenClassId : (numericClasses[0]?.id ?? '');
  const selectedSubjectId = subjects.some(s => s.id === chosenSubjectId) ? chosenSubjectId : (subjects[0]?.id ?? '');
  const selectClass = (id: string) => { setChosenClassId(id); setEdits({}); };
  const selectSubject = (id: string) => { setChosenSubjectId(id); setEdits({}); };

  const currentClass = numericClasses.find(c => c.id === selectedClassId);
  const subject = subjects.find(s => s.id === selectedSubjectId);
  const scheme = subject?.scheme;

  const rosterQ = useAsync(() => selectedClassId ? listClassRoster(selectedClassId) : Promise.resolve([]), [selectedClassId], []);
  const enrollmentIds = useMemo(() => rosterQ.data.map(r => r.enrollment.id), [rosterQ.data]);
  const gradesQ = useAsync(() => listGrades(enrollmentIds), [enrollmentIds.join(',')], []);

  const key = (enrollmentId: string, period: number, component: string): EditKey => `${enrollmentId}|${period}|${component}`;

  /** Linhas salvas + edições locais, no formato que o motor entende. */
  const entriesFor = (enrollmentId: string) => {
    const base = gradesQ.data
      .filter(g => g.enrollment_id === enrollmentId && g.subject_id === selectedSubjectId)
      .map(g => ({ subject_id: g.subject_id, period: g.period, component_id: g.component_id, value: Number(g.value) }));
    const merged = new Map(base.map(e => [`${e.period}|${e.component_id}`, e]));
    for (const [k, v] of Object.entries(edits)) {
      const [eid, p, c] = k.split('|');
      if (eid !== enrollmentId) continue;
      const mk = `${p}|${c}`;
      if (v === null) merged.delete(mk);
      else merged.set(mk, { subject_id: selectedSubjectId, period: Number(p), component_id: c, value: v });
    }
    return [...merged.values()];
  };

  const valueOf = (enrollmentId: string, period: number, component: string): number | null => {
    const k = key(enrollmentId, period, component);
    if (k in edits) return edits[k];
    const row = gradesQ.data.find(g => g.enrollment_id === enrollmentId && g.subject_id === selectedSubjectId && g.period === period && g.component_id === component);
    return row ? Number(row.value) : null;
  };

  const handleChange = (enrollmentId: string, period: number, component: string, raw: string, max: number) => {
    const k = key(enrollmentId, period, component);
    if (raw.trim() === '') { setEdits(prev => ({ ...prev, [k]: null })); return; }
    const num = Number(raw.replace(',', '.'));
    if (Number.isNaN(num)) return;
    setEdits(prev => ({ ...prev, [k]: clampGrade(num, max, policy) }));
  };

  const dirtyCount = Object.keys(edits).length;

  const handleSave = async () => {
    if (!school || !user) return;
    const upserts: { enrollment_id: string; subject_id: string; period: number; component_id: string; value: number }[] = [];
    const deletes: { enrollment_id: string; subject_id: string; period: number; component_id: string }[] = [];
    for (const [k, v] of Object.entries(edits)) {
      const [enrollment_id, p, component_id] = k.split('|');
      const period = Number(p);
      if (v === null) deletes.push({ enrollment_id, subject_id: selectedSubjectId, period, component_id });
      else upserts.push({ enrollment_id, subject_id: selectedSubjectId, period, component_id, value: v });
    }
    setSaving(true);
    try {
      await saveGrades(school.id, user.id, upserts, deletes);
      await gradesQ.reload();
      setEdits({});
      toast.success('Notas salvas.');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Falha ao salvar.');
    } finally {
      setSaving(false);
    }
  };

  const fmt = (v: number | null) => v === null ? '—' : roundGrade(v, policy).toFixed(policy.decimals);
  const isRecoveryPeriod = policy.recoveryPeriods.includes(selectedPeriod);
  const isFinal = selectedPeriod === FINAL_RECOVERY_PERIOD;
  const semesterOf = (p: number): 's1' | 's2' => (p <= 2 ? 's1' : 's2');

  const inputStyle: React.CSSProperties = { textAlign: 'center', width: '70px', padding: '0.4rem' };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 style={{ margin: 0 }}>Diário: Lançamento de Notas</h2>
          <p className="text-muted">Ano Letivo {selectedYear?.label ?? ''} {currentClass ? `• ${currentClass.name}` : ''} {subject ? `• ${subject.name}` : ''}</p>
        </div>
        {currentClass && (
          <button className="btn btn-primary" onClick={() => void handleSave()} disabled={saving || dirtyCount === 0}>
            <Save size={18} /> Salvar Diário{dirtyCount > 0 ? ` (${dirtyCount})` : ''}
          </button>
        )}
      </div>

      <div className="card mb-6" style={{ padding: '1.25rem 1.5rem', display: 'flex', gap: '1.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <div className="flex items-center gap-2">
          <label style={{ margin: 0, fontWeight: 700, whiteSpace: 'nowrap', fontSize: '0.9rem' }}>Turma:</label>
          <select value={selectedClassId} onChange={e => selectClass(e.target.value)} style={{ width: '200px' }}>
            {numericClasses.length > 0
              ? numericClasses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)
              : <option value="">Nenhuma turma numérica</option>}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label style={{ margin: 0, fontWeight: 700, whiteSpace: 'nowrap', fontSize: '0.9rem' }}>Disciplina:</label>
          <select value={selectedSubjectId} onChange={e => selectSubject(e.target.value)} style={{ width: '200px' }}>
            {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label style={{ margin: 0, fontWeight: 700, whiteSpace: 'nowrap', fontSize: '0.9rem' }}>Período:</label>
          <select value={selectedPeriod} onChange={e => setSelectedPeriod(Number(e.target.value))} style={{ width: '200px' }}>
            {periods.map((p, i) => <option key={p} value={i + 1}>{p}</option>)}
            <option value={FINAL_RECOVERY_PERIOD}>Recuperação Final</option>
          </select>
        </div>
        {currentClass && (
          <span style={{ marginLeft: 'auto', padding: '0.3rem 0.8rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700, backgroundColor: '#eff6ff', color: 'var(--color-primary)' }}>
            {rosterQ.data.length} aluno{rosterQ.data.length !== 1 ? 's' : ''} • {currentClass.series} {currentClass.letter}
          </span>
        )}
      </div>

      {reportClasses.length > 0 && (
        <div className="card mb-4" style={{ padding: '0.9rem 1.25rem', backgroundColor: '#fffbeb', borderLeft: '4px solid #f59e0b', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <BookOpen size={18} color="#d97706" />
          <p style={{ margin: 0, fontSize: '0.85rem', color: '#92400e' }}>
            <strong>{reportClasses.map(c => c.name).join(', ')}</strong> {reportClasses.length > 1 ? 'utilizam' : 'utiliza'} Relatórios Descritivos.{' '}
            <Link to="/reports" style={{ color: '#d97706', fontWeight: 700 }}>Gerar Relatório IA →</Link>
          </p>
        </div>
      )}

      {numericClasses.length === 0 && (
        <div className="card p-12 text-center">
          <FileText size={48} style={{ opacity: 0.3, margin: '0 auto 1rem' }} />
          <h3>Nenhuma turma com notas numéricas</h3>
          <p className="text-muted">Suas turmas utilizam Relatórios Descritivos.</p>
          <Link to="/reports" className="btn btn-primary mt-4">Gerar Relatório IA</Link>
        </div>
      )}

      {numericClasses.length > 0 && !rosterQ.loading && rosterQ.data.length === 0 && (
        <div className="card text-center p-12"><p className="text-muted">Nenhum aluno matriculado nesta turma.</p></div>
      )}

      {numericClasses.length > 0 && rosterQ.data.length > 0 && subject && scheme && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              {isFinal ? (
                <>
                  <thead>
                    <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid var(--color-border)' }}>
                      <th style={{ padding: '1rem', textAlign: 'left' }}>Aluno</th>
                      <th style={{ padding: '1rem', textAlign: 'center' }}>Média Anual</th>
                      <th style={{ padding: '1rem', textAlign: 'center' }}>Recup. Final<br /><span style={{ fontSize: '0.7rem', fontWeight: 400, color: '#64748b' }}>(máx. {policy.scale.max})</span></th>
                      <th style={{ padding: '1rem', textAlign: 'center' }}>Resultado Final</th>
                      <th style={{ padding: '1rem', textAlign: 'center' }}>Situação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rosterQ.data.map(({ enrollment, student }) => {
                      const result = calcSubject(buildGradeBook(entriesFor(enrollment.id), subject.id), subject, policy);
                      const canRecover = result.annual !== null && result.annual < policy.passingGrade;
                      return (
                        <tr key={enrollment.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                          <td style={{ padding: '1rem', fontWeight: 600 }}>{student.name}</td>
                          <td style={{ padding: '1rem', textAlign: 'center' }}>{fmt(result.annual)}</td>
                          <td style={{ padding: '0.5rem', textAlign: 'center' }}>
                            <input type="number" min={policy.scale.min} max={policy.scale.max} step="0.1" placeholder={canRecover ? '---' : 'n/a'} disabled={!canRecover}
                              value={valueOf(enrollment.id, FINAL_RECOVERY_PERIOD, FINAL_RECOVERY_COMPONENT) ?? ''}
                              onChange={e => handleChange(enrollment.id, FINAL_RECOVERY_PERIOD, FINAL_RECOVERY_COMPONENT, e.target.value, policy.scale.max)}
                              style={{ ...inputStyle, border: '2px solid #6366f1', borderRadius: '4px', width: '80px' }} />
                          </td>
                          <td style={{ padding: '1rem', textAlign: 'center', fontWeight: 800 }}>{fmt(result.final)}</td>
                          <td style={{ padding: '1rem', textAlign: 'center' }}>
                            {result.passed === null ? <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>Ano em aberto</span> : (
                              <span style={{ padding: '0.4rem 1rem', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 700, backgroundColor: result.passed ? '#C6EFCE' : '#FFC7CE', color: result.passed ? '#166534' : '#991b1b' }}>
                                {result.passed ? 'APROVADO' : 'REPROVADO'}
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </>
              ) : (
                <>
                  <thead>
                    <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid var(--color-border)' }}>
                      <th style={{ padding: '1rem', textAlign: 'left' }}>Aluno</th>
                      {scheme.components.map(c => (
                        <th key={c.id} style={{ padding: '1rem', textAlign: 'center' }}>{c.label}<br /><span style={{ fontSize: '0.7rem', fontWeight: 400, color: '#64748b' }}>(máx. {c.max})</span></th>
                      ))}
                      {scheme.exam && (
                        <>
                          <th style={{ padding: '1rem', textAlign: 'center', backgroundColor: '#f3f4f6' }}>N1<br /><span style={{ fontSize: '0.7rem', fontWeight: 400, color: '#64748b' }}>(máx. {policy.scale.max})</span></th>
                          <th style={{ padding: '1rem', textAlign: 'center' }}>{scheme.exam.label}<br /><span style={{ fontSize: '0.7rem', fontWeight: 400, color: '#64748b' }}>(máx. {scheme.exam.max})</span></th>
                        </>
                      )}
                      <th style={{ padding: '1rem', textAlign: 'center', backgroundColor: '#f3f4f6' }}>Média Bim.</th>
                      {isRecoveryPeriod && (
                        <>
                          <th style={{ padding: '1rem', textAlign: 'center', backgroundColor: '#eef2ff' }}>Média Sem.</th>
                          <th style={{ padding: '1rem', textAlign: 'center', backgroundColor: '#eef2ff' }}>Recup.<br /><span style={{ fontSize: '0.7rem', fontWeight: 400, color: '#64748b' }}>(máx. {policy.scale.max})</span></th>
                          <th style={{ padding: '1rem', textAlign: 'center', backgroundColor: '#eef2ff' }}>Final Sem.</th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {rosterQ.data.map(({ enrollment, student }) => {
                      const result = calcSubject(buildGradeBook(entriesFor(enrollment.id), subject.id), subject, policy);
                      const bim = result.bimesters[selectedPeriod - 1];
                      const sem = result[semesterOf(selectedPeriod)];
                      const mediaBg = bim.media === null ? '#f9fafb' : bim.media >= policy.passingGrade ? '#C6EFCE' : '#FFC7CE';
                      return (
                        <tr key={enrollment.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                          <td style={{ padding: '1rem', fontWeight: 600, whiteSpace: 'nowrap' }}>{student.name}</td>
                          {schemeFields(scheme).map((f, idx) => (
                            <Fragment key={f.id}>
                              {scheme.exam && idx === scheme.components.length && (
                                <td style={{ padding: '1rem', textAlign: 'center', fontWeight: 700, backgroundColor: '#f9fafb' }}>{fmt(bim.n1)}</td>
                              )}
                              <td style={{ padding: '0.5rem', textAlign: 'center' }}>
                                <input type="number" min={policy.scale.min} max={f.max} step="0.1" placeholder="—"
                                  value={valueOf(enrollment.id, selectedPeriod, f.id) ?? ''}
                                  onChange={e => handleChange(enrollment.id, selectedPeriod, f.id, e.target.value, f.max)}
                                  style={inputStyle} />
                              </td>
                            </Fragment>
                          ))}
                          <td style={{ padding: '1rem', textAlign: 'center', fontWeight: 800, backgroundColor: mediaBg }}>{fmt(bim.media)}</td>
                          {isRecoveryPeriod && (
                            <>
                              <td style={{ padding: '1rem', textAlign: 'center', backgroundColor: '#f5f7ff' }}>{fmt(sem.media)}</td>
                              <td style={{ padding: '0.5rem', backgroundColor: '#f5f7ff', textAlign: 'center' }}>
                                <input type="number" min={policy.scale.min} max={policy.scale.max} step="0.1" placeholder={sem.needsRecovery ? '---' : 'n/a'} disabled={!sem.needsRecovery}
                                  value={valueOf(enrollment.id, selectedPeriod, RECOVERY_COMPONENT) ?? ''}
                                  onChange={e => handleChange(enrollment.id, selectedPeriod, RECOVERY_COMPONENT, e.target.value, policy.scale.max)}
                                  style={inputStyle} />
                              </td>
                              <td style={{ padding: '1rem', textAlign: 'center', fontWeight: 800, backgroundColor: sem.final === null ? '#f5f7ff' : sem.final >= policy.passingGrade ? '#C6EFCE' : '#FFC7CE' }}>{fmt(sem.final)}</td>
                            </>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </>
              )}
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
