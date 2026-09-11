import { adminClient, authenticate, body, handler, HttpError, requirePlatformAdmin } from '../_lib/supabase';

/**
 * Backoffice da plataforma (quem opera o SaaS). Tudo aqui exige
 * `platform_admins` e roda com service_role.
 *
 *   GET                                  -> lista escolas com contagens e uso de IA no mês
 *   POST { action: 'create', ... }       -> cria escola + ano letivo + primeiro admin
 *   POST { action: 'update', school_id, patch: { plan_id?, status?, trial_ends_at?, feature_overrides?, name?, slug? } }
 *   POST { action: 'usage', school_id }  -> uso de IA dos últimos 90 dias
 */

interface CreateBody {
  action: 'create';
  name: string;
  slug: string;
  plan_id?: string;
  trial_days?: number;
  year_label?: string;
  admin_name: string;
  admin_email: string;
  admin_password?: string;
}

interface UpdateBody {
  action: 'update';
  school_id: string;
  patch: Record<string, unknown>;
}

interface UsageBody {
  action: 'usage';
  school_id: string;
}

type Body = CreateBody | UpdateBody | UsageBody;

const PATCHABLE = ['plan_id', 'status', 'trial_ends_at', 'feature_overrides', 'name', 'slug', 'dpa_signed_at', 'legal_name', 'cnpj', 'city', 'uf'];

function randomPassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  let out = '';
  for (let i = 0; i < 12; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

export default handler(['GET', 'POST'], async (req) => {
  const caller = await authenticate(req);
  requirePlatformAdmin(caller);
  const db = adminClient();

  if (req.method === 'GET') {
    const [{ data: schools }, { data: plans }] = await Promise.all([
      db.from('schools').select('*').order('created_at', { ascending: false }),
      db.from('plans').select('*').order('sort_order'),
    ]);
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
    const rows = await Promise.all((schools ?? []).map(async (s) => {
      const [students, users, ai] = await Promise.all([
        db.from('students').select('id', { count: 'exact', head: true }).eq('school_id', s.id).eq('active', true),
        db.from('profiles').select('id', { count: 'exact', head: true }).eq('school_id', s.id).eq('active', true),
        db.from('ai_usage').select('id', { count: 'exact', head: true }).eq('school_id', s.id).eq('ok', true).gte('created_at', monthStart),
      ]);
      return { ...s, students_count: students.count ?? 0, users_count: users.count ?? 0, ai_month: ai.count ?? 0 };
    }));
    return { schools: rows, plans: plans ?? [] };
  }

  const payload = body<Body>(req);

  if (payload.action === 'create') {
    const { name, slug, admin_name, admin_email } = payload;
    if (!name?.trim() || !slug?.trim() || !admin_name?.trim() || !admin_email?.trim()) {
      throw new HttpError(400, 'Nome, slug e dados do primeiro admin são obrigatórios.');
    }
    if (!/^[a-z0-9-]{3,40}$/.test(slug)) throw new HttpError(400, 'Slug: só letras minúsculas, números e hífen (3 a 40).');

    const trialDays = payload.trial_days ?? 14;
    const { data: school, error } = await db.from('schools').insert({
      name: name.trim(),
      slug,
      plan_id: payload.plan_id ?? 'trial',
      status: 'trial',
      trial_ends_at: new Date(Date.now() + trialDays * 86_400_000).toISOString(),
    }).select('*').single();
    if (error || !school) throw new HttpError(400, error?.message ?? 'Falha ao criar escola.');

    const yearLabel = payload.year_label ?? String(new Date().getFullYear());
    await db.from('school_years').insert({ school_id: school.id, label: yearLabel, active: true });

    const password = payload.admin_password?.trim() || randomPassword();
    const { data: created, error: uErr } = await db.auth.admin.createUser({
      email: admin_email.trim().toLowerCase(),
      password,
      email_confirm: true,
      user_metadata: { name: admin_name.trim() },
    });
    if (uErr || !created.user) {
      await db.from('schools').delete().eq('id', school.id);
      throw new HttpError(400, uErr?.message ?? 'Falha ao criar o usuário admin.');
    }
    const { error: pErr } = await db.from('profiles').insert({
      id: created.user.id,
      school_id: school.id,
      name: admin_name.trim(),
      email: admin_email.trim().toLowerCase(),
      role: 'admin',
    });
    if (pErr) {
      await db.auth.admin.deleteUser(created.user.id);
      await db.from('schools').delete().eq('id', school.id);
      throw new HttpError(500, pErr.message);
    }

    return { school, admin_user_id: created.user.id, initial_password: payload.admin_password ? undefined : password };
  }

  if (payload.action === 'update') {
    const patch: Record<string, unknown> = {};
    for (const k of PATCHABLE) if (k in payload.patch) patch[k] = payload.patch[k];
    if (Object.keys(patch).length === 0) throw new HttpError(400, 'Nada para atualizar.');
    const { data, error } = await db.from('schools').update(patch).eq('id', payload.school_id).select('*').single();
    if (error) throw new HttpError(400, error.message);
    return { school: data };
  }

  if (payload.action === 'usage') {
    const since = new Date(Date.now() - 90 * 86_400_000).toISOString();
    const { data } = await db.from('ai_usage')
      .select('feature, model, ok, input_tokens, output_tokens, latency_ms, created_at')
      .eq('school_id', payload.school_id).gte('created_at', since)
      .order('created_at', { ascending: false }).limit(500);
    return { usage: data ?? [] };
  }

  throw new HttpError(400, 'Ação inválida.');
});
