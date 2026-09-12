import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Wallet, Receipt, Users, Settings, Plus, RefreshCw, ExternalLink, Copy, Check, Ban, Send, AlertTriangle, Link2, Save, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';
import { useSchool } from '../contexts/SchoolContext';
import { useAsync } from '../lib/useAsync';
import { formatBRL, parseBRL, monthLabel, currentMonth, formatDate } from '../lib/format';
import {
  listStudents, listEnrollments, listTuitionPlans, upsertTuitionPlan, deleteTuitionPlan, listStudentBilling, upsertStudentBilling,
  listInvoices, createInvoice, updateInvoice, financeMonthSummary, financeCharges, financeAsaas, updateSchool,
} from '../data';
import { Badge, DataTable, EmptyState, PageHeader, SkeletonStats, SkeletonCard, useConfirm } from '../components/ui';
import type { BadgeTone, Column } from '../components/ui';
import type { Invoice, InvoiceStatus, Student, StudentBilling, TuitionPlan, FinanceConfig } from '../types/db';

type Tab = 'overview' | 'invoices' | 'students' | 'settings';
const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'overview', label: 'Visão do mês', icon: <Wallet size={16} /> },
  { id: 'invoices', label: 'Cobranças', icon: <Receipt size={16} /> },
  { id: 'students', label: 'Alunos e planos', icon: <Users size={16} /> },
  { id: 'settings', label: 'Configurações', icon: <Settings size={16} /> },
];

const STATUS: Record<InvoiceStatus, { label: string; tone: BadgeTone }> = {
  draft: { label: 'Rascunho', tone: 'neutral' },
  pending: { label: 'Em aberto', tone: 'warning' },
  paid: { label: 'Pago', tone: 'success' },
  overdue: { label: 'Em atraso', tone: 'danger' },
  canceled: { label: 'Cancelada', tone: 'neutral' },
  refunded: { label: 'Estornada', tone: 'neutral' },
};

/** Cobrança interna não recebe webhook: pendente com vencimento passado é atraso. */
function effectiveStatus(i: Invoice): InvoiceStatus {
  return i.status === 'pending' && i.due_date < new Date().toISOString().slice(0, 10) ? 'overdue' : i.status;
}

function InvoiceStatusBadge({ invoice }: { invoice: Invoice }) {
  const s = STATUS[effectiveStatus(invoice)] ?? STATUS.pending;
  return <Badge tone={s.tone}>{s.label}</Badge>;
}

/** Financeiro da escola: mensalidades, cobrança via Asaas (conta da escola), inadimplência. */
export function Finance() {
  const { user } = useAuth();
  const { school, hasFeature } = useSchool();
  const [params, setParams] = useSearchParams();
  const tabParam = params.get('tab') as Tab | null;
  const tab: Tab = tabParam && TABS.some(t => t.id === tabParam) ? tabParam : 'overview';
  const setTab = (t: Tab) => setParams(t === 'overview' ? {} : { tab: t }, { replace: true });

  if (user?.role !== 'admin' || !school) return <div className="card"><EmptyState title="Só a direção acessa o financeiro" /></div>;
  if (!hasFeature('finance')) return <div className="card"><EmptyState icon={<Wallet size={36} />} title="Financeiro não está no plano atual" description="Disponível nos planos Completo e Rede. Fale com a plataforma para ativar." /></div>;

  return (
    <div>
      <PageHeader icon={<Wallet size={22} />} title="Financeiro" subtitle="Mensalidades, cobrança por boleto/PIX/cartão e inadimplência. O dinheiro cai na conta Asaas da escola." />
      <div className="flex gap-2 mb-6" style={{ flexWrap: 'wrap' }}>
        {TABS.map(t => <button key={t.id} onClick={() => setTab(t.id)} className={`btn btn-sm ${tab === t.id ? 'btn-primary' : 'btn-secondary'}`}>{t.icon} {t.label}</button>)}
      </div>
      {!school.finance_config?.asaas_connected && tab !== 'settings' && (
        <div className="callout callout-warning mb-6"><AlertTriangle size={16} /><span>A conta Asaas ainda não foi conectada. Você pode cadastrar planos e gerar cobranças internas; para emitir boleto/PIX, conecte em <button className="btn btn-ghost btn-sm" style={{ padding: 0, color: 'inherit', textDecoration: 'underline' }} onClick={() => setTab('settings')}>Configurações</button>.</span></div>
      )}
      {tab === 'overview' && <OverviewTab onGoInvoices={() => setTab('invoices')} />}
      {tab === 'invoices' && <InvoicesTab />}
      {tab === 'students' && <StudentsTab />}
      {tab === 'settings' && <SettingsTab />}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Visão do mês
// ---------------------------------------------------------------------------

function MonthPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center gap-2">
      <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>Mês</span>
      <input type="month" value={value} onChange={e => e.target.value && onChange(e.target.value)} style={{ width: 'auto', padding: '0.4rem 0.6rem' }} />
    </div>
  );
}

function OverviewTab({ onGoInvoices }: { onGoInvoices: () => void }) {
  const { school, selectedYear } = useSchool();
  const [month, setMonth] = useState(currentMonth());
  const summaryQ = useAsync(() => (school && selectedYear) ? financeMonthSummary(selectedYear.id, month) : Promise.resolve(null), [school?.id, selectedYear?.id, month], null);
  const overdueQ = useAsync(() => school ? listInvoices({ schoolId: school.id, status: ['overdue', 'pending'] }).then(rows => rows.filter(i => effectiveStatus(i) === 'overdue')) : Promise.resolve([]), [school?.id], []);
  const studentsQ = useAsync(() => school ? listStudents(school.id) : Promise.resolve([] as Student[]), [school?.id], [] as Student[]);
  const s = summaryQ.data;
  const rate = s && s.total_cents > 0 ? Math.round((s.paid_cents / s.total_cents) * 100) : 0;
  const nameOf = (id: string) => studentsQ.data.find(x => x.id === id)?.name ?? '—';

  const overdueColumns: Column<Invoice>[] = [
    { key: 'student', header: 'Aluno', render: i => <span style={{ fontWeight: 600 }}>{nameOf(i.student_id)}</span> },
    { key: 'desc', header: 'Cobrança', hideOnMobile: true, render: i => i.description },
    { key: 'due', header: 'Venceu em', render: i => formatDate(i.due_date) },
    { key: 'amount', header: 'Valor', align: 'right', render: i => formatBRL(i.amount_cents - i.discount_cents) },
    { key: 'link', header: '', align: 'right', render: i => i.invoice_url ? <a className="btn btn-secondary btn-sm" href={i.invoice_url} target="_blank" rel="noreferrer"><ExternalLink size={14} /> Link</a> : null },
  ];

  return (
    <div>
      <div className="card flex items-center gap-4 flex-wrap mb-6" style={{ padding: '0.75rem 1rem' }}>
        <MonthPicker value={month} onChange={setMonth} />
        <span className="text-muted" style={{ fontSize: '0.85rem' }}>Ano letivo {selectedYear?.label}</span>
        <button className="btn btn-primary btn-sm" style={{ marginLeft: 'auto' }} onClick={onGoInvoices}><Receipt size={16} /> Ver cobranças de {monthLabel(month)}</button>
      </div>
      {summaryQ.loading || !s ? <SkeletonStats count={4} /> : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
          {[
            { label: 'Previsto no mês', value: formatBRL(s.total_cents), sub: `${s.invoices_count} cobrança(s)` },
            { label: 'Recebido', value: formatBRL(s.paid_cents), sub: `${rate}% do previsto`, tone: 'success' },
            { label: 'Em aberto', value: formatBRL(s.pending_cents), sub: 'ainda no prazo' },
            { label: 'Em atraso', value: formatBRL(s.overdue_cents), sub: `${s.overdue_count} cobrança(s)`, tone: s.overdue_count > 0 ? 'danger' : undefined },
          ].map(k => (
            <div key={k.label} className="card">
              <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{k.label}</span>
              <h3 style={{ fontSize: '1.6rem', margin: '0.35rem 0 0', color: k.tone === 'danger' ? 'var(--color-danger-text)' : k.tone === 'success' ? 'var(--color-success-text)' : 'var(--color-text)' }}>{k.value}</h3>
              <p style={{ fontSize: '0.78rem', margin: 0, color: 'var(--color-text-subtle)' }}>{k.sub}</p>
            </div>
          ))}
        </div>
      )}
      <div className="card p-0 mt-6">
        <div className="flex justify-between items-center" style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--color-border)' }}>
          <h3 style={{ margin: 0, fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><AlertTriangle size={18} color="var(--color-danger)" /> Em atraso (todos os meses)</h3>
          <Badge tone={overdueQ.data.length > 0 ? 'danger' : 'success'}>{overdueQ.data.length} cobrança(s)</Badge>
        </div>
        <DataTable bare columns={overdueColumns} rows={overdueQ.data} rowKey={i => i.id} loading={overdueQ.loading || studentsQ.loading}
          empty={<EmptyState icon={<Check size={36} />} title="Nenhuma cobrança em atraso" description="O status muda sozinho quando o Asaas avisa que venceu ou foi pago." />} />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Cobranças do mês
// ---------------------------------------------------------------------------

function InvoicesTab() {
  const { school, selectedYear, classes } = useSchool();
  const askConfirm = useConfirm();
  const [month, setMonth] = useState(currentMonth());
  const [statusFilter, setStatusFilter] = useState<'' | InvoiceStatus>('');
  const [busy, setBusy] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [newInv, setNewInv] = useState({ student_id: '', description: '', amount: '', due_date: '' });
  const [copied, setCopied] = useState<string | null>(null);
  const connected = Boolean(school?.finance_config?.asaas_connected);

  const studentsQ = useAsync(() => school ? listStudents(school.id) : Promise.resolve([] as Student[]), [school?.id], [] as Student[]);
  const invoicesQ = useAsync(() => (school && selectedYear) ? listInvoices({ schoolId: school.id, yearId: selectedYear.id, month }) : Promise.resolve([]), [school?.id, selectedYear?.id, month], []);
  const nameOf = (id: string) => studentsQ.data.find(x => x.id === id)?.name ?? '—';
  const rows = useMemo(() => invoicesQ.data.filter(i => !statusFilter || effectiveStatus(i) === statusFilter).sort((a, b) => nameOf(a.student_id).localeCompare(nameOf(b.student_id), 'pt-BR')), [invoicesQ.data, statusFilter, studentsQ.data]); // eslint-disable-line react-hooks/exhaustive-deps

  const run = async (key: string, fn: () => Promise<unknown>, ok: string) => {
    setBusy(key);
    try { await fn(); await invoicesQ.reload(); if (ok) toast.success(ok); }
    catch (e) { toast.error(e instanceof Error ? e.message : 'Falha.'); }
    finally { setBusy(null); }
  };

  const generate = async () => {
    if (!selectedYear) return;
    const ok = await askConfirm({
      title: `Gerar mensalidades de ${monthLabel(month)}?`,
      description: `Uma cobrança por aluno com matrícula ativa e cobrança configurada (${classes.length} turma(s)). Quem já tem cobrança neste mês é ignorado.${connected ? ' As cobranças serão emitidas no Asaas na hora.' : ''}`,
      confirmLabel: 'Gerar',
    });
    if (!ok) return;
    await run('generate', async () => {
      const r = await financeCharges<{ created: number; issued: number; skipped: number; errors: string[] }>({ action: 'generate_month', year_id: selectedYear.id, month, issue: connected });
      toast.success(`${r.created} cobrança(s) criada(s)${connected ? `, ${r.issued} emitida(s)` : ''}, ${r.skipped} já existiam.`);
      for (const err of r.errors.slice(0, 5)) toast.error(err, { duration: 8000 });
      if (r.errors.length > 5) toast.error(`… e mais ${r.errors.length - 5} aviso(s).`);
    }, '');
  };

  const markPaid = async (i: Invoice) => {
    if (!(await askConfirm({ title: `Marcar como pago?`, description: `${nameOf(i.student_id)} · ${i.description} · ${formatBRL(i.amount_cents - i.discount_cents)}. Use para pagamentos fora do Asaas (dinheiro, transferência).`, confirmLabel: 'Marcar pago' }))) return;
    await run(i.id, () => updateInvoice(i.id, { status: 'paid', paid_at: new Date().toISOString(), paid_amount_cents: i.amount_cents - i.discount_cents, payment_method: 'manual' }), 'Marcada como paga.');
  };

  const cancel = async (i: Invoice) => {
    if (!(await askConfirm({ title: 'Cancelar esta cobrança?', description: i.asaas_payment_id ? 'Ela também será removida no Asaas e o boleto/PIX deixa de valer.' : 'A cobrança interna será cancelada.', danger: true, confirmLabel: 'Cancelar cobrança' }))) return;
    await run(i.id, () => i.asaas_payment_id ? financeCharges({ action: 'cancel', invoice_id: i.id }) : updateInvoice(i.id, { status: 'canceled' }), 'Cobrança cancelada.');
  };

  const copyPix = (i: Invoice) => {
    if (!i.pix_payload) return;
    void navigator.clipboard.writeText(i.pix_payload);
    setCopied(i.id); setTimeout(() => setCopied(null), 1500);
  };

  const createOne = async () => {
    if (!school || !selectedYear) return;
    const amount = parseBRL(newInv.amount);
    if (!newInv.student_id || !newInv.description.trim() || amount <= 0 || !newInv.due_date) { toast.error('Preencha aluno, descrição, valor e vencimento.'); return; }
    await run('new', () => createInvoice({ school_id: school.id, student_id: newInv.student_id, year_id: selectedYear.id, reference_month: `${month}-01`, description: newInv.description.trim(), amount_cents: amount, due_date: newInv.due_date }), 'Cobrança criada.');
    setShowNew(false); setNewInv({ student_id: '', description: '', amount: '', due_date: '' });
  };

  const columns: Column<Invoice>[] = [
    { key: 'student', header: 'Aluno', render: i => <div><div style={{ fontWeight: 600 }}>{nameOf(i.student_id)}</div><div style={{ fontSize: '0.75rem', color: 'var(--color-text-subtle)' }}>{i.description}</div></div> },
    { key: 'due', header: 'Vencimento', align: 'center', render: i => formatDate(i.due_date) },
    { key: 'amount', header: 'Valor', align: 'right', render: i => <div><div style={{ fontWeight: 600 }}>{formatBRL(i.amount_cents - i.discount_cents)}</div>{i.discount_cents > 0 && <div style={{ fontSize: '0.7rem', color: 'var(--color-text-subtle)' }}>desc. {formatBRL(i.discount_cents)}</div>}</div> },
    { key: 'status', header: 'Status', align: 'center', render: i => <div className="flex flex-col items-center gap-1"><InvoiceStatusBadge invoice={i} />{i.paid_at && <span style={{ fontSize: '0.7rem', color: 'var(--color-text-subtle)' }}>{new Date(i.paid_at).toLocaleDateString('pt-BR')} · {i.payment_method === 'manual' ? 'manual' : i.payment_method}</span>}</div> },
    { key: 'asaas', header: 'Asaas', align: 'center', hideOnMobile: true, render: i => i.asaas_payment_id ? <Badge tone="primary"><Link2 size={11} /> emitida</Badge> : <span className="text-muted" style={{ fontSize: '0.75rem' }}>interna</span> },
    { key: 'actions', header: '', align: 'right', render: i => {
      const b = busy === i.id;
      const open = i.status === 'pending' || i.status === 'overdue';
      return (
        <div className="flex justify-end gap-1 flex-wrap">
          {i.invoice_url && <a className="btn btn-ghost" href={i.invoice_url} target="_blank" rel="noreferrer" title="Abrir link de pagamento"><ExternalLink size={16} /></a>}
          {i.pix_payload && <button className="btn btn-ghost" onClick={() => copyPix(i)} title="Copiar PIX copia-e-cola">{copied === i.id ? <Check size={16} /> : <Copy size={16} />}</button>}
          {open && !i.asaas_payment_id && connected && <button className="btn btn-primary btn-sm" disabled={b} onClick={() => void run(i.id, () => financeCharges({ action: 'issue', invoice_id: i.id }), 'Emitida no Asaas.')}><Send size={14} /> Emitir</button>}
          {i.asaas_payment_id && open && <button className="btn btn-ghost" disabled={b} onClick={() => void run(i.id, () => financeCharges({ action: 'sync', invoice_id: i.id }), 'Status atualizado.')} title="Sincronizar com o Asaas"><RefreshCw size={16} /></button>}
          {open && <button className="btn btn-ghost" disabled={b} onClick={() => void markPaid(i)} title="Marcar como pago (fora do Asaas)"><Check size={16} /></button>}
          {open && <button className="btn btn-ghost danger" disabled={b} onClick={() => void cancel(i)} title="Cancelar cobrança"><Ban size={16} /></button>}
        </div>
      );
    } },
  ];

  const totals = useMemo(() => rows.reduce((a, i) => i.status === 'canceled' ? a : a + i.amount_cents - i.discount_cents, 0), [rows]);

  return (
    <div>
      <div className="card flex items-center gap-4 flex-wrap mb-6" style={{ padding: '0.75rem 1rem' }}>
        <MonthPicker value={month} onChange={setMonth} />
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as '' | InvoiceStatus)} style={{ width: 'auto', padding: '0.4rem 0.6rem' }}>
          <option value="">Todos os status</option>
          {(Object.keys(STATUS) as InvoiceStatus[]).filter(k => k !== 'draft').map(k => <option key={k} value={k}>{STATUS[k].label}</option>)}
        </select>
        <span className="text-muted" style={{ fontSize: '0.85rem' }}>{rows.length} cobrança(s) · {formatBRL(totals)}</span>
        <div className="flex gap-2" style={{ marginLeft: 'auto' }}>
          <button className="btn btn-secondary btn-sm" onClick={() => setShowNew(v => !v)}><Plus size={16} /> Avulsa</button>
          <button className="btn btn-primary btn-sm" disabled={busy === 'generate'} onClick={() => void generate()}><Receipt size={16} /> Gerar mensalidades</button>
        </div>
      </div>

      {showNew && (
        <div className="card mb-6">
          <h3 style={{ fontSize: '1rem', marginBottom: '1rem' }}>Cobrança avulsa em {monthLabel(month)}</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div><label style={{ fontSize: '0.8rem' }}>Aluno</label><select value={newInv.student_id} onChange={e => setNewInv({ ...newInv, student_id: e.target.value })}><option value="">Selecione…</option>{studentsQ.data.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
            <div><label style={{ fontSize: '0.8rem' }}>Descrição</label><input type="text" placeholder="Ex.: Material didático" value={newInv.description} onChange={e => setNewInv({ ...newInv, description: e.target.value })} /></div>
            <div><label style={{ fontSize: '0.8rem' }}>Valor</label><input type="text" placeholder="R$ 0,00" value={newInv.amount} onChange={e => setNewInv({ ...newInv, amount: e.target.value })} /></div>
            <div><label style={{ fontSize: '0.8rem' }}>Vencimento</label><input type="date" value={newInv.due_date} onChange={e => setNewInv({ ...newInv, due_date: e.target.value })} /></div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <button className="btn btn-secondary btn-sm" onClick={() => setShowNew(false)}>Cancelar</button>
            <button className="btn btn-primary btn-sm" disabled={busy === 'new'} onClick={() => void createOne()}><Plus size={16} /> Criar cobrança</button>
          </div>
        </div>
      )}

      <DataTable columns={columns} rows={rows} rowKey={i => i.id} loading={invoicesQ.loading || studentsQ.loading}
        empty={<EmptyState icon={<Receipt size={36} />} title={`Nenhuma cobrança em ${monthLabel(month)}`} description="Gere as mensalidades do mês em um clique ou crie uma cobrança avulsa." action={<button className="btn btn-primary btn-sm" onClick={() => void generate()}><Receipt size={16} /> Gerar mensalidades</button>} />} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Alunos e planos
// ---------------------------------------------------------------------------

function StudentsTab() {
  const { school, selectedYear, classes } = useSchool();
  const askConfirm = useConfirm();
  const plansQ = useAsync(() => selectedYear ? listTuitionPlans(selectedYear.id) : Promise.resolve([]), [selectedYear?.id], []);
  const billingQ = useAsync(() => school ? listStudentBilling(school.id) : Promise.resolve([]), [school?.id], []);
  const studentsQ = useAsync(() => school ? listStudents(school.id) : Promise.resolve([] as Student[]), [school?.id], [] as Student[]);
  const classIds = useMemo(() => classes.map(c => c.id), [classes]);
  const enrollQ = useAsync(() => listEnrollments(classIds), [classIds.join(',')], []);
  const [newPlan, setNewPlan] = useState({ name: '', amount: '', due_day: '10', discount: '', discount_days: '5' });
  const [saving, setSaving] = useState(false);

  const enrolled = useMemo(() => {
    const byStudent = new Map<string, string>();
    for (const e of enrollQ.data) if (e.active) byStudent.set(e.student_id, e.class_id);
    return studentsQ.data.filter(s => byStudent.has(s.id)).map(s => ({ student: s, className: classes.find(c => c.id === byStudent.get(s.id))?.name ?? '' })).sort((a, b) => a.student.name.localeCompare(b.student.name, 'pt-BR'));
  }, [enrollQ.data, studentsQ.data, classes]);

  const addPlan = async () => {
    if (!school || !selectedYear) return;
    const amount = parseBRL(newPlan.amount);
    if (!newPlan.name.trim() || amount <= 0) { toast.error('Informe nome e valor do plano.'); return; }
    setSaving(true);
    try {
      await upsertTuitionPlan({ school_id: school.id, year_id: selectedYear.id, name: newPlan.name.trim(), amount_cents: amount, due_day: Number(newPlan.due_day) || 10, discount_cents: parseBRL(newPlan.discount), discount_days: Number(newPlan.discount_days) || 0 });
      await plansQ.reload();
      setNewPlan({ name: '', amount: '', due_day: '10', discount: '', discount_days: '5' });
      toast.success('Plano criado.');
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Falha.'); } finally { setSaving(false); }
  };

  const removePlan = async (p: TuitionPlan) => {
    if (!(await askConfirm({ title: `Excluir o plano ${p.name}?`, description: 'Alunos vinculados ficam sem valor até receberem outro plano.', danger: true }))) return;
    try { await deleteTuitionPlan(p.id); await Promise.all([plansQ.reload(), billingQ.reload()]); toast.success('Plano excluído.'); } catch (e) { toast.error(e instanceof Error ? e.message : 'Falha.'); }
  };

  const applyPlanToAll = async (p: TuitionPlan) => {
    if (!school) return;
    const without = enrolled.filter(({ student }) => !billingQ.data.some(b => b.student_id === student.id && b.tuition_plan_id));
    if (without.length === 0) { toast.info('Todos os alunos matriculados já têm plano.'); return; }
    if (!(await askConfirm({ title: `Aplicar "${p.name}" a ${without.length} aluno(s) sem plano?`, description: 'Você ajusta bolsa, desconto e pagador aluno por aluno depois.', confirmLabel: 'Aplicar' }))) return;
    setSaving(true);
    try {
      for (const { student } of without) {
        const existing = billingQ.data.find(b => b.student_id === student.id);
        await upsertStudentBilling({ ...(existing ?? {}), school_id: school.id, student_id: student.id, tuition_plan_id: p.id, payer_name: existing?.payer_name ?? student.guardian1 ?? null });
      }
      await billingQ.reload();
      toast.success(`Plano aplicado a ${without.length} aluno(s).`);
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Falha.'); } finally { setSaving(false); }
  };

  return (
    <div className="grid gap-6">
      <div className="card">
        <h3 style={{ fontSize: '1rem', marginBottom: '0.25rem' }}>Planos de mensalidade · {selectedYear?.label}</h3>
        <p className="text-muted" style={{ fontSize: '0.85rem' }}>Um valor de referência por segmento ou série. O aluno recebe o plano e, se precisar, bolsa ou desconto próprio.</p>
        <div className="flex flex-col gap-2 mb-4">
          {plansQ.data.map(p => (
            <div key={p.id} className="flex items-center gap-3 flex-wrap" style={{ padding: '0.6rem 0.9rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)' }}>
              <span style={{ fontWeight: 600 }}>{p.name}</span>
              <Badge tone="primary">{formatBRL(p.amount_cents)}</Badge>
              <span className="text-muted" style={{ fontSize: '0.8rem' }}>vence dia {p.due_day}{p.discount_cents > 0 ? ` · ${formatBRL(p.discount_cents)} de desconto até ${p.discount_days} dia(s) antes` : ''}</span>
              <span className="text-muted" style={{ fontSize: '0.8rem' }}>· {billingQ.data.filter(b => b.tuition_plan_id === p.id).length} aluno(s)</span>
              <div className="flex gap-1" style={{ marginLeft: 'auto' }}>
                <button className="btn btn-secondary btn-sm" disabled={saving} onClick={() => void applyPlanToAll(p)}>Aplicar a quem não tem</button>
                <button className="btn btn-ghost danger" onClick={() => void removePlan(p)} title="Excluir"><Trash2 size={16} /></button>
              </div>
            </div>
          ))}
          {!plansQ.loading && plansQ.data.length === 0 && <p className="text-muted" style={{ fontSize: '0.85rem' }}>Nenhum plano ainda — crie o primeiro abaixo.</p>}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3 items-end">
          <div className="md:col-span-2"><label style={{ fontSize: '0.8rem' }}>Nome</label><input type="text" placeholder="Ex.: Infantil integral" value={newPlan.name} onChange={e => setNewPlan({ ...newPlan, name: e.target.value })} /></div>
          <div><label style={{ fontSize: '0.8rem' }}>Valor</label><input type="text" placeholder="R$ 0,00" value={newPlan.amount} onChange={e => setNewPlan({ ...newPlan, amount: e.target.value })} /></div>
          <div><label style={{ fontSize: '0.8rem' }}>Dia venc.</label><input type="number" min={1} max={28} value={newPlan.due_day} onChange={e => setNewPlan({ ...newPlan, due_day: e.target.value })} /></div>
          <div><label style={{ fontSize: '0.8rem' }}>Desc. pontualidade</label><input type="text" placeholder="R$ 0,00" value={newPlan.discount} onChange={e => setNewPlan({ ...newPlan, discount: e.target.value })} /></div>
          <button className="btn btn-primary btn-sm" disabled={saving} onClick={() => void addPlan()}><Plus size={16} /> Criar plano</button>
        </div>
      </div>

      <div className="card p-0">
        <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--color-border)' }}>
          <h3 style={{ fontSize: '1rem', margin: 0 }}>Cobrança por aluno</h3>
          <p className="text-muted" style={{ fontSize: '0.85rem', margin: '0.25rem 0 0' }}>Plano, bolsa e quem paga. O CPF do pagador é obrigatório para emitir boleto/PIX no Asaas.</p>
        </div>
        {(studentsQ.loading || billingQ.loading || enrollQ.loading) ? <div style={{ padding: '1rem' }}><SkeletonCard lines={6} className="border-none" /></div> : enrolled.length === 0 ? (
          <EmptyState icon={<Users size={36} />} title="Nenhum aluno matriculado no ano" description="Matricule os alunos em turmas para configurar a cobrança." />
        ) : (
          <div className="table-wrap">
            <table className="table table-compact">
              <thead><tr><th>Aluno</th><th>Plano</th><th className="right">Valor próprio</th><th className="center">Bolsa %</th><th className="right">Desconto</th><th>Pagador</th><th>CPF/CNPJ</th><th className="mobile-hide">E-mail · WhatsApp</th><th className="right">Mensalidade</th><th></th></tr></thead>
              <tbody>
                {enrolled.map(({ student, className }) => (
                  <BillingRow key={`${student.id}:${billingQ.data.find(b => b.student_id === student.id)?.updated_at ?? ''}`} student={student} className={className} plans={plansQ.data} billing={billingQ.data.find(b => b.student_id === student.id) ?? null} onSaved={() => void billingQ.reload()} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function BillingRow({ student, className, plans, billing, onSaved }: { student: Student; className: string; plans: TuitionPlan[]; billing: StudentBilling | null; onSaved: () => void }) {
  const { school } = useSchool();
  const [f, setF] = useState({
    tuition_plan_id: billing?.tuition_plan_id ?? '',
    custom_amount: billing?.custom_amount_cents ? formatBRL(billing.custom_amount_cents) : '',
    scholarship_pct: String(billing?.scholarship_pct ?? 0),
    discount: billing?.discount_cents ? formatBRL(billing.discount_cents) : '',
    payer_name: billing?.payer_name ?? student.guardian1 ?? '',
    payer_cpf_cnpj: billing?.payer_cpf_cnpj ?? '',
    payer_email: billing?.payer_email ?? '',
    payer_phone: billing?.payer_phone ?? '',
  });
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const set = (k: keyof typeof f, v: string) => { setF(prev => ({ ...prev, [k]: v })); setDirty(true); };

  const plan = plans.find(p => p.id === f.tuition_plan_id) ?? null;
  const base = parseBRL(f.custom_amount) || plan?.amount_cents || 0;
  const final = Math.max(0, Math.round(base * (1 - (Number(f.scholarship_pct) || 0) / 100)) - parseBRL(f.discount));

  const save = async () => {
    if (!school) return;
    setSaving(true);
    try {
      await upsertStudentBilling({
        school_id: school.id, student_id: student.id,
        tuition_plan_id: f.tuition_plan_id || null,
        custom_amount_cents: parseBRL(f.custom_amount) || null,
        scholarship_pct: Math.min(100, Math.max(0, Number(f.scholarship_pct) || 0)),
        discount_cents: parseBRL(f.discount),
        payer_name: f.payer_name.trim() || null, payer_cpf_cnpj: f.payer_cpf_cnpj.trim() || null,
        payer_email: f.payer_email.trim() || null, payer_phone: f.payer_phone.trim() || null,
        // CPF mudou = pagador mudou: o cliente Asaas será recriado/relocalizado na próxima emissão.
        asaas_customer_id: billing && billing.payer_cpf_cnpj === f.payer_cpf_cnpj.trim() ? billing.asaas_customer_id : null,
        active: true,
      });
      setDirty(false);
      onSaved();
      toast.success(`${student.name.split(' ')[0]}: cobrança salva.`);
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Falha.'); } finally { setSaving(false); }
  };

  const cell = { padding: '0.3rem 0.4rem', fontSize: '0.8rem' } as const;
  return (
    <tr>
      <td><div style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>{student.name}</div><div style={{ fontSize: '0.72rem', color: 'var(--color-text-subtle)' }}>{className}</div></td>
      <td><select value={f.tuition_plan_id} onChange={e => set('tuition_plan_id', e.target.value)} style={{ ...cell, minWidth: 140 }}><option value="">— sem plano —</option>{plans.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></td>
      <td><input type="text" placeholder="usa o plano" value={f.custom_amount} onChange={e => set('custom_amount', e.target.value)} style={{ ...cell, width: 110, textAlign: 'right' }} /></td>
      <td><input type="number" min={0} max={100} value={f.scholarship_pct} onChange={e => set('scholarship_pct', e.target.value)} style={{ ...cell, width: 64, textAlign: 'center' }} /></td>
      <td><input type="text" placeholder="R$ 0" value={f.discount} onChange={e => set('discount', e.target.value)} style={{ ...cell, width: 90, textAlign: 'right' }} /></td>
      <td><input type="text" placeholder="Nome do responsável financeiro" value={f.payer_name} onChange={e => set('payer_name', e.target.value)} style={{ ...cell, minWidth: 160 }} /></td>
      <td><input type="text" placeholder="000.000.000-00" value={f.payer_cpf_cnpj} onChange={e => set('payer_cpf_cnpj', e.target.value)} style={{ ...cell, width: 140 }} /></td>
      <td className="mobile-hide"><div className="flex flex-col gap-1"><input type="text" placeholder="e-mail" value={f.payer_email} onChange={e => set('payer_email', e.target.value)} style={{ ...cell, minWidth: 150 }} /><input type="text" placeholder="(12) 99999-9999" value={f.payer_phone} onChange={e => set('payer_phone', e.target.value)} style={{ ...cell, minWidth: 150 }} /></div></td>
      <td className="right" style={{ fontWeight: 700, whiteSpace: 'nowrap' }}>{final > 0 ? formatBRL(final) : <span className="text-muted" style={{ fontWeight: 400 }}>—</span>}</td>
      <td className="right">{(dirty || !billing) && <button className="btn btn-primary btn-sm" disabled={saving} onClick={() => void save()}><Save size={14} /></button>}</td>
    </tr>
  );
}

// ---------------------------------------------------------------------------
// Configurações (Asaas + regras)
// ---------------------------------------------------------------------------

function SettingsTab() {
  const { school, refresh } = useSchool();
  const askConfirm = useConfirm();
  const statusQ = useAsync(() => financeAsaas<{ connected: boolean; env: string; webhook_url: string; webhook_token: string | null }>({ action: 'status' }), [school?.id], null);
  const [apiKey, setApiKey] = useState('');
  const [env, setEnv] = useState<'sandbox' | 'production'>('sandbox');
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const cfg0 = school?.finance_config ?? {};
  const [cfg, setCfg] = useState<FinanceConfig>({ due_day: cfg0.due_day ?? 10, fine_pct: cfg0.fine_pct ?? 2, interest_pct_month: cfg0.interest_pct_month ?? 1, discount_days: cfg0.discount_days ?? 5 });

  const connect = async () => {
    if (!apiKey.trim()) { toast.error('Cole a chave de API do Asaas.'); return; }
    setBusy(true);
    try {
      await financeAsaas({ action: 'connect', api_key: apiKey.trim(), env });
      setApiKey('');
      await Promise.all([statusQ.reload(), refresh()]);
      toast.success(`Asaas conectado (${env === 'sandbox' ? 'sandbox' : 'produção'}).`);
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Falha ao conectar.'); } finally { setBusy(false); }
  };

  const disconnect = async () => {
    if (!(await askConfirm({ title: 'Desconectar o Asaas?', description: 'As cobranças já emitidas continuam valendo no Asaas; o sistema só deixa de emitir novas e de receber o webhook.', danger: true, confirmLabel: 'Desconectar' }))) return;
    setBusy(true);
    try { await financeAsaas({ action: 'disconnect' }); await Promise.all([statusQ.reload(), refresh()]); toast.success('Desconectado.'); }
    catch (e) { toast.error(e instanceof Error ? e.message : 'Falha.'); } finally { setBusy(false); }
  };

  const saveCfg = async () => {
    if (!school) return;
    setBusy(true);
    try { await updateSchool(school.id, { finance_config: { ...school.finance_config, ...cfg } }); await refresh(); toast.success('Regras salvas.'); }
    catch (e) { toast.error(e instanceof Error ? e.message : 'Falha.'); } finally { setBusy(false); }
  };

  const copy = (key: string, text: string) => { void navigator.clipboard.writeText(text); setCopied(key); setTimeout(() => setCopied(null), 1500); };
  const st = statusQ.data;

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="card">
        <h3 style={{ fontSize: '1rem', marginBottom: '0.25rem' }}>Conta Asaas da escola</h3>
        <p className="text-muted" style={{ fontSize: '0.85rem' }}>O dinheiro vai direto para a conta da escola no Asaas. A chave fica guardada só no servidor; ninguém do front a vê — nem a direção depois de salvar.</p>
        {statusQ.loading ? <SkeletonCard lines={3} className="border-none p-0" /> : st?.connected ? (
          <>
            <div className="callout callout-success mb-4"><Check size={16} /><span>Conectado · ambiente <strong>{st.env === 'production' ? 'produção' : 'sandbox (testes)'}</strong></span></div>
            <label style={{ fontSize: '0.8rem' }}>Webhook — cadastre no Asaas (Integrações → Webhooks) com o evento "Cobranças"</label>
            <div className="flex gap-2 mb-3"><input type="text" readOnly value={st.webhook_url} style={{ fontSize: '0.8rem' }} /><button className="btn btn-secondary btn-sm" onClick={() => copy('url', st.webhook_url)}>{copied === 'url' ? <Check size={14} /> : <Copy size={14} />}</button></div>
            <label style={{ fontSize: '0.8rem' }}>Token de autenticação do webhook</label>
            <div className="flex gap-2 mb-4"><input type="text" readOnly value={st.webhook_token ?? ''} style={{ fontSize: '0.8rem', fontFamily: 'monospace' }} /><button className="btn btn-secondary btn-sm" onClick={() => copy('tok', st.webhook_token ?? '')}>{copied === 'tok' ? <Check size={14} /> : <Copy size={14} />}</button></div>
            <p className="text-muted" style={{ fontSize: '0.78rem' }}>Sem o webhook, o status das cobranças só atualiza quando você clica em "sincronizar".</p>
            <button className="btn btn-secondary btn-sm" disabled={busy} onClick={() => void disconnect()}>Desconectar</button>
          </>
        ) : (
          <>
            <label style={{ fontSize: '0.8rem' }}>Ambiente</label>
            <select value={env} onChange={e => setEnv(e.target.value as 'sandbox' | 'production')} className="mb-3"><option value="sandbox">Sandbox (testes, sem dinheiro real)</option><option value="production">Produção</option></select>
            <label style={{ fontSize: '0.8rem' }}>Chave de API (Asaas → Integrações → Chave de API)</label>
            <input type="password" placeholder="$aact_…" value={apiKey} onChange={e => setApiKey(e.target.value)} className="mb-4" autoComplete="off" />
            <button className="btn btn-primary btn-sm" disabled={busy} onClick={() => void connect()}><Link2 size={16} /> Conectar</button>
            <p className="text-muted mt-3" style={{ fontSize: '0.78rem' }}>Não tem conta? Crie em asaas.com (gratuita; taxa por boleto/PIX recebido). Teste primeiro no sandbox.</p>
          </>
        )}
      </div>

      <div className="card">
        <h3 style={{ fontSize: '1rem', marginBottom: '0.25rem' }}>Regras de cobrança</h3>
        <p className="text-muted" style={{ fontSize: '0.85rem' }}>Valem para as mensalidades geradas a partir de agora.</p>
        <div className="grid grid-cols-2 gap-4">
          <div><label style={{ fontSize: '0.8rem' }}>Dia de vencimento padrão</label><input type="number" min={1} max={28} value={cfg.due_day ?? 10} onChange={e => setCfg({ ...cfg, due_day: Number(e.target.value) })} /></div>
          <div><label style={{ fontSize: '0.8rem' }}>Desconto até N dias antes</label><input type="number" min={0} max={28} value={cfg.discount_days ?? 0} onChange={e => setCfg({ ...cfg, discount_days: Number(e.target.value) })} /></div>
          <div><label style={{ fontSize: '0.8rem' }}>Multa por atraso (%)</label><input type="number" min={0} max={20} step={0.5} value={cfg.fine_pct ?? 0} onChange={e => setCfg({ ...cfg, fine_pct: Number(e.target.value) })} /></div>
          <div><label style={{ fontSize: '0.8rem' }}>Juros ao mês (%)</label><input type="number" min={0} max={10} step={0.1} value={cfg.interest_pct_month ?? 0} onChange={e => setCfg({ ...cfg, interest_pct_month: Number(e.target.value) })} /></div>
        </div>
        <p className="text-muted mt-3" style={{ fontSize: '0.78rem' }}>Limites legais: multa até 2% e juros até 1% ao mês (CDC). O Asaas aplica automaticamente no boleto e no PIX.</p>
        <button className="btn btn-primary btn-sm mt-3" disabled={busy} onClick={() => void saveCfg()}><Save size={16} /> Salvar regras</button>
      </div>
    </div>
  );
}
