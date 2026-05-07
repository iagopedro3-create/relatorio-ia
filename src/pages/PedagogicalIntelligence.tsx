import { useState, useMemo } from 'react';
import { 
  Brain, FileText, AlertCircle, Sparkles, Loader2, Printer, Users, 
  ChevronRight, BarChart3, TrendingUp, PieChart, Activity, CheckCircle2, XCircle, Search
} from 'lucide-react';
import { generatePedagogicalIntelligence } from '../lib/aiService';
import { useAuth } from '../contexts/AuthContext';
import { useSettings } from '../contexts/SettingsContext';
import { mockAssessments, mockStudents, mockClasses, mockEnrollments } from '../store/mockDb';
import type { ClassGroup, Student, Enrollment } from '../store/mockDb';

type Step = 'select' | 'input' | 'dashboard';

export function PedagogicalIntelligence() {
  const { user } = useAuth();
  const { settings } = useSettings();
  const [currentStep, setCurrentStep] = useState<Step>('select');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [selectedAssessmentId, setSelectedAssessmentId] = useState<string>(mockAssessments[0].id);
  const [studentAnswers, setStudentAnswers] = useState<Record<string, Record<string, boolean>>>({});
  const [activeTab, setActiveTab] = useState<'overview' | 'students' | 'bncc'>('overview');

  const managedClasses = useMemo(() => {
    if (user?.role === 'teacher') return mockClasses.filter((c: ClassGroup) => c.id === user.classId);
    if (user?.role === 'coordinator' && user.managedLevel !== 'all') {
      return mockClasses.filter((c: ClassGroup) => c.level === user.managedLevel);
    }
    return mockClasses;
  }, [user]);

  const students = useMemo(() => {
    const classIds = managedClasses.map((c: ClassGroup) => c.id);
    const enrolledIds = mockEnrollments
      .filter((e: Enrollment) => classIds.includes(e.classId))
      .map((e: Enrollment) => e.studentId);
    return mockStudents.filter((s: Student) => enrolledIds.includes(s.id));
  }, [managedClasses]);

  const availableAssessments = useMemo(() => {
    // In a real app, assessments would also have a level or be linked to classes
    // For now, we filter by subject or bimestre if needed, but let's assume they are all available
    // OR we could filter them if we add a level to Assessment
    return mockAssessments;
  }, []);

  const selectedAssessment = useMemo(() => 
    availableAssessments.find(a => a.id === selectedAssessmentId) || availableAssessments[0], 
    [selectedAssessmentId, availableAssessments]
  );

  const handleToggleAnswer = (studentId: string, questionId: string) => {
    setStudentAnswers(prev => ({
      ...prev,
      [studentId]: {
        ...(prev[studentId] || {}),
        [questionId]: !prev[studentId]?.[questionId]
      }
    }));
  };

  const handleGenerateAI = async () => {
    if (!settings.apiKey) {
      alert('A chave da API não foi detectada neste dispositivo. Peça para a Direção configurar em "Configurações" ou utilize variáveis de ambiente globais.');
      return;
    }

    setLoading(true);
    try {
      // Format data for AI
      const formattedResults = students.map(s => {
        const answers = studentAnswers[s.id] || {};
        const correctCount = Object.values(answers).filter(v => v).length;
        const wrongQuestions = selectedAssessment.questions
          .filter(q => !answers[q.id])
          .map(q => q.id)
          .join(', ');
        return `${s.name}: ${correctCount}/${selectedAssessment.questions.length} acertos (Errou: ${wrongQuestions || 'Nenhuma'})`;
      }).join('\n');

      const aiResponse = await generatePedagogicalIntelligence({
        year: selectedAssessment.name,
        subject: selectedAssessment.subject,
        skills: selectedAssessment.questions.map(q => q.skill).join(', '),
        results: formattedResults
      }, {
        provider: settings.aiProvider,
        modelId: settings.aiModel,
        apiKey: settings.apiKey
      });
      setResult(aiResponse);
    } catch (error) {
      alert('Erro ao gerar análise: ' + error);
    } finally {
      setLoading(false);
    }
  };

  const renderSelectStep = () => (
    <div className="card p-8 animate-fade-in">
      <h3 className="mb-6 flex items-center gap-2"><FileText size={24} color="var(--color-primary)" /> Escolha a Avaliação</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {mockAssessments.map(assessment => (
          <div 
            key={assessment.id}
            onClick={() => {
              setSelectedAssessmentId(assessment.id);
              setCurrentStep('input');
            }}
            className="p-6 rounded-xl border-2 cursor-pointer transition-all hover:border-primary hover:bg-blue-50"
            style={{ 
              borderColor: selectedAssessmentId === assessment.id ? 'var(--color-primary)' : 'var(--color-border)',
              backgroundColor: selectedAssessmentId === assessment.id ? 'rgba(10, 115, 255, 0.05)' : 'white'
            }}
          >
            <div className="flex justify-between items-start mb-2">
              <div className="flex gap-2">
                <span className="badge" style={{ backgroundColor: 'var(--color-primary)', color: 'white', padding: '0.2rem 0.6rem', borderRadius: '4px', fontSize: '0.7rem' }}>
                  {assessment.bimestre}
                </span>
                <span className="badge" style={{ backgroundColor: '#e2e8f0', color: '#475569', padding: '0.2rem 0.6rem', borderRadius: '4px', fontSize: '0.7rem' }}>
                  {assessment.questions.some(q => q.skill.startsWith('EI')) ? 'Infantil' : 'Fundamental'}
                </span>
              </div>
              <span className="text-muted" style={{ fontSize: '0.8rem' }}>{assessment.subject}</span>
            </div>
            <h4 style={{ margin: 0, fontSize: '1.1rem' }}>{assessment.name}</h4>
            <p className="text-muted mt-2 mb-0" style={{ fontSize: '0.85rem' }}>{assessment.questions.length} questões cadastradas</p>
          </div>
        ))}
        <div className="p-6 rounded-xl border-2 border-dashed border-border flex flex-col items-center justify-center text-muted cursor-not-allowed opacity-60">
          <Sparkles size={24} className="mb-2" />
          <span>Cadastrar Nova Prova</span>
        </div>
      </div>
    </div>
  );

  const renderInputStep = () => (
    <div className="animate-fade-in">
      <div className="flex items-center gap-2 mb-6">
        <button onClick={() => setCurrentStep('select')} className="btn btn-secondary" style={{ padding: '0.5rem' }}>Voltar</button>
        <h3 style={{ margin: 0 }}>Lançar Resultados: {selectedAssessment.name}</h3>
      </div>

      <div className="card p-0 overflow-hidden">
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid var(--color-border)' }}>
                <th style={{ padding: '1rem', textAlign: 'left', minWidth: '200px' }}>Aluno</th>
                {selectedAssessment.questions.map(q => (
                  <th key={q.id} style={{ padding: '1rem', textAlign: 'center' }} title={q.theme}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>{q.skill}</div>
                    <div>Q{q.id.replace('q', '')}</div>
                  </th>
                ))}
                <th style={{ padding: '1rem', textAlign: 'center', backgroundColor: '#eff6ff' }}>Acertos</th>
              </tr>
            </thead>
            <tbody>
              {students.map(student => {
                const answers = studentAnswers[student.id] || {};
                const correctCount = Object.values(answers).filter(v => v).length;
                return (
                  <tr key={student.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <td style={{ padding: '1rem', fontWeight: 600 }}>{student.name}</td>
                    {selectedAssessment.questions.map(q => (
                      <td key={q.id} style={{ padding: '0.5rem', textAlign: 'center' }}>
                        <button 
                          onClick={() => handleToggleAnswer(student.id, q.id)}
                          style={{ 
                            border: 'none', background: 'transparent', cursor: 'pointer', 
                            color: answers[q.id] ? 'var(--color-success)' : '#cbd5e1',
                            transform: 'scale(1.2)'
                          }}
                        >
                          {answers[q.id] ? <CheckCircle2 size={24} /> : <XCircle size={24} />}
                        </button>
                      </td>
                    ))}
                    <td style={{ padding: '1rem', textAlign: 'center', fontWeight: 800, backgroundColor: '#f0fdf4' }}>
                      {correctCount} / {selectedAssessment.questions.length}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="p-6 bg-slate-50 flex justify-end gap-4">
          <button className="btn btn-secondary" onClick={() => setCurrentStep('select')}>Cancelar</button>
          <button className="btn btn-primary" onClick={() => setCurrentStep('dashboard')}>
            Ver Panorama Pedagógico <ChevronRight size={20} />
          </button>
        </div>
      </div>
    </div>
  );

  const renderDashboard = () => {
    const isAdmin = user?.role === 'admin' || user?.role === 'coordinator';
    
    // Simple mock stats for the dashboard
    const totalCorrect = Object.values(studentAnswers).reduce((acc, student) => 
      acc + Object.values(student).filter(v => v).length, 0);
    const totalPossible = students.length * selectedAssessment.questions.length;
    const avgScore = totalPossible > 0 ? (totalCorrect / totalPossible) * 100 : 0;

    return (
      <div className="animate-fade-in">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 style={{ margin: 0 }}>Panorama Pedagógico: {selectedAssessment.name}</h2>
            <p className="text-muted">
              {isAdmin ? 'Visão Geral da Escola' : `Turma: ${mockClasses.find(c => c.id === user?.classId)?.name}`}
            </p>
          </div>
          <div className="flex gap-2">
            <button className="btn btn-secondary" onClick={() => window.print()}><Printer size={20} /> Imprimir</button>
            <button className="btn btn-primary" onClick={() => setCurrentStep('input')}>Editar Dados</button>
          </div>
        </div>

        {/* Dashboard Tabs */}
        <div className="flex gap-4 mb-6" style={{ borderBottom: '1px solid var(--color-border)', paddingBottom: '1rem' }}>
          <button 
            className={`btn ${activeTab === 'overview' ? 'btn-primary' : ''}`}
            onClick={() => setActiveTab('overview')}
            style={{ padding: '0.5rem 1.5rem', fontSize: '0.9rem', backgroundColor: activeTab === 'overview' ? '' : 'transparent', color: activeTab === 'overview' ? '' : 'var(--color-text-muted)' }}
          >
            <BarChart3 size={18} /> Visão Geral
          </button>
          <button 
            className={`btn ${activeTab === 'students' ? 'btn-primary' : ''}`}
            onClick={() => setActiveTab('students')}
            style={{ padding: '0.5rem 1.5rem', fontSize: '0.9rem', backgroundColor: activeTab === 'students' ? '' : 'transparent', color: activeTab === 'students' ? '' : 'var(--color-text-muted)' }}
          >
            <Users size={18} /> Por Aluno
          </button>
          <button 
            className={`btn ${activeTab === 'bncc' ? 'btn-primary' : ''}`}
            onClick={() => setActiveTab('bncc')}
            style={{ padding: '0.5rem 1.5rem', fontSize: '0.9rem', backgroundColor: activeTab === 'bncc' ? '' : 'transparent', color: activeTab === 'bncc' ? '' : 'var(--color-text-muted)' }}
          >
            <Activity size={18} /> Mapeamento BNCC
          </button>
        </div>

        {activeTab === 'overview' && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <div className="card p-6" style={{ borderLeft: '4px solid var(--color-primary)' }}>
                <p className="text-muted mb-1" style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase' }}>Aproveitamento Médio</p>
                <h3 style={{ fontSize: '2rem', margin: 0 }}>{Math.round(avgScore)}%</h3>
                <div className="mt-2 flex items-center gap-1 text-success" style={{ fontSize: '0.8rem' }}>
                  <TrendingUp size={14} /> +12% em relação ao simulado
                </div>
              </div>
              <div className="card p-6" style={{ borderLeft: '4px solid #10b981' }}>
                <p className="text-muted mb-1" style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase' }}>Nível de Domínio</p>
                <h3 style={{ fontSize: '2rem', margin: 0 }}>Satisfatório</h3>
                <p className="text-muted mt-1" style={{ fontSize: '0.8rem' }}>Maioria da turma acima de 70%</p>
              </div>
              <div className="card p-6" style={{ borderLeft: '4px solid #f59e0b' }}>
                <p className="text-muted mb-1" style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase' }}>Habilidades Críticas</p>
                <h3 style={{ fontSize: '2rem', margin: 0 }}>02</h3>
                <p className="text-muted mt-1" style={{ fontSize: '0.8rem' }}>Necessitam de reforço imediato</p>
              </div>
              <div className="card p-6" style={{ borderLeft: '4px solid #ef4444' }}>
                <p className="text-muted mb-1" style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase' }}>Alunos em Alerta</p>
                <h3 style={{ fontSize: '2rem', margin: 0 }}>01</h3>
                <p className="text-muted mt-1" style={{ fontSize: '0.8rem' }}>Abaixo de 50% de acertos</p>
              </div>
            </div>

            {isAdmin && (
              <div className="card p-6 mb-8" style={{ borderTop: '4px solid var(--color-primary)' }}>
                <h4 className="mb-4">Comparativo Geral: Aproveitamento por Turma</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {managedClasses.filter(c => c.evaluationType === 'numeric').map((c, i) => (
                    <div key={c.id}>
                      <div className="flex justify-between mb-2">
                        <span style={{ fontWeight: 600 }}>{c.name}</span>
                        <span style={{ color: i === 0 ? 'var(--color-success)' : 'var(--color-text-muted)', fontWeight: 700 }}>
                          {85 - (i * 12)}% {i === 0 && '🏆'}
                        </span>
                      </div>
                      <div style={{ width: '100%', height: '12px', backgroundColor: '#f1f5f9', borderRadius: '6px', overflow: 'hidden' }}>
                        <div style={{ 
                          width: `${85 - (i * 12)}%`, 
                          height: '100%', 
                          backgroundColor: i === 0 ? 'var(--color-success)' : 'var(--color-primary)',
                          transition: 'width 1s ease'
                        }}></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {activeTab === 'students' && (
          <div className="card p-6 animate-fade-in">
            <div className="flex justify-between items-center mb-6">
              <h4 style={{ margin: 0 }}>Panorama Individual por Aluno</h4>
              <div style={{ position: 'relative' }}>
                <Search size={18} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
                <input 
                  type="text" 
                  placeholder="Buscar aluno..." 
                  style={{ paddingLeft: '2.5rem', width: '250px', fontSize: '0.9rem' }}
                />
              </div>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8fafc', textAlign: 'left' }}>
                    <th style={{ padding: '1rem' }}>Aluno</th>
                    <th style={{ padding: '1rem', textAlign: 'center' }}>Pontuação</th>
                    <th style={{ padding: '1rem', textAlign: 'center' }}>Desempenho</th>
                    <th style={{ padding: '1rem', textAlign: 'right' }}>Ação</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map(s => {
                    const answers = studentAnswers[s.id] || {};
                    const correctCount = Object.values(answers).filter(v => v).length;
                    const percent = (correctCount / selectedAssessment.questions.length) * 100;
                    const getLevel = (p: number) => {
                      if (p >= 90) return { label: 'Excelente', color: '#10b981' };
                      if (p >= 70) return { label: 'Bom', color: '#3b82f6' };
                      if (p >= 50) return { label: 'Regular', color: '#f59e0b' };
                      return { label: 'Crítico', color: '#ef4444' };
                    };
                    const level = getLevel(percent);
                    
                    return (
                      <tr key={s.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                        <td style={{ padding: '1rem', fontWeight: 600 }}>{s.name}</td>
                        <td style={{ padding: '1rem', textAlign: 'center' }}>{correctCount} / {selectedAssessment.questions.length}</td>
                        <td style={{ padding: '1rem', textAlign: 'center' }}>
                          <span style={{ 
                            backgroundColor: level.color + '20', 
                            color: level.color,
                            padding: '0.25rem 0.75rem',
                            borderRadius: '20px',
                            fontSize: '0.75rem',
                            fontWeight: 700
                          }}>
                            {level.label}
                          </span>
                        </td>
                        <td style={{ padding: '1rem', textAlign: 'right' }}>
                          <button className="btn btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}>Ver Detalhes</button>
                        </td>
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
              {selectedAssessment.questions.map(q => (
                <div key={q.id} className="p-4 rounded-lg border border-border bg-slate-50">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-primary)' }}>{q.skill}</div>
                      <div style={{ fontWeight: 600 }}>{q.theme}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '1.2rem', fontWeight: 800 }}>75%</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--color-success)' }}>Domínio Alto</div>
                    </div>
                  </div>
                  <div style={{ width: '100%', height: '8px', backgroundColor: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ width: '75%', height: '100%', backgroundColor: 'var(--color-success)' }}></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8">

          <div className="lg:col-span-2">
            {!result ? (
              <div className="card p-12 text-center flex flex-col items-center justify-center" style={{ minHeight: '400px', backgroundColor: '#f8fafc', border: '2px dashed #cbd5e1' }}>
                <div style={{ backgroundColor: 'rgba(10, 115, 255, 0.1)', padding: '2rem', borderRadius: '50%', marginBottom: '1.5rem' }}>
                  <Brain size={64} color="var(--color-primary)" />
                </div>
                <h3 className="mb-4">Análise Diagnóstica Profunda</h3>
                <p className="text-muted mb-8" style={{ maxWidth: '450px' }}>
                  Nossa Inteligência Pedagógica pode gerar um relatório completo analisando o desempenho individual e sugerindo estratégias específicas para cada habilidade da BNCC.
                </p>
                <button 
                  className="btn btn-primary py-4 px-8" 
                  onClick={handleGenerateAI}
                  disabled={loading}
                >
                  {loading ? (
                    <> <Loader2 size={24} className="animate-spin" /> Processando Dados... </>
                  ) : (
                    <> <Sparkles size={24} /> Gerar Relatório de Inteligência IA </>
                  )}
                </button>
              </div>
            ) : (
              <div className="card p-8 animate-fade-in" style={{ backgroundColor: 'white' }}>
                <div className="flex items-center gap-4 mb-6 pb-4" style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <Brain size={32} color="var(--color-primary)" />
                  <h3 style={{ margin: 0 }}>Diagnóstico da Inteligência Pedagógica</h3>
                </div>
                <div style={{ whiteSpace: 'pre-wrap', lineHeight: '1.7', color: '#334155', fontSize: '1rem' }}>
                  {result}
                </div>
              </div>
            )}
          </div>

          <div className="lg:col-span-1">
            <div className="card p-6 mb-6">
              <h4 className="mb-4 flex items-center gap-2"><PieChart size={18} color="var(--color-secondary)" /> Desempenho por Tema</h4>
              <div className="flex flex-col gap-4">
                {selectedAssessment.questions.map(q => (
                  <div key={q.id}>
                    <div className="flex justify-between mb-1" style={{ fontSize: '0.85rem' }}>
                      <span style={{ fontWeight: 600 }}>{q.theme}</span>
                      <span className="text-muted">75%</span>
                    </div>
                    <div style={{ width: '100%', height: '8px', backgroundColor: '#f1f5f9', borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{ width: '75%', height: '100%', backgroundColor: 'var(--color-primary)' }}></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="card p-6" style={{ backgroundColor: '#fff7ed', border: '1px solid #ffedd5' }}>
              <h4 className="mb-4 flex items-center gap-2" style={{ color: '#9a3412' }}><AlertCircle size={18} /> Alerta Pedagógico</h4>
              <p style={{ fontSize: '0.9rem', color: '#c2410c' }}>
                A habilidade <strong>EF35LP04 (Pontuação)</strong> apresentou o menor índice de acerto (42%). Recomendamos retomar este conteúdo com agrupamentos produtivos.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="pedagogical-intelligence">
      <div className="mb-8">
        <h1 className="flex items-center gap-3">
          <div style={{ backgroundColor: 'var(--color-primary)', color: 'white', padding: '0.75rem', borderRadius: '12px' }}>
            <Brain size={32} />
          </div>
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
        .badge { display: inline-block; }
      `}</style>
    </div>
  );
}
