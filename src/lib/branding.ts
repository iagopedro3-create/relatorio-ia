import type { School } from '../types/db';

/** Identidade neutra do produto, usada antes do login e quando a escola não personalizou. */
export const PRODUCT_NAME = import.meta.env.VITE_PRODUCT_NAME || 'Althion Education';

export const DEFAULT_COLORS = {
  primary: '#0a73ff',
  secondary: '#fd852d',
  accent: '#ffcb64',
  bg: '#f4f6fb',
};

function darken(hex: string, amount = 0.15): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  const r = Math.round(((n >> 16) & 255) * (1 - amount));
  const g = Math.round(((n >> 8) & 255) * (1 - amount));
  const b = Math.round((n & 255) * (1 - amount));
  return `#${[r, g, b].map(v => v.toString(16).padStart(2, '0')).join('')}`;
}

function isHex(v: unknown): v is string {
  return typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v.trim());
}

/**
 * Injeta a marca da escola como CSS vars em :root. Todo o CSS do app lê
 * `--color-primary`, `--color-secondary`, `--color-accent` e `--color-bg`;
 * nada de cor de escola chumbada em componente.
 */
export function applyBranding(school: School | null) {
  const root = document.documentElement;
  const c = school?.branding?.colors ?? {};
  const primary = isHex(c.primary) ? c.primary : DEFAULT_COLORS.primary;
  const secondary = isHex(c.secondary) ? c.secondary : DEFAULT_COLORS.secondary;
  const accent = isHex(c.accent) ? c.accent : DEFAULT_COLORS.accent;
  const bg = isHex(c.bg) ? c.bg : DEFAULT_COLORS.bg;

  root.style.setProperty('--color-primary', primary);
  root.style.setProperty('--color-primary-hover', darken(primary));
  root.style.setProperty('--color-secondary', secondary);
  root.style.setProperty('--color-secondary-hover', darken(secondary));
  root.style.setProperty('--color-accent', accent);
  root.style.setProperty('--color-bg', bg);

  document.title = school ? `${school.name} · ${PRODUCT_NAME}` : PRODUCT_NAME;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', primary);
}

/** URL do logo da escola ou o logo padrão do produto. */
export function logoUrl(school: School | null): string {
  return school?.branding?.logo_url || '/logo.svg';
}
