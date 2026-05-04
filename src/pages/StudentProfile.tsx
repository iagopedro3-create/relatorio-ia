import { useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, FileText, Award, User, CalendarDays } from 'lucide-react';
import { mockStudents, mockClasses, mockReports, mockUsers } from '../store/mockDb';
import type { ClassGroup, Student, User as UserType, ReportRecord } from '../store/mockDb';

export function StudentProfile() {
  const { id } = useParams();
  const navigate = useNavigate();

  const student = mockStudents.find((s: Student) => s.id === id);
  const studentClass = mockClasses.find((c: ClassGroup) => c.id === student?.classId);

  // Historico de Relatórios (Mock)
  const studentReports = useMemo(() => {
    return mockReports
      .filter(r => r.studentId === id)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [id]);

  if (!student) {
    return (
      <div className="card p-12 text-center">
        <User size={48} style={{ opacity: 0.3, margin: '0 auto 1rem' }} />
        <h2>Aluno não encontrado</h2>
        <button className="btn btn-secondary mt-4" onClick={() => navigate('/students')}>Voltar para Lista</button>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-4 mb-6">
        <button 
          onClick={() => navigate(-1)}
          style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '0.5rem', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          className="hover:bg-slate-200 transition-colors"
        >
          <ArrowLeft size={20} color="#475569" />
        </button>
        <div>
          <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <User size={24} color="var(--color-primary)" />
            Perfil Escolar do Aluno
          </h2>
          <p className="text-muted">Histórico completo, relatórios e evolução pedagógica</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Coluna Esquerda: Informações e Resumo */}
        <div className="lg:col-span-1 flex flex-col gap-6">
          <div className="card p-6" style={{ background: 'linear-gradient(to bottom, #f8fafc, #ffffff)', borderTop: '4px solid var(--color-primary)' }}>
            <div style={{ width: '80px', height: '80px', borderRadius: '50%', backgroundColor: '#e2e8f0', color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', fontWeight: 800, margin: '0 auto 1rem' }}>
              {student.name.charAt(0)}
            </div>
            <h3 style={{ margin: '0 0 0.5rem 0', textAlign: 'center', fontSize: '1.25rem' }}>{student.name}</h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '2rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.5rem' }}>
                <span className="text-muted" style={{ fontSize: '0.85rem' }}>Turma Atual</span>
                <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>{studentClass?.name || 'Não alocado'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.5rem' }}>
                <span className="text-muted" style={{ fontSize: '0.85rem' }}>Nascimento</span>
                <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>{student.birthDate ? new Date(student.birthDate).toLocaleDateString('pt-BR', {timeZone:'UTC'}) : '—'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.5rem' }}>
                <span className="text-muted" style={{ fontSize: '0.85rem' }}>Responsável 1</span>
                <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>{student.parent1}</span>
              </div>
              {student.parent2 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.5rem' }}>
                  <span className="text-muted" style={{ fontSize: '0.85rem' }}>Responsável 2</span>
                  <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>{student.parent2}</span>
                </div>
              )}
            </div>
          </div>

          <div className="card p-5" style={{ backgroundColor: '#f0f9ff', border: '1px solid #bae6fd' }}>
            <h4 style={{ color: '#0369a1', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Award size={18} /> Resumo do Ano
            </h4>
            <p style={{ fontSize: '0.85rem', color: '#0c4a6e', lineHeight: 1.5 }}>
              Aluno apresenta excelente participação. Histórico de frequência regular. 
              Avaliações indicam ótimo desenvolvimento das competências de {studentClass?.level === 'infantil' ? 'coordenação e interação social' : 'leitura e raciocínio lógico'}.
            </p>
            <button className="btn btn-primary" style={{ width: '100%', marginTop: '1rem', padding: '0.6rem', fontSize: '0.85rem' }} onClick={() => navigate('/bulletin')}>
              Visualizar Boletim Completo
            </button>
          </div>
        </div>

        {/* Coluna Direita: Linha do Tempo e Relatórios */}
        <div className="lg:col-span-2">
          <div className="card p-0" style={{ overflow: 'hidden' }}>
            <div className="p-5 border-b border-border" style={{ backgroundColor: '#f8fafc' }}>
              <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <CalendarDays size={20} color="var(--color-primary)" />
                Linha do Tempo Pedagógica
              </h3>
            </div>
            
            <div className="p-6">
              {studentReports.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem 0', color: '#94a3b8' }}>
                  <FileText size={32} style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
                  <p>Nenhum relatório registrado no histórico deste aluno ainda.</p>
                </div>
              ) : (
                <div style={{ position: 'relative', paddingLeft: '1rem' }}>
                  {/* Linha vertical da timeline */}
                  <div style={{ position: 'absolute', top: 0, bottom: 0, left: '23px', width: '2px', backgroundColor: '#e2e8f0' }} />
                  
                  {studentReports.map((report: ReportRecord, idx: number) => {
                    const teacher = mockUsers.find((u: UserType) => u.id === report.teacherId);
                    return (
                      <div key={report.id} style={{ position: 'relative', marginBottom: idx === studentReports.length - 1 ? 0 : '2.5rem', paddingLeft: '2.5rem' }}>
                        {/* Ponto da timeline */}
                        <div style={{ 
                          position: 'absolute', left: '-5px', top: '4px', width: '14px', height: '14px', 
                          borderRadius: '50%', backgroundColor: 'var(--color-primary)', border: '3px solid white',
                          boxShadow: '0 0 0 1px var(--color-primary)'
                        }} />
                        
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                          <h4 style={{ margin: 0, fontSize: '1rem', color: '#1e293b' }}>Relatório Gerado por IA</h4>
                          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', backgroundColor: '#f1f5f9', padding: '0.2rem 0.6rem', borderRadius: '12px' }}>
                            {new Date(report.createdAt).toLocaleDateString('pt-BR', {timeZone: 'UTC'})}
                          </span>
                        </div>
                        
                        <div style={{ backgroundColor: '#f8fafc', padding: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                          <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '0.75rem' }}>
                            <div style={{ fontSize: '0.8rem', color: '#475569' }}>
                              <strong>Contexto:</strong> {report.context}
                            </div>
                            <div style={{ fontSize: '0.8rem', color: '#475569' }}>
                              <strong>Professor(a):</strong> {teacher?.name || 'Desconhecido'}
                            </div>
                          </div>
                          
                          <p style={{ fontSize: '0.85rem', color: '#334155', lineHeight: 1.6, margin: 0, fontStyle: 'italic' }}>
                            "O aluno demonstrou grande evolução neste período, participando ativamente das atividades propostas. 
                            Recomenda-se continuar estimulando o interesse através de metodologias ativas..."
                          </p>
                          
                          <div style={{ marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid #cbd5e1', display: 'flex', justifyContent: 'flex-end' }}>
                            <button className="btn btn-secondary" style={{ padding: '0.4rem 0.75rem', fontSize: '0.75rem' }}>
                              <FileText size={14} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} />
                              Visualizar Relatório Completo
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
