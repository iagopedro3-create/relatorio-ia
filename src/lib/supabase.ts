import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;

if (!url || !key) {
  // Falha cedo e com mensagem clara: sem isso toda tela quebra de forma opaca.
  throw new Error(
    'VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY precisam estar definidas (veja .env.example).',
  );
}

export const supabase = createClient(url, key, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
});

/** Token do usuário logado, para chamar as funções em /api. */
export async function getAccessToken(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error('Sessão expirada. Entre novamente.');
  return token;
}

/**
 * Chama uma função serverless em /api com o JWT do usuário. As funções
 * validam o token, resolvem a escola e usam a service_role só do lado deles.
 */
export async function callApi<T>(path: string, body: unknown, init?: { method?: string }): Promise<T> {
  const token = await getAccessToken();
  const res = await fetch(path, {
    method: init?.method ?? 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  let json: unknown = null;
  try { json = text ? JSON.parse(text) : null; } catch { /* resposta não-JSON */ }
  if (!res.ok) {
    const message =
      (json && typeof json === 'object' && 'error' in json && typeof (json as { error: unknown }).error === 'string')
        ? (json as { error: string }).error
        : `Erro ${res.status} em ${path}`;
    throw new Error(message);
  }
  return json as T;
}
