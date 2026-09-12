import type { SchoolYear, YearPeriod } from '../types/db';

/** Meses (0-based) de cada período quando a escola não cadastrou datas. */
const APPROX_MONTHS: number[][] = [[1, 2, 3], [4, 5, 6], [7, 8], [9, 10, 11]];

export interface DateRange { start: string; end: string }

const pad = (n: number) => String(n).padStart(2, '0');
const lastDay = (y: number, m0: number) => new Date(y, m0 + 1, 0).getDate();

/** Ano civil do ano letivo (rótulo "2026" → 2026). */
export function yearNumber(year: SchoolYear | null | undefined): number {
  const n = year ? parseInt(year.label, 10) : NaN;
  return Number.isFinite(n) ? n : new Date().getFullYear();
}

/**
 * Datas do período `idx` (0-based). Usa `school_years.periods` se cadastrado;
 * senão aproxima por meses, distribuindo os meses de fev–dez entre os períodos.
 */
export function periodRange(year: SchoolYear | null | undefined, periodCount: number, idx: number): DateRange {
  const cfg = (year?.periods ?? []) as YearPeriod[];
  const p = cfg[idx];
  if (p?.start && p?.end) return { start: p.start, end: p.end };
  const y = yearNumber(year);
  const months = approxMonths(periodCount)[Math.max(0, Math.min(idx, periodCount - 1))] ?? [1, 11];
  const first = months[0];
  const last = months[months.length - 1];
  return { start: `${y}-${pad(first + 1)}-01`, end: `${y}-${pad(last + 1)}-${pad(lastDay(y, last))}` };
}

/** Meses (0-based) cobertos por um período — para tabelas mensais (diário). */
export function periodMonths(year: SchoolYear | null | undefined, periodCount: number, idx: number): number[] {
  const { start, end } = periodRange(year, periodCount, idx);
  const s = new Date(start + 'T00:00:00');
  const e = new Date(end + 'T00:00:00');
  const out: number[] = [];
  for (let d = new Date(s.getFullYear(), s.getMonth(), 1); d <= e; d.setMonth(d.getMonth() + 1)) out.push(d.getMonth());
  return out;
}

/** Índice do período que contém a data (ou o último já iniciado). */
export function periodIndexForDate(year: SchoolYear | null | undefined, periodCount: number, date = new Date().toISOString().slice(0, 10)): number {
  let last = 0;
  for (let i = 0; i < periodCount; i++) {
    const r = periodRange(year, periodCount, i);
    if (date >= r.start && date <= r.end) return i;
    if (date > r.end) last = i;
  }
  return last;
}

function approxMonths(count: number): number[][] {
  if (count === 4) return APPROX_MONTHS;
  // Distribui fev..dez (11 meses) igualmente.
  const all = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
  const size = Math.ceil(all.length / Math.max(1, count));
  return Array.from({ length: count }, (_, i) => all.slice(i * size, (i + 1) * size)).filter(m => m.length > 0);
}
