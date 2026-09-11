import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Building2, Palette, CalendarRange, Sliders, Save, Upload, CreditCard, Sparkles, Plus, Check } from 'lucide-react';
import { PageHeader, SkeletonCard } from '../components/ui';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';
import { useSchool } from '../contexts/SchoolContext';
import { updateSchool, uploadLogo, createYear, setActiveYear } from '../data';
import { callApi, supabase } from '../lib/supabase';
import { useAsync } from '../lib/useAsync';
import type { Plan } from '../types/db';
import { applyBranding, DEFAULT_COLORS, logoUrl } from '../lib/branding';
import { DEFAULT_GRADING_CONFIG, validateGradingConfig } from '../store/gradingConfig';
import type { GradingConfig } from '../store/gradingConfig';
import type { School } from '../types/db';

type Tab = 'school' | 'brand' | 'years' | 'grading' | 'plan';

/**
 * A tela é remontada (key) sempre que a escola muda no servidor, então os
 * formulários inicializam direto do dado atual — sem efeitos sincronizando estado.
 */
export function Settings() {
  const { user } = useAuth();
  const { school, grading } = useSchool();
  if (user?.role !== 'admin' || !school) {
    return <div className="card text-center"><p className="text-muted">Apenas a direção acessa as configurações.</p></div>;
  }
  return <SettingsForm key={`${school.id}:${school.updated_at}`} school={school} grading={grading} />;
}

function SettingsForm({ school, grading }: { school: School; grading: GradingConfig }) {
  const { plan, years, aiUsage, refresh } = useSchool();
  // A aba pode vir da URL (?tab=years) — o checklist de primeiros passos manda para cá.
  const [params, setParams] = useSearchParams();
  const TABS: Tab[] = ['school', 'brand', 'years', 'grading', 'plan'];
  const fromUrl = params.get('tab') as Tab | null;
  const tab: Tab = fromUrl && TABS.includes(fromUrl) ? fromUrl : 'school';
  const setTab = (t: Tab) => setParams(t === 'school' ? {} : { tab: t }, { replace: true });
  const [saving, setSaving] = useState(false);

  // Escola
  const [info, setInfo] = useState({
    name: school.name, legal_name: school.legal_name ?? '', cnpj: school.cnpj ?? '', city: school.city ?? '', uf: school.uf ?? '',
    authorization_text: school.authorization_text ?? '', tagline: school.branding?.tagline ?? '',
  });
  // Marca
  const [colors, setColors] = useState({ ...DEFAULT_COLORS, ...(school.branding?.colors ?? {}) });
  const [logoFile, setLogoFile] = useState<File | null>(null);
  // Anos
  const [newYear, setNewYear] = useState(String(new Date().getFullYear() + 1));
  // Avaliação
  const [cfg, setCfg] = useState<GradingConfig>(grading);
  const [cfgJson, setCfgJson] = useState(() => JSON.stringify(grading, null, 2));
  const [jsonMode, setJsonMode] = useState(false);

  const save = async (patch: Partial<School>, msg: string) => {
    setSaving(true);
    try {
      await updateSchool(school.id, patch);
      await refresh();
      toast.success(msg);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Falha ao salvar.');
    } finally {
      setSaving(false);
    }
  };

  const saveInfo = () => void save({
    name: info.name.trim(), legal_name: info.legal_name.trim() || null, cnpj: info.cnpj.trim() || null, city: info.city.trim() || null, uf: info.uf.trim().toUpperCase() || null,
    authorization_text: info.authorization_text.trim() || null,
    branding: { ...school.branding, tagline: info.tagline.trim() || undefined },
  }, 'Dados da escola salvos.');

  const previewColors = (next: typeof colors) => {
    setColors(next);
    applyBranding({ ...school, branding: { ...school.branding, colors: next } });
  };

  const saveBrand = async () => {
    setSaving(true);
    try {
      let logo_url = school.branding?.logo_url;
      if (logoFile) logo_url = await uploadLogo(school.id, logoFile);
      await updateSchool(school.id, { branding: { ...school.branding, logo_url, colors } });
      await refresh();
      setLogoFile(null);
      toast.success('Marca atualizada.');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Falha ao salvar a marca.');
    } finally {
      setSaving(false);
    }
  };

  const addYear = async () => {
    if (!/^\d{4}$/.test(newYear)) { toast.error('Informe o ano com 4 dígitos.'); return; }
    try {
      await createYear(school.id, newYear);
      await refresh();
      toast.success(`Ano letivo ${newYear} criado.`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Falha ao criar.');
    }
  };

  const activateYear = async (id: string) => {
    try { await setActiveYear(school.id, id); await refresh(); toast.success('Ano ativo atualizado.'); } catch (e) { toast.error(e instanceof Error ? e.message : 'Falha.'); }
  };

  const saveGrading = () => {
    let next: GradingConfig = cfg;
    if (jsonMode) {
      try { next = JSON.parse(cfgJson) as GradingConfig; } catch { toast.error('JSON inválido.'); return; }
    }
    const errors = validateGradingConfig(next.subjects, next.policy);
    if (errors.length > 0) { toast.error(errors[0]); return; }
    void save({ grading_config: next as unknown as Record<string, unknown> }, 'Política de avaliação salva.');
  };

  const resetGrading = () => void save({ grading_config: null }, 'Política restaurada para o padrão.');

  const plansQ = useAsync(async () => (await supabase.from('plans').select('*').eq('active', true).order('sort_order')).data as Plan[] | null ?? [], [], [] as Plan[]);
  const subscribe = async (planId: string) => {
    setSaving(true);
    try {
      const { url } = await callApi<{ url: string }>('/api/billing/checkout', { plan_id: planId });
      window.location.assign(url);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Não foi possível abrir o pagamento.');
      setSaving(false);
    }
  };

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'school', label: 'Escola', icon: <Building2 size={16} /> },
    { id: 'brand', label: 'Marca', icon: <Palette size={16} /> },
    { id: 'years', label: 'Anos letivos', icon: <CalendarRange size={16} /> },
    { id: 'grading', label: 'Avaliação', icon: <Sliders size={16} /> },
    { id: 'plan', label: 'Plano e IA', icon: <CreditCard size={16} /> },
  ];

  const updatePolicy = (k: keyof GradingConfig['policy'], v: number) => setCfg(c => ({ ...c, policy: { ...c.policy, [k]: v } }));

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto' }}>
      <PageHeader title="Configurações da escola" subtitle="Dados cadastrais, marca, anos letivos, política de avaliação e plano." />

      <div className="flex gap-2 mb-6" style={{ flexWrap: 'wrap' }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} className={`btn btn-sm ${tab === t.id ? 'btn-primary' : 'btn-secondary'}`}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {tab === 'school' && (
        <div className="card">
          <h3 className="mb-4">Dados cadastrais</h3>
          <p className="text-muted mb-4" style={{ fontSize: '0.85rem' }}>Aparecem no cabeçalho de boletins, diários, histórico escolar e nos documentos gerados.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><label>Nome (como aparece no sistema)</label><input type="text" value={info.name} onChange={e => setInfo({ ...info, name: e.target.value })} /></div>
            <div><label>Razão social</label><input type="text" value={info.legal_name} onChange={e => setInfo({ ...info, legal_name: e.target.value })} /></div>
            <div><label>CNPJ</label><input type="text" value={info.cnpj} onChange={e => setInfo({ ...info, cnpj: e.target.value })} placeholder="00.000.000/0000-00" /></div>
            <div><label>Slogan (capa do relatório)</label><input type="text" value={info.tagline} onChange={e => setInfo({ ...info, tagline: e.target.value })} placeholder="Ex: Educação com propósito" /></div>
            <div><label>Cidade</label><input type="text" value={info.city} onChange={e => setInfo({ ...info, city: e.target.value })} /></div>
            <div><label>UF</label><input type="text" value={info.uf} maxLength={2} onChange={e => setInfo({ ...info, uf: e.target.value })} /></div>
            <div className="md:col-span-2"><label>Texto de autorização (histórico escolar)</label><input type="text" value={info.authorization_text} onChange={e => setInfo({ ...info, authorization_text: e.target.value })} placeholder="Ex: Autorizada pela Portaria SEE nº ... | Telefone | Endereço" /></div>
          </div>
          <button className="btn btn-primary mt-6" onClick={saveInfo} disabled={saving}><Save size={18} /> Salvar</button>
        </div>
      )}

      {tab === 'brand' && (
        <div className="card">
          <h3 className="mb-4">Identidade visual</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label>Logo</label>
              <div style={{ padding: '1rem', border: '1px dashed var(--color-border-strong)', borderRadius: '10px', textAlign: 'center', marginBottom: '0.75rem', backgroundColor: 'var(--color-surface-2)' }}>
                <img src={logoFile ? URL.createObjectURL(logoFile) : logoUrl(school)} alt="Logo" style={{ maxHeight: '80px', maxWidth: '220px', margin: '0 auto' }} />
              </div>
              <label className="btn btn-secondary" style={{ cursor: 'pointer', fontSize: '0.85rem', padding: '0.5rem 1rem' }}>
                <Upload size={16} /> Enviar logo (PNG/SVG, até 2 MB)
                <input type="file" accept="image/png,image/jpeg,image/svg+xml,image/webp" style={{ display: 'none' }} onChange={e => setLogoFile(e.target.files?.[0] ?? null)} />
              </label>
            </div>
            <div>
              <label>Cores</label>
              {([['primary', 'Principal (botões, links)'], ['secondary', 'Secundária (destaques)'], ['accent', 'Realce'], ['bg', 'Fundo das telas']] as const).map(([k, label]) => (
                <div key={k} className="flex items-center gap-3 mb-3">
                  <input type="color" value={colors[k]} onChange={e => previewColors({ ...colors, [k]: e.target.value })} style={{ width: '44px', height: '36px', padding: 0, border: '1px solid var(--color-border)', borderRadius: '6px' }} />
                  <span style={{ fontSize: '0.85rem', flex: 1 }}>{label}</span>
                  <code style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{colors[k]}</code>
                </div>
              ))}
              <button className="btn btn-secondary" style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem' }} onClick={() => previewColors({ ...DEFAULT_COLORS })}>Restaurar padrão</button>
            </div>
          </div>
          <p className="text-muted mt-4" style={{ fontSize: '0.8rem' }}>As cores são aplicadas ao vivo para você conferir. Só valem para todos depois de salvar.</p>
          <button className="btn btn-primary mt-4" onClick={() => void saveBrand()} disabled={saving}><Save size={18} /> Salvar marca</button>
        </div>
      )}

      {tab === 'years' && (
        <div className="card">
          <h3 className="mb-4">Anos letivos</h3>
          <div className="flex flex-col gap-2 mb-6">
            {years.map(y => (
              <div key={y.id} className="flex items-center justify-between" style={{ padding: '0.75rem 1rem', border: '1px solid var(--color-border)', borderRadius: '8px', backgroundColor: y.active ? 'var(--color-success-soft)' : 'white' }}>
                <span style={{ fontWeight: 700 }}>{y.label} {y.active && <span style={{ fontSize: '0.7rem', color: 'var(--color-success-text)', marginLeft: '0.5rem' }}>ATIVO</span>}</span>
                {!y.active && <button className="btn btn-secondary" style={{ padding: '0.3rem 0.7rem', fontSize: '0.75rem' }} onClick={() => void activateYear(y.id)}><Check size={14} /> Tornar ativo</button>}
              </div>
            ))}
            {years.length === 0 && <p className="text-muted">Nenhum ano letivo. Crie o primeiro abaixo.</p>}
          </div>
          <div className="flex gap-2 items-end">
            <div><label>Novo ano letivo</label><input type="text" value={newYear} onChange={e => setNewYear(e.target.value)} maxLength={4} style={{ width: '140px' }} /></div>
            <button className="btn btn-primary" onClick={() => void addYear()}><Plus size={18} /> Criar</button>
          </div>
          <p className="text-muted mt-4" style={{ fontSize: '0.8rem' }}>Turmas e matrículas pertencem a um ano letivo. Ao virar o ano, crie o novo, torne-o ativo e cadastre as turmas.</p>
        </div>
      )}

      {tab === 'grading' && (
        <div className="card">
          <div className="flex justify-between items-center mb-4">
            <h3 style={{ margin: 0 }}>Política de avaliação</h3>
            <button className="btn btn-secondary" style={{ fontSize: '0.75rem', padding: '0.3rem 0.7rem' }} onClick={() => setJsonMode(m => !m)}>{jsonMode ? 'Modo visual' : 'Modo avançado (JSON)'}</button>
          </div>
          <p className="text-muted mb-4" style={{ fontSize: '0.85rem' }}>Escala, média de aprovação, frequência mínima, disciplinas e componentes de nota. Um peso errado aqui contamina todo boletim: o sistema valida antes de salvar.</p>

          {!jsonMode ? (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div><label style={{ fontSize: '0.8rem' }}>Nota máxima</label><input type="number" value={cfg.policy.scale.max} onChange={e => setCfg(c => ({ ...c, policy: { ...c.policy, scale: { ...c.policy.scale, max: Number(e.target.value) } } }))} /></div>
                <div><label style={{ fontSize: '0.8rem' }}>Média de aprovação</label><input type="number" value={cfg.policy.passingGrade} onChange={e => updatePolicy('passingGrade', Number(e.target.value))} /></div>
                <div><label style={{ fontSize: '0.8rem' }}>Frequência mínima (%)</label><input type="number" value={cfg.policy.minAttendance} onChange={e => updatePolicy('minAttendance', Number(e.target.value))} /></div>
                <div><label style={{ fontSize: '0.8rem' }}>Máx. disciplinas na rec. final</label><input type="number" value={cfg.policy.maxSubjectsInFinalRecovery} onChange={e => updatePolicy('maxSubjectsInFinalRecovery', Number(e.target.value))} /></div>
              </div>

              <label style={{ fontSize: '0.85rem' }}>Períodos</label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-6">
                {cfg.periods.map((p, i) => <input key={i} type="text" value={p} onChange={e => setCfg(c => ({ ...c, periods: c.periods.map((x, j) => j === i ? e.target.value : x) }))} />)}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                {(['infantil', 'fundamental'] as const).map(level => (
                  <div key={level}>
                    <label style={{ fontSize: '0.85rem' }}>Séries · {level === 'infantil' ? 'Educação Infantil' : 'Ensino Fundamental'} (uma por linha, da mais nova à mais velha)</label>
                    <textarea value={cfg.series[level].join('\n')} onChange={e => setCfg(c => ({ ...c, series: { ...c.series, [level]: e.target.value.split('\n').map(s => s.trim()).filter(Boolean) } }))} rows={5} style={{ minHeight: '120px' }} />
                  </div>
                ))}
              </div>

              <label style={{ fontSize: '0.85rem' }}>Disciplinas</label>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                  <thead><tr style={{ backgroundColor: 'var(--color-surface-2)' }}><th style={{ padding: '0.5rem', textAlign: 'left' }}>Nome</th><th style={{ padding: '0.5rem', textAlign: 'left' }}>Nome oficial</th><th style={{ padding: '0.5rem' }}>Avaliação</th><th style={{ padding: '0.5rem' }}>Quem lança</th><th style={{ padding: '0.5rem', textAlign: 'left' }}>Componentes (id:máx)</th><th style={{ padding: '0.5rem' }}>Prova</th></tr></thead>
                  <tbody>
                    {cfg.subjects.map((s, i) => (
                      <tr key={s.id} style={{ borderBottom: '1px solid var(--color-border-soft)' }}>
                        <td style={{ padding: '0.4rem' }}><input type="text" value={s.name} onChange={e => setCfg(c => ({ ...c, subjects: c.subjects.map((x, j) => j === i ? { ...x, name: e.target.value } : x) }))} style={{ padding: '0.3rem', fontSize: '0.85rem' }} /></td>
                        <td style={{ padding: '0.4rem' }}><input type="text" value={s.officialName} onChange={e => setCfg(c => ({ ...c, subjects: c.subjects.map((x, j) => j === i ? { ...x, officialName: e.target.value } : x) }))} style={{ padding: '0.3rem', fontSize: '0.85rem' }} /></td>
                        <td style={{ padding: '0.4rem', textAlign: 'center' }}>{s.evaluation === 'grade' ? 'Nota' : 'Relatório'}</td>
                        <td style={{ padding: '0.4rem', textAlign: 'center' }}>{s.taughtBy === 'regente' ? 'Regente' : s.taughtBy === 'english' ? 'Inglês' : 'Ed. Física'}</td>
                        <td style={{ padding: '0.4rem', color: 'var(--color-text-muted)' }}>{s.scheme ? s.scheme.components.map(c => `${c.label}:${c.max}`).join(', ') : '—'}</td>
                        <td style={{ padding: '0.4rem', textAlign: 'center' }}>{s.scheme?.exam ? s.scheme.exam.max : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-muted mt-2" style={{ fontSize: '0.75rem' }}>Para mudar pesos, componentes ou adicionar disciplinas, use o modo avançado (JSON).</p>
            </>
          ) : (
            <textarea value={cfgJson} onChange={e => setCfgJson(e.target.value)} rows={24} style={{ fontFamily: 'monospace', fontSize: '0.8rem', minHeight: '420px' }} />
          )}

          <div className="flex gap-3 mt-6">
            <button className="btn btn-primary" onClick={saveGrading} disabled={saving}><Save size={18} /> Salvar política</button>
            <button className="btn btn-secondary" onClick={resetGrading} disabled={saving}>Restaurar padrão</button>
            <button className="btn btn-secondary" style={{ marginLeft: 'auto', fontSize: '0.8rem' }} onClick={() => { setCfg(DEFAULT_GRADING_CONFIG); setCfgJson(JSON.stringify(DEFAULT_GRADING_CONFIG, null, 2)); }}>Carregar padrão no editor</button>
          </div>
        </div>
      )}

      {tab === 'plan' && (
        <div className="card">
          <h3 className="mb-4 flex items-center gap-2"><CreditCard size={20} /> Plano e uso</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div style={{ padding: '1rem', border: '1px solid var(--color-border)', borderRadius: '10px' }}>
              <p className="text-muted" style={{ fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 700, margin: 0 }}>Plano</p>
              <h3 style={{ margin: '0.25rem 0' }}>{plan?.name ?? 'Sem plano'}</h3>
              <p style={{ margin: 0, fontSize: '0.85rem' }}>Status: <strong>{school.status}</strong>{school.trial_ends_at && school.status === 'trial' ? ` · até ${new Date(school.trial_ends_at).toLocaleDateString('pt-BR')}` : ''}</p>
            </div>
            <div style={{ padding: '1rem', border: '1px solid var(--color-border)', borderRadius: '10px' }}>
              <p className="text-muted" style={{ fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 700, margin: 0 }}>Limites</p>
              <p style={{ margin: '0.5rem 0 0', fontSize: '0.85rem' }}>Alunos: {plan?.max_students ?? '∞'}<br />Usuários: {plan?.max_users ?? '∞'}</p>
            </div>
            <div style={{ padding: '1rem', border: '1px solid var(--color-border)', borderRadius: '10px' }}>
              <p className="text-muted" style={{ fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 700, margin: 0 }}><Sparkles size={12} style={{ display: 'inline' }} /> IA este mês</p>
              <h3 style={{ margin: '0.25rem 0' }}>{aiUsage.used}{aiUsage.limit !== null ? ` / ${aiUsage.limit}` : ''}</h3>
              <p style={{ margin: 0, fontSize: '0.85rem' }}>gerações (relatórios, PEI, análises, copiloto)</p>
            </div>
          </div>
          <h4 className="mb-3">Planos disponíveis</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {plansQ.loading && <SkeletonCard lines={3} />}
            {plansQ.data.filter(p => p.price_cents > 0).map(p => (
              <div key={p.id} style={{ padding: '1rem', border: `2px solid ${p.id === school.plan_id ? 'var(--color-primary)' : 'var(--color-border)'}`, borderRadius: '10px' }}>
                <h4 style={{ margin: 0 }}>{p.name}</h4>
                <p style={{ margin: '0.25rem 0', fontSize: '1.3rem', fontWeight: 800 }}>R$ {(p.price_cents / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}<span style={{ fontSize: '0.75rem', fontWeight: 400 }}>/mês</span></p>
                <p className="text-muted" style={{ fontSize: '0.8rem', margin: '0 0 0.75rem' }}>até {p.max_students ?? '∞'} alunos · {p.ai_monthly_credits ?? '∞'} gerações de IA/mês</p>
                {p.id === school.plan_id && school.status === 'active'
                  ? <span style={{ fontSize: '0.8rem', color: 'var(--color-success-text)', fontWeight: 700 }}>Plano atual</span>
                  : <button className="btn btn-primary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }} disabled={saving} onClick={() => void subscribe(p.id)}>Assinar</button>}
              </div>
            ))}
          </div>
          <p className="text-muted" style={{ fontSize: '0.85rem' }}>
            Para ampliar limites, planos de rede ou faturamento por boleto, fale com o suporte da plataforma. A chave de IA é da plataforma — a escola não precisa configurar nada.
          </p>
          {school.dpa_signed_at
            ? <p style={{ fontSize: '0.85rem', color: 'var(--color-success-text)' }}>Contrato de tratamento de dados (LGPD) assinado em {new Date(school.dpa_signed_at).toLocaleDateString('pt-BR')}.</p>
            : <p style={{ fontSize: '0.85rem', color: 'var(--color-warning-text)' }}>Contrato de tratamento de dados (LGPD) ainda não registrado. Veja docs/lgpd no repositório do produto.</p>}
        </div>
      )}
    </div>
  );
}
