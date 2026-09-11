import { useCallback, useEffect, useRef, useState } from 'react';

interface Snapshot<T> {
  data: T;
  error: string | null;
  /** Chave (deps + contador de reload) que produziu este snapshot. */
  loadedKey: string | null;
}

/**
 * Carrega dados assíncronos com estado de loading/erro e um `reload()`.
 *
 * `loading` é derivado (a chave atual ainda não foi carregada), então nenhum
 * setState roda de forma síncrona dentro do efeito — só depois do await.
 * Respostas de chamadas antigas são ignoradas quando as deps mudam rápido.
 */
export function useAsync<T>(fn: () => Promise<T>, deps: unknown[], initial: T) {
  const [snap, setSnap] = useState<Snapshot<T>>({ data: initial, error: null, loadedKey: null });
  const [reloadCount, setReloadCount] = useState(0);
  const fnRef = useRef(fn);
  useEffect(() => { fnRef.current = fn; });

  const key = `${JSON.stringify(deps)}#${reloadCount}`;

  useEffect(() => {
    let active = true;
    fnRef.current().then(
      data => { if (active) setSnap({ data, error: null, loadedKey: key }); },
      e => { if (active) setSnap(prev => ({ data: prev.data, error: e instanceof Error ? e.message : String(e), loadedKey: key })); },
    );
    return () => { active = false; };
  }, [key]);

  const reload = useCallback(async () => { setReloadCount(c => c + 1); }, []);
  const setData = useCallback((data: T) => setSnap(prev => ({ ...prev, data })), []);

  return { data: snap.data, setData, loading: snap.loadedKey !== key, error: snap.error, reload };
}

/** Converte erro do supabase-js em Error normal. */
export function unwrap<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return res.data as T;
}
