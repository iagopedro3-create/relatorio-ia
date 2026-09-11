import type { ReactNode } from 'react';
import type { DocumentStatus } from '../../types/db';

export type BadgeTone = 'neutral' | 'primary' | 'secondary' | 'success' | 'warning' | 'danger';

interface Props {
  tone?: BadgeTone;
  children: ReactNode;
  title?: string;
  className?: string;
}

export function Badge({ tone = 'neutral', children, title, className }: Props) {
  return <span className={`badge badge-${tone}${className ? ` ${className}` : ''}`} title={title}>{children}</span>;
}

/** Rótulo e cor do ciclo de vida de documentos e planos (rascunho → enviado → aprovado/devolvido). */
// eslint-disable-next-line react-refresh/only-export-components -- tabela de status vive junto do badge que a usa
export const DOCUMENT_STATUS: Record<DocumentStatus, { label: string; tone: BadgeTone }> = {
  draft: { label: 'Rascunho', tone: 'neutral' },
  submitted: { label: 'Enviado', tone: 'warning' },
  approved: { label: 'Aprovado', tone: 'success' },
  returned: { label: 'Devolvido', tone: 'danger' },
};

export function StatusBadge({ status }: { status: DocumentStatus }) {
  const s = DOCUMENT_STATUS[status] ?? DOCUMENT_STATUS.draft;
  return <Badge tone={s.tone}>{s.label}</Badge>;
}
