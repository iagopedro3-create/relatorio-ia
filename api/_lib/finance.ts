import type { SupabaseClient } from '@supabase/supabase-js';
import { Asaas, mapStatus, toCents, fromCents } from './asaas.js';
import type { AsaasEnv, AsaasPayment } from './asaas.js';
import { HttpError } from './supabase.js';

/** Carrega o cliente Asaas da escola (ou null se não conectou). */
export async function asaasFor(db: SupabaseClient, schoolId: string): Promise<{ client: Asaas; env: AsaasEnv } | null> {
  const { data } = await db.from('school_secrets').select('asaas_api_key, asaas_env').eq('school_id', schoolId).maybeSingle();
  if (!data?.asaas_api_key) return null;
  return { client: new Asaas(data.asaas_api_key, data.asaas_env as AsaasEnv), env: data.asaas_env as AsaasEnv };
}

export function requireAsaas(x: Awaited<ReturnType<typeof asaasFor>>) {
  if (!x) throw new HttpError(400, 'A escola ainda não conectou a conta Asaas (Financeiro → Configurações).');
  return x.client;
}

export interface InvoiceRow {
  id: string;
  school_id: string;
  student_id: string;
  description: string;
  amount_cents: number;
  discount_cents: number;
  due_date: string;
  status: string;
  asaas_payment_id: string | null;
}

export interface BillingRow {
  student_id: string;
  payer_name: string | null;
  payer_cpf_cnpj: string | null;
  payer_email: string | null;
  payer_phone: string | null;
  asaas_customer_id: string | null;
}

/** Garante o cliente (pagador) no Asaas e grava o id. */
export async function ensureCustomer(db: SupabaseClient, asaas: Asaas, billing: BillingRow, studentName: string): Promise<string> {
  if (billing.asaas_customer_id) return billing.asaas_customer_id;
  const cpf = (billing.payer_cpf_cnpj ?? '').replace(/\D/g, '');
  if (!billing.payer_name?.trim() || !cpf) {
    throw new HttpError(400, `${studentName}: informe nome e CPF/CNPJ do pagador antes de emitir a cobrança.`);
  }
  const existing = await asaas.findCustomerByCpf(cpf);
  const customer = existing ?? await asaas.createCustomer({
    name: billing.payer_name.trim(),
    cpfCnpj: cpf,
    email: billing.payer_email?.trim() || undefined,
    mobilePhone: billing.payer_phone?.replace(/\D/g, '') || undefined,
    externalReference: billing.student_id,
  });
  await db.from('student_billing').update({ asaas_customer_id: customer.id }).eq('student_id', billing.student_id);
  return customer.id;
}

/** Cria a cobrança no Asaas para uma fatura local e grava links/status. */
export async function issueInvoice(
  db: SupabaseClient,
  asaas: Asaas,
  invoice: InvoiceRow,
  customerId: string,
  cfg: { fine_pct?: number; interest_pct_month?: number; discount_days?: number },
  billingType: 'UNDEFINED' | 'BOLETO' | 'PIX' | 'CREDIT_CARD' = 'UNDEFINED',
) {
  if (invoice.asaas_payment_id) throw new HttpError(400, 'Esta cobrança já foi emitida.');
  const value = fromCents(invoice.amount_cents);
  const payment = await asaas.createPayment({
    customer: customerId,
    billingType,
    value,
    dueDate: invoice.due_date,
    description: invoice.description,
    externalReference: invoice.id,
    discount: invoice.discount_cents > 0 ? { value: fromCents(invoice.discount_cents), dueDateLimitDays: cfg.discount_days ?? 0, type: 'FIXED' } : undefined,
    fine: cfg.fine_pct ? { value: cfg.fine_pct, type: 'PERCENTAGE' } : undefined,
    interest: cfg.interest_pct_month ? { value: cfg.interest_pct_month } : undefined,
  });
  const pix = billingType === 'PIX' || billingType === 'UNDEFINED' ? await asaas.pixQrCode(payment.id) : null;
  const patch = paymentPatch(payment, pix);
  const { data, error } = await db.from('invoices').update(patch).eq('id', invoice.id).select('*').single();
  if (error) throw new HttpError(500, error.message);
  return data;
}

/** Campos da fatura derivados de um pagamento do Asaas. */
export function paymentPatch(p: AsaasPayment, pix?: { encodedImage: string; payload: string } | null) {
  const status = p.deleted ? 'canceled' : mapStatus(p.status);
  const paidDate = p.clientPaymentDate ?? p.paymentDate ?? p.confirmedDate ?? null;
  return {
    asaas_payment_id: p.id,
    status,
    billing_type: p.billingType,
    invoice_url: p.invoiceUrl ?? null,
    bank_slip_url: p.bankSlipUrl ?? null,
    ...(pix ? { pix_payload: pix.payload, pix_qr_code: pix.encodedImage } : {}),
    ...(status === 'paid' ? { paid_at: paidDate ? new Date(paidDate + 'T12:00:00').toISOString() : new Date().toISOString(), paid_amount_cents: toCents(p.value), payment_method: p.billingType } : {}),
    ...(status === 'pending' || status === 'overdue' ? { paid_at: null, paid_amount_cents: null } : {}),
  };
}

/** Valor final de um aluno: plano (ou valor próprio) − bolsa % − desconto fixo. */
export function studentAmount(plan: { amount_cents: number; discount_cents: number } | null, billing: { custom_amount_cents: number | null; discount_cents: number; scholarship_pct: number }) {
  const base = billing.custom_amount_cents ?? plan?.amount_cents ?? 0;
  const afterScholarship = Math.round(base * (1 - Number(billing.scholarship_pct) / 100));
  const amount = Math.max(0, afterScholarship - billing.discount_cents);
  return { amount_cents: amount, discount_cents: plan?.discount_cents ?? 0 };
}
