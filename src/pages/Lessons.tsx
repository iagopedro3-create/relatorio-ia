import { useState } from 'react';
import { BookOpen, Plus, Calendar, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';
import { useSchool } from '../contexts/SchoolContext';
import { useAsync } from '../lib/useAsync';
import { listLessons, createLesson, deleteLesson } from '../data';
import { subjectsFor } from '../store/gradingConfig';

export function Lessons() {
  const { user } = useAuth();
  const { school, classes, grading } = useSchool();
  const [chosenClassId, setSelectedClassId] = useState('');
  const [saving, setSaving] = useState(false);
  const selectedClassId = classes.some(c => c.id === chosenClassId) ? chosenClassId : (classes[0]?.id ?? '');

  const currentClass = classes.find(c => c.id === selectedClassId);
  const isInfantil = currentClass?.level === 'infantil';

  // Especialista lança só a própria disciplina; regente vê as da turma. Infantil usa campos de experiência.
  const subjectOptions = isInfantil
    ? [{ id: 'vivencias', name: 'Vivências / Campos de experiência' }, { id: 'ing', name: 'Inglês' }, { id: 'ef', name: 'Ed. Física' }]
    : subjectsFor(user?.specialty ?? undefined).filter(s => grading.subjects.some(g => g.id === s.id)).map(s => ({ id: s.id, name: s.name }));

  const [newLesson, setNewLesson] = useState({ date: new Date().toISOString().split('T')[0], subject_id: '', content: '', observations: '' });
  const subjectId = subjectOptions.some(s => s.id === newLesson.subject_id) ? newLesson.subject_id : (subjectOptions[0]?.id ?? '');

  const lessonsQ = useAsync(() => selectedClassId ? listLessons(selectedClassId) : Promise.resolve([]), [selectedClassId], []);

  const subjectName = (id: string) => grading.subjects.find(s => s.id === id)?.name ?? subjectOptions.find(s => s.id === id)?.name ?? id;

  const handleAdd = async () => {
    if (!school || !user || !selectedClassId) return;
    if (!subjectId || !newLesson.content.trim()) { toast.error('Informe a disciplina e o conteúdo.'); return; }
    setSaving(true);
    try {
      await createLesson({
        school_id: school.id,
        class_id: selectedClassId,
        date: newLesson.date,
        subject_id: subjectId,
        content: newLesson.content.trim(),
        observations: newLesson.observations.trim() || null,
        created_by: user.id,
      });
      await lessonsQ.reload();
      setNewLesson(l => ({ ...l, content: '', observations: '' }));
      toast.success('Registro salvo no diário.');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Falha ao salvar.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Excluir este registro?')) return;
    try {
      await deleteLesson(id);
      await lessonsQ.reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Falha ao excluir.');
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 style={{ margin: 0 }}>Diário de Classe: Conteúdos</h2>
          <p className="text-muted">Registro de aulas ministradas</p>
        </div>
        {classes.length > 1 && (
          <select value={selectedClassId} onChange={e => setSelectedClassId(e.target.value)} style={{ width: '220px' }}>
            {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        )}
      </div>

      {classes.length === 0 && <div className="card text-center p-12"><p className="text-muted">Você não tem turma vinculada neste ano letivo.</p></div>}

      {classes.length > 0 && (
        <div className="grid grid-cols-2" style={{ gridTemplateColumns: 'minmax(0, 0.7fr) minmax(0, 1.3fr)', gap: '2rem' }}>
          <div className="left-panel">
            <div className="card">
              <h3 className="mb-4 flex items-center gap-2"><Plus size={20} color="var(--color-primary)" /> Novo Registro · {currentClass?.name}</h3>
              <div className="form-group">
                <label>Data</label>
                <input type="date" value={newLesson.date} onChange={e => setNewLesson({ ...newLesson, date: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Disciplina / Componente</label>
                <select value={subjectId} onChange={e => setNewLesson({ ...newLesson, subject_id: e.target.value })}>
                  {subjectOptions.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Conteúdo Ministrado</label>
                <textarea placeholder="Descreva o conteúdo da aula..." value={newLesson.content} onChange={e => setNewLesson({ ...newLesson, content: e.target.value })} style={{ minHeight: '150px' }} />
              </div>
              <div className="form-group">
                <label>Observações (Opcional)</label>
                <input type="text" placeholder="Ex: Todos os alunos concluíram" value={newLesson.observations} onChange={e => setNewLesson({ ...newLesson, observations: e.target.value })} />
              </div>
              <button onClick={() => void handleAdd()} className="btn btn-primary w-full" disabled={saving}>
                Salvar Registro no Diário
              </button>
            </div>
          </div>

          <div className="right-panel">
            <div className="card" style={{ padding: '1.5rem' }}>
              <h3 className="mb-6 flex items-center gap-2"><BookOpen size={20} color="var(--color-secondary)" /> Histórico de Conteúdos</h3>
              <div className="flex flex-col gap-4">
                {lessonsQ.loading && <p className="text-muted text-center py-8">Carregando...</p>}
                {lessonsQ.data.map(lesson => (
                  <div key={lesson.id} style={{ padding: '1.5rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--color-bg)' }}>
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-primary)', textTransform: 'uppercase' }}>{subjectName(lesson.subject_id)}</span>
                        <h4 style={{ margin: '0.25rem 0', color: 'var(--color-text)' }}>{new Date(lesson.date + 'T00:00:00').toLocaleDateString('pt-BR')}</h4>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar size={18} className="text-muted" />
                        {(lesson.created_by === user?.id || user?.role !== 'teacher') && (
                          <button onClick={() => void handleDelete(lesson.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444' }} title="Excluir"><Trash2 size={16} /></button>
                        )}
                      </div>
                    </div>
                    <p style={{ margin: 0, fontSize: '0.95rem', lineHeight: '1.5', whiteSpace: 'pre-wrap' }}>{lesson.content}</p>
                    {lesson.observations && (
                      <p style={{ marginTop: '0.75rem', fontSize: '0.85rem', fontStyle: 'italic', color: 'var(--color-text-muted)' }}>Obs: {lesson.observations}</p>
                    )}
                  </div>
                ))}
                {!lessonsQ.loading && lessonsQ.data.length === 0 && <p className="text-muted text-center py-8">Nenhum conteúdo registrado ainda.</p>}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
