import { adminClient, body, handler, HttpError } from '../_lib/supabase.js';

/**
 * Cadastro self-serve: a coordenação/direção cria a conta da escola sozinha,
 * sem operador da plataforma. Nasce em trial (30 dias) com um ano letivo e o
 * primeiro admin. Sem autenticação — por isso: campos mínimos, honeypot,
 * e-mail único e registro no audit_log.
 *
 * POST { school_name, admin_name, email, password, city?, uf?, website? (honeypot) }
 */

interface Body {
  school_name: string;
  admin_name: string;
  email: string;
  password: string;
  city?: string;
  uf?: string;
  website?: string; // honeypot: humano não preenche
}

const TRIAL_DAYS = 30;

function slugify(name: string): string {
  return name
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
    .slice(0, 32) || 'escola';
}

function suffix(): string {
  return Math.random().toString(36).slice(2, 6);
}

export default handler(['POST'], async (req) => {
  const p = body<Body>(req);
  if (p.website?.trim()) return { ok: true }; // bot: finge sucesso e não cria nada

  const schoolName = (p.school_name ?? '').trim();
  const adminName = (p.admin_name ?? '').trim();
  const email = (p.email ?? '').trim().toLowerCase();
  const password = p.password ?? '';
  if (schoolName.length < 3) throw new HttpError(400, 'Informe o nome da escola.');
  if (adminName.length < 2) throw new HttpError(400, 'Informe o seu nome.');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new HttpError(400, 'E-mail inválido.');
  if (password.length < 8) throw new HttpError(400, 'A senha precisa ter ao menos 8 caracteres.');

  const db = adminClient();

  // E-mail já cadastrado em alguma escola: não revela em qual; só orienta a entrar.
  const { data: existing } = await db.from('profiles').select('id').eq('email', email).maybeSingle();
  if (existing) throw new HttpError(409, 'Este e-mail já tem acesso a uma escola. Entre pelo login ou use "Esqueci minha senha".');

  let slug = `${slugify(schoolName)}-${suffix()}`;
  for (let i = 0; i < 3; i++) {
    const { data: taken } = await db.from('schools').select('id').eq('slug', slug).maybeSingle();
    if (!taken) break;
    slug = `${slugify(schoolName)}-${suffix()}`;
  }

  const { data: school, error } = await db.from('schools').insert({
    name: schoolName,
    slug,
    city: p.city?.trim() || null,
    uf: p.uf?.trim().toUpperCase().slice(0, 2) || null,
    plan_id: 'trial',
    status: 'trial',
    trial_ends_at: new Date(Date.now() + TRIAL_DAYS * 86_400_000).toISOString(),
  }).select('id').single();
  if (error || !school) throw new HttpError(500, error?.message ?? 'Falha ao criar a escola.');

  await db.from('school_years').insert({ school_id: school.id, label: String(new Date().getFullYear()), active: true });

  const { data: created, error: uErr } = await db.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name: adminName },
  });
  if (uErr || !created.user) {
    await db.from('schools').delete().eq('id', school.id);
    throw new HttpError(400, uErr?.message?.includes('already') ? 'Este e-mail já está cadastrado. Entre pelo login.' : (uErr?.message ?? 'Falha ao criar o usuário.'));
  }
  const { error: pErr } = await db.from('profiles').insert({
    id: created.user.id, school_id: school.id, name: adminName, email, role: 'admin',
  });
  if (pErr) {
    await db.auth.admin.deleteUser(created.user.id);
    await db.from('schools').delete().eq('id', school.id);
    throw new HttpError(500, pErr.message);
  }

  await db.from('audit_log').insert({
    school_id: school.id, actor_id: created.user.id, action: 'school.self_signup', entity: 'school', entity_id: school.id,
    data: { slug, trial_days: TRIAL_DAYS },
  });

  return { ok: true, school_id: school.id };
});
