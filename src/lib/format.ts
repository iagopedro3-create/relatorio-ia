export const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

/** ISO (YYYY-MM-DD) -> DD/MM/YYYY. */
export function formatDate(iso: string | null | undefined) {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

export function calcAgeYears(birthDate: string): number {
  const bd = new Date(birthDate + 'T00:00:00');
  const today = new Date();
  let age = today.getFullYear() - bd.getFullYear();
  const m = today.getMonth() - bd.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < bd.getDate())) age--;
  return age;
}

export function calcAge(birthDate: string | null | undefined): string {
  if (!birthDate) return '—';
  const age = calcAgeYears(birthDate);
  return `${age} ano${age !== 1 ? 's' : ''}`;
}

/**
 * Índice do período letivo corrente pela data (fev–dez divididos igualmente
 * entre os períodos). Serve como padrão de seleção; a escola sempre pode trocar.
 */
export function currentPeriodIndex(periodCount: number, today = new Date()): number {
  if (periodCount <= 0) return 0;
  const month = today.getMonth(); // 0 = jan
  const pos = Math.max(0, Math.min(10, month - 1)); // fev..dez -> 0..10
  return Math.min(periodCount - 1, Math.floor((pos / 11) * periodCount));
}

/** Centavos -> "R$ 1.234,56". */
export function formatBRL(cents: number | null | undefined): string {
  return ((cents ?? 0) / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

/** "R$ 1.234,56" / "1234,56" / "1234.56" -> centavos. */
export function parseBRL(text: string): number {
  const clean = text.replace(/[^\d,.-]/g, '').replace(/\.(?=\d{3}(\D|$))/g, '').replace(',', '.');
  const n = Number(clean);
  return Number.isFinite(n) ? Math.round(n * 100) : 0;
}

/** 'YYYY-MM' -> 'setembro de 2026'. */
export function monthLabel(ym: string): string {
  const [y, m] = ym.split('-').map(Number);
  return `${MONTHS[(m || 1) - 1].toLowerCase()} de ${y}`;
}

export function currentMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}
