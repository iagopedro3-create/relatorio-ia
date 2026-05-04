import { useState } from 'react';
import { Plus, Edit2, Trash2, User as UserIcon, Check, X } from 'lucide-react';
import { mockUsers, mockClasses } from '../store/mockDb';
import type { User } from '../store/mockDb';

import { useAuth } from '../contexts/AuthContext';

export function UserManagement() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>(mockUsers);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<User>>({
    name: '',
    username: '',
    password: '',
    role: 'teacher',
    managedLevel: 'fundamental',
    classId: ''
  });

  const canManage = currentUser?.role === 'admin' || currentUser?.role === 'coordinator';

  if (!canManage) {
    return (
      <div className="card p-12 text-center">
        <X size={48} className="text-error mb-4 mx-auto" />
        <h2>Acesso Restrito</h2>
        <p className="text-muted">Apenas a Direção ou Coordenação pode gerenciar usuários e hierarquias.</p>
      </div>
    );
  }

  const handleSave = () => {
    if (!formData.name || !formData.username || (!editingId && !formData.password)) {
      alert('Preencha nome, usuário e senha.');
      return;
    }

    if (editingId) {
      setUsers(prev => prev.map(u => u.id === editingId ? { ...u, ...formData } as User : u));
      setEditingId(null);
    } else {
      const newUser: User = {
        id: `u${Date.now()}`,
        name: formData.name || '',
        username: formData.username || '',
        password: formData.password || '',
        role: formData.role as any,
        managedLevel: formData.role === 'coordinator' ? (formData.managedLevel as any) : undefined,
        classId: formData.role === 'teacher' ? formData.classId : undefined
      };
      setUsers(prev => [...prev, newUser]);
    }

    setFormData({ name: '', username: '', password: '', role: 'teacher', managedLevel: 'fundamental', classId: '' });
    setIsAdding(false);
  };

  const handleEdit = (u: User) => {
    setEditingId(u.id);
    setFormData(u);
    setIsAdding(true);
  };

  const handleDelete = (id: string) => {
    if (id === currentUser.id) {
      alert('Você não pode excluir seu próprio usuário!');
      return;
    }
    if (window.confirm('Tem certeza que deseja excluir este usuário?')) {
      setUsers(prev => prev.filter(u => u.id !== id));
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin': return { label: 'DIREÇÃO', color: '#9333ea', bg: '#f3e8ff' };
      case 'coordinator': return { label: 'COORDENAÇÃO', color: 'var(--color-primary)', bg: '#eff6ff' };
      case 'teacher': return { label: 'PROFESSOR', color: 'var(--color-secondary)', bg: '#f0fdf4' };
      default: return { label: role, color: '#64748b', bg: '#f1f5f9' };
    }
  };

  return (
    <div className="user-management">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 style={{ margin: 0 }}>Gestão de Usuários</h2>
          <p className="text-muted">Controle de acessos e níveis de hierarquia do sistema</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setIsAdding(true); setEditingId(null); setFormData({ name: '', username: '', password: '', role: 'teacher', managedLevel: 'fundamental', classId: '' }); }}>
          <Plus size={20} /> Novo Usuário
        </button>
      </div>

      {isAdding && (
        <div className="card p-6 mb-8 border-primary animate-fade-in" style={{ borderTop: '4px solid var(--color-primary)' }}>
          <h3 className="mb-6">{editingId ? 'Editar Usuário' : 'Cadastrar Novo Usuário'}</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label>Nome Completo</label>
              <input 
                type="text" 
                value={formData.name} 
                onChange={e => setFormData({...formData, name: e.target.value})}
                placeholder="Ex: João da Silva"
              />
            </div>
            <div>
              <label>Usuário de Acesso</label>
              <input 
                type="text"
                value={formData.username || ''} 
                onChange={e => setFormData({...formData, username: e.target.value})}
                placeholder="Ex: joao.silva"
              />
            </div>
            <div>
              <label>{editingId ? 'Nova Senha (deixe em branco para manter)' : 'Senha de Acesso'}</label>
              <input 
                type="password"
                value={formData.password || ''} 
                onChange={e => setFormData({...formData, password: e.target.value})}
                placeholder={editingId ? '••••••••' : 'Mínimo 6 caracteres'}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-4">
            <div>
              <label>Nível de Hierarquia</label>
              <select 
                value={formData.role} 
                onChange={e => setFormData({...formData, role: e.target.value as any})}
              >
                <option value="admin">Direção (Acesso Total)</option>
                <option value="coordinator">Coordenação (Acesso por Segmento)</option>
                <option value="teacher">Professor (Acesso por Turma)</option>
              </select>
            </div>

            {formData.role === 'coordinator' && (
              <div>
                <label>Segmento Gerenciado</label>
                <select 
                  value={formData.managedLevel} 
                  onChange={e => setFormData({...formData, managedLevel: e.target.value as any})}
                >
                  <option value="all">Todos os Segmentos</option>
                  <option value="infantil">Apenas Educação Infantil</option>
                  <option value="fundamental">Apenas Ensino Fundamental</option>
                </select>
              </div>
            )}

            {formData.role === 'teacher' && (
              <div>
                <label>Vincular à Turma</label>
                <select 
                  value={formData.classId} 
                  onChange={e => setFormData({...formData, classId: e.target.value})}
                >
                  <option value="">Selecione uma turma</option>
                  {mockClasses.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
          <div className="flex justify-end gap-3 mt-8">
            <button className="btn btn-secondary" onClick={() => setIsAdding(false)}>Cancelar</button>
            <button className="btn btn-primary" onClick={handleSave}>
              <Check size={20} /> {editingId ? 'Atualizar' : 'Salvar Usuário'}
            </button>
          </div>
        </div>
      )}

      <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid var(--color-border)' }}>
              <th style={{ padding: '1rem', textAlign: 'left' }}>Usuário</th>
              <th style={{ padding: '1rem', textAlign: 'left' }}>Login</th>
              <th style={{ padding: '1rem', textAlign: 'center' }}>Nível</th>
              <th style={{ padding: '1rem', textAlign: 'left' }}>Escopo de Acesso</th>
              <th style={{ padding: '1rem', textAlign: 'right' }}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => {
              const role = getRoleBadge(u.role);
              const scopeLabel = u.role === 'admin' 
                ? 'Acesso Total (Escola)' 
                : u.role === 'coordinator' 
                ? `Coordenador: ${u.managedLevel === 'all' ? 'Todos os Níveis' : u.managedLevel === 'infantil' ? 'Ed. Infantil' : 'Ens. Fundamental'}`
                : `Professor: ${mockClasses.find(c => c.id === u.classId)?.name || 'Sem turma'}`;

              return (
                <tr key={u.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                  <td style={{ padding: '1rem' }}>
                    <div className="flex items-center gap-3">
                      <div style={{ backgroundColor: role.bg, color: role.color, padding: '0.5rem', borderRadius: '50%', flexShrink: 0 }}>
                        <UserIcon size={20} />
                      </div>
                      <span style={{ fontWeight: 600 }}>{u.name}</span>
                    </div>
                  </td>
                  <td style={{ padding: '1rem', color: '#64748b', fontSize: '0.85rem', fontFamily: 'monospace' }}>
                    {u.username}
                  </td>
                  <td style={{ padding: '1rem', textAlign: 'center' }}>
                    <span style={{ 
                      padding: '0.25rem 0.75rem', borderRadius: '20px', fontSize: '0.7rem', fontWeight: 700,
                      backgroundColor: role.bg, color: role.color
                    }}>
                      {role.label}
                    </span>
                  </td>
                  <td style={{ padding: '1rem', color: '#64748b', fontSize: '0.9rem' }}>
                    {scopeLabel}
                  </td>
                  <td style={{ padding: '1rem', textAlign: 'right' }}>
                    <div className="flex justify-end gap-2">
                      <button className="icon-btn" onClick={() => handleEdit(u)}><Edit2 size={18} /></button>
                      <button className="icon-btn text-error" onClick={() => handleDelete(u.id)}><Trash2 size={18} /></button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <style>{`
        .icon-btn { background: transparent; border: none; padding: 0.5rem; cursor: pointer; color: #64748b; border-radius: 8px; transition: all 0.2s; }
        .icon-btn:hover { background: #f1f5f9; color: var(--color-primary); }
        .icon-btn.text-error:hover { background: #fef2f2; color: #ef4444; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fade-in { animation: fadeIn 0.3s ease-out; }
      `}</style>
    </div>
  );
}
