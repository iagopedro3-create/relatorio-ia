import { useState } from 'react';
import { HeartPulse, Pencil, Plus, Check, X, AlertTriangle, ThumbsUp, Stethoscope, Users, Trash2, Share2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';
import { useSchool } from '../contexts/SchoolContext';
import { useAsync } from '../lib/useAsync';
import { getStudentHealth, upsertStudentHealth, listIncidents, createIncident, updateIncident, deleteIncident } from '../data';
import { formatDate } from '../lib/format';
import { Badge, SkeletonCard, useConfirm } from './ui';
import type { BadgeTone } from './ui';
import type { EmergencyContact, IncidentKind, StudentHealth, StudentIncident } from '../types/db';

export const INCIDENT_KIND: Record<IncidentKind, { label: string; tone: BadgeTone; icon: React.ReactNode }> = {
  ocorrencia: { label: 'Ocorrência', tone: 'warning', icon: <AlertTriangle size={12} /> },
  elogio: { label: 'Elogio', tone: 'success', icon: <ThumbsUp size={12} /> },
  saude: { label: 'Saúde', tone: 'danger', icon: <Stethoscope size={12} /> },
  acidente: { label: 'Acidente', tone: 'danger', icon: <AlertTriangle size={12} /> },
  atendimento: { label: 'Atendimento à família', tone: 'primary', icon: <Users size={12} /> },
};

const EMPTY_HEALTH = { allergies: '', medications: '', dietary: '', conditions: '', blood_type: '', health_plan: '', pediatrician: '', notes: '' };

/** Ficha de saúde do aluno: leitura para quem cuida, edição pela gestão. */
export function HealthCard({ studentId, classId }: { studentId: string; classId?: string | null }) {
  const { user } = useAuth();
  const { school } = useSchool();
  const canEdit = user?.role === 'admin' || user?.role === 'coordinator';
  const healthQ = useAsync(() => getStudentHealth(studentId), [studentId], null);
  const [editing, setEditing] = useState(false);
  void classId;

  if (healthQ.loading) return <SkeletonCard lines={4} />;
  const h = healthQ.data;
  const hasAlert = Boolean(h?.allergies || h?.medications || h?.dietary || h?.conditions);
  const contacts = (h?.emergency_contacts ?? []) as EmergencyContact[];

  if (editing && school) {
    return <HealthEditor schoolId={school.id} studentId={studentId} initial={h} onDone={() => { setEditing(false); void healthQ.reload(); }} />;
  }

  return (
    <div className="card p-5" style={hasAlert ? { borderColor: 'var(--color-danger-border)' } : undefined}>
      <div className="flex justify-between items-center mb-3">
        <h4 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}><HeartPulse size={18} color="var(--color-danger)" /> Saúde e cuidado</h4>
        {canEdit && <button className="btn btn-ghost" onClick={() => setEditing(true)} title="Editar"><Pencil size={14} /></button>}
      </div>
      {!h && <p className="text-muted" style={{ fontSize: '0.85rem', margin: 0 }}>Nenhuma informação de saúde registrada.{canEdit ? ' Preencha alergias, medicações e contatos de emergência.' : ''}</p>}
      {h && (
        <div style={{ fontSize: '0.85rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {h.allergies && <div><span className="badge badge-danger">Alergias</span><div style={{ marginTop: 2 }}>{h.allergies}</div></div>}
          {h.medications && <div><span className="badge badge-warning">Medicação</span><div style={{ marginTop: 2 }}>{h.medications}</div></div>}
          {h.dietary && <div><span className="badge badge-warning">Alimentação</span><div style={{ marginTop: 2 }}>{h.dietary}</div></div>}
          {h.conditions && <div><span className="badge badge-neutral">Condições</span><div style={{ marginTop: 2 }}>{h.conditions}</div></div>}
          {(h.blood_type || h.health_plan || h.pediatrician) && <div className="text-muted" style={{ fontSize: '0.8rem' }}>{[h.blood_type && `Sangue ${h.blood_type}`, h.health_plan && `Plano ${h.health_plan}`, h.pediatrician && `Pediatra ${h.pediatrician}`].filter(Boolean).join(' · ')}</div>}
          {contacts.length > 0 && (
            <div>
              <span className="text-muted" style={{ fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 700 }}>Emergência</span>
              {contacts.map((c, i) => <div key={i}><strong>{c.name}</strong>{c.relation ? ` (${c.relation})` : ''} · <a href={`tel:${c.phone.replace(/\D/g, '')}`} style={{ color: 'var(--color-primary)' }}>{c.phone}</a></div>)}
            </div>
          )}
          {h.notes && <p className="text-muted" style={{ margin: 0, fontSize: '0.8rem' }}>{h.notes}</p>}
        </div>
      )}
    </div>
  );
}

function HealthEditor({ schoolId, studentId, initial, onDone }: { schoolId: string; studentId: string; initial: StudentHealth | null; onDone: () => void }) {
  const { user } = useAuth();
  const [f, setF] = useState({ ...EMPTY_HEALTH, ...Object.fromEntries(Object.entries(initial ?? {}).filter(([k, v]) => k in EMPTY_HEALTH && typeof v === 'string')) });
  const [contacts, setContacts] = useState<EmergencyContact[]>((initial?.emergency_contacts as EmergencyContact[] | undefined)?.length ? (initial!.emergency_contacts as EmergencyContact[]) : [{ name: '', phone: '', relation: '' }]);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      await upsertStudentHealth({
        school_id: schoolId, student_id: studentId,
        ...Object.fromEntries(Object.entries(f).map(([k, v]) => [k, (v as string).trim() || null])),
        emergency_contacts: contacts.filter(c => c.name.trim() && c.phone.trim()),
        updated_by: user?.id ?? null,
      });
      toast.success('Ficha de saúde salva.');
      onDone();
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Falha.'); } finally { setSaving(false); }
  };

  const field = (k: keyof typeof EMPTY_HEALTH, label: string, placeholder?: string) => (
    <div><label style={{ fontSize: '0.75rem' }}>{label}</label><input type="text" value={f[k]} placeholder={placeholder} onChange={e => setF({ ...f, [k]: e.target.value })} style={{ padding: '0.45rem 0.6rem', fontSize: '0.85rem' }} /></div>
  );

  return (
    <div className="card p-5">
      <h4 style={{ margin: '0 0 0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><HeartPulse size={18} color="var(--color-danger)" /> Saúde e cuidado</h4>
      <div className="flex flex-col gap-2">
        {field('allergies', 'Alergias', 'Ex.: amendoim, dipirona')}
        {field('medications', 'Medicação em uso', 'Nome, dose, horário')}
        {field('dietary', 'Restrições alimentares')}
        {field('conditions', 'Condições de saúde', 'Ex.: asma, epilepsia')}
        <div className="grid grid-cols-3 gap-2">{field('blood_type', 'Sangue')}{field('health_plan', 'Plano')}{field('pediatrician', 'Pediatra')}</div>
        <label style={{ fontSize: '0.75rem', margin: '0.25rem 0 0' }}>Contatos de emergência</label>
        {contacts.map((c, i) => (
          <div key={i} className="grid grid-cols-[1fr_1fr_0.7fr_auto] gap-1">
            <input type="text" placeholder="Nome" value={c.name} onChange={e => setContacts(contacts.map((x, j) => j === i ? { ...x, name: e.target.value } : x))} style={{ padding: '0.4rem 0.5rem', fontSize: '0.8rem' }} />
            <input type="text" placeholder="Telefone" value={c.phone} onChange={e => setContacts(contacts.map((x, j) => j === i ? { ...x, phone: e.target.value } : x))} style={{ padding: '0.4rem 0.5rem', fontSize: '0.8rem' }} />
            <input type="text" placeholder="Parentesco" value={c.relation ?? ''} onChange={e => setContacts(contacts.map((x, j) => j === i ? { ...x, relation: e.target.value } : x))} style={{ padding: '0.4rem 0.5rem', fontSize: '0.8rem' }} />
            <button className="btn btn-ghost" onClick={() => setContacts(contacts.filter((_, j) => j !== i))} title="Remover"><X size={14} /></button>
          </div>
        ))}
        <button className="btn btn-secondary btn-sm" style={{ alignSelf: 'flex-start' }} onClick={() => setContacts([...contacts, { name: '', phone: '', relation: '' }])}><Plus size={14} /> Contato</button>
        {field('notes', 'Observações')}
      </div>
      <div className="flex justify-end gap-2 mt-3">
        <button className="btn btn-secondary btn-sm" onClick={onDone}>Cancelar</button>
        <button className="btn btn-primary btn-sm" disabled={saving} onClick={() => void save()}><Check size={14} /> Salvar</button>
      </div>
    </div>
  );
}

/** Ocorrências do aluno: registro pela equipe, "ciente" da família. */
export function IncidentsCard({ studentId, classId }: { studentId: string; classId?: string | null }) {
  const { user } = useAuth();
  const { school, staff } = useSchool();
  const askConfirm = useConfirm();
  const q = useAsync(() => school ? listIncidents({ schoolId: school.id, studentId }) : Promise.resolve([]), [school?.id, studentId], []);
  const [showForm, setShowForm] = useState(false);
  const [f, setF] = useState<{ kind: IncidentKind; title: string; description: string; date: string; share: boolean }>({ kind: 'ocorrencia', title: '', description: '', date: new Date().toISOString().slice(0, 10), share: false });
  const [saving, setSaving] = useState(false);
  const isStaff = user?.role !== 'guardian';

  const save = async () => {
    if (!school || !user) return;
    if (!f.title.trim()) { toast.error('Dê um título à ocorrência.'); return; }
    setSaving(true);
    try {
      await createIncident({ school_id: school.id, student_id: studentId, class_id: classId ?? null, author_id: user.id, date: f.date, kind: f.kind, title: f.title.trim(), description: f.description.trim() || null, share_with_family: f.share });
      await q.reload();
      setShowForm(false);
      setF({ kind: 'ocorrencia', title: '', description: '', date: new Date().toISOString().slice(0, 10), share: false });
      toast.success('Ocorrência registrada.');
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Falha.'); } finally { setSaving(false); }
  };

  const remove = async (i: StudentIncident) => {
    if (!(await askConfirm({ title: 'Excluir esta ocorrência?', danger: true }))) return;
    try { await deleteIncident(i.id); await q.reload(); } catch (e) { toast.error(e instanceof Error ? e.message : 'Falha.'); }
  };

  const ack = async (i: StudentIncident) => {
    try { await updateIncident(i.id, { family_ack_at: new Date().toISOString() }); await q.reload(); toast.success('Registrado como ciente.'); }
    catch (e) { toast.error(e instanceof Error ? e.message : 'Falha.'); }
  };

  return (
    <div className="card p-0" style={{ overflow: 'hidden' }}>
      <div className="p-5 border-b border-slate-200 flex justify-between items-center" style={{ backgroundColor: 'var(--color-surface-2)' }}>
        <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1rem' }}><AlertTriangle size={18} color="var(--color-warning)" /> Ocorrências</h3>
        {isStaff && <button className="btn btn-primary btn-sm" onClick={() => setShowForm(v => !v)}><Plus size={14} /> Registrar</button>}
      </div>
      {showForm && (
        <div className="p-5 border-b border-slate-200">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
            <div><label style={{ fontSize: '0.75rem' }}>Tipo</label><select value={f.kind} onChange={e => setF({ ...f, kind: e.target.value as IncidentKind })} style={{ padding: '0.45rem 0.6rem', fontSize: '0.85rem' }}>{(Object.keys(INCIDENT_KIND) as IncidentKind[]).map(k => <option key={k} value={k}>{INCIDENT_KIND[k].label}</option>)}</select></div>
            <div><label style={{ fontSize: '0.75rem' }}>Data</label><input type="date" value={f.date} onChange={e => setF({ ...f, date: e.target.value })} style={{ padding: '0.45rem 0.6rem', fontSize: '0.85rem' }} /></div>
            <div><label style={{ fontSize: '0.75rem' }}>Título</label><input type="text" value={f.title} placeholder="Ex.: Mordeu colega na roda" onChange={e => setF({ ...f, title: e.target.value })} style={{ padding: '0.45rem 0.6rem', fontSize: '0.85rem' }} /></div>
          </div>
          <textarea value={f.description} rows={3} placeholder="O que aconteceu, o que foi feito, quem foi avisado." onChange={e => setF({ ...f, description: e.target.value })} style={{ minHeight: 70, fontSize: '0.9rem' }} />
          <div className="flex items-center gap-3 mt-2 flex-wrap">
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0, fontSize: '0.85rem', fontWeight: 500, cursor: 'pointer' }}><input type="checkbox" checked={f.share} onChange={e => setF({ ...f, share: e.target.checked })} /> <Share2 size={14} /> Mostrar à família (pede "ciente")</label>
            <div className="flex gap-2" style={{ marginLeft: 'auto' }}>
              <button className="btn btn-secondary btn-sm" onClick={() => setShowForm(false)}>Cancelar</button>
              <button className="btn btn-primary btn-sm" disabled={saving} onClick={() => void save()}><Check size={14} /> Salvar</button>
            </div>
          </div>
        </div>
      )}
      <div className="p-5">
        {q.loading ? <SkeletonCard lines={3} className="border-none p-0" /> : q.data.length === 0 ? (
          <p className="text-muted" style={{ margin: 0, fontSize: '0.875rem' }}>Nenhuma ocorrência registrada.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {q.data.map(i => {
              const k = INCIDENT_KIND[i.kind];
              return (
                <div key={i.id} style={{ borderLeft: `3px solid var(--color-${k.tone === 'neutral' ? 'border' : k.tone})`, paddingLeft: '0.75rem' }}>
                  <div className="flex items-center gap-2 flex-wrap" style={{ fontSize: '0.75rem', color: 'var(--color-text-subtle)' }}>
                    <Badge tone={k.tone}>{k.icon} {k.label}</Badge>
                    <span>{formatDate(i.date)}</span>
                    <span>{staff.find(u => u.id === i.author_id)?.name?.split(' ')[0]}</span>
                    {i.share_with_family && <Badge tone={i.family_ack_at ? 'success' : 'warning'}>{i.family_ack_at ? `ciente em ${new Date(i.family_ack_at).toLocaleDateString('pt-BR')}` : 'aguardando ciente'}</Badge>}
                    {isStaff && (user?.role !== 'teacher' || i.author_id === user.id) && <button className="btn btn-ghost danger" style={{ marginLeft: 'auto' }} onClick={() => void remove(i)} title="Excluir"><Trash2 size={13} /></button>}
                  </div>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem', marginTop: 2 }}>{i.title}</div>
                  {i.description && <p style={{ margin: '0.15rem 0 0', fontSize: '0.85rem', lineHeight: 1.5, color: 'var(--color-text-muted)' }}>{i.description}</p>}
                  {!isStaff && i.share_with_family && !i.family_ack_at && <button className="btn btn-primary btn-sm mt-2" onClick={() => void ack(i)}><Check size={14} /> Estou ciente</button>}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
