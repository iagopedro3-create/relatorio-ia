import { adminClient, authenticate, body, handler, HttpError, requireSchoolAdmin } from '../_lib/supabase.js';

/**
 * Gestão de usuários DA ESCOLA, pela direção. Precisa de service_role porque
 * cria/apaga o auth.user — por isso é função e não query do front.
 *
 *   POST   { action: 'create', name, email, role, managed_level?, specialty?, password?, student_ids? }
 *   POST   { action: 'reset_password', user_id }      -> manda e-mail de redefinição
 *   POST   { action: 'set_password', user_id, password }
 *   POST   { action: 'deactivate', user_id }  /  { action: 'activate', user_id }
 *   POST   { action: 'delete', user_id }
 */

type Role = 'admin' | 'coordinator' | 'teacher' | 'guardian';

interface CreateBody {
  action: 'create';
  name: string;
  email: string;
  role: Role;
  managed_level?: 'infantil' | 'fundamental' | null;
  specialty?: 'english' | 'pe' | null;
  password?: string;
  /** Para responsáveis: alunos vinculados. */
  student_ids?: string[];
}

interface UserBody {
  action: 'reset_password' | 'set_password' | 'deactivate' | 'activate' | 'delete';
  user_id: string;
  password?: string;
}

type Body = CreateBody | UserBody;

function randomPassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  let out = '';
  for (let i = 0; i < 12; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

export default handler(['POST'], async (req) => {
  const caller = await authenticate(req);
  const admin = requireSchoolAdmin(caller);
  const db = adminClient();
  const payload = body<Body>(req);

  if (payload.action === 'create') {
    const { name, email, role } = payload;
    if (!name?.trim() || !email?.trim() || !role) throw new HttpError(400, 'Nome, e-mail e papel são obrigatórios.');
    if (!['admin', 'coordinator', 'teacher', 'guardian'].includes(role)) throw new HttpError(400, 'Papel inválido.');

    // Limite de usuários do plano.
    const { data: school } = await db.from('schools').select('plan_id').eq('id', admin.school_id).single();
    if (school?.plan_id) {
      const { data: plan } = await db.from('plans').select('max_users').eq('id', school.plan_id).maybeSingle();
      if (plan?.max_users) {
        const { count } = await db.from('profiles').select('id', { count: 'exact', head: true })
          .eq('school_id', admin.school_id).eq('active', true).neq('role', 'guardian');
        if (role !== 'guardian' && (count ?? 0) >= plan.max_users) {
          throw new HttpError(403, `O plano permite até ${plan.max_users} usuários da equipe.`);
        }
      }
    }

    const password = payload.password?.trim() || randomPassword();
    const { data: created, error } = await db.auth.admin.createUser({
      email: email.trim().toLowerCase(),
      password,
      email_confirm: true,
      user_metadata: { name: name.trim() },
    });
    if (error || !created.user) {
      throw new HttpError(400, error?.message?.includes('already') ? 'Já existe um usuário com este e-mail.' : (error?.message ?? 'Falha ao criar usuário.'));
    }

    const { error: pErr } = await db.from('profiles').insert({
      id: created.user.id,
      school_id: admin.school_id,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      role,
      managed_level: role === 'coordinator' ? (payload.managed_level ?? null) : null,
      specialty: role === 'teacher' ? (payload.specialty ?? null) : null,
    });
    if (pErr) {
      await db.auth.admin.deleteUser(created.user.id);
      throw new HttpError(500, `Falha ao criar perfil: ${pErr.message}`);
    }

    if (role === 'guardian' && payload.student_ids?.length) {
      await db.from('student_guardians').insert(
        payload.student_ids.map(student_id => ({ school_id: admin.school_id, student_id, profile_id: created.user!.id })),
      );
    }

    // A senha inicial volta UMA vez para a direção repassar. Não é guardada.
    return { user_id: created.user.id, initial_password: payload.password ? undefined : password };
  }

  // Ações sobre usuário existente: só dentro da própria escola.
  const { data: target } = await db.from('profiles').select('id, school_id, role').eq('id', payload.user_id).maybeSingle();
  if (!target || target.school_id !== admin.school_id) throw new HttpError(404, 'Usuário não encontrado.');
  if (target.id === admin.id && ['deactivate', 'delete'].includes(payload.action)) {
    throw new HttpError(400, 'Você não pode desativar o próprio usuário.');
  }

  switch (payload.action) {
    case 'reset_password': {
      const { data: u } = await db.from('profiles').select('email').eq('id', target.id).single();
      const redirectTo = process.env.APP_URL ? `${process.env.APP_URL}/login` : undefined;
      const { error } = await db.auth.resetPasswordForEmail(u!.email, { redirectTo });
      if (error) throw new HttpError(500, error.message);
      return { ok: true };
    }
    case 'set_password': {
      if (!payload.password || payload.password.length < 8) throw new HttpError(400, 'Senha precisa ter ao menos 8 caracteres.');
      const { error } = await db.auth.admin.updateUserById(target.id, { password: payload.password });
      if (error) throw new HttpError(500, error.message);
      return { ok: true };
    }
    case 'deactivate':
    case 'activate': {
      const active = payload.action === 'activate';
      await db.from('profiles').update({ active }).eq('id', target.id);
      // Usuário desativado não consegue logar: banimos no Auth também.
      await db.auth.admin.updateUserById(target.id, { ban_duration: active ? 'none' : '87600h' });
      return { ok: true };
    }
    case 'delete': {
      const { error } = await db.auth.admin.deleteUser(target.id); // cascade apaga o profile
      if (error) throw new HttpError(500, error.message);
      return { ok: true };
    }
    default:
      throw new HttpError(400, 'Ação inválida.');
  }
});
