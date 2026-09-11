import type { ReactNode } from 'react';

interface Props {
  title: ReactNode;
  subtitle?: ReactNode;
  icon?: ReactNode;
  /** Botões à direita (no celular, quebram para baixo). */
  actions?: ReactNode;
  className?: string;
}

/** Cabeçalho padrão de tela: título + subtítulo à esquerda, ações à direita. */
export function PageHeader({ title, subtitle, icon, actions, className }: Props) {
  return (
    <div className={`page-header${className ? ` ${className}` : ''}`}>
      <div className="min-w-0">
        <h2>{icon}{title}</h2>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {actions && <div className="page-header-actions">{actions}</div>}
    </div>
  );
}
