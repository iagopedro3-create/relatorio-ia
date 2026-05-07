import { useState, useMemo } from 'react';
import { 
  Save, Send, Plus, 
  BookOpen, MessageSquare, Sparkles, Brain, 
  Calendar, FileText, Target
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { mockClasses } from '../store/mockDb';
import { getStoredPlans, saveStoredPlans, type LessonPlan, type AISuggestion } from '../store/planningDb';
import { useSettings } from '../contexts/SettingsContext';
import { generateLessonPlanSuggestion } from '../lib/aiService';

export function LessonPlanning() {
  const { user } = useAuth();
  const { settings } = useSettings();
  
  const [activeTab, setActiveTab] = useState<'list' | 'editor' | 'ideas'>('list');
  const [plans, setPlans] = useState<LessonPlan[]>(getStoredPlans());
  const [isAiLoading, setIsAiLoading] = useState(false);

  const isAdmin = user?.role === 'admin' || user?.role === 'coordinator';

  const getDayOfWeek = (dateStr: string) => {
    const date = new Date(dateStr + 'T00:00:00');
    return new Intl.DateTimeFormat('pt-BR', { weekday: 'long' }).format(date);
  };

  const generateEmptyDailyPlans = (start: string, end: string) => {
    const days = [];
    let current = new Date(start + 'T00:00:00');
    const last = new Date(end + 'T00:00:00');
    
    while (current <= last) {
      const dateStr = current.toISOString().split('T')[0];
      days.push({
        date: dateStr,
        dayOfWeek: getDayOfWeek(dateStr).charAt(0).toUpperCase() + getDayOfWeek(dateStr).slice(1),
        subject: '',
        theme: '',
        objectives: '',
        content: '',
        activities: ''
      });
      current.setDate(current.getDate() + 1);
    }
    return days;
  };

  const initialPlan: Partial<LessonPlan> = {
    weeklyTheme: '',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    dailyPlans: generateEmptyDailyPlans(new Date().toISOString().split('T')[0], new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]),
    methodology: '',
    resources: '',
    evaluation: '',
    status: 'draft',
    coordinatorFeedback: '',
    aiSuggestions: [],
    teacherId: user?.id || '',
    teacherName: user?.name || ''
  };

  const [formData, setFormData] = useState<Partial<LessonPlan>>(initialPlan);

  const filteredPlans = useMemo(() => {
    if (user?.role === 'admin') return plans;
    
    if (user?.role === 'coordinator') {
      if (user.managedLevel === 'all') return plans;
      const levelClasses = mockClasses.filter(c => c.level === user.managedLevel).map(c => c.id);
      return plans.filter(p => levelClasses.includes(p.classId));
    }

    return plans.filter(p => p.teacherId === user?.id);
  }, [plans, user]);

  const handleCreate = () => {
    setFormData(initialPlan);
    setActiveTab('editor');
  };

  const handleEdit = (plan: LessonPlan) => {
    setFormData(plan);
    setActiveTab('editor');
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    if (name === 'startDate' || name === 'endDate') {
      const newFormData = { ...formData, [name]: value };
      if (newFormData.startDate && newFormData.endDate) {
        newFormData.dailyPlans = generateEmptyDailyPlans(newFormData.startDate, newFormData.endDate);
      }
      setFormData(newFormData);
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const handleDailyPlanChange = (index: number, field: string, value: string) => {
    const newDailyPlans = [...(formData.dailyPlans || [])];
    newDailyPlans[index] = { ...newDailyPlans[index], [field]: value };
    setFormData({ ...formData, dailyPlans: newDailyPlans });
  };

  const simulateAiSuggestion = async (type: AISuggestion['type'], profile?: string) => {
    if (!settings.apiKey) {
      alert('A IA está em modo de demonstração pois a chave API não foi configurada nas Configurações.');
      // Keep simulation as fallback
      setIsAiLoading(true);
      setTimeout(() => {
        setIsAiLoading(false);
        setActiveTab('ideas');
      }, 1000);
      return;
    }

    setIsAiLoading(true);
    
    const weeklyTheme = formData.weeklyTheme || "tema atual";
    const firstActiveDay = (formData.dailyPlans || []).find(d => d.subject || d.theme || d.content);
    const dayContext = firstActiveDay ? `${firstActiveDay.dayOfWeek} (${firstActiveDay.subject})` : "suas aulas";

    try {
      let prompt = "";
      if (type === 'ideas') {
        prompt = `Com base no tema semanal "${weeklyTheme}" e no planejamento de ${dayContext}, sugira 3 ideias criativas de atividades práticas.`;
      } else if (type === 'improvement') {
        prompt = `Analise o seguinte plano de aula e sugira melhorias pedagógicas focadas em engajamento e metodologias ativas: Theme: ${weeklyTheme}, Methodology: ${formData.methodology}`;
      } else {
        const profileLabel = profile === 'tdah' ? 'TDAH' : (profile === 'tea' ? 'Autismo' : (profile === 'dislexia' ? 'Dislexia' : 'Inclusão'));
        prompt = `Como posso adaptar as atividades de "${dayContext}" sobre "${weeklyTheme}" para um aluno com ${profileLabel}? Forneça orientações práticas.`;
      }

      // Use the dedicated planning suggestion method
      const result = await generateLessonPlanSuggestion(prompt, {
        provider: settings.aiProvider,
        modelId: settings.aiModel,
        apiKey: settings.apiKey
      });

      const newSuggestion: AISuggestion = {
        id: Date.now().toString(),
        type,
        content: result,
        isFavorite: false,
        createdAt: new Date().toISOString()
      };
      
      setFormData(prev => ({
        ...prev,
        aiSuggestions: [newSuggestion, ...(prev.aiSuggestions || [])]
      }));
      setActiveTab('ideas');
    } catch (err) {
      console.error(err);
      alert('Erro ao consultar a IA. Verifique sua chave API.');
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleSave = (status: LessonPlan['status']) => {
    const plan: LessonPlan = {
      ...formData as LessonPlan,
      id: formData.id || `lp${Date.now()}`,
      status,
      coordinatorFeedback: formData.coordinatorFeedback || '',
      createdAt: formData.createdAt || new Date().toISOString(),
      teacherId: formData.teacherId || user?.id || '',
      teacherName: formData.teacherName || user?.name || ''
    };

    setPlans(prevPlans => {
      const exists = prevPlans.find(p => p.id === plan.id);
      let next;
      if (exists) {
        next = prevPlans.map(p => p.id === plan.id ? plan : p);
      } else {
        next = [plan, ...prevPlans];
      }
      saveStoredPlans(next);
      return next;
    });

    setActiveTab('list');
    alert(status === 'pending' ? 'Plano enviado para a coordenação!' : status === 'approved' ? 'Plano aprovado!' : 'Operação realizada!');
  };

  return (
    <div className="lesson-planning">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 style={{ margin: 0 }}>Planejamento Pedagógico</h2>
          <p className="text-muted">Gestão estratégica de conteúdos e atividades</p>
        </div>
        {!isAdmin && activeTab === 'list' && (
          <button className="btn btn-primary" onClick={handleCreate}>
            <Plus size={20} /> Novo Planejamento
          </button>
        )}
      </div>

      {activeTab === 'list' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredPlans.length === 0 ? (
            <div className="card col-span-full p-12 text-center">
              <FileText size={48} color="#cbd5e1" style={{ margin: '0 auto 1rem' }} />
              <h3 className="text-muted">Nenhum planejamento encontrado</h3>
              <p className="text-muted">Crie seu primeiro plano para começar.</p>
            </div>
          ) : (
            filteredPlans.map(plan => (
              <div key={plan.id} className="card p-6 cursor-pointer hover-card" onClick={() => handleEdit(plan)}>
                <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
                  <div style={{ 
                    width: '50px', height: '50px', borderRadius: '12px', 
                    backgroundColor: plan.status === 'approved' ? '#dcfce7' : (plan.status === 'returned' ? '#fee2e2' : (plan.status === 'pending' ? '#fff7ed' : '#f1f5f9')),
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>
                    <BookOpen size={24} color={plan.status === 'approved' ? '#166534' : (plan.status === 'returned' ? '#b91c1c' : (plan.status === 'pending' ? '#c2410c' : '#64748b'))} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <h3 style={{ margin: 0, fontSize: '1.1rem' }}>{plan.weeklyTheme}</h3>
                      {isAdmin && <span style={{ fontSize: '0.7rem', padding: '0.1rem 0.4rem', backgroundColor: '#f1f5f9', borderRadius: '4px', color: '#64748b' }}>Prof. {plan.teacherName}</span>}
                    </div>
                    <p style={{ margin: '0.2rem 0 0', fontSize: '0.85rem', color: '#64748b' }}>
                      {plan.className} • {new Date(plan.startDate).toLocaleDateString()} a {new Date(plan.endDate).toLocaleDateString()}
                    </p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ 
                      padding: '0.3rem 0.75rem', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 800,
                      backgroundColor: plan.status === 'approved' ? '#dcfce7' : (plan.status === 'returned' ? '#fee2e2' : (plan.status === 'pending' ? '#fff7ed' : '#f1f5f9')),
                      color: plan.status === 'approved' ? '#166534' : (plan.status === 'returned' ? '#b91c1c' : (plan.status === 'pending' ? '#c2410c' : '#64748b'))
                    }}>
                      {plan.status === 'returned' ? 'PEDIDO DE AJUSTE' : plan.status.toUpperCase()}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      ) : activeTab === 'editor' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="card p-8">
              <div className="flex justify-between items-center mb-8">
                <h3 className="flex items-center gap-2" style={{ margin: 0 }}>
                  <FileText size={24} color="var(--color-primary)" /> Informações Gerais
                </h3>
                <button className="btn btn-secondary" onClick={() => setActiveTab('list')}>Voltar</button>
              </div>

              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="field-group">
                    <label>Turma</label>
                    <select name="classId" value={formData.classId} onChange={handleInputChange} disabled={isAdmin}>
                      <option value="">Selecione a turma</option>
                      {mockClasses.filter(c => c.teacherId === user?.id || isAdmin).map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="field-group">
                    <label>Período (Início - Fim)</label>
                    <div className="flex gap-2">
                      <input type="date" name="startDate" value={formData.startDate} onChange={handleInputChange} disabled={isAdmin} />
                      <input type="date" name="endDate" value={formData.endDate} onChange={handleInputChange} disabled={isAdmin} />
                    </div>
                  </div>
                </div>

                <div className="field-group">
                  <label>Tema da Semana</label>
                  <input 
                    type="text" 
                    name="weeklyTheme" 
                    value={formData.weeklyTheme} 
                    onChange={handleInputChange} 
                    placeholder="Ex: Primavera e Meio Ambiente"
                    disabled={isAdmin}
                  />
                </div>

                {/* Daily Breakdown */}
                <div className="mt-8">
                  <h4 className="flex items-center gap-2 mb-4" style={{ color: 'var(--color-primary)' }}>
                    <Calendar size={18} /> Detalhamento Diário
                  </h4>
                  
                  <div className="space-y-4">
                    {formData.dailyPlans?.map((day, idx) => (
                      <div key={idx} className="p-4 rounded-lg border border-border bg-surface/50">
                        <div className="flex items-center justify-between mb-3">
                          <span style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--color-primary)' }}>
                            {day.dayOfWeek} ({new Date(day.date + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })})
                          </span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                          <div className="field-group">
                            <label style={{ fontSize: '0.75rem' }}>Disciplina</label>
                            <input 
                              type="text" 
                              value={day.subject} 
                              onChange={(e) => handleDailyPlanChange(idx, 'subject', e.target.value)}
                              placeholder="Ex: Português"
                              disabled={isAdmin}
                              style={{ padding: '0.4rem 0.75rem', fontSize: '0.85rem' }}
                            />
                          </div>
                          <div className="field-group">
                            <label style={{ fontSize: '0.75rem' }}>Tema do Dia</label>
                            <input 
                              type="text" 
                              value={day.theme} 
                              onChange={(e) => handleDailyPlanChange(idx, 'theme', e.target.value)}
                              placeholder="Ex: Leitura Compartilhada"
                              disabled={isAdmin}
                              style={{ padding: '0.4rem 0.75rem', fontSize: '0.85rem' }}
                            />
                          </div>
                        </div>
                        <div className="field-group mb-4">
                          <label style={{ fontSize: '0.75rem' }}>Objetivos de Aprendizagem</label>
                          <textarea 
                            value={day.objectives} 
                            onChange={(e) => handleDailyPlanChange(idx, 'objectives', e.target.value)}
                            placeholder="Descreva o que os alunos devem aprender..."
                            disabled={isAdmin}
                            rows={2}
                            style={{ padding: '0.4rem 0.75rem', fontSize: '0.85rem' }}
                          ></textarea>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="field-group">
                            <label style={{ fontSize: '0.75rem' }}>Conteúdo</label>
                            <textarea 
                              value={day.content} 
                              onChange={(e) => handleDailyPlanChange(idx, 'content', e.target.value)}
                              placeholder="Conteúdo programático..."
                              disabled={isAdmin}
                              rows={3}
                              style={{ padding: '0.4rem 0.75rem', fontSize: '0.85rem' }}
                            ></textarea>
                          </div>
                          <div className="field-group">
                            <label style={{ fontSize: '0.75rem' }}>Atividades</label>
                            <textarea 
                              value={day.activities} 
                              onChange={(e) => handleDailyPlanChange(idx, 'activities', e.target.value)}
                              placeholder="Atividades práticas..."
                              disabled={isAdmin}
                              rows={3}
                              style={{ padding: '0.4rem 0.75rem', fontSize: '0.85rem' }}
                            ></textarea>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="field-group">
                  <label>Metodologia Geral</label>
                  <textarea name="methodology" value={formData.methodology} onChange={handleInputChange} rows={3} disabled={isAdmin}></textarea>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="field-group">
                    <label>Recursos</label>
                    <textarea name="resources" value={formData.resources} onChange={handleInputChange} rows={3} disabled={isAdmin}></textarea>
                  </div>
                  <div className="field-group">
                    <label>Avaliação</label>
                    <textarea name="evaluation" value={formData.evaluation} onChange={handleInputChange} rows={3} disabled={isAdmin}></textarea>
                  </div>
                </div>
              </div>

              {!isAdmin && (
                <div className="flex gap-4 mt-8 pt-8 border-t">
                  <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => handleSave('draft')}>
                    <Save size={20} /> Salvar Rascunho
                  </button>
                  <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => handleSave('pending')}>
                    <Send size={20} /> Enviar para Coordenação
                  </button>
                </div>
              )}

              {isAdmin && (
                <div className="mt-8 pt-8 border-t" style={{ backgroundColor: '#fff7ed', padding: '1.5rem', borderRadius: '12px', border: '1px solid #ffedd5' }}>
                  <h4 className="flex items-center gap-2 mb-2" style={{ color: '#c2410c' }}>
                    <MessageSquare size={18} /> Devolutiva da Coordenação
                  </h4>
                  <p style={{ fontSize: '0.8rem', color: '#9a3412', marginBottom: '1rem' }}>
                    {formData.status === 'pending' 
                      ? 'Este plano aguarda sua revisão. Escreva as orientações e escolha uma ação abaixo.' 
                      : `Status atual: ${formData.status === 'approved' ? 'Aprovado' : 'Em rascunho/ajuste'}`}
                  </p>
                  <textarea 
                     placeholder="Escreva suas orientações pedagógicas aqui..." 
                     name="coordinatorFeedback"
                     value={formData.coordinatorFeedback || ''}
                     onChange={handleInputChange}
                     style={{ width: '100%', padding: '1rem', borderRadius: '8px', border: '1px solid #fed7aa', marginBottom: '1rem', fontSize: '0.9rem' }}
                     rows={4}
                  ></textarea>
                  <div className="flex gap-4">
                    <button className="btn btn-primary" style={{ flex: 1, backgroundColor: '#10b981', boxShadow: 'none' }} onClick={() => handleSave('approved')}>
                      {formData.status === 'approved' ? 'Atualizar Feedback' : 'Aprovar Plano'}
                    </button>
                    <button className="btn btn-secondary" style={{ flex: 1, color: '#ef4444', border: '1px solid #fee2e2' }} onClick={() => handleSave('returned')}>Solicitar Ajustes</button>
                  </div>
                </div>
              )}

              {formData.coordinatorFeedback && !isAdmin && (
                <div className="mt-8 pt-8 border-t" style={{ backgroundColor: '#f0f9ff', padding: '1.5rem', borderRadius: '12px', border: '1px solid #e0f2fe' }}>
                  <h4 className="flex items-center gap-2 mb-2" style={{ color: '#0369a1' }}>
                    <MessageSquare size={18} /> Comentários da Coordenação
                  </h4>
                  <p style={{ fontSize: '0.9rem', color: '#0c4a6e', margin: 0, whiteSpace: 'pre-wrap' }}>{formData.coordinatorFeedback}</p>
                  <p style={{ fontSize: '0.75rem', color: '#38bdf8', marginTop: '0.5rem', fontWeight: 600 }}>Revise as orientações e envie novamente se necessário.</p>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-6">
            <div className="card p-6" style={{ background: 'linear-gradient(135deg, #0a73ff 0%, #0052cc 100%)', color: 'white' }}>
              <div className="flex items-center gap-3 mb-6">
                <div style={{ backgroundColor: 'rgba(255,255,255,0.2)', padding: '0.5rem', borderRadius: '8px' }}>
                  <Brain size={24} />
                </div>
                <div>
                  <h3 style={{ margin: 0 }}>Copiloto Pedagógico</h3>
                  <p style={{ margin: 0, fontSize: '0.8rem', opacity: 0.8 }}>IA Assistente de Planejamento</p>
                </div>
              </div>
              
              <div className="space-y-4">
                <button 
                  className="btn" 
                  style={{ width: '100%', backgroundColor: 'white', color: 'var(--color-primary)', justifyContent: 'flex-start', gap: '0.75rem' }}
                  onClick={() => simulateAiSuggestion('ideas')}
                  disabled={isAiLoading}
                >
                  <Sparkles size={18} /> {isAiLoading ? 'Analisando...' : 'Sugerir ideias de aula'}
                </button>
                <button 
                  className="btn" 
                  style={{ width: '100%', backgroundColor: 'rgba(255,255,255,0.1)', color: 'white', border: '1px solid rgba(255,255,255,0.3)', justifyContent: 'flex-start', gap: '0.75rem' }}
                  onClick={() => simulateAiSuggestion('improvement')}
                  disabled={isAiLoading}
                >
                  <Target size={18} /> Sugerir melhorias no plano
                </button>
                
                <div style={{ paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                  <p style={{ fontSize: '0.85rem', marginBottom: '0.75rem', fontWeight: 600 }}>Sugerir adaptação para inclusão:</p>
                  <div className="grid grid-cols-2 gap-2">
                    <button onClick={() => simulateAiSuggestion('adaptation', 'tdah')} className="btn-ai-sub">TDAH</button>
                    <button onClick={() => simulateAiSuggestion('adaptation', 'tea')} className="btn-ai-sub">Autismo</button>
                    <button onClick={() => simulateAiSuggestion('adaptation', 'dislexia')} className="btn-ai-sub">Dislexia</button>
                    <button onClick={() => simulateAiSuggestion('adaptation', 'down')} className="btn-ai-sub">T. de Down</button>
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
                {formData.aiSuggestions?.slice(0, 3).map((s, i) => (
                  <div key={i} style={{ padding: '1rem', backgroundColor: '#f8fafc', borderRadius: '10px', fontSize: '0.85rem', border: '1px solid #e2e8f0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', color: 'var(--color-primary)', fontWeight: 700 }}>
                      <Sparkles size={14} /> {s.type === 'ideas' ? 'Ideias' : s.type === 'improvement' ? 'Melhoria' : 'Adaptação'}
                    </div>
                    <p style={{ margin: 0, lineClamp: 3, overflow: 'hidden', display: '-webkit-box', WebkitBoxOrient: 'vertical', WebkitLineClamp: 3 }}>{s.content}</p>
                  </div>
                ))}
                {(!formData.aiSuggestions || formData.aiSuggestions.length === 0) && (
                  <p className="text-center text-muted" style={{ padding: '2rem 0', fontSize: '0.85rem' }}>Nenhuma sugestão gerada ainda.</p>
                )}
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
            {formData.aiSuggestions?.map((s, i) => (
              <div key={i} className="card p-6" style={{ border: '1px solid #e2e8f0', position: 'relative' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', color: 'var(--color-primary)', fontWeight: 800 }}>
                  <Sparkles size={18} /> {s.type === 'ideas' ? 'Sugestão de Aula' : s.type === 'improvement' ? 'Melhoria Pedagógica' : 'Adaptação Curricular'}
                </div>
                <p style={{ marginBottom: '1.5rem', lineHeight: 1.6 }}>{s.content}</p>
                <button className="btn btn-secondary" style={{ width: '100%' }} onClick={() => {
                   // Simple mock implementation of "Apply"
                   const cleanContent = s.content.replace(/^(Sugestão|A IA sugere|Recomendação): /i, '');
                   if (s.type === 'ideas' || s.type === 'adaptation') {
                     // Apply to methodology as a general fallback for now
                     setFormData(f => ({ ...f, methodology: (f.methodology ? f.methodology + '\n\n' : '') + cleanContent }));
                   } else if (s.type === 'improvement') {
                     setFormData(f => ({ ...f, methodology: (f.methodology ? f.methodology + '\n\n' : '') + cleanContent }));
                   }
                   alert('Sugestão aplicada à metodologia do plano!');
                }}>
                  Aplicar ao meu plano
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <style>{`
        .field-group { display: flex; flex-direction: column; gap: 0.5rem; }
        .field-group label { font-weight: 700; font-size: 0.85rem; color: #475569; }
        .btn-ai-sub {
          padding: 0.5rem;
          background-color: rgba(255,255,255,0.1);
          border: 1px solid rgba(255,255,255,0.2);
          color: white;
          border-radius: 6px;
          font-size: 0.75rem;
          cursor: pointer;
          transition: all 0.2s;
        }
        .btn-ai-sub:hover { background-color: rgba(255,255,255,0.2); }
        .hover-card:hover { transform: translateY(-2px); box-shadow: 0 10px 20px rgba(0,0,0,0.05); }
      `}</style>
    </div>
  );
}
