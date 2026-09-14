import { useMemo, useState } from 'react';
import { ClipboardCheck, Plus, Check, X, Trash2, Users } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';
import { useSchool } from '../contexts/SchoolContext';
import { useAsync } from '../lib/useAsync';
import { listAuthorizations, createAuthorization, updateAuthorization, deleteAuthorization, listAuthorizationResponses, respondAuthorization, listStudents, listEnrollments } from '../data';
import { formatDate } from '../lib/format';
import { Badge, EmptyState, SkeletonCard, useConfirm } from './ui';
import type { BadgeTone } from './ui';
import type { Authorization, AuthorizationKind, Student } from '../types/db';

const KIND: Record<AuthorizationKind, { label: string; tone: BadgeTone }> = {
  passeio: { label: 'Passeio', tone: 'primary' },
  imagem: { label: 'Uso de imagem', tone: 'secondary' },
  medicacao: { label: 'Medicação', tone: 'danger' },
  saida: { label: 'Saída antecipada', tone: 'warning' },
  outro: { label: 'Outro', tone: 'neutral' },
};

/**
 * Autorizações digitais (passeio, imagem, medicação). A gestão publica para
 * turmas ou alunos; a família aceita ou recusa por filho, com registro de
 * quem, quando e de que dispositivo.
 */
export function AuthorizationsTab() {
  const { user } = useAuth();
  const { school, classes } = useSchool();
  const askConfirm = useConfirm();
  const isGuardian = user?.role === 'guardian';
  const isManager = user?.role === 'admin' || user?.role === 'coordinator';

  const authQ = useAsync(() => school ? listAuthorizations(school.id) : Promise.resolve([]), [school?.id], []);
  const respQ = useAsync(() => school ? listAuthorizationResponses(school.id) : Promise.resolve([]), [school?.id], []);
  const studentsQ = useAsync(() => school ? listStudents(school.id) : Promise.resolve([] as Student[]), [school?.id], [] as Student[]);
  const classIds = useMemo(() => classes.map(c => c.id), [classes]);
  const enrollQ = useAsync(() => listEnrollments(classIds), [classIds.join(',')], []);

  const [showNew, setShowNew] = useState(false);
  const [f, setF] = useState<{ kind: AuthorizationKind; title: string; description: string; class_ids: string[]; deadline: string; event_date: string }>({ kind: 'passeio', title: '', description: '', class_ids: [], deadline: '', event_date: '' });
  const [saving, setSaving] = useState(false);

  // Alunos alcançados por uma autorização (turmas escolhidas ou toda a escola).
  const reach = (a: Authorization) => {
    const inClasses = enrollQ.data.filter(e => e.active && (a.class_ids.length === 0 || a.class_ids.includes(e.class_id))).map(e => e.student_id);
    const ids = new Set([...inClasses, ...a.student_ids]);
    return studentsQ.data.filter(s => ids.has(s.id));
  };

  const create = async () => {
    if (!school || !user) return;
    if (!f.title.trim() || !f.description.trim()) { toast.error('Título e texto da autorização são obrigatórios.'); return; }
    setSaving(true);
    try {
      await createAuthorization({ school_id: school.id, kind: f.kind, title: f.title.trim(), description: f.description.trim(), class_ids: f.class_ids, deadline: f.deadline || null, event_date: f.event_date || null, created_by: user.id });
      await authQ.reload();
      setShowNew(false);
      setF({ kind: 'passeio', title: '', description: '', class_ids: [], deadline: '', event_date: '' });
      toast.success('Autorização publicada para as famílias.');
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Falha.'); } finally { setSaving(false); }
  };

  const remove = async (a: Authorization) => {
    if (!(await askConfirm({ title: `Excluir "${a.title}"?`, description: 'As respostas das famílias também serão apagadas.', danger: true }))) return;
    try { await deleteAuthorization(a.id); await authQ.reload(); } catch (e) { toast.error(e instanceof Error ? e.message : 'Falha.'); }
  };

  const close = async (a: Authorization) => {
    try { await updateAuthorization(a.id, { active: false }); await authQ.reload(); toast.success('Autorização encerrada.'); } catch (e) { toast.error(e instanceof Error ? e.message : 'Falha.'); }
  };

  const respond = async (a: Authorization, studentId: string, accepted: boolean) => {
    if (!school || !user) return;
    try {
      await respondAuthorization({ authorization_id: a.id, student_id: studentId, school_id: school.id, profile_id: user.id, accepted, user_agent: navigator.userAgent.slice(0, 200) });
      await respQ.reload();
      toast.success(accepted ? 'Autorização registrada.' : 'Recusa registrada.');
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Falha.'); }
  };

  const chip = (on: boolean): React.CSSProperties => ({ padding: '0.3rem 0.7rem', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', border: on ? '2px solid var(--color-primary)' : '2px solid var(--color-border)', backgroundColor: on ? 'var(--color-primary-soft)' : 'white', color: on ? 'var(--color-primary)' : 'var(--color-text-muted)', fontFamily: 'inherit' });

  const loading = authQ.loading || respQ.loading || studentsQ.loading || enrollQ.loading;
  const active = authQ.data.filter(a => a.active);
  const closed = authQ.data.filter(a => !a.active);

  return (
    <div>
      {isManager && (
        <div className="flex justify-end mb-4">
          <button className="btn btn-primary btn-sm" onClick={() => setShowNew(v => !v)}><Plus size={16} /> Nova autorização</button>
        </div>
      )}
      {showNew && isManager && (
        <div className="card card-accent mb-6">
          <h3 style={{ fontSize: '1rem', margin: '0 0 1rem' }}>Nova autorização</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-3">
            <div><label style={{ fontSize: '0.8rem' }}>Tipo</label><select value={f.kind} onChange={e => setF({ ...f, kind: e.target.value as AuthorizationKind })}>{(Object.keys(KIND) as AuthorizationKind[]).map(k => <option key={k} value={k}>{KIND[k].label}</option>)}</select></div>
            <div className="md:col-span-3"><label style={{ fontSize: '0.8rem' }}>Título</label><input type="text" value={f.title} placeholder="Ex.: Passeio ao Zoológico — 25/10" onChange={e => setF({ ...f, title: e.target.value })} /></div>
          </div>
          <label style={{ fontSize: '0.8rem' }}>Texto que a família vai aceitar</label>
          <textarea value={f.description} rows={4} placeholder="Autorizo meu(minha) filho(a) a participar do passeio ao Zoológico no dia 25/10, das 8h às 13h, com transporte fretado e acompanhamento das professoras…" onChange={e => setF({ ...f, description: e.target.value })} />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
            <div><label style={{ fontSize: '0.8rem' }}>Data do evento</label><input type="date" value={f.event_date} onChange={e => setF({ ...f, event_date: e.target.value })} /></div>
            <div><label style={{ fontSize: '0.8rem' }}>Prazo de resposta</label><input type="date" value={f.deadline} onChange={e => setF({ ...f, deadline: e.target.value })} /></div>
          </div>
          <p className="text-muted mt-3" style={{ fontSize: '0.8rem', margin: '0.75rem 0 0.4rem' }}>Turmas (nenhuma marcada = toda a escola)</p>
          <div className="flex flex-wrap gap-2">
            {classes.map(c => <button key={c.id} type="button" style={chip(f.class_ids.includes(c.id))} onClick={() => setF({ ...f, class_ids: f.class_ids.includes(c.id) ? f.class_ids.filter(x => x !== c.id) : [...f.class_ids, c.id] })}>{c.name}</button>)}
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <button className="btn btn-secondary btn-sm" onClick={() => setShowNew(false)}>Cancelar</button>
            <button className="btn btn-primary btn-sm" disabled={saving} onClick={() => void create()}><Check size={14} /> Publicar</button>
          </div>
        </div>
      )}

      {loading ? <SkeletonCard lines={3} /> : authQ.data.length === 0 ? (
        <div className="card"><EmptyState icon={<ClipboardCheck size={36} />} title="Nenhuma autorização" description={isGuardian ? 'Quando a escola pedir uma autorização (passeio, imagem, medicação), ela aparece aqui para você aceitar.' : 'Publique a primeira: passeio, uso de imagem, medicação.'} /></div>
      ) : (
        <div className="flex flex-col gap-4">
          {[...active, ...closed].map(a => {
            const k = KIND[a.kind];
            const students = reach(a);
            const responses = respQ.data.filter(r => r.authorization_id === a.id);
            const accepted = responses.filter(r => r.accepted).length;
            const refused = responses.filter(r => !r.accepted).length;
            const pending = students.length - responses.length;
            return (
              <div key={a.id} className="card" style={{ opacity: a.active ? 1 : 0.7 }}>
                <div className="flex justify-between items-start gap-3 flex-wrap">
                  <div style={{ minWidth: 0 }}>
                    <div className="flex items-center gap-2 flex-wrap mb-1"><Badge tone={k.tone}>{k.label}</Badge>{!a.active && <Badge tone="neutral">encerrada</Badge>}{a.deadline && <span className="text-muted" style={{ fontSize: '0.75rem' }}>responder até {formatDate(a.deadline)}</span>}</div>
                    <h4 style={{ margin: 0, fontSize: '1rem' }}>{a.title}</h4>
                  </div>
                  {isManager && (
                    <div className="flex gap-1">
                      {a.active && <button className="btn btn-secondary btn-sm" onClick={() => void close(a)}>Encerrar</button>}
                      <button className="btn btn-ghost danger" onClick={() => void remove(a)} title="Excluir"><Trash2 size={14} /></button>
                    </div>
                  )}
                </div>
                <p style={{ margin: '0.6rem 0 0', fontSize: '0.9rem', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{a.description}</p>

                {isGuardian ? (
                  <div className="mt-3 flex flex-col gap-2">
                    {students.map(s => {
                      const r = responses.find(x => x.student_id === s.id);
                      return (
                        <div key={s.id} className="flex items-center gap-3 flex-wrap" style={{ padding: '0.6rem 0.8rem', background: 'var(--color-surface-2)', borderRadius: 'var(--radius-sm)' }}>
                          <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{s.name}</span>
                          {r ? (
                            <Badge tone={r.accepted ? 'success' : 'danger'}>{r.accepted ? 'autorizado' : 'recusado'} em {new Date(r.responded_at).toLocaleDateString('pt-BR')}</Badge>
                          ) : a.active ? (
                            <div className="flex gap-2" style={{ marginLeft: 'auto' }}>
                              <button className="btn btn-secondary btn-sm" onClick={() => void respond(a, s.id, false)}><X size={14} /> Não autorizo</button>
                              <button className="btn btn-primary btn-sm" onClick={() => void respond(a, s.id, true)}><Check size={14} /> Autorizo</button>
                            </div>
                          ) : <span className="text-muted" style={{ fontSize: '0.8rem' }}>sem resposta</span>}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="mt-3">
                    <div className="flex items-center gap-2 flex-wrap" style={{ fontSize: '0.8rem' }}>
                      <Users size={14} className="text-muted" /><span className="text-muted">{students.length} aluno(s)</span>
                      <Badge tone="success">{accepted} autorizado(s)</Badge>
                      {refused > 0 && <Badge tone="danger">{refused} recusa(s)</Badge>}
                      <Badge tone={pending > 0 ? 'warning' : 'neutral'}>{pending} sem resposta</Badge>
                    </div>
                    {pending > 0 && a.active && (
                      <details className="mt-2">
                        <summary style={{ cursor: 'pointer', fontSize: '0.8rem', color: 'var(--color-primary)', fontWeight: 600 }}>Ver quem não respondeu</summary>
                        <div className="flex flex-wrap gap-1 mt-2">{students.filter(s => !responses.some(r => r.student_id === s.id)).map(s => <span key={s.id} className="badge badge-neutral" style={{ textTransform: 'none', fontWeight: 500 }}>{s.name}</span>)}</div>
                      </details>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
