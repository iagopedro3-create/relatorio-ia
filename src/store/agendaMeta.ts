import type { AgendaCategory, AgendaEventType } from '../types/db';

export const CATEGORY_LABELS: Record<AgendaCategory, { label: string; color: string; bg: string }> = {
  comunicado: { label: 'Comunicado', color: '#1d4ed8', bg: '#eff6ff' },
  pedagogico: { label: 'Pedagógico', color: '#7e22ce', bg: '#faf5ff' },
  financeiro: { label: 'Financeiro', color: '#b45309', bg: '#fffbeb' },
  evento: { label: 'Evento', color: '#0f766e', bg: '#f0fdfa' },
};

export const EVENT_TYPES: Record<AgendaEventType, { label: string; color: string; icon: string }> = {
  prova: { label: 'Prova', color: '#dc2626', icon: '📝' },
  reuniao: { label: 'Reunião', color: '#7c3aed', icon: '🤝' },
  feriado: { label: 'Feriado', color: '#059669', icon: '🎉' },
  atividade: { label: 'Atividade', color: '#2563eb', icon: '📚' },
  tarefa: { label: 'Tarefa', color: '#d97706', icon: '✏️' },
  evento: { label: 'Evento', color: '#0891b2', icon: '🎪' },
};

export function timeAgo(dateStr: string) {
  const d = new Date(dateStr);
  const diff = Date.now() - d.getTime();
  const days = Math.floor(diff / 86400000);
  if (days > 30) return d.toLocaleDateString('pt-BR');
  if (days > 0) return `${days}d atrás`;
  const hours = Math.floor(diff / 3600000);
  if (hours > 0) return `${hours}h atrás`;
  return 'Agora';
}
