import { useState, useMemo } from 'react';
import { Brain, CheckCircle2, XCircle, ChevronRight, Printer, BarChart3, Users, Activity, Search, Sparkles, Loader2, AlertCircle, PieChart, FileText, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';
import { useSchool } from '../contexts/SchoolContext';
import { useAsync } from '../lib/useAsync';
import { listAssessments, createAssessment, deleteAssessment, listAssessmentResults, saveAssessmentResults, listClassRoster } from '../data';
import { generatePedagogicalIntelligence, firstName } from '../lib/aiService';
import { renderMarkdown } from '../lib/markdown';
import type { Assessment, AssessmentQuestion } from '../types/db';

type Step = 'select' | 'input' | 'dashboard';

export function PedagogicalIntelligence() {
  const { user } = useAuth();
  const { school, classes, grading, refreshAiUsage } = useSchool();
  const [currentStep, setCurrentStep] = useState<Step>('select');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string>('');
  // Respostas = o que está salvo + o que foi clicado nesta sessão (zera ao trocar de prova).
  const [localAnswers, setLocalAnswers] = useState<Record<string, Record<string, boolean>>>({});
  const [activeTab, setActiveTab] = useState<'overview' | 'students' | 'bncc'>('overview');
  const [search, setSearch] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [saving, setSaving] = useState(false);

  const isManager = user?.role === 'admin' || user?.role === 'coordinator';
  const assessmentsQ = useAsync(() => school ? listAssessments(school.id) : Promise.resolve([]), [school?.id], []);
  const selected = assessmentsQ.data.find(a => a.id === selectedId);
  const rosterQ = useAsync(() => selected?.class_id ? listClassRoster(selected.class_id) : Promise.resolve([]), [selected?.class_id], []);
  const resultsQ = useAsync(() => selectedId ? listAssessmentResults(selectedId) : Promise.resolve([]), [selectedId], []);

  const answers = useMemo(() => {
    const map: Record<string, Record<string, boolean>> = {};
    for (const r of resultsQ.data) map[r.student_id] = { ...r.answers };
    for (const [sid, a] of Object.entries(localAnswers)) map[sid] = { ...(map[sid] ?? {}), ...a };
    return map;
  }, [resultsQ.data, localAnswers]);

  const students = useMemo(() => rosterQ.data.map(r => r.student), [rosterQ.data]);
  const questions = useMemo(() => selected?.questions ?? [], [selected]);

  // Nova avaliação
  const [newName, setNewName] = useState('');
  const [newClassId, setNewClassId] = useState('');
  const [newPeriod, setNewPeriod] = useState(grading.periods[0]);
  const [newSubject, setNewSubject] = useState(grading.subjects[0]?.id ?? '');
  const [newQuestions, setNewQuestions] = useState<AssessmentQuestion[]>([{ id: 'q1', theme: '', skill: '' }]);

  const handleCreate = async () => {
    if (!school || !user) return;
    if (!newName.trim() || !newClassId) { toast.error('Nome e turma são obrigatórios.'); return; }
    const qs = newQuestions.filter(q => q.theme.trim()).map((q, i) => ({ id: `q${i + 1}`, theme: q.theme.trim(), skill: q.skill.trim() }));
    if (qs.length === 0) { toast.error('Cadastre ao menos uma questão.'); return; }
    setSaving(true);
    try {
      await createAssessment({ school_id: school.id, class_id: newClassId, name: newName.trim(), period: newPeriod, subject_id: newSubject, questions: qs, created_by: user.id });
      await assessmentsQ.reload();
      setShowNew(false); setNewName(''); setNewQuestions([{ id: 'q1', theme: '', skill: '' }]);
      toast.success('Avaliação cadastrada.');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Falha ao criar.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (a: Assessment) => {
    if (!window.confirm(`Excluir "${a.name}" e seus resultados?`)) return;
    try { await deleteAssessment(a.id); await assessmentsQ.reload(); } catch (e) { toast.error(e instanceof Error ? e.message : 'Falha.'); }
  };

  const toggleAnswer = (studentId: string, questionId: string) => {
    const current = Boolean(answers[studentId]?.[questionId]);
    setLocalAnswers(prev => ({ ...prev, [studentId]: { ...(prev[studentId] || {}), [questionId]: !current } }));
  };

  const saveResults = async () => {
    if (!school || !selected) return;
    setSaving(true);
    try {
      await saveAssessmentResults(school.id, selected.id, students.map(s => ({ student_id: s.id, answers: answers[s.id] ?? {} })));
      await resultsQ.reload();
      setLocalAnswers({});
      toast.success('Resultados salvos.');
      setCurrentStep('dashboard');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Falha ao salvar.');
    } finally {
      setSaving(false);
    }
  };

  // Estatísticas reais
  const stats = useMemo(() => {
    const total = students.length * questions.length;
    const correct = students.reduce((acc, s) => acc + questions.filter(q => answers[s.id]?.[q.id]).length, 0);
    const avg = total > 0 ? (correct / total) * 100 : 0;
    const bySkill = questions.map(q => {
      const hits = students.filter(s => answers[s.id]?.[q.id]).length;
      return { q, pct: students.length > 0 ? (hits / students.length) * 100 : 0 };
    });
    const critical = bySkill.filter(x => x.pct < 50);
    const atRisk = students.filter(s => questions.length > 0 && (questions.filter(q => answers[s.id]?.[q.id]).length / questions.length) < 0.5);
    const level = avg >= 90 ? 'Excelente' : avg >= 70 ? 'Satisfatório' : avg >= 50 ? 'Regular' : 'Crítico';
    return { avg, bySkill, critical, atRisk, level };
  }, [students, questions, answers]);

  const handleGenerateAI = async () => {
    if (!selected) return;
    setLoading(true);
    try {
      const formattedResults = students.map(s => {
        const a = answers[s.id] || {};
        const correctCount = questions.filter(q => a[q.id]).length;
        const wrong = questions.filter(q => !a[q.id]).map(q => `${q.id} (${q.theme})`).join(', ');
        return `${firstName(s.name)}: ${correctCount}/${questions.length} acertos (Errou: ${wrong || 'Nenhuma'})`;
      }).join('\n');
      const subjectName = grading.subjects.find(s => s.id === selected.subject_id)?.name ?? selected.subject_id ?? '';
      const aiResponse = await generatePedagogicalIntelligence({
        assessmentName: `${selected.name} · ${classes.find(c => c.id === selected.class_id)?.name ?? ''} · ${selected.period ?? ''}`,
        subject: subjectName,
        skills: questions.map(q => `${q.id}: ${q.skill || q.theme}`).join(', '),
        results: formattedResults,
      });
      setResult(aiResponse);
      void refreshAiUsage();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao gerar análise.');
    } finally {
      setLoading(false);
    }
  };

  const getLevel = (p: number) => p >= 90 ? { label: 'Excelente', color: '#10b981' } : p >= 70 ? { label: 'Bom', color: '#3b82f6' } : p >= 50 ? { label: 'Regular', color: '#f59e0b' } : { label: 'Crítico', color: '#ef4444' };

  const renderSelectStep = () => (
    <div className="card p-8 animate-fade-in">
      <div className="flex justify-between items-center mb-6">
        <h3 className="flex items-center gap-2" style={{ margin: 0 }}><FileText size={24} color="var(--color-primary)" /> Escolha a Avaliação</h3>
        <button className="btn btn-primary" style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }} onClick={() => setShowNew(v => !v)}><Plus size={16} /> Nova Prova</button>
      </div>

      {showNew && (
        <div style={{ padding: '1.25rem', border: '1px solid #e2e8f0', borderRadius: '12px', marginBottom: '1.5rem', backgroundColor: '#f8fafc' }}>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div><label style={{ fontSize: '0.8rem' }}>Nome</label><input type="text" value={newName} onChange={e => setNewName(e.target.value)} placeholder="Ex: Avaliação de Português" /></div>
            <div><label style={{ fontSize: '0.8rem' }}>Turma</label><select value={newClassId} onChange={e => setNewClassId(e.target.value)}><option value="">Selecione</option>{classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
            <div><label style={{ fontSize: '0.8rem' }}>Período</label><select value={newPeriod} onChange={e => setNewPeriod(e.target.value)}>{grading.periods.map(p => <option key={p} value={p}>{p}</option>)}</select></div>
            <div><label style={{ fontSize: '0.8rem' }}>Disciplina</label><select value={newSubject} onChange={e => setNewSubject(e.target.value)}>{grading.subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
          </div>
          <label style={{ fontSize: '0.8rem', marginTop: '1rem' }}>Questões (tema e habilidade BNCC)</label>
          {newQuestions.map((q, i) => (
            <div key={i} className="flex gap-2 mb-2">
              <span style={{ alignSelf: 'center', fontSize: '0.8rem', fontWeight: 700, width: '32px' }}>Q{i + 1}</span>
              <input type="text" value={q.theme} placeholder="Tema (ex: Interpretação de texto)" onChange={e => setNewQuestions(qs => qs.map((x, j) => j === i ? { ...x, theme: e.target.value } : x))} />
              <input type="text" value={q.skill} placeholder="Código BNCC (ex: EF35LP01)" onChange={e => setNewQuestions(qs => qs.map((x, j) => j === i ? { ...x, skill: e.target.value } : x))} style={{ maxWidth: '220px' }} />
              <button onClick={() => setNewQuestions(qs => qs.filter((_, j) => j !== i))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}><Trash2 size={16} /></button>
            </div>
          ))}
          <div className="flex justify-between mt-3">
            <button className="btn btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }} onClick={() => setNewQuestions(qs => [...qs, { id: `q${qs.length + 1}`, theme: '', skill: '' }])}><Plus size={14} /> Questão</button>
            <div className="flex gap-2">
              <button className="btn btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }} onClick={() => setShowNew(false)}>Cancelar</button>
              <button className="btn btn-primary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }} disabled={saving} onClick={() => void handleCreate()}>Salvar prova</button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {assessmentsQ.data.map(a => (
          <div key={a.id} onClick={() => { setSelectedId(a.id); setLocalAnswers({}); setResult(null); setCurrentStep('input'); }} className="p-6 rounded-xl border-2 cursor-pointer transition-all"
            style={{ borderColor: selectedId === a.id ? 'var(--color-primary)' : 'var(--color-border)', backgroundColor: selectedId === a.id ? 'rgba(0,0,0,0.03)' : 'white' }}>
            <div className="flex justify-between items-start mb-2">
              <div className="flex gap-2">
                <span style={{ backgroundColor: 'var(--color-primary)', color: 'white', padding: '0.2rem 0.6rem', borderRadius: '4px', fontSize: '0.7rem' }}>{a.period}</span>
                <span style={{ backgroundColor: '#e2e8f0', color: '#475569', padding: '0.2rem 0.6rem', borderRadius: '4px', fontSize: '0.7rem' }}>{classes.find(c => c.id === a.class_id)?.name ?? 'Turma'}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-muted" style={{ fontSize: '0.8rem' }}>{grading.subjects.find(s => s.id === a.subject_id)?.name ?? a.subject_id}</span>
                {(isManager || a.created_by === user?.id) && <button onClick={e => { e.stopPropagation(); void handleDelete(a); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#cbd5e1' }}><Trash2 size={14} /></button>}
              </div>
            </div>
            <h4 style={{ margin: 0, fontSize: '1.1rem' }}>{a.name}</h4>
            <p className="text-muted mt-2 mb-0" style={{ fontSize: '0.85rem' }}>{a.questions.length} questões cadastradas</p>
          </div>
        ))}
        {assessmentsQ.data.length === 0 && !assessmentsQ.loading && <p className="text-muted col-span-full">Nenhuma avaliação cadastrada. Crie a primeira.</p>}
      </div>
    </div>
  );

  const renderInputStep = () => selected && (
    <div className="animate-fade-in">
      <div className="flex items-center gap-2 mb-6">
        <button onClick={() => setCurrentStep('select')} className="btn btn-secondary" style={{ padding: '0.5rem' }}>Voltar</button>
        <h3 style={{ margin: 0 }}>Lançar Resultados: {selected.name}</h3>
      </div>
      <div className="card p-0 overflow-hidden">
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid var(--color-border)' }}>
                <th style={{ padding: '1rem', textAlign: 'left', minWidth: '200px' }}>Aluno</th>
                {questions.map(q => (
                  <th key={q.id} style={{ padding: '1rem', textAlign: 'center' }} title={q.theme}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>{q.skill}</div>
                    <div>{q.id.toUpperCase()}</div>
                  </th>
                ))}
                <th style={{ padding: '1rem', textAlign: 'center', backgroundColor: '#eff6ff' }}>Acertos</th>
              </tr>
            </thead>
            <tbody>
              {students.map(student => {
                const a = answers[student.id] || {};
                const correctCount = questions.filter(q => a[q.id]).length;
                return (
                  <tr key={student.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <td style={{ padding: '1rem', fontWeight: 600 }}>{student.name}</td>
                    {questions.map(q => (
                      <td key={q.id} style={{ padding: '0.5rem', textAlign: 'center' }}>
                        <button onClick={() => toggleAnswer(student.id, q.id)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: a[q.id] ? 'var(--color-success)' : '#cbd5e1' }}>
                          {a[q.id] ? <CheckCircle2 size={24} /> : <XCircle size={24} />}
                        </button>
                      </td>
                    ))}
                    <td style={{ padding: '1rem', textAlign: 'center', fontWeight: 800, backgroundColor: '#f0fdf4' }}>{correctCount} / {questions.length}</td>
                  </tr>
                );
              })}
              {students.length === 0 && <tr><td colSpan={questions.length + 2} style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>Nenhum aluno matriculado na turma desta avaliação.</td></tr>}
            </tbody>
          </table>
        </div>
        <div className="p-6 bg-slate-50 flex justify-end gap-4">
          <button className="btn btn-secondary" onClick={() => setCurrentStep('select')}>Cancelar</button>
          <button className="btn btn-primary" disabled={saving} onClick={() => void saveResults()}>Salvar e ver panorama <ChevronRight size={20} /></button>
        </div>
      </div>
    </div>
  );

  const renderDashboard = () => selected && (
    <div className="animate-fade-in">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 style={{ margin: 0 }}>Panorama Pedagógico: {selected.name}</h2>
          <p className="text-muted">{classes.find(c => c.id === selected.class_id)?.name} · {selected.period}</p>
        </div>
        <div className="flex gap-2">
          <button className="btn btn-secondary" onClick={() => window.print()}><Printer size={20} /> Imprimir</button>
          <button className="btn btn-primary" onClick={() => setCurrentStep('input')}>Editar Dados</button>
        </div>
      </div>

      <div className="flex gap-4 mb-6" style={{ borderBottom: '1px solid var(--color-border)', paddingBottom: '1rem' }}>
        {[['overview', <BarChart3 size={18} key="i1" />, 'Visão Geral'], ['students', <Users size={18} key="i2" />, 'Por Aluno'], ['bncc', <Activity size={18} key="i3" />, 'Mapeamento BNCC']].map(([id, icon, label]) => (
          <button key={id as string} className={`btn ${activeTab === id ? 'btn-primary' : ''}`} onClick={() => setActiveTab(id as typeof activeTab)} style={{ padding: '0.5rem 1.5rem', fontSize: '0.9rem', backgroundColor: activeTab === id ? undefined : 'transparent', color: activeTab === id ? undefined : 'var(--color-text-muted)' }}>{icon} {label as string}</button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="card p-6" style={{ borderLeft: '4px solid var(--color-primary)' }}>
            <p className="text-muted mb-1" style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase' }}>Aproveitamento Médio</p>
            <h3 style={{ fontSize: '2rem', margin: 0 }}>{Math.round(stats.avg)}%</h3>
          </div>
          <div className="card p-6" style={{ borderLeft: '4px solid #10b981' }}>
            <p className="text-muted mb-1" style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase' }}>Nível de Domínio</p>
            <h3 style={{ fontSize: '2rem', margin: 0 }}>{stats.level}</h3>
          </div>
          <div className="card p-6" style={{ borderLeft: '4px solid #f59e0b' }}>
            <p className="text-muted mb-1" style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase' }}>Habilidades Críticas</p>
            <h3 style={{ fontSize: '2rem', margin: 0 }}>{String(stats.critical.length).padStart(2, '0')}</h3>
            <p className="text-muted mt-1" style={{ fontSize: '0.8rem' }}>abaixo de 50% de acerto</p>
          </div>
          <div className="card p-6" style={{ borderLeft: '4px solid #ef4444' }}>
            <p className="text-muted mb-1" style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase' }}>Alunos em Alerta</p>
            <h3 style={{ fontSize: '2rem', margin: 0 }}>{String(stats.atRisk.length).padStart(2, '0')}</h3>
            <p className="text-muted mt-1" style={{ fontSize: '0.8rem' }}>abaixo de 50% de acertos</p>
          </div>
        </div>
      )}

      {activeTab === 'students' && (
        <div className="card p-6 animate-fade-in">
          <div className="flex justify-between items-center mb-6">
            <h4 style={{ margin: 0 }}>Panorama Individual por Aluno</h4>
            <div style={{ position: 'relative' }}>
              <Search size={18} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
              <input type="text" placeholder="Buscar aluno..." value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: '2.5rem', width: '250px', fontSize: '0.9rem' }} />
            </div>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr style={{ backgroundColor: '#f8fafc', textAlign: 'left' }}><th style={{ padding: '1rem' }}>Aluno</th><th style={{ padding: '1rem', textAlign: 'center' }}>Pontuação</th><th style={{ padding: '1rem', textAlign: 'center' }}>Desempenho</th></tr></thead>
              <tbody>
                {students.filter(s => s.name.toLowerCase().includes(search.toLowerCase())).map(s => {
                  const correctCount = questions.filter(q => answers[s.id]?.[q.id]).length;
                  const percent = questions.length > 0 ? (correctCount / questions.length) * 100 : 0;
                  const level = getLevel(percent);
                  return (
                    <tr key={s.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                      <td style={{ padding: '1rem', fontWeight: 600 }}>{s.name}</td>
                      <td style={{ padding: '1rem', textAlign: 'center' }}>{correctCount} / {questions.length}</td>
                      <td style={{ padding: '1rem', textAlign: 'center' }}><span style={{ backgroundColor: level.color + '20', color: level.color, padding: '0.25rem 0.75rem', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 700 }}>{level.label}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'bncc' && (
        <div className="card p-6 animate-fade-in">
          <h4 className="mb-6">Mapeamento de Habilidades BNCC</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {stats.bySkill.map(({ q, pct }) => {
              const lv = getLevel(pct);
              return (
                <div key={q.id} className="p-4 rounded-lg border border-slate-200 bg-slate-50">
                  <div className="flex justify-between items-start mb-4">
                    <div><div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-primary)' }}>{q.skill || q.id.toUpperCase()}</div><div style={{ fontWeight: 600 }}>{q.theme}</div></div>
                    <div style={{ textAlign: 'right' }}><div style={{ fontSize: '1.2rem', fontWeight: 800 }}>{Math.round(pct)}%</div><div style={{ fontSize: '0.7rem', color: lv.color }}>{lv.label}</div></div>
                  </div>
                  <div style={{ width: '100%', height: '8px', backgroundColor: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}><div style={{ width: `${pct}%`, height: '100%', backgroundColor: lv.color }}></div></div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8">
        <div className="lg:col-span-2">
          {!result ? (
            <div className="card p-12 text-center flex flex-col items-center justify-center" style={{ minHeight: '400px', backgroundColor: '#f8fafc', border: '2px dashed #cbd5e1' }}>
              <div style={{ backgroundColor: 'rgba(0,0,0,0.05)', padding: '2rem', borderRadius: '50%', marginBottom: '1.5rem' }}><Brain size={64} color="var(--color-primary)" /></div>
              <h3 className="mb-4">Análise Diagnóstica Profunda</h3>
              <p className="text-muted mb-8" style={{ maxWidth: '450px' }}>A Inteligência Pedagógica gera um relatório completo analisando o desempenho individual e sugerindo estratégias por habilidade da BNCC. Só o primeiro nome dos alunos é enviado.</p>
              <button className="btn btn-primary py-4 px-8" onClick={() => void handleGenerateAI()} disabled={loading || students.length === 0}>
                {loading ? <><Loader2 size={24} className="animate-spin" /> Processando Dados...</> : <><Sparkles size={24} /> Gerar Relatório de Inteligência IA</>}
              </button>
            </div>
          ) : (
            <div className="card p-8 animate-fade-in">
              <div className="flex items-center gap-4 mb-6 pb-4" style={{ borderBottom: '1px solid #f1f5f9' }}><Brain size={32} color="var(--color-primary)" /><h3 style={{ margin: 0 }}>Diagnóstico da Inteligência Pedagógica</h3></div>
              <div style={{ lineHeight: '1.7', color: '#334155' }}>{renderMarkdown(result)}</div>
            </div>
          )}
        </div>
        <div className="lg:col-span-1">
          <div className="card p-6 mb-6">
            <h4 className="mb-4 flex items-center gap-2"><PieChart size={18} color="var(--color-secondary)" /> Desempenho por Tema</h4>
            <div className="flex flex-col gap-4">
              {stats.bySkill.map(({ q, pct }) => (
                <div key={q.id}>
                  <div className="flex justify-between mb-1" style={{ fontSize: '0.85rem' }}><span style={{ fontWeight: 600 }}>{q.theme}</span><span className="text-muted">{Math.round(pct)}%</span></div>
                  <div style={{ width: '100%', height: '8px', backgroundColor: '#f1f5f9', borderRadius: '4px', overflow: 'hidden' }}><div style={{ width: `${pct}%`, height: '100%', backgroundColor: 'var(--color-primary)' }}></div></div>
                </div>
              ))}
            </div>
          </div>
          {stats.critical.length > 0 && (
            <div className="card p-6" style={{ backgroundColor: '#fff7ed', border: '1px solid #ffedd5' }}>
              <h4 className="mb-4 flex items-center gap-2" style={{ color: '#9a3412' }}><AlertCircle size={18} /> Alerta Pedagógico</h4>
              <p style={{ fontSize: '0.9rem', color: '#c2410c' }}>
                {stats.critical.map(c => <span key={c.q.id}><strong>{c.q.skill || c.q.id.toUpperCase()} ({c.q.theme})</strong> com {Math.round(c.pct)}% de acerto. </span>)}
                Recomendamos retomar esses conteúdos com agrupamentos produtivos.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="pedagogical-intelligence">
      <div className="mb-8">
        <h1 className="flex items-center gap-3">
          <div style={{ backgroundColor: 'var(--color-primary)', color: 'white', padding: '0.75rem', borderRadius: '12px' }}><Brain size={32} /></div>
          Inteligência Pedagógica
        </h1>
        <p className="text-muted">Da avaliação à ação estratégica: transformando dados em evolução escolar.</p>
      </div>
      {currentStep === 'select' && renderSelectStep()}
      {currentStep === 'input' && renderInputStep()}
      {currentStep === 'dashboard' && renderDashboard()}
      <style>{`
        .animate-fade-in { animation: fadeIn 0.4s ease-out; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .animate-spin { animation: spin 1s linear infinite; }
      `}</style>
    </div>
  );
}
