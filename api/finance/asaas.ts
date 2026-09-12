import { randomBytes } from 'node:crypto';
import { adminClient, authenticate, body, handler, HttpError, requireSchoolAdmin } from '../_lib/supabase.js';
import { Asaas } from '../_lib/asaas.js';
import type { AsaasEnv } from '../_lib/asaas.js';

/**
 * Conexão da escola com o Asaas. A chave entra aqui uma vez e fica em
 * `school_secrets` (só service_role). O front só vê "conectado / ambiente".
 *
 *   POST { action: 'connect', api_key, env: 'sandbox' | 'production' }
 *   POST { action: 'disconnect' }
 *   POST { action: 'status' } -> { connected, env, webhook_url, webhook_token }
 */
interface ConnectBody { action: 'connect'; api_key: string; env: AsaasEnv }
interface SimpleBody { action: 'disconnect' | 'status' }
type Body = ConnectBody | SimpleBody;

export default handler(['POST'], async (req) => {
  const caller = await authenticate(req);
  const admin = requireSchoolAdmin(caller);
  const db = adminClient();
  const payload = body<Body>(req);
  const appUrl = process.env.APP_URL ?? '';
  const webhookUrl = `${appUrl}/api/finance/webhook?school=${admin.school_id}`;

  if (payload.action === 'connect') {
    const key = payload.api_key?.trim();
    const env: AsaasEnv = payload.env === 'production' ? 'production' : 'sandbox';
    if (!key) throw new HttpError(400, 'Informe a chave de API do Asaas.');
    // Valida antes de guardar: chave errada não pode ficar salva.
    try {
      await new Asaas(key, env).ping();
    } catch (e) {
      throw new HttpError(400, `O Asaas recusou a chave (${env === 'sandbox' ? 'sandbox' : 'produção'}): ${e instanceof Error ? e.message : 'erro'}`);
    }
    const { data: existing } = await db.from('school_secrets').select('asaas_webhook_token').eq('school_id', admin.school_id).maybeSingle();
    const token = existing?.asaas_webhook_token ?? randomBytes(24).toString('hex');
    const { error } = await db.from('school_secrets').upsert({ school_id: admin.school_id, asaas_api_key: key, asaas_env: env, asaas_webhook_token: token });
    if (error) throw new HttpError(500, error.message);
    const { data: school } = await db.from('schools').select('finance_config').eq('id', admin.school_id).single();
    await db.from('schools').update({ finance_config: { ...(school?.finance_config ?? {}), asaas_connected: true, asaas_env: env } }).eq('id', admin.school_id);
    return { connected: true, env, webhook_url: webhookUrl, webhook_token: token };
  }

  if (payload.action === 'disconnect') {
    await db.from('school_secrets').update({ asaas_api_key: null }).eq('school_id', admin.school_id);
    const { data: school } = await db.from('schools').select('finance_config').eq('id', admin.school_id).single();
    await db.from('schools').update({ finance_config: { ...(school?.finance_config ?? {}), asaas_connected: false } }).eq('id', admin.school_id);
    return { connected: false };
  }

  if (payload.action === 'status') {
    const { data } = await db.from('school_secrets').select('asaas_api_key, asaas_env, asaas_webhook_token').eq('school_id', admin.school_id).maybeSingle();
    return {
      connected: Boolean(data?.asaas_api_key),
      env: data?.asaas_env ?? 'sandbox',
      webhook_url: webhookUrl,
      webhook_token: data?.asaas_webhook_token ?? null,
    };
  }

  throw new HttpError(400, 'Ação inválida.');
});
