import { useMemo, useState } from 'react';
import { Wallet, ExternalLink, Copy, Check, FileText, QrCode } from 'lucide-react';
import { useSchool } from '../contexts/SchoolContext';
import { useAsync } from '../lib/useAsync';
import { listMyInvoices, listStudents } from '../data';
import { formatBRL, formatDate, monthLabel } from '../lib/format';
import { Badge, EmptyState, PageHeader, SkeletonCard } from '../components/ui';
import type { BadgeTone } from '../components/ui';
import type { Invoice, InvoiceStatus, Student } from '../types/db';

const STATUS: Record<InvoiceStatus, { label: string; tone: BadgeTone }> = {
  draft: { label: 'Rascunho', tone: 'neutral' },
  pending: { label: 'Em aberto', tone: 'warning' },
  paid: { label: 'Pago', tone: 'success' },
  overdue: { label: 'Vencido', tone: 'danger' },
  canceled: { label: 'Cancelado', tone: 'neutral' },
  refunded: { label: 'Estornado', tone: 'neutral' },
};

/** Portal da família: mensalidades dos filhos, com link de pagamento, boleto e PIX. */
export function FamilyFinance() {
  const { school } = useSchool();
  const invoicesQ = useAsync(() => listMyInvoices(), [school?.id], []);
  const studentsQ = useAsync(() => school ? listStudents(school.id) : Promise.resolve([] as Student[]), [school?.id], [] as Student[]);
  const [pixOpen, setPixOpen] = useState<Invoice | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const nameOf = (id: string) => studentsQ.data.find(s => s.id === id)?.name.split(' ')[0] ?? '';

  const open = useMemo(() => invoicesQ.data.filter(i => i.status === 'pending' || i.status === 'overdue'), [invoicesQ.data]);
  const history = useMemo(() => invoicesQ.data.filter(i => i.status === 'paid' || i.status === 'refunded' || i.status === 'canceled'), [invoicesQ.data]);
  const openTotal = open.reduce((a, i) => a + i.amount_cents - i.discount_cents, 0);

  const copyPix = (i: Invoice) => { if (!i.pix_payload) return; void navigator.clipboard.writeText(i.pix_payload); setCopied(i.id); setTimeout(() => setCopied(null), 1500); };

  const today = new Date().toISOString().slice(0, 10);
  const Row = ({ i }: { i: Invoice }) => {
    const s = STATUS[i.status === 'pending' && i.due_date < today ? 'overdue' : i.status];
    return (
      <div className="card" style={{ padding: '1rem' }}>
        <div className="flex justify-between items-start gap-3 flex-wrap">
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 600 }}>{i.description}{studentsQ.data.length > 1 ? ` · ${nameOf(i.student_id)}` : ''}</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Vencimento {formatDate(i.due_date)}{i.paid_at ? ` · pago em ${new Date(i.paid_at).toLocaleDateString('pt-BR')}` : ''}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontWeight: 700, fontSize: '1.05rem' }}>{formatBRL(i.amount_cents - i.discount_cents)}</div>
            <Badge tone={s.tone}>{s.label}</Badge>
          </div>
        </div>
        {(i.status === 'pending' || i.status === 'overdue') && (
          <div className="flex gap-2 mt-3 flex-wrap">
            {i.invoice_url && <a className="btn btn-primary btn-sm" href={i.invoice_url} target="_blank" rel="noreferrer"><ExternalLink size={14} /> Pagar</a>}
            {i.bank_slip_url && <a className="btn btn-secondary btn-sm" href={i.bank_slip_url} target="_blank" rel="noreferrer"><FileText size={14} /> Boleto</a>}
            {i.pix_payload && <button className="btn btn-secondary btn-sm" onClick={() => setPixOpen(i)}><QrCode size={14} /> PIX</button>}
            {!i.invoice_url && <span className="text-muted" style={{ fontSize: '0.8rem', alignSelf: 'center' }}>Pagamento combinado diretamente com a escola.</span>}
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={{ maxWidth: '820px', margin: '0 auto' }}>
      <PageHeader icon={<Wallet size={22} />} title="Financeiro" subtitle={open.length > 0 ? `${open.length} cobrança(s) em aberto · ${formatBRL(openTotal)}` : 'Nenhuma cobrança em aberto.'} />
      {invoicesQ.loading ? <><SkeletonCard lines={2} /><div className="mt-3"><SkeletonCard lines={2} /></div></> : (
        <>
          {open.length === 0 && history.length === 0 && <div className="card"><EmptyState icon={<Wallet size={36} />} title="Nada por aqui ainda" description="Quando a escola emitir uma mensalidade, ela aparece aqui com boleto e PIX." /></div>}
          {open.length > 0 && (
            <>
              <h3 style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-muted)', margin: '0 0 0.75rem' }}>Em aberto</h3>
              <div className="flex flex-col gap-3 mb-8">{open.map(i => <Row key={i.id} i={i} />)}</div>
            </>
          )}
          {history.length > 0 && (
            <>
              <h3 style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-muted)', margin: '0 0 0.75rem' }}>Histórico</h3>
              <div className="flex flex-col gap-3">{history.map(i => <Row key={i.id} i={i} />)}</div>
            </>
          )}
        </>
      )}

      {pixOpen && (
        <div className="dialog-overlay" onMouseDown={e => { if (e.target === e.currentTarget) setPixOpen(null); }}>
          <div className="dialog" style={{ textAlign: 'center' }}>
            <h3>PIX · {pixOpen.description}</h3>
            <p>{monthLabel(pixOpen.reference_month.slice(0, 7))} · {formatBRL(pixOpen.amount_cents - pixOpen.discount_cents)}</p>
            {pixOpen.pix_qr_code && <img src={`data:image/png;base64,${pixOpen.pix_qr_code}`} alt="QR Code PIX" style={{ width: 220, height: 220, margin: '1rem auto', display: 'block' }} />}
            <button className="btn btn-primary btn-sm" onClick={() => copyPix(pixOpen)}>{copied === pixOpen.id ? <Check size={14} /> : <Copy size={14} />} Copiar código PIX</button>
            <div className="dialog-actions" style={{ justifyContent: 'center' }}><button className="btn btn-secondary btn-sm" onClick={() => setPixOpen(null)}>Fechar</button></div>
          </div>
        </div>
      )}
    </div>
  );
}
