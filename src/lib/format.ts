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
