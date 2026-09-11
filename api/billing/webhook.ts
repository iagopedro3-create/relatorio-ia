import Stripe from 'stripe';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { adminClient } from '../_lib/supabase.js';

/**
 * Webhook do Stripe: mantém `schools.status` / `plan_id` em dia.
 *
 *   checkout.session.completed            -> active + plan_id
 *   customer.subscription.updated/deleted -> active | past_due | canceled
 *   invoice.payment_failed                -> past_due
 *
 * Verifica a assinatura com STRIPE_WEBHOOK_SECRET; sem ela, recusa tudo.
 * Precisa do corpo cru, por isso não usa o `handler()` genérico.
 */
export const config = { api: { bodyParser: false } };

async function rawBody(req: VercelRequest): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  return Buffer.concat(chunks);
}

const STATUS_MAP: Record<string, 'active' | 'past_due' | 'canceled' | 'suspended'> = {
  active: 'active',
  trialing: 'active',
  past_due: 'past_due',
  unpaid: 'suspended',
  canceled: 'canceled',
  incomplete_expired: 'canceled',
};

export default async function webhook(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).end();
  const secret = process.env.STRIPE_SECRET_KEY;
  const whSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret || !whSecret) return res.status(501).json({ error: 'Stripe não configurado.' });

  const stripe = new Stripe(secret);
  let event: Stripe.Event;
  try {
    const sig = req.headers['stripe-signature'];
    if (!sig || Array.isArray(sig)) throw new Error('sem assinatura');
    event = stripe.webhooks.constructEvent(await rawBody(req), sig, whSecret);
  } catch (err) {
    return res.status(400).json({ error: `Assinatura inválida: ${err instanceof Error ? err.message : 'erro'}` });
  }

  const db = adminClient();

  const bySchool = async (schoolId: string | undefined, patch: Record<string, unknown>) => {
    if (!schoolId) return;
    await db.from('schools').update(patch).eq('id', schoolId);
  };
  const byCustomer = async (customerId: string | Stripe.Customer | Stripe.DeletedCustomer | null, patch: Record<string, unknown>) => {
    const id = typeof customerId === 'string' ? customerId : customerId?.id;
    if (!id) return;
    await db.from('schools').update(patch).eq('billing_customer_id', id);
  };

  switch (event.type) {
    case 'checkout.session.completed': {
      const s = event.data.object;
      await bySchool(s.metadata?.school_id, {
        status: 'active',
        plan_id: s.metadata?.plan_id ?? undefined,
        billing_subscription_id: typeof s.subscription === 'string' ? s.subscription : s.subscription?.id ?? null,
        trial_ends_at: null,
      });
      break;
    }
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted': {
      const sub = event.data.object;
      const status = STATUS_MAP[sub.status] ?? 'past_due';
      const patch: Record<string, unknown> = { status, billing_subscription_id: status === 'canceled' ? null : sub.id };
      if (sub.metadata?.plan_id && status === 'active') patch.plan_id = sub.metadata.plan_id;
      if (sub.metadata?.school_id) await bySchool(sub.metadata.school_id, patch);
      else await byCustomer(sub.customer, patch);
      break;
    }
    case 'invoice.payment_failed': {
      const inv = event.data.object;
      await byCustomer(inv.customer, { status: 'past_due' });
      break;
    }
    default:
      break;
  }

  return res.status(200).json({ received: true });
}
