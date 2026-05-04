import { useState, useMemo, useEffect } from 'react';
import { Plus, Edit2, Trash2, GraduationCap, Check, X, Layers, BarChart, User } from 'lucide-react';
import { mockClasses, mockUsers } from '../store/mockDb';
import type { ClassGroup } from '../store/mockDb';
import { useAuth } from '../contexts/AuthContext';
import { useYear } from '../contexts/YearContext';

const SERIES_OPTIONS = {
  infantil: ['Ninho', 'Grupo 2', 'Grupo 3', 'Grupo 4', 'Grupo 5'],
  fundamental: ['1º Ano', '2º Ano', '3º Ano', '4º Ano', '5º Ano']
};

const LETTERS = ['A', 'B', 'C', 'D', 'E'];

export function ClassManagement() {
  const { user } = useAuth();
  const { selectedYear } = useYear();
  const [classes, setClasses] = useState<ClassGroup[]>(mockClasses);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState<Partial<ClassGroup>>({
    series: 'Ninho',
    letter: 'A',
    level: 'infantil',
    evaluationType: 'report',
    teacherId: ''
  });

  const canManage = user?.role === 'admin' || user?.role === 'coordinator';

  // Restriction logic: Coordinators only manage their segment
  const allowedLevels = useMemo(() => {
    if (user?.role === 'admin') return ['infantil', 'fundamental'];
    if (user?.role === 'coordinator') {
      if (user.managedLevel === 'all') return ['infantil', 'fundamental'];
      return [user.managedLevel];
    }
    return [];
  }, [user]);

  // Update level and series when opening add form if restricted
  useEffect(() => {
    if (isAdding && !editingId) {
      const defaultLevel = allowedLevels[0] as 'infantil' | 'fundamental';
      if (formData.level !== defaultLevel) {
        setFormData(prev => ({
          ...prev,
          level: defaultLevel,
          series: SERIES_OPTIONS[defaultLevel][0],
          evaluationType: defaultLevel === 'infantil' ? 'report' : 'numeric'
        }));
      }
    }
  }, [isAdding, editingId, allowedLevels]);

  const teachers = useMemo(() => 
    mockUsers.filter(u => u.role === 'teacher'), 
    []
  );

  if (!canManage) {
    return (
      <div className="card p-12 text-center">
        <X size={48} className="text-error mb-4 mx-auto" />
        <h2>Acesso Negado</h2>
        <p className="text-muted">Você não tem permissão para gerenciar turmas.</p>
      </div>
    );
  }

  const handleSave = () => {
    if (!formData.series || !formData.letter) return;

    const className = `${formData.series.toUpperCase()} ${formData.letter}`;

    if (editingId) {
      setClasses(prev => prev.map(c => c.id === editingId ? { ...c, ...formData, name: className } as ClassGroup : c));
      setEditingId(null);
    } else {
      const newClass: ClassGroup = {
        id: `c${Date.now()}`,
        yearId: selectedYear.id,
        name: className,
        series: formData.series!,
        letter: formData.letter!,
        level: formData.level as 'infantil' | 'fundamental',
        evaluationType: formData.evaluationType as 'report' | 'numeric',
        teacherId: formData.teacherId
      };
      setClasses(prev => [...prev, newClass]);
    }

    setIsAdding(false);
  };

  const handleEdit = (c: ClassGroup) => {
    setEditingId(c.id);
    setFormData(c);
    setIsAdding(true);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir esta turma?')) {
      setClasses(prev => prev.filter(c => c.id !== id));
    }
  };

  return (
    <div className="class-management">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 style={{ margin: 0 }}>Gestão de Turmas</h2>
          <p className="text-muted">Administração de níveis escolares e métodos de avaliação</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setIsAdding(true); setEditingId(null); }}>
          <Plus size={20} /> Nova Turma
        </button>
      </div>

      {isAdding && (
        <div className="card p-6 mb-8 border-primary animate-fade-in" style={{ borderTop: '4px solid var(--color-primary)' }}>
          <h3 className="mb-6">{editingId ? 'Editar Turma' : 'Cadastrar Nova Turma'}</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
            <div>
              <label>Segmento</label>
              <select 
                value={formData.level} 
                onChange={e => {
                  const val = e.target.value as 'infantil' | 'fundamental';
                  setFormData({
                    ...formData, 
                    level: val, 
                    series: SERIES_OPTIONS[val][0],
                    evaluationType: val === 'infantil' ? 'report' : 'numeric'
                  });
                }}
              >
                {allowedLevels.includes('infantil') && <option value="infantil">Educação Infantil</option>}
                {allowedLevels.includes('fundamental') && <option value="fundamental">Ensino Fundamental</option>}
              </select>
            </div>
            <div>
              <label>Série / Nível</label>
              <select 
                value={formData.series} 
                onChange={e => setFormData({...formData, series: e.target.value})}
              >
                {SERIES_OPTIONS[formData.level as 'infantil' | 'fundamental'].map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div>
              <label>Turma (Letra)</label>
              <select 
                value={formData.letter} 
                onChange={e => setFormData({...formData, letter: e.target.value})}
              >
                {LETTERS.map(l => (
                  <option key={l} value={l}>{l}</option>
                ))}
              </select>
            </div>
            <div>
              <label>Professor Responsável</label>
              <select 
                value={formData.teacherId} 
                onChange={e => setFormData({...formData, teacherId: e.target.value})}
              >
                <option value="">Selecione um professor</option>
                {teachers.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label>Tipo de Avaliação</label>
              <select 
                value={formData.evaluationType} 
                onChange={e => setFormData({...formData, evaluationType: e.target.value as any})}
              >
                <option value="report">Relatório Descritivo (IA)</option>
                <option value="numeric">Notas Numéricas (0-100)</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-8">
            <button className="btn btn-secondary" onClick={() => setIsAdding(false)}>Cancelar</button>
            <button className="btn btn-primary" onClick={handleSave}>
              <Check size={20} /> {editingId ? 'Atualizar Turma' : 'Salvar Turma'}
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {classes.map(c => {
          const classTeacher = teachers.find(t => t.id === c.teacherId);
          return (
            <div key={c.id} className="card p-6 hover-scale transition-all">
              <div className="flex justify-between items-start mb-4">
                <div style={{ backgroundColor: c.level === 'infantil' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(10, 115, 255, 0.1)', padding: '0.75rem', borderRadius: '12px' }}>
                  {c.level === 'infantil' ? <Layers size={24} color="#10b981" /> : <GraduationCap size={24} color="var(--color-primary)" />}
                </div>
                <div className="flex gap-2">
                  <button className="icon-btn" onClick={() => handleEdit(c)}><Edit2 size={18} /></button>
                  <button className="icon-btn text-error" onClick={() => handleDelete(c.id)}><Trash2 size={18} /></button>
                </div>
              </div>
              
              <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '1.2rem' }}>{c.name}</h4>
              
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2 text-muted" style={{ fontSize: '0.85rem' }}>
                  <span className={`badge ${c.level === 'infantil' ? 'badge-success' : 'badge-primary'}`} style={{ 
                    padding: '0.2rem 0.6rem', 
                    borderRadius: '4px', 
                    backgroundColor: c.level === 'infantil' ? '#C6EFCE' : '#D0E1FD',
                    color: c.level === 'infantil' ? '#166534' : '#084298',
                    fontSize: '0.7rem',
                    fontWeight: 700
                  }}>
                    {c.level === 'infantil' ? 'INFANTIL' : 'FUNDAMENTAL'}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-muted" style={{ fontSize: '0.85rem' }}>
                  <BarChart size={16} />
                  <span>{c.evaluationType === 'report' ? 'Relatórios Descritivos' : 'Notas Numéricas'}</span>
                </div>
                <div className="flex items-center gap-2 text-muted" style={{ fontSize: '0.85rem' }}>
                  <User size={16} />
                  <span style={{ fontWeight: classTeacher ? 600 : 400, color: classTeacher ? 'var(--color-primary)' : 'inherit' }}>
                    {classTeacher ? classTeacher.name : 'Nenhum professor vinculado'}
                  </span>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-border flex justify-between items-center">
                <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Status: Ativa</span>
                <div 
                  onClick={() => handleEdit(c)}
                  style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-primary)', cursor: 'pointer' }}
                >
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
