import { useState } from 'react';
import { Building2, Plus, RefreshCw, Copy, BarChart3, X } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';
import { useAsync } from '../lib/useAsync';
import { callApi } from '../lib/supabase';
import type { Plan, School, SchoolStatus } from '../types/db';

type Row = School & { students_count: number; users_count: number; ai_month: number };
interface ListResponse { schools: Row[]; plans: Plan[] }
interface UsageRow { feature: string; model: string; ok: boolean; input_tokens: number | null; output_tokens: number | null; latency_ms: number | null; created_at: string }

const STATUS: SchoolStatus[] = ['trial', 'active', 'past_due', 'suspended', 'canceled'];

/** Backoffice de quem opera a plataforma: provisionar escolas, plano, trial, status. */
export function PlatformAdmin() {
  const { isPlatformAdmin } = useAuth();
  const listQ = useAsync(() => callApi<ListResponse>('/api/platform/schools', undefined, { method: 'GET' }), [], { schools: [], plans: [] } as ListResponse);
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState({ name: '', slug: '', plan_id: 'trial', trial_days: 14, admin_name: '', admin_email: '', admin_password: '' });
  const [created, setCreated] = useState<{ email: string; password?: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [usageFor, setUsageFor] = useState<Row | null>(null);
  const [usage, setUsage] = useState<UsageRow[]>([]);

  if (!isPlatformAdmin) return <div className="card text-center"><p className="text-muted">Acesso restrito à operação da plataforma.</p></div>;

  const create = async () => {
    if (!form.name.trim() || !form.slug.trim() || !form.admin_name.trim() || !form.admin_email.trim()) { toast.error('Preencha nome, slug e o primeiro admin.'); return; }
    setSaving(true);
    try {
      const res = await callApi<{ initial_password?: string }>('/api/platform/schools', { action: 'create', ...form, admin_password: form.admin_password || undefined });
      setCreated({ email: form.admin_email, password: res.initial_password ?? form.admin_password });
      setShowNew(false);
      setForm({ name: '', slug: '', plan_id: 'trial', trial_days: 14, admin_name: '', admin_email: '', admin_password: '' });
      await listQ.reload();
      toast.success('Escola criada.');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Falha ao criar.');
    } finally {
      setSaving(false);
    }
  };

  const patch = async (school_id: string, p: Record<string, unknown>) => {
    try {
      await callApi('/api/platform/schools', { action: 'update', school_id, patch: p });
      await listQ.reload();
      toast.success('Atualizado.');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Falha ao atualizar.');
    }
  };

  const openUsage = async (row: Row) => {
    setUsageFor(row);
    try {
      const res = await callApi<{ usage: UsageRow[] }>('/api/platform/schools', { action: 'usage', school_id: row.id });
      setUsage(res.usage);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Falha.');
    }
  };

  const slugify = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Building2 size={24} /> Backoffice · Escolas</h2>
          <p className="text-muted">{listQ.data.schools.length} escola(s) na plataforma</p>
        </div>
        <div className="flex gap-2">
          <button className="btn btn-secondary" onClick={() => void listQ.reload()}><RefreshCw size={16} /></button>
          <button className="btn btn-primary" onClick={() => setShowNew(v => !v)}><Plus size={18} /> Nova escola</button>
        </div>
      </div>

      {created && (
        <div className="card mb-6 p-5" style={{ borderLeft: '4px solid #10b981', backgroundColor: '#f0fdf4' }}>
          <div className="flex justify-between items-start gap-4">
            <div>
              <p style={{ margin: 0, fontWeight: 700, color: '#166534' }}>Acesso do primeiro admin — repasse à escola. A senha não será exibida de novo.</p>
              <p style={{ margin: '0.5rem 0 0', fontFamily: 'monospace' }}>{created.email} · <strong>{created.password}</strong></p>
            </div>
            <div className="flex gap-2">
              <button className="btn btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }} onClick={() => { void navigator.clipboard.writeText(`${created.email} / ${created.password}`); toast.success('Copiado.'); }}><Copy size={14} /></button>
              <button className="btn btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }} onClick={() => setCreated(null)}><X size={14} /></button>
            </div>
          </div>
        </div>
      )}

      {showNew && (
        <div className="card mb-6" style={{ borderTop: '4px solid var(--color-primary)' }}>
          <h3 className="mb-4">Provisionar escola</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div><label>Nome da escola</label><input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value, slug: form.slug || slugify(e.target.value) })} /></div>
            <div><label>Slug (identificador)</label><input type="text" value={form.slug} onChange={e => setForm({ ...form, slug: slugify(e.target.value) })} /></div>
            <div><label>Plano inicial</label><select value={form.plan_id} onChange={e => setForm({ ...form, plan_id: e.target.value })}>{listQ.data.plans.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
            <div><label>Dias de trial</label><input type="number" value={form.trial_days} onChange={e => setForm({ ...form, trial_days: Number(e.target.value) })} /></div>
            <div><label>Nome do admin</label><input type="text" value={form.admin_name} onChange={e => setForm({ ...form, admin_name: e.target.value })} /></div>
            <div><label>E-mail do admin</label><input type="email" value={form.admin_email} onChange={e => setForm({ ...form, admin_email: e.target.value })} /></div>
            <div><label>Senha inicial (opcional)</label><input type="text" value={form.admin_password} onChange={e => setForm({ ...form, admin_password: e.target.value })} placeholder="Em branco = gerar" /></div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <button className="btn btn-secondary" onClick={() => setShowNew(false)}>Cancelar</button>
            <button className="btn btn-primary" onClick={() => void create()} disabled={saving}>Criar escola</button>
          </div>
        </div>
      )}

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                {['Escola', 'Plano', 'Status', 'Trial até', 'Alunos', 'Usuários', 'IA/mês', 'DPA', ''].map(h => <th key={h} style={{ padding: '0.75rem 1rem', textAlign: 'left' }}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {listQ.data.schools.map(s => (
                <tr key={s.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '0.75rem 1rem' }}><div style={{ fontWeight: 700 }}>{s.name}</div><div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{s.slug} · {new Date(s.created_at).toLocaleDateString('pt-BR')}</div></td>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    <select value={s.plan_id ?? ''} onChange={e => void patch(s.id, { plan_id: e.target.value || null })} style={{ padding: '0.3rem', fontSize: '0.8rem', width: 'auto' }}>
                      <option value="">—</option>{listQ.data.plans.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </td>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    <select value={s.status} onChange={e => void patch(s.id, { status: e.target.value })} style={{ padding: '0.3rem', fontSize: '0.8rem', width: 'auto' }}>
                      {STATUS.map(st => <option key={st} value={st}>{st}</option>)}
                    </select>
                  </td>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    <input type="date" value={s.trial_ends_at ? s.trial_ends_at.slice(0, 10) : ''} onChange={e => void patch(s.id, { trial_ends_at: e.target.value ? new Date(e.target.value + 'T23:59:59').toISOString() : null })} style={{ padding: '0.3rem', fontSize: '0.8rem', width: 'auto' }} />
                  </td>
                  <td style={{ padding: '0.75rem 1rem' }}>{s.students_count}</td>
                  <td style={{ padding: '0.75rem 1rem' }}>{s.users_count}</td>
                  <td style={{ padding: '0.75rem 1rem' }}>{s.ai_month}</td>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    {s.dpa_signed_at ? <span style={{ color: '#166534', fontSize: '0.75rem', fontWeight: 700 }}>OK</span> : <button className="btn btn-secondary" style={{ padding: '0.2rem 0.5rem', fontSize: '0.7rem' }} onClick={() => void patch(s.id, { dpa_signed_at: new Date().toISOString() })}>Marcar assinado</button>}
                  </td>
                  <td style={{ padding: '0.75rem 1rem' }}><button className="btn btn-secondary" style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }} onClick={() => void openUsage(s)}><BarChart3 size={14} /> Uso</button></td>
                </tr>
              ))}
              {listQ.data.schools.length === 0 && !listQ.loading && <tr><td colSpan={9} style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>Nenhuma escola ainda.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {usageFor && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }} onClick={() => setUsageFor(null)}>
          <div className="card" style={{ maxWidth: '900px', width: '100%', maxHeight: '85vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 style={{ margin: 0 }}>Uso de IA · {usageFor.name} (90 dias)</h3>
              <button onClick={() => setUsageFor(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={20} /></button>
            </div>
            <p className="text-muted" style={{ fontSize: '0.85rem' }}>
              {usage.length} chamadas · {usage.filter(u => !u.ok).length} falhas · {usage.reduce((a, u) => a + (u.input_tokens ?? 0), 0).toLocaleString('pt-BR')} tokens de entrada · {usage.reduce((a, u) => a + (u.output_tokens ?? 0), 0).toLocaleString('pt-BR')} de saída
            </p>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
              <thead><tr style={{ backgroundColor: '#f8fafc' }}>{['Quando', 'Recurso', 'Modelo', 'Tokens', 'ms', 'OK'].map(h => <th key={h} style={{ padding: '0.5rem', textAlign: 'left' }}>{h}</th>)}</tr></thead>
              <tbody>
                {usage.map((u, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '0.5rem' }}>{new Date(u.created_at).toLocaleString('pt-BR')}</td>
                    <td style={{ padding: '0.5rem' }}>{u.feature}</td>
                    <td style={{ padding: '0.5rem' }}>{u.model}</td>
                    <td style={{ padding: '0.5rem' }}>{(u.input_tokens ?? 0) + (u.output_tokens ?? 0)}</td>
                    <td style={{ padding: '0.5rem' }}>{u.latency_ms ?? '—'}</td>
                    <td style={{ padding: '0.5rem' }}>{u.ok ? '✓' : '✗'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
