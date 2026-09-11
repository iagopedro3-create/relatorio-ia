import type { ReactNode } from 'react';

interface Props {
  icon?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  /** Ação de saída — todo vazio deveria dizer o que fazer a seguir. */
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ icon, title, description, action, className }: Props) {
  return (
    <div className={`empty-state${className ? ` ${className}` : ''}`}>
      {icon}
      <h4>{title}</h4>
      {description && <p>{description}</p>}
      {action}
    </div>
  );
}
