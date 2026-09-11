import { useState, useMemo } from 'react';
import { Plus, Edit2, Trash2, GraduationCap, Check, X, Layers, BarChart, User } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';
import { useSchool } from '../contexts/SchoolContext';
import { createClass, updateClass, deleteClass } from '../data';
import type { ClassGroup, SchoolLevel, EvaluationType } from '../types/db';

const LETTERS = ['A', 'B', 'C', 'D', 'E'];

interface FormState {
  level: SchoolLevel;
  series: string;
  letter: string;
  evaluation_type: EvaluationType;
  homeroom_teacher_id: string;
}

export function ClassManagement() {
  const { user } = useAuth();
  const { school, classes, selectedYear, staff, grading, refreshClasses } = useSchool();
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const canManage = user?.role === 'admin' || user?.role === 'coordinator';

  // Coordenação só mexe no próprio segmento (null = a escola toda).
  const allowedLevels = useMemo<SchoolLevel[]>(() => {
    if (user?.role === 'admin') return ['infantil', 'fundamental'];
    if (user?.role === 'coordinator') return user.managed_level ? [user.managed_level] : ['infantil', 'fundamental'];
    return [];
  }, [user]);

  const emptyForm = (): FormState => {
    const level = allowedLevels[0] ?? 'infantil';
    return {
      level,
      series: grading.series[level][0] ?? '',
      letter: 'A',
      evaluation_type: level === 'infantil' ? 'report' : 'numeric',
      homeroom_teacher_id: '',
    };
  };

  const [formData, setFormData] = useState<FormState>(emptyForm);

  const teachers = useMemo(() => staff.filter(u => u.role === 'teacher' && u.active), [staff]);

  if (!canManage) {
    return (
      <div className="card p-12 text-center">
        <X size={48} className="mb-4 mx-auto" color="#ef4444" />
        <h2>Acesso Negado</h2>
        <p className="text-muted">Você não tem permissão para gerenciar turmas.</p>
      </div>
    );
  }

  if (!selectedYear || !school) {
    return <div className="card text-center"><p className="text-muted">Crie um ano letivo em Configurações antes de cadastrar turmas.</p></div>;
  }

  const handleSave = async () => {
    if (!formData.series || !formData.letter) return;
    const name = `${formData.series.toUpperCase()} ${formData.letter}`;
    setSaving(true);
    try {
      const payload = {
        name,
        series: formData.series,
        letter: formData.letter,
        level: formData.level,
        evaluation_type: formData.evaluation_type,
        homeroom_teacher_id: formData.homeroom_teacher_id || null,
      };
      if (editingId) {
        await updateClass(editingId, payload);
        toast.success('Turma atualizada.');
      } else {
        await createClass({ ...payload, school_id: school.id, year_id: selectedYear.id });
        toast.success('Turma criada.');
      }
      refreshClasses();
      setIsAdding(false);
      setEditingId(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Falha ao salvar a turma.');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (c: ClassGroup) => {
    setEditingId(c.id);
    setFormData({
      level: c.level,
      series: c.series,
      letter: c.letter,
      evaluation_type: c.evaluation_type,
      homeroom_teacher_id: c.homeroom_teacher_id ?? '',
    });
    setIsAdding(true);
  };

  const handleDelete = async (c: ClassGroup) => {
    if (!window.confirm(`Excluir a turma ${c.name}? As matrículas, frequências e notas dela serão apagadas.`)) return;
    try {
      await deleteClass(c.id);
      refreshClasses();
      toast.success('Turma excluída.');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Falha ao excluir.');
    }
  };

  const openNew = () => { setFormData(emptyForm()); setEditingId(null); setIsAdding(true); };

  const visibleClasses = classes.filter(c => allowedLevels.includes(c.level));

  return (
    <div className="class-management">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 style={{ margin: 0 }}>Gestão de Turmas</h2>
          <p className="text-muted">Ano letivo {selectedYear.label} · segmentos e métodos de avaliação</p>
        </div>
        <button className="btn btn-primary" onClick={openNew}>
          <Plus size={20} /> Nova Turma
        </button>
      </div>

      {isAdding && (
        <div className="card p-6 mb-8 animate-fade-in" style={{ borderTop: '4px solid var(--color-primary)' }}>
          <h3 className="mb-6">{editingId ? 'Editar Turma' : 'Cadastrar Nova Turma'}</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
            <div>
              <label>Segmento</label>
              <select
                value={formData.level}
                onChange={e => {
                  const level = e.target.value as SchoolLevel;
                  setFormData({ ...formData, level, series: grading.series[level][0] ?? '', evaluation_type: level === 'infantil' ? 'report' : 'numeric' });
                }}
              >
                {allowedLevels.includes('infantil') && <option value="infantil">Educação Infantil</option>}
                {allowedLevels.includes('fundamental') && <option value="fundamental">Ensino Fundamental</option>}
              </select>
            </div>
            <div>
              <label>Série / Nível</label>
              <select value={formData.series} onChange={e => setFormData({ ...formData, series: e.target.value })}>
                {grading.series[formData.level].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label>Turma (Letra)</label>
              <select value={formData.letter} onChange={e => setFormData({ ...formData, letter: e.target.value })}>
                {LETTERS.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
            <div>
              <label>Professor Regente</label>
              <select value={formData.homeroom_teacher_id} onChange={e => setFormData({ ...formData, homeroom_teacher_id: e.target.value })}>
                <option value="">Selecione um professor</option>
                {teachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
            <div>
              <label>Tipo de Avaliação</label>
              <select value={formData.evaluation_type} onChange={e => setFormData({ ...formData, evaluation_type: e.target.value as EvaluationType })}>
                <option value="report">Relatório Descritivo (IA)</option>
                <option value="numeric">Notas Numéricas ({grading.policy.scale.min}-{grading.policy.scale.max})</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-8">
            <button className="btn btn-secondary" onClick={() => setIsAdding(false)}>Cancelar</button>
            <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
              <Check size={20} /> {editingId ? 'Atualizar Turma' : 'Salvar Turma'}
            </button>
          </div>
        </div>
      )}

      {visibleClasses.length === 0 && (
        <div className="card text-center p-12">
          <GraduationCap size={40} style={{ opacity: 0.3, margin: '0 auto 1rem' }} />
          <p className="text-muted">Nenhuma turma cadastrada em {selectedYear.label}.</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {visibleClasses.map(c => {
          const classTeacher = teachers.find(t => t.id === c.homeroom_teacher_id);
          return (
            <div key={c.id} className="card p-6 hover-scale transition-all">
              <div className="flex justify-between items-start mb-4">
                <div style={{ backgroundColor: c.level === 'infantil' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(0,0,0,0.05)', padding: '0.75rem', borderRadius: '12px' }}>
                  {c.level === 'infantil' ? <Layers size={24} color="#10b981" /> : <GraduationCap size={24} color="var(--color-primary)" />}
                </div>
                <div className="flex gap-2">
                  <button className="icon-btn" onClick={() => handleEdit(c)}><Edit2 size={18} /></button>
                  <button className="icon-btn text-error" onClick={() => handleDelete(c)}><Trash2 size={18} /></button>
                </div>
              </div>

              <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '1.2rem' }}>{c.name}</h4>

              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2 text-muted" style={{ fontSize: '0.85rem' }}>
                  <span style={{
                    padding: '0.2rem 0.6rem', borderRadius: '4px',
                    backgroundColor: c.level === 'infantil' ? '#C6EFCE' : '#D0E1FD',
                    color: c.level === 'infantil' ? '#166534' : '#084298',
                    fontSize: '0.7rem', fontWeight: 700,
                  }}>
                    {c.level === 'infantil' ? 'INFANTIL' : 'FUNDAMENTAL'}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-muted" style={{ fontSize: '0.85rem' }}>
                  <BarChart size={16} />
                  <span>{c.evaluation_type === 'report' ? 'Relatórios Descritivos' : 'Notas Numéricas'}</span>
                </div>
                <div className="flex items-center gap-2 text-muted" style={{ fontSize: '0.85rem' }}>
                  <User size={16} />
                  <span style={{ fontWeight: classTeacher ? 600 : 400, color: classTeacher ? 'var(--color-primary)' : 'inherit' }}>
                    {classTeacher ? classTeacher.name : 'Nenhum professor vinculado'}
                  </span>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-200 flex justify-between items-center">
                <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Ano {selectedYear.label}</span>
                <div onClick={() => handleEdit(c)} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-primary)', cursor: 'pointer' }}>
                  {classTeacher ? 'Alterar Professor' : 'Vincular Professor'} <Plus size={14} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <style>{`
        .hover-scale:hover { transform: translateY(-4px); box-shadow: var(--shadow-lg); }
        .icon-btn { background: transparent; border: none; padding: 0.5rem; cursor: pointer; color: #64748b; border-radius: 8px; transition: all 0.2s; }
        .icon-btn:hover { background: #f1f5f9; color: var(--color-primary); }
        .icon-btn.text-error:hover { background: #fef2f2; color: #ef4444; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fade-in { animation: fadeIn 0.3s ease-out; }
      `}</style>
    </div>
  );
}
