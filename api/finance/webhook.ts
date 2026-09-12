import type { VercelRequest, VercelResponse } from '@vercel/node';
import { adminClient } from '../_lib/supabase.js';
import { paymentPatch } from '../_lib/finance.js';
import type { AsaasPayment } from '../_lib/asaas.js';

/**
 * Webhook do Asaas, um por escola: `/api/finance/webhook?school=<id>`.
 * Autentica pelo header `asaas-access-token`, que a escola cadastra no Asaas
 * com o token que mostramos em Financeiro → Configurações.
 *
 * Idempotente: cada `evt_` é gravado em finance_webhook_events; repetido = 200 sem efeito.
 * Sempre responde 200 quando o evento é nosso — o Asaas pausa a fila em erro.
 */
interface AsaasEvent { id: string; event: string; payment?: AsaasPayment }

export default async function webhook(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).end();
  const schoolId = typeof req.query.school === 'string' ? req.query.school : '';
  const token = req.headers['asaas-access-token'];
  if (!schoolId || typeof token !== 'string' || !token) return res.status(401).json({ error: 'Sem escola ou token.' });

  const db = adminClient();
  const { data: secret } = await db.from('school_secrets').select('asaas_webhook_token').eq('school_id', schoolId).maybeSingle();
  if (!secret?.asaas_webhook_token || secret.asaas_webhook_token !== token) return res.status(401).json({ error: 'Token inválido.' });

  const evt = (typeof req.body === 'string' ? JSON.parse(req.body) : req.body) as AsaasEvent;
  if (!evt?.id || !evt.event) return res.status(400).json({ error: 'Evento malformado.' });

  // Idempotência.
  const { error: dupErr } = await db.from('finance_webhook_events').insert({
    id: evt.id, school_id: schoolId, event: evt.event, payment_id: evt.payment?.id ?? null, payload: evt as unknown as Record<string, unknown>,
  });
  if (dupErr) return res.status(200).json({ ok: true, duplicate: true });

  const p = evt.payment;
  if (!p?.id || !evt.event.startsWith('PAYMENT_')) return res.status(200).json({ ok: true, ignored: true });

  // Localiza a fatura: pelo id do pagamento ou pela nossa referência externa.
  let q = db.from('invoices').select('id, status').eq('school_id', schoolId).eq('asaas_payment_id', p.id).maybeSingle();
  let { data: inv } = await q;
  if (!inv && p.externalReference) {
    q = db.from('invoices').select('id, status').eq('school_id', schoolId).eq('id', p.externalReference).maybeSingle();
    ({ data: inv } = await q);
  }
  if (!inv) return res.status(200).json({ ok: true, unmatched: true });

  const patch: Record<string, unknown> = paymentPatch({ ...p, deleted: evt.event === 'PAYMENT_DELETED' });
  // Não voltamos uma fatura já paga para pendente por um evento atrasado de "atualização".
  if (inv.status === 'paid' && patch.status === 'pending') delete patch.status;
  // Não sobrescrevemos o PIX guardado com vazio.
  delete patch.pix_payload; delete patch.pix_qr_code;

  const { error } = await db.from('invoices').update(patch).eq('id', inv.id);
  if (error) {
    console.error('[asaas webhook]', error);
    return res.status(500).json({ error: error.message });
  }
  return res.status(200).json({ ok: true });
}
