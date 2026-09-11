import { useState, useMemo } from 'react';
import { Save, Send, Plus, BookOpen, MessageSquare, Sparkles, Brain, Calendar, FileText, Target, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';
import { useSchool } from '../contexts/SchoolContext';
import { useAsync } from '../lib/useAsync';
import { listLessonPlans, createLessonPlan, updateLessonPlan, deleteLessonPlan } from '../data';
import { generateLessonPlanSuggestion } from '../lib/aiService';
import type { LessonPlan, DailyPlan, AISuggestion, DocumentStatus } from '../types/db';

type Draft = Omit<LessonPlan, 'id' | 'school_id' | 'teacher_id' | 'created_at' | 'updated_at'> & { id?: string };

const STATUS_STYLE: Record<DocumentStatus, { bg: string; color: string; label: string }> = {
  draft: { bg: '#f1f5f9', color: '#64748b', label: 'RASCUNHO' },
  submitted: { bg: '#fff7ed', color: '#c2410c', label: 'AGUARDANDO' },
  approved: { bg: '#dcfce7', color: '#166534', label: 'APROVADO' },
  returned: { bg: '#fee2e2', color: '#b91c1c', label: 'PEDIDO DE AJUSTE' },
};

function getDayOfWeek(dateStr: string) {
  const label = new Intl.DateTimeFormat('pt-BR', { weekday: 'long' }).format(new Date(dateStr + 'T00:00:00'));
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function generateEmptyDailyPlans(start: string, end: string): DailyPlan[] {
  const days: DailyPlan[] = [];
  const current = new Date(start + 'T00:00:00');
  const last = new Date(end + 'T00:00:00');
  while (current <= last && days.length < 31) {
    const dateStr = current.toISOString().split('T')[0];
    days.push({ date: dateStr, dayOfWeek: getDayOfWeek(dateStr), subject: '', theme: '', objectives: '', content: '', activities: '' });
    current.setDate(current.getDate() + 1);
  }
  return days;
}

function isoDaysFromNow(n: number) {
  return new Date(Date.now() + n * 86_400_000).toISOString().split('T')[0];
}

export function LessonPlanning() {
  const { user } = useAuth();
  const { school, classes, staff, refreshAiUsage } = useSchool();
  const [activeTab, setActiveTab] = useState<'list' | 'editor' | 'ideas'>('list');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const isManager = user?.role === 'admin' || user?.role === 'coordinator';
  const plansQ = useAsync(() => school ? listLessonPlans(school.id) : Promise.resolve([]), [school?.id], []);

  const emptyDraft = (): Draft => ({
    class_id: classes[0]?.id ?? '',
    start_date: isoDaysFromNow(0),
    end_date: isoDaysFromNow(4),
    weekly_theme: '',
    daily_plans: generateEmptyDailyPlans(isoDaysFromNow(0), isoDaysFromNow(4)),
    methodology: '',
    resources: '',
    evaluation: '',
    status: 'draft',
    coordinator_feedback: '',
    ai_suggestions: [],
  });

  const [formData, setFormData] = useState<Draft>(emptyDraft);
  const [ownerId, setOwnerId] = useState<string | null>(null);

  const isOwner = !ownerId || ownerId === user?.id;
  const readOnly = !isOwner;

  const visiblePlans = useMemo(() => plansQ.data, [plansQ.data]); // RLS já filtra por turma/segmento

  const className = (id: string) => classes.find(c => c.id === id)?.name ?? '—';
  const teacherName = (id: string) => staff.find(u => u.id === id)?.name ?? '—';

  const handleCreate = () => { setFormData(emptyDraft()); setOwnerId(user?.id ?? null); setActiveTab('editor'); };
  const handleEdit = (plan: LessonPlan) => {
    const { id, class_id, start_date, end_date, weekly_theme, daily_plans, methodology, resources, evaluation, status, coordinator_feedback, ai_suggestions } = plan;
    setFormData({ id, class_id, start_date, end_date, weekly_theme, daily_plans, methodology, resources, evaluation, status, coordinator_feedback, ai_suggestions });
    setOwnerId(plan.teacher_id);
    setActiveTab('editor');
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name === 'start_date' || name === 'end_date') {
      const next = { ...formData, [name]: value };
      if (next.start_date && next.end_date) next.daily_plans = generateEmptyDailyPlans(next.start_date, next.end_date);
      setFormData(next);
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const handleDailyPlanChange = (index: number, field: keyof DailyPlan, value: string) => {
    const daily = [...formData.daily_plans];
    daily[index] = { ...daily[index], [field]: value };
    setFormData({ ...formData, daily_plans: daily });
  };

  const askAi = async (type: AISuggestion['type'], profile?: string) => {
    setIsAiLoading(true);
    const weeklyTheme = formData.weekly_theme || 'tema atual';
    const firstActiveDay = formData.daily_plans.find(d => d.subject || d.theme || d.content);
    const dayContext = firstActiveDay ? `${firstActiveDay.dayOfWeek} (${firstActiveDay.subject})` : 'suas aulas';
    const cls = classes.find(c => c.id === formData.class_id);
    const ctx = cls ? ` Turma: ${cls.name} (${cls.level === 'infantil' ? 'Educação Infantil' : 'Ensino Fundamental'}).` : '';
    try {
      let prompt = '';
      if (type === 'ideas') prompt = `Com base no tema semanal "${weeklyTheme}" e no planejamento de ${dayContext}, sugira 3 ideias criativas de atividades práticas.${ctx}`;
      else if (type === 'improvement') prompt = `Analise o seguinte plano de aula e sugira melhorias pedagógicas focadas em engajamento e metodologias ativas.${ctx} Tema: ${weeklyTheme}. Metodologia: ${formData.methodology || 'não descrita'}. Dias: ${formData.daily_plans.filter(d => d.content).map(d => `${d.dayOfWeek}: ${d.subject} - ${d.theme} - ${d.content}`).join(' | ') || 'sem detalhamento'}.`;
      else {
        const label = profile === 'tdah' ? 'TDAH' : profile === 'tea' ? 'Autismo (TEA)' : profile === 'dislexia' ? 'Dislexia' : profile === 'down' ? 'Síndrome de Down' : 'necessidades educacionais específicas';
        prompt = `Como posso adaptar as atividades de "${dayContext}" sobre "${weeklyTheme}" para um aluno com ${label}? Forneça orientações práticas.${ctx}`;
      }
      const result = await generateLessonPlanSuggestion(prompt);
      void refreshAiUsage();
      const suggestion: AISuggestion = { id: Date.now().toString(), type, content: result, isFavorite: false, createdAt: new Date().toISOString() };
      setFormData(prev => ({ ...prev, ai_suggestions: [suggestion, ...prev.ai_suggestions] }));
      setActiveTab('ideas');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao consultar a IA.');
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleSave = async (status: DocumentStatus) => {
    if (!school || !user) return;
    if (!formData.class_id) { toast.error('Selecione a turma.'); return; }
    setSaving(true);
    try {
      const { id, ...rest } = formData;
      const payload = { ...rest, status, coordinator_feedback: rest.coordinator_feedback || null };
      if (id) await updateLessonPlan(id, payload);
      else await createLessonPlan({ ...payload, school_id: school.id, teacher_id: user.id });
      await plansQ.reload();
      setActiveTab('list');
      toast.success(status === 'submitted' ? 'Plano enviado para a coordenação!' : status === 'approved' ? 'Plano aprovado!' : status === 'returned' ? 'Devolvido ao professor.' : 'Rascunho salvo.');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Falha ao salvar.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (plan: LessonPlan) => {
    if (!window.confirm('Excluir este planejamento?')) return;
    try {
      await deleteLessonPlan(plan.id);
      await plansQ.reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Falha ao excluir.');
    }
  };

  const disabled = readOnly;

  return (
    <div className="lesson-planning">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 style={{ margin: 0 }}>Planejamento Pedagógico</h2>
          <p className="text-muted">Planos semanais com revisão da coordenação e copiloto de IA</p>
        </div>
        {!isManager && activeTab === 'list' && (
          <button className="btn btn-primary" onClick={handleCreate}><Plus size={20} /> Novo Planejamento</button>
        )}
      </div>

      {activeTab === 'list' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {plansQ.loading && <p className="text-muted col-span-full">Carregando...</p>}
          {!plansQ.loading && visiblePlans.length === 0 ? (
            <div className="card col-span-full p-12 text-center">
              <FileText size={48} color="#cbd5e1" style={{ margin: '0 auto 1rem' }} />
              <h3 className="text-muted">Nenhum planejamento encontrado</h3>
              <p className="text-muted">{isManager ? 'Os planos enviados pelos professores aparecem aqui.' : 'Crie seu primeiro plano para começar.'}</p>
            </div>
          ) : (
            visiblePlans.map(plan => {
              const st = STATUS_STYLE[plan.status];
              return (
                <div key={plan.id} className="card p-6 cursor-pointer hover-card" onClick={() => handleEdit(plan)}>
                  <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
                    <div style={{ width: '50px', height: '50px', borderRadius: '12px', backgroundColor: st.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <BookOpen size={24} color={st.color} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                        <h3 style={{ margin: 0, fontSize: '1.1rem' }}>{plan.weekly_theme || '(sem tema)'}</h3>
                        {isManager && <span style={{ fontSize: '0.7rem', padding: '0.1rem 0.4rem', backgroundColor: '#f1f5f9', borderRadius: '4px', color: '#64748b' }}>Prof. {teacherName(plan.teacher_id)}</span>}
                      </div>
                      <p style={{ margin: '0.2rem 0 0', fontSize: '0.85rem', color: '#64748b' }}>
                        {className(plan.class_id)} • {new Date(plan.start_date + 'T00:00:00').toLocaleDateString('pt-BR')} a {new Date(plan.end_date + 'T00:00:00').toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                    <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'flex-end' }}>
                      <span style={{ padding: '0.3rem 0.75rem', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 800, backgroundColor: st.bg, color: st.color }}>{st.label}</span>
                      {(plan.teacher_id === user?.id || isManager) && (
                        <button onClick={e => { e.stopPropagation(); void handleDelete(plan); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }} title="Excluir"><Trash2 size={16} /></button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      ) : activeTab === 'editor' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="card p-8">
              <div className="flex justify-between items-center mb-8">
                <h3 className="flex items-center gap-2" style={{ margin: 0 }}><FileText size={24} color="var(--color-primary)" /> Informações Gerais</h3>
                <button className="btn btn-secondary" onClick={() => setActiveTab('list')}>Voltar</button>
              </div>

              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="field-group">
                    <label>Turma</label>
                    <select name="class_id" value={formData.class_id} onChange={handleInputChange} disabled={disabled}>
                      <option value="">Selecione a turma</option>
                      {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div className="field-group">
                    <label>Período (Início - Fim)</label>
                    <div className="flex gap-2">
                      <input type="date" name="start_date" value={formData.start_date} onChange={handleInputChange} disabled={disabled} />
                      <input type="date" name="end_date" value={formData.end_date} onChange={handleInputChange} disabled={disabled} />
                    </div>
                  </div>
                </div>

                <div className="field-group">
                  <label>Tema da Semana</label>
                  <input type="text" name="weekly_theme" value={formData.weekly_theme} onChange={handleInputChange} placeholder="Ex: Primavera e Meio Ambiente" disabled={disabled} />
                </div>

                <div className="mt-8">
                  <h4 className="flex items-center gap-2 mb-4" style={{ color: 'var(--color-primary)' }}><Calendar size={18} /> Detalhamento Diário</h4>
                  <div className="space-y-4">
                    {formData.daily_plans.map((day, idx) => (
                      <div key={idx} className="p-4 rounded-lg border border-slate-200">
                        <div className="flex items-center justify-between mb-3">
                          <span style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--color-primary)' }}>{day.dayOfWeek} ({new Date(day.date + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })})</span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                          <div className="field-group"><label style={{ fontSize: '0.75rem' }}>Disciplina</label><input type="text" value={day.subject} onChange={e => handleDailyPlanChange(idx, 'subject', e.target.value)} placeholder="Ex: Português" disabled={disabled} style={{ padding: '0.4rem 0.75rem', fontSize: '0.85rem' }} /></div>
                          <div className="field-group"><label style={{ fontSize: '0.75rem' }}>Tema do Dia</label><input type="text" value={day.theme} onChange={e => handleDailyPlanChange(idx, 'theme', e.target.value)} placeholder="Ex: Leitura Compartilhada" disabled={disabled} style={{ padding: '0.4rem 0.75rem', fontSize: '0.85rem' }} /></div>
                        </div>
                        <div className="field-group mb-4"><label style={{ fontSize: '0.75rem' }}>Objetivos de Aprendizagem</label><textarea value={day.objectives} onChange={e => handleDailyPlanChange(idx, 'objectives', e.target.value)} placeholder="O que os alunos devem aprender..." disabled={disabled} rows={2} style={{ padding: '0.4rem 0.75rem', fontSize: '0.85rem', minHeight: '60px' }} /></div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="field-group"><label style={{ fontSize: '0.75rem' }}>Conteúdo</label><textarea value={day.content} onChange={e => handleDailyPlanChange(idx, 'content', e.target.value)} placeholder="Conteúdo programático..." disabled={disabled} rows={3} style={{ padding: '0.4rem 0.75rem', fontSize: '0.85rem', minHeight: '70px' }} /></div>
                          <div className="field-group"><label style={{ fontSize: '0.75rem' }}>Atividades</label><textarea value={day.activities} onChange={e => handleDailyPlanChange(idx, 'activities', e.target.value)} placeholder="Atividades práticas..." disabled={disabled} rows={3} style={{ padding: '0.4rem 0.75rem', fontSize: '0.85rem', minHeight: '70px' }} /></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="field-group"><label>Metodologia Geral</label><textarea name="methodology" value={formData.methodology} onChange={handleInputChange} rows={3} disabled={disabled} /></div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="field-group"><label>Recursos</label><textarea name="resources" value={formData.resources} onChange={handleInputChange} rows={3} disabled={disabled} /></div>
                  <div className="field-group"><label>Avaliação</label><textarea name="evaluation" value={formData.evaluation} onChange={handleInputChange} rows={3} disabled={disabled} /></div>
                </div>
              </div>

              {isOwner && (
                <div className="flex gap-4 mt-8 pt-8 border-t">
                  <button className="btn btn-secondary" style={{ flex: 1 }} disabled={saving} onClick={() => void handleSave('draft')}><Save size={20} /> Salvar Rascunho</button>
                  <button className="btn btn-primary" style={{ flex: 1 }} disabled={saving} onClick={() => void handleSave('submitted')}><Send size={20} /> Enviar para Coordenação</button>
                </div>
              )}

              {isManager && !isOwner && (
                <div className="mt-8 pt-8 border-t" style={{ backgroundColor: '#fff7ed', padding: '1.5rem', borderRadius: '12px', border: '1px solid #ffedd5' }}>
                  <h4 className="flex items-center gap-2 mb-2" style={{ color: '#c2410c' }}><MessageSquare size={18} /> Devolutiva da Coordenação</h4>
                  <p style={{ fontSize: '0.8rem', color: '#9a3412', marginBottom: '1rem' }}>
                    {formData.status === 'submitted' ? 'Este plano aguarda sua revisão. Escreva as orientações e escolha uma ação.' : `Status atual: ${STATUS_STYLE[formData.status].label}`}
                  </p>
                  <textarea placeholder="Escreva suas orientações pedagógicas aqui..." name="coordinator_feedback" value={formData.coordinator_feedback ?? ''} onChange={handleInputChange} style={{ width: '100%', padding: '1rem', borderRadius: '8px', border: '1px solid #fed7aa', marginBottom: '1rem', fontSize: '0.9rem' }} rows={4} />
                  <div className="flex gap-4">
                    <button className="btn btn-primary" style={{ flex: 1, backgroundColor: '#10b981', boxShadow: 'none' }} disabled={saving} onClick={() => void handleSave('approved')}>{formData.status === 'approved' ? 'Atualizar Feedback' : 'Aprovar Plano'}</button>
                    <button className="btn btn-secondary" style={{ flex: 1, color: '#ef4444', border: '1px solid #fee2e2', background: 'white', boxShadow: 'none' }} disabled={saving} onClick={() => void handleSave('returned')}>Solicitar Ajustes</button>
                  </div>
                </div>
              )}

              {formData.coordinator_feedback && isOwner && (
                <div className="mt-8 pt-8 border-t" style={{ backgroundColor: '#f0f9ff', padding: '1.5rem', borderRadius: '12px', border: '1px solid #e0f2fe' }}>
                  <h4 className="flex items-center gap-2 mb-2" style={{ color: '#0369a1' }}><MessageSquare size={18} /> Comentários da Coordenação</h4>
                  <p style={{ fontSize: '0.9rem', color: '#0c4a6e', margin: 0, whiteSpace: 'pre-wrap' }}>{formData.coordinator_feedback}</p>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-6">
            <div className="card p-6" style={{ background: 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-hover) 100%)', color: 'white' }}>
              <div className="flex items-center gap-3 mb-6">
                <div style={{ backgroundColor: 'rgba(255,255,255,0.2)', padding: '0.5rem', borderRadius: '8px' }}><Brain size={24} /></div>
                <div><h3 style={{ margin: 0, color: 'white' }}>Copiloto Pedagógico</h3><p style={{ margin: 0, fontSize: '0.8rem', opacity: 0.8 }}>IA Assistente de Planejamento</p></div>
              </div>
              <div className="space-y-4">
                <button className="btn" style={{ width: '100%', backgroundColor: 'white', color: 'var(--color-primary)', justifyContent: 'flex-start', gap: '0.75rem' }} onClick={() => void askAi('ideas')} disabled={isAiLoading}>
                  <Sparkles size={18} /> {isAiLoading ? 'Analisando...' : 'Sugerir ideias de aula'}
                </button>
                <button className="btn" style={{ width: '100%', backgroundColor: 'rgba(255,255,255,0.1)', color: 'white', border: '1px solid rgba(255,255,255,0.3)', justifyContent: 'flex-start', gap: '0.75rem' }} onClick={() => void askAi('improvement')} disabled={isAiLoading}>
                  <Target size={18} /> Sugerir melhorias no plano
                </button>
                <div style={{ paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                  <p style={{ fontSize: '0.85rem', marginBottom: '0.75rem', fontWeight: 600 }}>Sugerir adaptação para inclusão:</p>
                  <div className="grid grid-cols-2 gap-2">
                    {[['tdah', 'TDAH'], ['tea', 'Autismo'], ['dislexia', 'Dislexia'], ['down', 'T. de Down']].map(([id, label]) => (
                      <button key={id} onClick={() => void askAi('adaptation', id)} className="btn-ai-sub" disabled={isAiLoading}>{label}</button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="card p-6">
              <div className="flex items-center justify-between mb-4">
                <h4 style={{ margin: 0 }}>Histórico do Copiloto</h4>
                <button className="btn btn-secondary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.7rem' }} onClick={() => setActiveTab('ideas')}>Ver todos</button>
              </div>
              <div className="space-y-4">
                {formData.ai_suggestions.slice(0, 3).map((s) => (
                  <div key={s.id} style={{ padding: '1rem', backgroundColor: '#f8fafc', borderRadius: '10px', fontSize: '0.85rem', border: '1px solid #e2e8f0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', color: 'var(--color-primary)', fontWeight: 700 }}>
                      <Sparkles size={14} /> {s.type === 'ideas' ? 'Ideias' : s.type === 'improvement' ? 'Melhoria' : 'Adaptação'}
                    </div>
                    <p style={{ margin: 0, overflow: 'hidden', display: '-webkit-box', WebkitBoxOrient: 'vertical', WebkitLineClamp: 3 }}>{s.content}</p>
                  </div>
                ))}
                {formData.ai_suggestions.length === 0 && <p className="text-center text-muted" style={{ padding: '2rem 0', fontSize: '0.85rem' }}>Nenhuma sugestão gerada ainda.</p>}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="card p-8">
          <div className="flex justify-between items-center mb-8">
            <h3 style={{ margin: 0 }}>Banco de Ideias da IA</h3>
            <button className="btn btn-secondary" onClick={() => setActiveTab('editor')}>Voltar ao Editor</button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {formData.ai_suggestions.map((s) => (
              <div key={s.id} className="card p-6" style={{ border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', color: 'var(--color-primary)', fontWeight: 800 }}>
                  <Sparkles size={18} /> {s.type === 'ideas' ? 'Sugestão de Aula' : s.type === 'improvement' ? 'Melhoria Pedagógica' : 'Adaptação Curricular'}
                </div>
                <p style={{ marginBottom: '1.5rem', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{s.content}</p>
                {isOwner && (
                  <button className="btn btn-secondary" style={{ width: '100%' }} onClick={() => {
                    setFormData(f => ({ ...f, methodology: (f.methodology ? f.methodology + '\n\n' : '') + s.content }));
                    toast.success('Sugestão aplicada à metodologia do plano.');
                  }}>
                    Aplicar ao meu plano
                  </button>
                )}
              </div>
            ))}
            {formData.ai_suggestions.length === 0 && <p className="text-muted col-span-full">Nenhuma sugestão ainda. Use o copiloto no editor.</p>}
          </div>
        </div>
      )}

      <style>{`
        .field-group { display: flex; flex-direction: column; gap: 0.5rem; }
        .field-group label { font-weight: 700; font-size: 0.85rem; color: #475569; }
        .btn-ai-sub { padding: 0.5rem; background-color: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); color: white; border-radius: 6px; font-size: 0.75rem; cursor: pointer; transition: all 0.2s; font-family: inherit; }
        .btn-ai-sub:hover { background-color: rgba(255,255,255,0.2); }
        .hover-card:hover { transform: translateY(-2px); box-shadow: 0 10px 20px rgba(0,0,0,0.05); }
      `}</style>
    </div>
  );
}
