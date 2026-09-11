import Stripe from 'stripe';
import { adminClient, authenticate, body, handler, HttpError, requireSchoolAdmin } from '../_lib/supabase.js';

/**
 * Cria uma sessão de checkout do Stripe para a escola assinar um plano.
 * A direção chama, escolhe o plano, e volta para /settings após pagar.
 *
 *   POST { plan_id }  -> { url }
 *
 * Env: STRIPE_SECRET_KEY, STRIPE_PRICES = {"essencial":"price_...","completo":"price_..."}, APP_URL.
 * Sem STRIPE_SECRET_KEY, a cobrança é manual (backoffice) e esta rota responde 501.
 */
export default handler(['POST'], async (req) => {
  const caller = await authenticate(req);
  const admin = requireSchoolAdmin(caller);

  const secret = process.env.STRIPE_SECRET_KEY;
  if (!secret) throw new HttpError(501, 'Cobrança online não configurada. Fale com o suporte.');
  const prices = JSON.parse(process.env.STRIPE_PRICES ?? '{}') as Record<string, string>;
  const { plan_id } = body<{ plan_id: string }>(req);
  const price = prices[plan_id];
  if (!price) throw new HttpError(400, 'Plano sem preço configurado.');

  const db = adminClient();
  const { data: school } = await db.from('schools').select('id, name, slug, billing_customer_id').eq('id', admin.school_id).single();
  if (!school) throw new HttpError(404, 'Escola não encontrada.');

  const stripe = new Stripe(secret);
  let customerId = school.billing_customer_id as string | null;
  if (!customerId) {
    const customer = await stripe.customers.create({
      name: school.name,
      email: caller.email ?? undefined,
      metadata: { school_id: school.id, slug: school.slug },
    });
    customerId = customer.id;
    await db.from('schools').update({ billing_customer_id: customerId }).eq('id', school.id);
  }

  const appUrl = process.env.APP_URL ?? 'http://localhost:5173';
  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer: customerId,
    line_items: [{ price, quantity: 1 }],
    success_url: `${appUrl}/settings?billing=success`,
    cancel_url: `${appUrl}/settings?billing=cancel`,
    metadata: { school_id: school.id, plan_id },
    subscription_data: { metadata: { school_id: school.id, plan_id } },
    locale: 'pt-BR',
  });

  return { url: session.url };
});
