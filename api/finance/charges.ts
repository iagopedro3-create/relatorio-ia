import { adminClient, authenticate, body, handler, HttpError, requireSchoolAdmin } from '../_lib/supabase.js';
import { asaasFor, ensureCustomer, issueInvoice, paymentPatch, requireAsaas, studentAmount } from '../_lib/finance.js';
import type { BillingRow, InvoiceRow } from '../_lib/finance.js';

/**
 * Operações de cobrança (direção). O que não precisa do Asaas (criar/editar
 * fatura local, marcar pago à mão) o front faz direto com RLS; aqui fica só o
 * que toca a API externa ou precisa de lote.
 *
 *   POST { action: 'generate_month', year_id, month: 'YYYY-MM', class_ids?, issue?: boolean }
 *        -> cria uma fatura por aluno matriculado com cobrança ativa (pula quem já tem)
 *   POST { action: 'issue', invoice_id, billing_type? }     -> cria a cobrança no Asaas
 *   POST { action: 'issue_many', invoice_ids }               -> idem, em lote (continua nos erros)
 *   POST { action: 'cancel', invoice_id }                    -> apaga no Asaas e cancela aqui
 *   POST { action: 'sync', invoice_id }                      -> relê o status no Asaas
 */
interface GenerateBody { action: 'generate_month'; year_id: string; month: string; class_ids?: string[]; issue?: boolean }
interface OneBody { action: 'issue' | 'cancel' | 'sync'; invoice_id: string; billing_type?: 'UNDEFINED' | 'BOLETO' | 'PIX' | 'CREDIT_CARD' }
interface ManyBody { action: 'issue_many'; invoice_ids: string[] }
type Body = GenerateBody | OneBody | ManyBody;

const MONTHS = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

export default handler(['POST'], async (req) => {
  const caller = await authenticate(req);
  const admin = requireSchoolAdmin(caller);
  const db = adminClient();
  const payload = body<Body>(req);
  const schoolId = admin.school_id;

  const { data: school } = await db.from('schools').select('finance_config, feature_overrides, plan_id').eq('id', schoolId).single();
  const cfg = (school?.finance_config ?? {}) as { due_day?: number; fine_pct?: number; interest_pct_month?: number; discount_days?: number };

  const loadInvoice = async (id: string): Promise<InvoiceRow> => {
    const { data } = await db.from('invoices').select('id, school_id, student_id, description, amount_cents, discount_cents, due_date, status, asaas_payment_id').eq('id', id).eq('school_id', schoolId).maybeSingle();
    if (!data) throw new HttpError(404, 'Cobrança não encontrada.');
    return data as InvoiceRow;
  };

  const issueOne = async (inv: InvoiceRow, billingType: OneBody['billing_type']) => {
    const asaas = requireAsaas(await asaasFor(db, schoolId));
    const [{ data: billing }, { data: student }] = await Promise.all([
      db.from('student_billing').select('student_id, payer_name, payer_cpf_cnpj, payer_email, payer_phone, asaas_customer_id').eq('student_id', inv.student_id).maybeSingle(),
      db.from('students').select('name').eq('id', inv.student_id).single(),
    ]);
    if (!billing) throw new HttpError(400, `${student?.name ?? 'Aluno'}: configure o pagador em Financeiro → Alunos.`);
    const customerId = await ensureCustomer(db, asaas, billing as BillingRow, student?.name ?? 'Aluno');
    return issueInvoice(db, asaas, inv, customerId, cfg, billingType ?? 'UNDEFINED');
  };

  if (payload.action === 'generate_month') {
    const m = /^(\d{4})-(\d{2})$/.exec(payload.month ?? '');
    if (!m || !payload.year_id) throw new HttpError(400, 'Informe ano letivo e mês (YYYY-MM).');
    const [, y, mo] = m;
    const monthIdx = Number(mo) - 1;
    const referenceMonth = `${y}-${mo}-01`;
    const dueDay = Math.min(28, Math.max(1, cfg.due_day ?? 10));
    const dueDate = `${y}-${mo}-${String(dueDay).padStart(2, '0')}`;
    const description = `Mensalidade ${MONTHS[monthIdx]}/${y}`;

    // Alunos com matrícula ativa no ano (nas turmas pedidas, se houver filtro).
    let classQ = db.from('classes').select('id').eq('year_id', payload.year_id).eq('school_id', schoolId);
    if (payload.class_ids?.length) classQ = classQ.in('id', payload.class_ids);
    const { data: classes } = await classQ;
    const classIds = (classes ?? []).map(c => c.id);
    if (classIds.length === 0) return { created: 0, skipped: 0, errors: [] as string[] };

    const { data: enrollments } = await db.from('enrollments').select('student_id').in('class_id', classIds).eq('active', true);
    const studentIds = [...new Set((enrollments ?? []).map(e => e.student_id))];
    if (studentIds.length === 0) return { created: 0, skipped: 0, errors: [] as string[] };

    const [{ data: billings }, { data: plans }, { data: existing }, { data: students }] = await Promise.all([
      db.from('student_billing').select('*').in('student_id', studentIds).eq('active', true),
      db.from('tuition_plans').select('*').eq('year_id', payload.year_id).eq('active', true),
      db.from('invoices').select('student_id').eq('school_id', schoolId).eq('reference_month', referenceMonth).eq('description', description),
      db.from('students').select('id, name').in('id', studentIds),
    ]);
    const already = new Set((existing ?? []).map(i => i.student_id));
    const planById = new Map((plans ?? []).map(p => [p.id, p]));
    const nameById = new Map((students ?? []).map(s => [s.id, s.name]));

    const rows: Record<string, unknown>[] = [];
    const errors: string[] = [];
    let skipped = 0;
    for (const b of billings ?? []) {
      if (already.has(b.student_id)) { skipped++; continue; }
      const plan = b.tuition_plan_id ? planById.get(b.tuition_plan_id) ?? null : null;
      const { amount_cents, discount_cents } = studentAmount(plan, b);
      if (amount_cents <= 0) { errors.push(`${nameById.get(b.student_id) ?? b.student_id}: sem valor de mensalidade (plano ou valor próprio).`); continue; }
      rows.push({
        school_id: schoolId, student_id: b.student_id, year_id: payload.year_id, reference_month: referenceMonth,
        description, amount_cents, discount_cents, due_date: dueDate, status: 'pending', created_by: admin.id,
      });
    }
    const noBilling = studentIds.filter(id => !(billings ?? []).some(b => b.student_id === id) && !already.has(id));
    for (const id of noBilling) errors.push(`${nameById.get(id) ?? id}: sem cobrança configurada (Financeiro → Alunos).`);

    let created: { id: string }[] = [];
    if (rows.length > 0) {
      const { data, error } = await db.from('invoices').insert(rows).select('id, school_id, student_id, description, amount_cents, discount_cents, due_date, status, asaas_payment_id');
      if (error) throw new HttpError(500, error.message);
      created = data ?? [];
    }

    let issued = 0;
    if (payload.issue && created.length > 0) {
      for (const inv of created as InvoiceRow[]) {
        try { await issueOne(inv, 'UNDEFINED'); issued++; } catch (e) { errors.push(`${nameById.get(inv.student_id) ?? inv.student_id}: ${e instanceof Error ? e.message : 'falha ao emitir'}`); }
      }
    }
    return { created: created.length, issued, skipped, errors };
  }

  if (payload.action === 'issue') {
    const inv = await loadInvoice(payload.invoice_id);
    if (inv.status === 'canceled') throw new HttpError(400, 'Cobrança cancelada.');
    return { invoice: await issueOne(inv, payload.billing_type) };
  }

  if (payload.action === 'issue_many') {
    const errors: string[] = [];
    let issued = 0;
    for (const id of payload.invoice_ids ?? []) {
      try {
        const inv = await loadInvoice(id);
        if (inv.asaas_payment_id || inv.status === 'canceled') continue;
        await issueOne(inv, 'UNDEFINED');
        issued++;
      } catch (e) {
        errors.push(e instanceof Error ? e.message : 'falha');
      }
    }
    return { issued, errors };
  }

  if (payload.action === 'cancel') {
    const inv = await loadInvoice(payload.invoice_id);
    if (inv.status === 'paid') throw new HttpError(400, 'Cobrança paga não pode ser cancelada — faça o estorno no Asaas.');
    if (inv.asaas_payment_id) {
      const asaas = requireAsaas(await asaasFor(db, schoolId));
      await asaas.deletePayment(inv.asaas_payment_id);
    }
    const { data, error } = await db.from('invoices').update({ status: 'canceled' }).eq('id', inv.id).select('*').single();
    if (error) throw new HttpError(500, error.message);
    return { invoice: data };
  }

  if (payload.action === 'sync') {
    const inv = await loadInvoice(payload.invoice_id);
    if (!inv.asaas_payment_id) throw new HttpError(400, 'Esta cobrança ainda não foi emitida no Asaas.');
    const asaas = requireAsaas(await asaasFor(db, schoolId));
    const p = await asaas.getPayment(inv.asaas_payment_id);
    const { data, error } = await db.from('invoices').update(paymentPatch(p)).eq('id', inv.id).select('*').single();
    if (error) throw new HttpError(500, error.message);
    return { invoice: data };
  }

  throw new HttpError(400, 'Ação inválida.');
});
