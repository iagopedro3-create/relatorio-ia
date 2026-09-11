import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';

export interface ConfirmOptions {
  title: string;
  description?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Ação destrutiva: botão vermelho e ícone de alerta. */
  danger?: boolean;
}

type Ask = (opts: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<Ask | null>(null);

/**
 * Substitui o `window.confirm`: diálogo próprio, com a marca da escola, que
 * explica a consequência e não trava a aba. Uso: `const ask = useConfirm();
 * if (!(await ask({ title: 'Excluir aluno?', danger: true }))) return;`
 */
// eslint-disable-next-line react-refresh/only-export-components -- hook + provider no mesmo módulo, de propósito
export function useConfirm(): Ask {
  const ask = useContext(ConfirmContext);
  if (!ask) throw new Error('useConfirm precisa do ConfirmProvider');
  return ask;
}

interface Pending { opts: ConfirmOptions; resolve: (ok: boolean) => void }

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<Pending | null>(null);
  const confirmBtn = useRef<HTMLButtonElement>(null);

  const ask = useCallback<Ask>((opts) => new Promise<boolean>(resolve => setPending({ opts, resolve })), []);

  const close = (ok: boolean) => {
    pending?.resolve(ok);
    setPending(null);
  };

  useEffect(() => {
    if (!pending) return;
    confirmBtn.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- close depende só de `pending`
  }, [pending]);

  return (
    <ConfirmContext.Provider value={ask}>
      {children}
      {pending && (
        <div className="dialog-overlay" onMouseDown={e => { if (e.target === e.currentTarget) close(false); }} role="presentation">
          <div className="dialog" role="alertdialog" aria-modal aria-labelledby="confirm-title">
            <div className="flex items-start gap-3">
              {pending.opts.danger && <AlertTriangle size={22} color="var(--color-danger)" style={{ flexShrink: 0, marginTop: 2 }} />}
              <div>
                <h3 id="confirm-title">{pending.opts.title}</h3>
                {pending.opts.description && <p>{pending.opts.description}</p>}
              </div>
            </div>
            <div className="dialog-actions">
              <button className="btn btn-secondary btn-sm" onClick={() => close(false)}>{pending.opts.cancelLabel ?? 'Cancelar'}</button>
              <button ref={confirmBtn} className={`btn btn-sm ${pending.opts.danger ? 'btn-danger' : 'btn-primary'}`} onClick={() => close(true)}>{pending.opts.confirmLabel ?? (pending.opts.danger ? 'Excluir' : 'Confirmar')}</button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}
