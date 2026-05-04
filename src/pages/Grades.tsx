import { useState, useMemo, useEffect } from 'react';
import { mockStudents, mockClasses, mockEnrollments } from '../store/mockDb';
import type { ClassGroup, Student, Enrollment } from '../store/mockDb';
import { useAuth } from '../contexts/AuthContext';
import { Link } from 'react-router-dom';
import { FileText, Save, BookOpen } from 'lucide-react';

const PERIODS = ['1º Bimestre', '2º Bimestre', '3º Bimestre', '4º Bimestre', 'Recuperação Final'];

// Max scores per component
const MAX = { work: 50, research: 30, activities: 20, exam: 100, recovery: 100, finalRec: 100 };

export function Grades() {
  const { user } = useAuth();
  const [selectedPeriod, setSelectedPeriod] = useState('1º Bimestre');
  const [gradesData, setGradesData] = useState<Record<string, any>>({});

  // All classes accessible to this user
  const managedClasses = useMemo(() => {
    // Specialists (English) and admins see all
    if (user?.role === 'admin' || user?.role === 'coordinator' || user?.specialty === 'english') {
      return mockClasses;
    }
    // Regular teachers see only their class
    if (user?.role === 'teacher') return mockClasses.filter((c: ClassGroup) => c.id === user.classId);
    return mockClasses;
  }, [user]);

  // Separate numeric (can enter grades) vs report (redirect)
  const numericClasses = useMemo(() => managedClasses.filter((c: ClassGroup) => c.evaluationType === 'numeric'), [managedClasses]);
  const reportClasses  = useMemo(() => managedClasses.filter((c: ClassGroup) => c.evaluationType === 'report'),  [managedClasses]);

  // Default selected class = first numeric class
  const [selectedClassId, setSelectedClassId] = useState<string>(() => numericClasses[0]?.id || '');

  // Keep selectedClassId valid when managedClasses change
  useEffect(() => {
    if (numericClasses.length > 0 && !numericClasses.find(c => c.id === selectedClassId)) {
      setSelectedClassId(numericClasses[0].id);
    }
  }, [numericClasses, selectedClassId]);

  const currentClass = useMemo(() => mockClasses.find((c: ClassGroup) => c.id === selectedClassId), [selectedClassId]);
  const isReport = currentClass?.evaluationType === 'report';

  // Students in the selected class (via enrollments)
  const students = useMemo(() => {
    const enrolledIds = mockEnrollments
      .filter((e: Enrollment) => e.classId === selectedClassId)
      .map((e: Enrollment) => e.studentId);
    return mockStudents.filter((s: Student) => enrolledIds.includes(s.id));
  }, [selectedClassId]);

  const handleGradeChange = (studentId: string, field: string, value: string) => {
    const max = MAX[field as keyof typeof MAX] ?? 100;
    const num = Math.min(max, Math.max(0, parseInt(value) || 0));
    setGradesData(prev => ({
      ...prev,
      [studentId]: {
        ...(prev[studentId] || { work: 0, research: 0, activities: 0, exam: 0, recovery: 0, finalRec: 0 }),
        [field]: num,
      },
    }));
  };

  const getN1   = (id: string) => { const d = gradesData[id] || {}; return (d.work||0) + (d.research||0) + (d.activities||0); };
  const getMedia = (id: string) => { const d = gradesData[id] || {}; return (getN1(id) + (d.exam||0)) / 2; };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 style={{ margin: 0 }}>Diário: Lançamento de Notas</h2>
          <p className="text-muted">Ano Letivo 2026 {currentClass ? `• ${currentClass.name}` : ''}</p>
        </div>
        {!isReport && students.length > 0 && (
          <button className="btn btn-primary" onClick={() => alert('Notas salvas!')}>
            <Save size={18} /> Salvar Diário
          </button>
        )}
      </div>

      {/* Selectors */}
      <div className="card mb-6" style={{ padding: '1.25rem 1.5rem', display: 'flex', gap: '1.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
        {/* Class selector — only numeric classes */}
        <div className="flex items-center gap-2">
          <label style={{ margin: 0, fontWeight: 700, whiteSpace: 'nowrap', fontSize: '0.9rem' }}>Turma:</label>
          <select
            value={selectedClassId}
            onChange={e => setSelectedClassId(e.target.value)}
            style={{ width: '200px' }}
          >
            {numericClasses.length > 0 ? (
              numericClasses.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))
            ) : (
              <option value="">Nenhuma turma numérica disponível</option>
            )}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label style={{ margin: 0, fontWeight: 700, whiteSpace: 'nowrap', fontSize: '0.9rem' }}>Período:</label>
          <select
            value={selectedPeriod}
            onChange={e => setSelectedPeriod(e.target.value)}
            style={{ width: '200px' }}
          >
            {PERIODS.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>

        {/* Info badge */}
        {currentClass && (
          <span style={{
            marginLeft: 'auto',
            padding: '0.3rem 0.8rem',
            borderRadius: '6px',
            fontSize: '0.75rem',
            fontWeight: 700,
            backgroundColor: '#eff6ff',
            color: 'var(--color-primary)',
          }}>
            {students.length} aluno{students.length !== 1 ? 's' : ''} • {currentClass.series} {currentClass.letter}
          </span>
        )}
      </div>

      {/* Report-only classes info banner */}
      {reportClasses.length > 0 && (
        <div className="card mb-4" style={{ padding: '0.9rem 1.25rem', backgroundColor: '#fffbeb', borderLeft: '4px solid #f59e0b', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <BookOpen size={18} color="#d97706" />
          <p style={{ margin: 0, fontSize: '0.85rem', color: '#92400e' }}>
            <strong>Educação Infantil e 1º Ano</strong> utilizam Relatórios Descritivos.{' '}
            <Link to="/reports" style={{ color: '#d97706', fontWeight: 700 }}>Gerar Relatório IA →</Link>
          </p>
        </div>
      )}

      {/* No numeric classes */}
      {numericClasses.length === 0 && (
        <div className="card p-12 text-center">
          <FileText size={48} style={{ opacity: 0.3, margin: '0 auto 1rem' }} />
          <h3>Nenhuma turma com notas numéricas</h3>
          <p className="text-muted">Suas turmas utilizam Relatórios Descritivos.</p>
          <Link to="/reports" className="btn btn-primary mt-4">Gerar Relatório IA</Link>
        </div>
      )}

      {/* Grades Table */}
      {numericClasses.length > 0 && students.length === 0 && (
        <div className="card text-center p-12">
          <p className="text-muted">Nenhum aluno encontrado para esta turma.</p>
        </div>
      )}

      {numericClasses.length > 0 && students.length > 0 && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              {selectedPeriod === 'Recuperação Final' ? (
                <>
                  <thead>
                    <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid var(--color-border)' }}>
                      <th style={{ padding: '1rem', textAlign: 'left' }}>Aluno</th>
                      <th style={{ padding: '1rem', textAlign: 'center' }}>Média Anual</th>
                      <th style={{ padding: '1rem', textAlign: 'center' }}>
                        Recup. Final<br />
                        <span style={{ fontSize: '0.7rem', fontWeight: 400, color: '#64748b' }}>(máx. 100)</span>
                      </th>
                      <th style={{ padding: '1rem', textAlign: 'center' }}>Resultado Final</th>
                      <th style={{ padding: '1rem', textAlign: 'center' }}>Situação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.map(student => {
                      const data = gradesData[student.id] || {};
                      const mediaAnual = 62.5; // mocked
                      const mediaFinal = Math.max(mediaAnual, data.finalRec || 0);
                      const aprovado = mediaFinal >= 70;
                      return (
                        <tr key={student.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                          <td style={{ padding: '1rem', fontWeight: 600 }}>{student.name}</td>
                          <td style={{ padding: '1rem', textAlign: 'center' }}>{mediaAnual.toFixed(1)}</td>
                          <td style={{ padding: '0.5rem', textAlign: 'center' }}>
                            <input
                              type="number" min={0} max={100}
                              placeholder="---"
                              value={data.finalRec || ''}
                              onChange={e => handleGradeChange(student.id, 'finalRec', e.target.value)}
                              style={{ textAlign: 'center', padding: '0.5rem', border: '2px solid #6366f1', borderRadius: '4px', width: '80px' }}
                            />
                          </td>
                          <td style={{ padding: '1rem', textAlign: 'center', fontWeight: 800 }}>{mediaFinal.toFixed(1)}</td>
                          <td style={{ padding: '1rem', textAlign: 'center' }}>
                            <span style={{
                              padding: '0.4rem 1rem', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 700,
                              backgroundColor: aprovado ? '#C6EFCE' : '#FFC7CE',
                              color: aprovado ? '#166534' : '#991b1b',
                            }}>
                              {aprovado ? 'APROVADO' : 'REPROVADO'}
                            </span>
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
                      <th style={{ padding: '1rem', textAlign: 'center' }}>
                        Trabalho<br /><span style={{ fontSize: '0.7rem', fontWeight: 400, color: '#64748b' }}>(máx. 50)</span>
                      </th>
                      <th style={{ padding: '1rem', textAlign: 'center' }}>
                        Pesquisa<br /><span style={{ fontSize: '0.7rem', fontWeight: 400, color: '#64748b' }}>(máx. 30)</span>
                      </th>
                      <th style={{ padding: '1rem', textAlign: 'center' }}>
                        Ativ.<br /><span style={{ fontSize: '0.7rem', fontWeight: 400, color: '#64748b' }}>(máx. 20)</span>
                      </th>
                      <th style={{ padding: '1rem', textAlign: 'center', backgroundColor: '#f3f4f6' }}>
                        N1<br /><span style={{ fontSize: '0.7rem', fontWeight: 400, color: '#64748b' }}>(máx. 100)</span>
                      </th>
                      <th style={{ padding: '1rem', textAlign: 'center' }}>
                        Prova<br /><span style={{ fontSize: '0.7rem', fontWeight: 400, color: '#64748b' }}>(máx. 100)</span>
                      </th>
                      <th style={{ padding: '1rem', textAlign: 'center', backgroundColor: '#f3f4f6' }}>Média Bim.</th>
                      {(selectedPeriod === '2º Bimestre' || selectedPeriod === '4º Bimestre') && (
                        <>
                          <th style={{ padding: '1rem', textAlign: 'center', backgroundColor: '#eef2ff' }}>Média Sem.</th>
                          <th style={{ padding: '1rem', textAlign: 'center', backgroundColor: '#eef2ff' }}>
                            Recup.<br /><span style={{ fontSize: '0.7rem', fontWeight: 400, color: '#64748b' }}>(máx. 100)</span>
                          </th>
                          <th style={{ padding: '1rem', textAlign: 'center', backgroundColor: '#eef2ff' }}>Média Final</th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {students.map(student => {
                      const data = gradesData[student.id] || { work: 0, research: 0, activities: 0, exam: 0, recovery: 0 };
                      const nota1 = getN1(student.id);
                      const mediaBim = getMedia(student.id);
                      const mediaSem = (65 + mediaBim) / 2;
                      const mediaFinal = Math.max(mediaSem, data.recovery || 0);
                      const isRecovBim = selectedPeriod === '2º Bimestre' || selectedPeriod === '4º Bimestre';
                      const displayed = isRecovBim ? mediaFinal : mediaBim;

                      return (
                        <tr key={student.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                          <td style={{ padding: '1rem', fontWeight: 600 }}>{student.name}</td>
                          <td style={{ padding: '0.5rem' }}>
                            <input type="number" min={0} max={50} value={data.work || ''} onChange={e => handleGradeChange(student.id, 'work', e.target.value)} style={{ textAlign: 'center', width: '60px' }} placeholder="0" />
                          </td>
                          <td style={{ padding: '0.5rem' }}>
                            <input type="number" min={0} max={30} value={data.research || ''} onChange={e => handleGradeChange(student.id, 'research', e.target.value)} style={{ textAlign: 'center', width: '60px' }} placeholder="0" />
                          </td>
                          <td style={{ padding: '0.5rem' }}>
                            <input type="number" min={0} max={20} value={data.activities || ''} onChange={e => handleGradeChange(student.id, 'activities', e.target.value)} style={{ textAlign: 'center', width: '60px' }} placeholder="0" />
                          </td>
                          <td style={{ padding: '1rem', textAlign: 'center', fontWeight: 700, backgroundColor: '#f9fafb' }}>{nota1}</td>
                          <td style={{ padding: '0.5rem' }}>
                            <input type="number" min={0} max={100} value={data.exam || ''} onChange={e => handleGradeChange(student.id, 'exam', e.target.value)} style={{ textAlign: 'center', width: '60px' }} placeholder="0" />
                          </td>
                          <td style={{ padding: '1rem', textAlign: 'center', fontWeight: 700, backgroundColor: '#f9fafb' }}>{mediaBim.toFixed(1)}</td>
                          {isRecovBim && (
                            <>
                              <td style={{ padding: '1rem', textAlign: 'center', backgroundColor: '#f5f7ff' }}>{mediaSem.toFixed(1)}</td>
                              <td style={{ padding: '0.5rem', backgroundColor: '#f5f7ff' }}>
                                <input type="number" min={0} max={100} value={data.recovery || ''} onChange={e => handleGradeChange(student.id, 'recovery', e.target.value)} style={{ textAlign: 'center', width: '60px' }} placeholder="0" />
                              </td>
                              <td style={{ padding: '1rem', textAlign: 'center', fontWeight: 800, backgroundColor: displayed >= 70 ? '#C6EFCE' : '#FFC7CE' }}>
                                {displayed.toFixed(1)}
                              </td>
                            </>
                          )}
                          {!isRecovBim && (
                            <td style={{ padding: '1rem', textAlign: 'center', fontWeight: 800, backgroundColor: displayed >= 70 ? '#C6EFCE' : mediaBim > 0 ? '#FFC7CE' : '#f9fafb' }}>
                              {displayed.toFixed(1)}
                            </td>
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
