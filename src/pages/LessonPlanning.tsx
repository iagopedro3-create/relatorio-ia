import { useState, useMemo } from 'react';
import { 
  BookOpen, Plus, Sparkles, Wand2, Users2, Save, 
  MessageSquare, CheckCircle2, History, Star, 
  ChevronRight, Filter, Send, AlertCircle
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { mockClasses } from '../store/mockDb';
import { mockLessonPlans, type LessonPlan, type AISuggestion } from '../store/planningDb';

export function LessonPlanning() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin' || user?.role === 'coordinator';
  
  const [activeTab, setActiveTab] = useState<'list' | 'editor' | 'ideas'>('list');
  const [plans, setPlans] = useState<LessonPlan[]>(mockLessonPlans);
  const [selectedPlan, setSelectedPlan] = useState<LessonPlan | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);

  const initialPlan: Partial<LessonPlan> = {
    teacherId: user?.id || '',
    teacherName: user?.name || '',
    classId: '',
    className: '',
    subject: '',
    date: new Date().toISOString().split('T')[0],
    theme: '',
    objectives: '',
    content: '',
    methodology: '',
    resources: '',
    activities: '',
    evaluation: '',
    status: 'draft',
    aiSuggestions: []
  };

  const [formData, setFormData] = useState<Partial<LessonPlan>>(initialPlan);

  const filteredPlans = useMemo(() => {
    if (isAdmin) return plans;
    return plans.filter(p => p.teacherId === user?.id);
  }, [plans, user, isAdmin]);

  const handleCreate = () => {
    setFormData(initialPlan);
    setSelectedPlan(null);
    setActiveTab('editor');
  };

  const handleEdit = (plan: LessonPlan) => {
    setFormData(plan);
    setSelectedPlan(plan);
    setActiveTab('editor');
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name === 'classId') {
      const cls = mockClasses.find(c => c.id === value);
      setFormData(prev => ({ ...prev, classId: value, className: cls?.name || '' }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const simulateAiSuggestion = (type: AISuggestion['type']) => {
    setIsAiLoading(true);
    setTimeout(() => {
      let content = "";
      if (type === 'ideas') {
        content = "Sugerimos integrar uma estação de 'Realidade Aumentada' simples usando cartões impressos para visualizar os elementos do tema. Para a dinâmica, um 'Quiz Interativo' em duplas aumentaria o engajamento.";
      } else if (type === 'improvement') {
        content = "Sua metodologia pode ser fortalecida com a técnica de 'Sala de Aula Invertida'. Sugerimos que os alunos pesquisem o tema base antes da aula para que o tempo em sala seja 100% focado em resolução de problemas.";
      } else {
        content = "Para alunos com TDAH, sugerimos dividir a atividade principal em blocos de 15 minutos com pausas ativas. Use estímulos visuais coloridos e forneça um roteiro passo-a-passo simplificado.";
      }

      const newSuggestion: AISuggestion = {
        id: `s${Date.now()}`,
        type,
        content,
        isFavorite: false,
        createdAt: new Date().toISOString()
      };

      setFormData(prev => ({
        ...prev,
        aiSuggestions: [newSuggestion, ...(prev.aiSuggestions || [])]
      }));
      setIsAiLoading(false);
    }, 1500);
  };

  const handleSave = (status: LessonPlan['status'] = 'draft') => {
    const plan: LessonPlan = {
      ...formData as LessonPlan,
      id: formData.id || `lp${Date.now()}`,
      status,
      createdAt: formData.createdAt || new Date().toISOString()
    };

    if (formData.id) {
      setPlans(plans.map(p => p.id === plan.id ? plan : p));
    } else {
      setPlans([plan, ...plans]);
    }
    setActiveTab('list');
    alert(status === 'pending' ? 'Plano enviado para a coordenação!' : 'Plano salvo como rascunho.');
  };

  return (
    <div className="container" style={{ maxWidth: '1100px' }}>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <BookOpen size={32} color="var(--color-primary)" /> Planejamento Pedagógico
          </h1>
          <p className="text-muted">Crie, otimize e receba suporte da IA para suas aulas</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button onClick={() => setActiveTab('list')} className={`btn ${activeTab === 'list' ? 'btn-primary' : 'btn-secondary'}`}>Lista de Planos</button>
          <button onClick={() => setActiveTab('ideas')} className={`btn ${activeTab === 'ideas' ? 'btn-primary' : 'btn-secondary'}`}>Banco de Ideias</button>
          {!isAdmin && <button onClick={handleCreate} className="btn btn-primary" style={{ backgroundColor: '#10b981', boxShadow: 'none' }}><Plus size={18} /> Novo Plano</button>}
        </div>
      </div>

      {/* ===== LIST VIEW ===== */}
      {activeTab === 'list' && (
        <div className="grid grid-cols-1 gap-4">
          {filteredPlans.map(plan => (
            <div key={plan.id} className="card hover-scale" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }} onClick={() => handleEdit(plan)}>
              <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
                <div style={{ 
                  width: '50px', height: '50px', borderRadius: '12px', 
                  backgroundColor: plan.status === 'approved' ? '#dcfce7' : (plan.status === 'pending' ? '#fff7ed' : '#f1f5f9'),
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  <BookOpen size={24} color={plan.status === 'approved' ? '#166534' : (plan.status === 'pending' ? '#c2410c' : '#64748b')} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.1rem' }}>{plan.theme}</h3>
                  <p style={{ margin: '0.2rem 0', fontSize: '0.85rem', color: '#64748b' }}>
                    {plan.className} • {plan.subject} • {new Date(plan.date).toLocaleDateString('pt-BR')}
                  </p>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ 
                    padding: '0.3rem 0.75rem', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 800,
                    backgroundColor: plan.status === 'approved' ? '#dcfce7' : (plan.status === 'pending' ? '#fff7ed' : '#f1f5f9'),
                    color: plan.status === 'approved' ? '#166534' : (plan.status === 'pending' ? '#c2410c' : '#64748b')
                  }}>
                    {plan.status.toUpperCase()}
                  </span>
                  {plan.aiSuggestions.length > 0 && (
                    <div style={{ marginTop: '0.4rem', fontSize: '0.75rem', color: 'var(--color-primary)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'flex-end' }}>
                      <Sparkles size={12} /> {plan.aiSuggestions.length} Ideias de IA
                    </div>
                  )}
                </div>
                <ChevronRight size={20} color="#cbd5e1" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ===== EDITOR VIEW ===== */}
      {activeTab === 'editor' && (
        <div className="grid grid-cols" style={{ gridTemplateColumns: '1.5fr 1fr', gap: '2rem' }}>
          <div className="card" style={{ padding: '2rem' }}>
            <h3 className="mb-6">{selectedPlan ? 'Editar Plano de Aula' : 'Novo Plano de Aula'}</h3>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="form-group">
                <label>Turma</label>
                <select name="classId" value={formData.classId} onChange={handleInputChange} disabled={isAdmin}>
                  <option value="">Selecione a turma</option>
                  {mockClasses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Data da Aula</label>
                <input type="date" name="date" value={formData.date} onChange={handleInputChange} disabled={isAdmin} />
              </div>
            </div>
            <div className="form-group mb-4">
              <label>Disciplina / Matéria</label>
              <input type="text" name="subject" value={formData.subject} onChange={handleInputChange} placeholder="Ex: Matemática, Artes..." disabled={isAdmin} />
            </div>
            <div className="form-group mb-4">
              <label>Tema da Aula</label>
              <input type="text" name="theme" value={formData.theme} onChange={handleInputChange} placeholder="Ex: Frações, Cores Primárias..." disabled={isAdmin} />
            </div>
            <div className="form-group mb-4">
              <label>Objetivos de Aprendizagem</label>
              <textarea name="objectives" value={formData.objectives} onChange={handleInputChange} rows={3} disabled={isAdmin}></textarea>
            </div>
            <div className="form-group mb-4">
              <label>Metodologia e Estratégias</label>
              <textarea name="methodology" value={formData.methodology} onChange={handleInputChange} rows={4} placeholder="Como a aula será conduzida?" disabled={isAdmin}></textarea>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="form-group">
                <label>Recursos Necessários</label>
                <textarea name="resources" value={formData.resources} onChange={handleInputChange} rows={2} disabled={isAdmin}></textarea>
              </div>
              <div className="form-group">
                <label>Avaliação</label>
                <textarea name="evaluation" value={formData.evaluation} onChange={handleInputChange} rows={2} disabled={isAdmin}></textarea>
              </div>
            </div>

            {!isAdmin && (
              <div className="flex gap-4 mt-8">
                <button className="btn btn-secondary" onClick={() => handleSave('draft')}><Save size={18} /> Salvar Rascunho</button>
                <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => handleSave('pending')}><Send size={18} /> Enviar para Coordenação</button>
              </div>
            )}

            {isAdmin && selectedPlan?.status === 'pending' && (
              <div className="mt-8 pt-8 border-t">
                <h4 className="mb-4">Análise da Coordenação</h4>
                <textarea 
                   placeholder="Escreva sua devolutiva para o professor..." 
                   style={{ width: '100%', padding: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '1rem' }}
                   rows={4}
                ></textarea>
                <div className="flex gap-4">
                  <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => handleSave('approved')}>Aprovar Plano</button>
                  <button className="btn btn-secondary" style={{ flex: 1, color: '#ef4444' }} onClick={() => handleSave('returned')}>Solicitar Ajustes</button>
                </div>
              </div>
            )}
          </div>

          {/* AI PANEL */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div className="card" style={{ background: 'linear-gradient(135deg, #eff6ff 0%, #ffffff 100%)', border: '1px solid #bfdbfe' }}>
              <h3 className="flex items-center gap-2 mb-4" style={{ color: 'var(--color-primary)' }}>
                <Sparkles size={22} /> Copiloto Pedagógico IA
              </h3>
              <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '1.5rem' }}>
                Use a inteligência artificial para potencializar seu planejamento. Clique nos botões abaixo para receber sugestões:
              </p>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <button 
                  className="btn btn-secondary ai-btn" 
                  disabled={isAiLoading}
                  onClick={() => simulateAiSuggestion('ideas')}
                >
                  <Wand2 size={16} color="var(--color-primary)" /> Gerar ideias de aula
                </button>
                <button 
                  className="btn btn-secondary ai-btn" 
                  disabled={isAiLoading}
                  onClick={() => simulateAiSuggestion('improvement')}
                >
                  <TrendingUp size={16} color="var(--color-primary)" /> Melhorar metodologia
                </button>
                <button 
                  className="btn btn-secondary ai-btn" 
                  disabled={isAiLoading}
                  onClick={() => simulateAiSuggestion('adaptation')}
                >
                  <Users2 size={16} color="var(--color-primary)" /> Sugerir adaptação (Inclusão)
                </button>
              </div>

              {isAiLoading && (
                <div style={{ marginTop: '2rem', textAlign: 'center' }}>
                  <div className="loader" style={{ margin: '0 auto 1rem' }}></div>
                  <p style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-primary)' }}>IA analisando seu plano...</p>
                </div>
              )}
            </div>

            <div className="card" style={{ flex: 1 }}>
              <h3 className="mb-4 flex items-center gap-2">
                <History size={18} color="#64748b" /> Sugestões Recentes
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {(formData.aiSuggestions || []).map(s => (
                  <div key={s.id} style={{ padding: '1rem', backgroundColor: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0', position: 'relative' }}>
                    <div className="flex justify-between items-start mb-2">
                      <span style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--color-primary)', backgroundColor: '#eff6ff', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>
                        {s.type === 'ideas' ? 'IDEIAS' : (s.type === 'improvement' ? 'MELHORIA' : 'ADAPTAÇÃO')}
                      </span>
                      <button style={{ background: 'none', border: 'none', cursor: 'pointer' }}><Star size={16} color={s.isFavorite ? '#f59e0b' : '#cbd5e1'} fill={s.isFavorite ? '#f59e0b' : 'none'} /></button>
                    </div>
                    <p style={{ fontSize: '0.85rem', lineHeight: 1.5, margin: 0 }}>{s.content}</p>
                    <button 
                      style={{ marginTop: '1rem', fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-primary)', background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
                      onClick={() => {
                        // Logic to append to specific field
                        if (s.type === 'ideas') setFormData(prev => ({ ...prev, activities: (prev.activities ? prev.activities + '\n\n' : '') + s.content }));
                        if (s.type === 'improvement') setFormData(prev => ({ ...prev, methodology: (prev.methodology ? prev.methodology + '\n\n' : '') + s.content }));
                      }}
                    >
                      + Aplicar ao meu plano
                    </button>
                  </div>
                ))}
                {(formData.aiSuggestions || []).length === 0 && !isAiLoading && (
                  <div style={{ textAlign: 'center', padding: '3rem 1rem', opacity: 0.5 }}>
                    <MessageSquare size={32} style={{ margin: '0 auto 0.5rem' }} />
                    <p style={{ fontSize: '0.85rem' }}>As sugestões da IA aparecerão aqui conforme você as solicitar.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== IDEAS BANK VIEW ===== */}
      {activeTab === 'ideas' && (
        <div className="grid grid-cols-1 gap-6">
          <div className="card" style={{ display: 'flex', gap: '1rem', alignItems: 'center', padding: '1.25rem' }}>
            <Filter size={20} color="#64748b" />
            <select style={{ padding: '0.5rem', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.85rem' }}>
              <option>Todas as Disciplinas</option>
              <option>Matemática</option>
              <option>Artes</option>
            </select>
            <input type="text" placeholder="Pesquisar por tema..." style={{ flex: 1, padding: '0.5rem', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.85rem' }} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            {plans.flatMap(p => p.aiSuggestions.map(s => ({ ...s, planTheme: p.theme }))).map(item => (
              <div key={item.id} className="card">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <span style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--color-primary)', backgroundColor: '#eff6ff', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>
                      {item.type.toUpperCase()}
                    </span>
                    <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.4rem' }}>Plano: {item.planTheme}</p>
                  </div>
                  <Star size={18} color="#f59e0b" fill="#f59e0b" />
                </div>
                <p style={{ fontSize: '0.9rem', lineHeight: 1.5 }}>{item.content}</p>
                <button className="btn btn-secondary mt-4" style={{ width: '100%', fontSize: '0.8rem' }}>Usar em novo plano</button>
              </div>
            ))}
          </div>
        </div>
      )}

      <style>{`
        .ai-btn { 
          justify-content: flex-start; text-align: left; padding: 0.75rem 1.25rem; 
          background: white; border: 1px solid #e2e8f0; font-size: 0.9rem;
          transition: all 0.2s;
        }
        .ai-btn:hover:not(:disabled) { 
          border-color: var(--color-primary); background-color: #eff6ff; transform: translateX(5px);
        }
        .ai-btn:disabled { opacity: 0.5; cursor: not-allowed; }
      `}</style>
    </div>
  );
}
