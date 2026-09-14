import type { BadgeTone } from '../components/ui';
import type { GoalStatus, GoalTerm } from '../types/db';

export const GOAL_STATUS: Record<GoalStatus, { label: string; tone: BadgeTone }> = {
  active: { label: 'Em andamento', tone: 'primary' },
  achieved: { label: 'Alcançada', tone: 'success' },
  paused: { label: 'Pausada', tone: 'warning' },
  dropped: { label: 'Descartada', tone: 'neutral' },
};

export const GOAL_TERM: Record<GoalTerm, string> = { curto: 'Curto prazo', medio: 'Médio prazo', longo: 'Longo prazo' };
