import { useEffect, useMemo, useState } from 'react';
import { Plus, Edit2, Trash2, User as UserIcon, Check, X, KeyRound, Ban, CheckCircle2, Copy } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';
import { useSchool } from '../contexts/SchoolContext';
import {
  createUser, userAction, setUserPassword, updateProfile, listStudents, listGuardians, setGuardianStudents,
  listAssignments, setAssignments,
} from '../data';
import type { Profile, Student, StudentGuardian, TeacherAssignment, UserRole } from '../types/db';

interface FormState {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  managed_level: '' | 'infantil' | 'fundamental';
  specialty: '' | 'english' | 'pe';
  student_ids: string[];
  class_ids: string[];
}

const EMPTY: FormState = { name: '', email: '', password: '', role: 'teacher', managed_level: '', specialty: '', student_ids: [], class_ids: [] };

const ROLE_BADGE: Record<UserRole, { label: string; color: string; bg: string }> = {
  admin: { label: 'DIREÇÃO', color: '#9333ea', bg: '#f3e8ff' },
  coordinator: { label: 'COORDENAÇÃO', color: 'var(--color-primary)', bg: '#eff6ff' },
  teacher: { label: 'PROFESSOR', color: 'var(--color-secondary)', bg: '#f0fdf4' },
  guardian: { label: 'RESPONSÁVEL', color: '#64748b', bg: '#f1f5f9' },
};

export function UserManagement() {
  const { user: currentUser } = useAuth();
  const { school, staff, classes, grading, refresh } = useSchool();
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormState>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [students, setStudents] = useState<Student[]>([]);
  const [guardians, setGuardians] = useState<StudentGuardian[]>([]);
  const [assignments, setAssignmentsState] = useState<TeacherAssignment[]>([]);
  const [revealed, setRevealed] = useState<{ email: string; password: string } | null>(null);

  const isAdmin = currentUser?.role === 'admin';
  const canView = isAdmin || currentUser?.role === 'coordinator';

  useEffect(() => {
    if (!school || !canView) return;
    listStudents(school.id).then(setStudents).catch(() => setStudents([]));
    listGuardians(school.id).then(setGuardians).catch(() => setGuardians([]));
    listAssignments(school.id).then(setAssignmentsState).catch(() => setAssignmentsState([]));
  }, [school, canView, staff]);

  const specialtySubject = useMemo(() => {
    const bySpecialty = { english: 'english', pe: 'pe' } as const;
    return (sp: 'english' | 'pe') => grading.subjects.find(s => s.taughtBy === bySpecialty[sp])?.id ?? sp;
  }, [grading]);

  if (!canView) {
    return (
      <div className="card p-12 text-center">
        <X size={48} className="mb-4 mx-auto" color="#ef4444" />
        <h2>Acesso Restrito</h2>
        <p className="text-muted">Apenas a Direção ou Coordenação pode ver os usuários.</p>
      </div>
    );
  }

  const openNew = () => { setFormData(EMPTY); setEditingId(null); setIsAdding(true); };

  const handleEdit = (u: Profile) => {
    setEditingId(u.id);
    setFormData({
      name: u.name,
      email: u.email,
      password: '',
      role: u.role,
      managed_level: u.managed_level ?? '',
      specialty: u.specialty ?? '',
      student_ids: guardians.filter(g => g.profile_id === u.id).map(g => g.student_id),
      class_ids: assignments.filter(a => a.teacher_id === u.id).map(a => a.class_id),
    });
    setIsAdding(true);
  };

  const handleSave = async () => {
    if (!school) return;
    if (!formData.name.trim() || !formData.email.trim()) { toast.error('Preencha nome e e-mail.'); return; }
    setSaving(true);
    try {
      const managed_level = formData.role === 'coordinator' && formData.managed_level ? formData.managed_level : null;
      const specialty = formData.role === 'teacher' && formData.specialty ? formData.specialty : null;

      let userId = editingId;
      if (editingId) {
        await updateProfile(editingId, { name: formData.name.trim(), role: formData.role, managed_level, specialty });
        if (formData.password.trim()) await setUserPassword(editingId, formData.password.trim());
        toast.success('Usuário atualizado.');
      } else {
        const res = await createUser({
          name: formData.name.trim(),
          email: formData.email.trim(),
          role: formData.role,
          managed_level,
          specialty,
          password: formData.password.trim() || undefined,
          student_ids: formData.role === 'guardian' ? formData.student_ids : undefined,
        });
        userId = res.user_id;
        if (res.initial_password) setRevealed({ email: formData.email.trim(), password: res.initial_password });
        toast.success('Usuário criado.');
      }

      if (userId && formData.role === 'guardian') {
        await setGuardianStudents(school.id, userId, formData.student_ids);
      }
      if (userId && formData.role === 'teacher' && specialty) {
        await setAssignments(school.id, userId, formData.class_ids, specialtySubject(specialty));
      }

      await refresh();
      setIsAdding(false);
      setEditingId(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Falha ao salvar.');
    } finally {
      setSaving(false);
    }
  };

  const run = async (label: string, fn: () => Promise<unknown>) => {
    try {
      await fn();
      await refresh();
      toast.success(label);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Falha na operação.');
    }
  };

  const handleDelete = (u: Profile) => {
    if (u.id === currentUser?.id) { toast.error('Você não pode excluir o próprio usuário.'); return; }
    if (!window.confirm(`Excluir ${u.name}? O acesso será removido permanentemente.`)) return;
    void run('Usuário excluído.', () => userAction('delete', u.id));
  };

  const scopeLabel = (u: Profile) => {
    if (u.role === 'admin') return 'Acesso total (escola)';
    if (u.role === 'coordinator') return `Coordena: ${u.managed_level === 'infantil' ? 'Ed. Infantil' : u.managed_level === 'fundamental' ? 'Ens. Fundamental' : 'Todos os segmentos'}`;
    if (u.role === 'teacher') {
      const homeroom = classes.filter(c => c.homeroom_teacher_id === u.id).map(c => c.name);
      const assigned = assignments.filter(a => a.teacher_id === u.id).map(a => classes.find(c => c.id === a.class_id)?.name).filter(Boolean);
      const sp = u.specialty === 'english' ? 'Inglês' : u.specialty === 'pe' ? 'Ed. Física' : 'Regente';
      const list = [...homeroom, ...assigned];
      return `${sp}${list.length ? `: ${list.join(', ')}` : ' · sem turma'}`;
    }
    const kids = guardians.filter(g => g.profile_id === u.id).map(g => students.find(s => s.id === g.student_id)?.name).filter(Boolean);
    return kids.length ? `Responsável por: ${kids.join(', ')}` : 'Sem aluno vinculado';
  };

  return (
    <div className="user-management">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 style={{ margin: 0 }}>Gestão de Usuários</h2>
          <p className="text-muted">Acessos e papéis da equipe e dos responsáveis</p>
        </div>
        {isAdmin && (
          <button className="btn btn-primary" onClick={openNew}>
            <Plus size={20} /> Novo Usuário
          </button>
        )}
      </div>

      {revealed && (
        <div className="card mb-6 p-5" style={{ borderLeft: '4px solid #10b981', backgroundColor: '#f0fdf4' }}>
          <div className="flex justify-between items-start gap-4">
            <div>
              <p style={{ margin: 0, fontWeight: 700, color: '#166534' }}>Senha inicial gerada — anote agora, ela não será exibida de novo.</p>
              <p style={{ margin: '0.5rem 0 0', fontFamily: 'monospace', fontSize: '1rem' }}>
                {revealed.email} · <strong>{revealed.password}</strong>
              </p>
            </div>
            <div className="flex gap-2">
              <button className="btn btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }} onClick={() => { void navigator.clipboard.writeText(`${revealed.email} / ${revealed.password}`); toast.success('Copiado.'); }}>
                <Copy size={14} /> Copiar
              </button>
              <button className="btn btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }} onClick={() => setRevealed(null)}><X size={14} /></button>
            </div>
          </div>
        </div>
      )}

      {isAdding && isAdmin && (
        <div className="card p-6 mb-8 animate-fade-in" style={{ borderTop: '4px solid var(--color-primary)' }}>
          <h3 className="mb-6">{editingId ? 'Editar Usuário' : 'Cadastrar Novo Usuário'}</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label>Nome Completo</label>
              <input type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="Ex: João da Silva" />
            </div>
            <div>
              <label>E-mail de acesso</label>
              <input type="email" value={formData.email} disabled={Boolean(editingId)} onChange={e => setFormData({ ...formData, email: e.target.value })} placeholder="joao@escola.com.br" />
            </div>
            <div>
              <label>{editingId ? 'Nova senha (opcional)' : 'Senha inicial (opcional)'}</label>
              <input type="password" value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} placeholder={editingId ? 'Deixe em branco para manter' : 'Em branco = gerar automaticamente'} />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-4">
            <div>
              <label>Papel</label>
              <select value={formData.role} onChange={e => setFormData({ ...formData, role: e.target.value as UserRole })}>
                <option value="admin">Direção (acesso total)</option>
                <option value="coordinator">Coordenação (por segmento)</option>
                <option value="teacher">Professor (por turma)</option>
                <option value="guardian">Responsável (portal da família)</option>
              </select>
            </div>

            {formData.role === 'coordinator' && (
              <div>
                <label>Segmento coordenado</label>
                <select value={formData.managed_level} onChange={e => setFormData({ ...formData, managed_level: e.target.value as FormState['managed_level'] })}>
                  <option value="">Todos os segmentos</option>
                  <option value="infantil">Apenas Educação Infantil</option>
                  <option value="fundamental">Apenas Ensino Fundamental</option>
                </select>
              </div>
            )}

            {formData.role === 'teacher' && (
              <div>
                <label>Atuação</label>
                <select value={formData.specialty} onChange={e => setFormData({ ...formData, specialty: e.target.value as FormState['specialty'] })}>
                  <option value="">Regente (vinculado pela turma)</option>
                  <option value="english">Especialista: Inglês</option>
                  <option value="pe">Especialista: Educação Física</option>
                </select>
              </div>
            )}
          </div>

          {formData.role === 'teacher' && formData.specialty && (
            <div className="mt-4">
              <label>Turmas atendidas</label>
              <div className="flex flex-wrap gap-2">
                {classes.map(c => {
                  const on = formData.class_ids.includes(c.id);
                  return (
                    <button key={c.id} type="button" onClick={() => setFormData(f => ({ ...f, class_ids: on ? f.class_ids.filter(id => id !== c.id) : [...f.class_ids, c.id] }))}
                      style={{ padding: '0.3rem 0.7rem', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', border: on ? '2px solid var(--color-primary)' : '2px solid #e2e8f0', backgroundColor: on ? '#eff6ff' : 'white', color: on ? 'var(--color-primary)' : '#64748b', fontFamily: 'inherit' }}>
                      {c.name}
                    </button>
                  );
                })}
                {classes.length === 0 && <span className="text-muted" style={{ fontSize: '0.85rem' }}>Cadastre turmas primeiro.</span>}
              </div>
              <p className="text-muted" style={{ fontSize: '0.8rem', marginTop: '0.5rem' }}>O regente é definido no cadastro da turma. Aqui só as turmas do especialista.</p>
            </div>
          )}

          {formData.role === 'guardian' && (
            <div className="mt-4">
              <label>Alunos sob responsabilidade</label>
              <div className="flex flex-wrap gap-2" style={{ maxHeight: '160px', overflowY: 'auto' }}>
                {students.map(s => {
                  const on = formData.student_ids.includes(s.id);
                  return (
                    <button key={s.id} type="button" onClick={() => setFormData(f => ({ ...f, student_ids: on ? f.student_ids.filter(id => id !== s.id) : [...f.student_ids, s.id] }))}
                      style={{ padding: '0.3rem 0.7rem', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', border: on ? '2px solid var(--color-primary)' : '2px solid #e2e8f0', backgroundColor: on ? '#eff6ff' : 'white', color: on ? 'var(--color-primary)' : '#64748b', fontFamily: 'inherit' }}>
                      {s.name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 mt-8">
            <button className="btn btn-secondary" onClick={() => setIsAdding(false)}>Cancelar</button>
            <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
              <Check size={20} /> {editingId ? 'Atualizar' : 'Salvar Usuário'}
            </button>
          </div>
        </div>
      )}

      <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid var(--color-border)' }}>
                <th style={{ padding: '1rem', textAlign: 'left' }}>Usuário</th>
                <th style={{ padding: '1rem', textAlign: 'left' }}>E-mail</th>
                <th style={{ padding: '1rem', textAlign: 'center' }}>Papel</th>
                <th style={{ padding: '1rem', textAlign: 'left' }}>Escopo</th>
                {isAdmin && <th style={{ padding: '1rem', textAlign: 'right' }}>Ações</th>}
              </tr>
            </thead>
            <tbody>
              {staff.map(u => {
                const role = ROLE_BADGE[u.role];
                return (
                  <tr key={u.id} style={{ borderBottom: '1px solid var(--color-border)', opacity: u.active ? 1 : 0.5 }}>
                    <td style={{ padding: '1rem' }}>
                      <div className="flex items-center gap-3">
                        <div style={{ backgroundColor: role.bg, color: role.color, padding: '0.5rem', borderRadius: '50%', flexShrink: 0 }}>
                          <UserIcon size={20} />
                        </div>
                        <div>
                          <span style={{ fontWeight: 600 }}>{u.name}</span>
                          {!u.active && <span style={{ marginLeft: '0.5rem', fontSize: '0.7rem', color: '#991b1b', fontWeight: 700 }}>INATIVO</span>}
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '1rem', color: '#64748b', fontSize: '0.85rem', fontFamily: 'monospace' }}>{u.email}</td>
                    <td style={{ padding: '1rem', textAlign: 'center' }}>
                      <span style={{ padding: '0.25rem 0.75rem', borderRadius: '20px', fontSize: '0.7rem', fontWeight: 700, backgroundColor: role.bg, color: role.color }}>{role.label}</span>
                    </td>
                    <td style={{ padding: '1rem', color: '#64748b', fontSize: '0.9rem' }}>{scopeLabel(u)}</td>
                    {isAdmin && (
                      <td style={{ padding: '1rem', textAlign: 'right' }}>
                        <div className="flex justify-end gap-1">
                          <button className="icon-btn" title="Editar" onClick={() => handleEdit(u)}><Edit2 size={17} /></button>
                          <button className="icon-btn" title="Enviar e-mail de redefinição de senha" onClick={() => void run('E-mail de redefinição enviado.', () => userAction('reset_password', u.id))}><KeyRound size={17} /></button>
                          {u.id !== currentUser?.id && (
                            u.active
                              ? <button className="icon-btn" title="Desativar acesso" onClick={() => void run('Acesso desativado.', () => userAction('deactivate', u.id))}><Ban size={17} /></button>
                              : <button className="icon-btn" title="Reativar acesso" onClick={() => void run('Acesso reativado.', () => userAction('activate', u.id))}><CheckCircle2 size={17} /></button>
                          )}
                          <button className="icon-btn text-error" title="Excluir" onClick={() => handleDelete(u)}><Trash2 size={17} /></button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
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
