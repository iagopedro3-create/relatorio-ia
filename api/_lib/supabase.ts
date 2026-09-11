import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * Lado do servidor. A service_role NUNCA sai daqui: as funções em /api são o
 * único lugar que a enxerga. O front só tem a chave publicável + RLS.
 */

function env(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Variável de ambiente ausente: ${name}`);
  return v;
}

let admin: SupabaseClient | null = null;

/** Cliente com service_role (ignora RLS). Use só depois de autenticar o chamador. */
export function adminClient(): SupabaseClient {
  if (!admin) {
    admin = createClient(env('SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'), {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return admin;
}

export interface Caller {
  userId: string;
  email: string | null;
  profile: {
    id: string;
    school_id: string;
    name: string;
    role: 'admin' | 'coordinator' | 'teacher' | 'guardian';
    managed_level: 'infantil' | 'fundamental' | null;
    specialty: 'english' | 'pe' | null;
    active: boolean;
  } | null;
  isPlatformAdmin: boolean;
}

export class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

/** Valida o JWT do header Authorization e carrega perfil + flag de admin da plataforma. */
export async function authenticate(req: VercelRequest): Promise<Caller> {
  const header = req.headers.authorization ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) throw new HttpError(401, 'Não autenticado.');

  const db = adminClient();
  const { data, error } = await db.auth.getUser(token);
  if (error || !data.user) throw new HttpError(401, 'Sessão inválida. Entre novamente.');

  const [{ data: profile }, { data: pa }] = await Promise.all([
    db.from('profiles').select('id, school_id, name, role, managed_level, specialty, active').eq('id', data.user.id).maybeSingle(),
    db.from('platform_admins').select('user_id').eq('user_id', data.user.id).maybeSingle(),
  ]);

  return {
    userId: data.user.id,
    email: data.user.email ?? null,
    profile: (profile as Caller['profile']) ?? null,
    isPlatformAdmin: Boolean(pa),
  };
}

export function requireProfile(caller: Caller): NonNullable<Caller['profile']> {
  if (!caller.profile || !caller.profile.active) throw new HttpError(403, 'Usuário sem perfil ativo em nenhuma escola.');
  return caller.profile;
}

export function requireSchoolAdmin(caller: Caller) {
  const p = requireProfile(caller);
  if (p.role !== 'admin') throw new HttpError(403, 'Apenas a direção pode fazer isso.');
  return p;
}

export function requirePlatformAdmin(caller: Caller) {
  if (!caller.isPlatformAdmin) throw new HttpError(403, 'Acesso restrito à operação da plataforma.');
}

/** Envelopa um handler: JSON, tratamento de erro e método permitido. */
export function handler(
  methods: string[],
  fn: (req: VercelRequest, res: VercelResponse) => Promise<unknown>,
) {
  return async (req: VercelRequest, res: VercelResponse) => {
    if (!methods.includes(req.method ?? '')) {
      res.setHeader('Allow', methods.join(', '));
      return res.status(405).json({ error: 'Método não permitido.' });
    }
    try {
      const out = await fn(req, res);
      if (!res.writableEnded) res.status(200).json(out ?? { ok: true });
    } catch (err) {
      const status = err instanceof HttpError ? err.status : 500;
      const message = err instanceof Error ? err.message : 'Erro interno.';
      if (status === 500) console.error(err);
      res.status(status).json({ error: message });
    }
  };
}

/** Body já parseado pelo Vercel, ou string quando o content-type não é JSON. */
export function body<T>(req: VercelRequest): T {
  const b = req.body;
  if (typeof b === 'string') {
    try { return JSON.parse(b) as T; } catch { throw new HttpError(400, 'JSON inválido.'); }
  }
  return (b ?? {}) as T;
}
