import { useState } from 'react';
import { BookOpen, Plus, Calendar } from 'lucide-react';
import { mockLessons } from '../store/mockDb';
import { useAuth } from '../contexts/AuthContext';

export function Lessons() {
  const { user } = useAuth();
  const [lessons, setLessons] = useState(mockLessons);
  const [newLesson, setNewLesson] = useState({
    date: new Date().toISOString().split('T')[0],
    subject: '',
    content: '',
    observations: ''
  });

  const handleAdd = () => {
    if (!newLesson.subject || !newLesson.content) return;
    
    const lesson = {
      id: Math.random().toString(36).substr(2, 9),
      classId: user?.classId || 'c1',
      ...newLesson
    };
    
    setLessons([lesson, ...lessons]);
    setNewLesson({
      date: new Date().toISOString().split('T')[0],
      subject: '',
      content: '',
      observations: ''
    });
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 style={{ margin: 0 }}>Diário de Classe: Conteúdos</h2>
          <p className="text-muted">Registro de aulas ministradas</p>
        </div>
      </div>

      <div className="grid grid-cols-2" style={{ gridTemplateColumns: 'minmax(0, 0.7fr) minmax(0, 1.3fr)', gap: '2rem' }}>
        <div className="left-panel">
          <div className="card">
            <h3 className="mb-4 flex items-center gap-2"><Plus size={20} color="var(--color-primary)" /> Novo Registro</h3>
            <div className="form-group">
              <label>Data</label>
              <input 
                type="date" 
                value={newLesson.date} 
                onChange={e => setNewLesson({...newLesson, date: e.target.value})} 
              />
            </div>
            <div className="form-group">
              <label>Disciplina / Componente</label>
              <input 
                type="text" 
                placeholder="Ex: Língua Portuguesa"
                value={newLesson.subject} 
                onChange={e => setNewLesson({...newLesson, subject: e.target.value})} 
              />
            </div>
            <div className="form-group">
              <label>Conteúdo Ministrado</label>
              <textarea 
                placeholder="Descreva o conteúdo da aula..."
                value={newLesson.content} 
                onChange={e => setNewLesson({...newLesson, content: e.target.value})} 
                style={{ minHeight: '150px' }}
              />
            </div>
            <div className="form-group">
              <label>Observações (Opcional)</label>
              <input 
                type="text" 
                placeholder="Ex: Todos os alunos concluíram"
                value={newLesson.observations} 
                onChange={e => setNewLesson({...newLesson, observations: e.target.value})} 
              />
            </div>
            <button onClick={handleAdd} className="btn btn-primary w-full">
              Salvar Registro no Diário
            </button>
          </div>
        </div>

        <div className="right-panel">
          <div className="card" style={{ padding: '1.5rem' }}>
            <h3 className="mb-6 flex items-center gap-2"><BookOpen size={20} color="var(--color-secondary)" /> Histórico de Conteúdos</h3>
            
            <div className="flex flex-col gap-4">
              {lessons.map(lesson => (
                <div key={lesson.id} style={{ padding: '1.5rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--color-bg)' }}>
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-primary)', textTransform: 'uppercase' }}>
                        {lesson.subject}
                      </span>
                      <h4 style={{ margin: '0.25rem 0', color: 'var(--color-text)' }}>{new Date(lesson.date).toLocaleDateString('pt-BR')}</h4>
                    </div>
                    <Calendar size={18} className="text-muted" />
                  </div>
                  <p style={{ margin: 0, fontSize: '0.95rem', lineHeight: '1.5' }}>{lesson.content}</p>
                  {lesson.observations && (
                    <p style={{ marginTop: '0.75rem', fontSize: '0.85rem', fontStyle: 'italic', color: 'var(--color-text-muted)' }}>
                      Obs: {lesson.observations}
                    </p>
                  )}
                </div>
              ))}
              {lessons.length === 0 && <p className="text-muted text-center py-8">Nenhum conteúdo registrado ainda.</p>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
