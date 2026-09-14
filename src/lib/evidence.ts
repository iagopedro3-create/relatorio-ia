import { FIELD_BY_ID } from '../store/bnccFields';
import type { Observation } from '../types/db';

/** Registro de observação no formato que o servidor numera e manda para a IA. */
export interface EvidenceIn { id: string; date: string; field: string; text: string }

/** Mapa n → id do registro, devolvido pelo servidor e guardado em form_data.evidence. */
export type EvidenceMap = Record<string, string>;

export function toEvidence(observations: Observation[]): EvidenceIn[] {
  return observations.map(o => ({ id: o.id, date: o.date, field: FIELD_BY_ID[o.field_id]?.label ?? 'Geral', text: o.text }));
}

const CITE_RE = /\s?\[(\d{1,3})\]/g;

/** Remove os marcadores [n] (para impressão, Word, família e cópia). */
export function stripCitations(text: string): string {
  return text.replace(CITE_RE, '').replace(/ +([.,;!?])/g, '$1');
}

/** Números citados no texto, na ordem de aparição, sem repetição. */
export function citedNumbers(text: string): number[] {
  const out: number[] = [];
  for (const m of text.matchAll(/\[(\d{1,3})\]/g)) {
    const n = Number(m[1]);
    if (!out.includes(n)) out.push(n);
  }
  return out;
}

/** Ids de observação usados no texto, dado o mapa n → id. */
export function citedObservationIds(text: string, map: EvidenceMap | undefined): string[] {
  if (!map) return [];
  return citedNumbers(text).map(n => map[String(n)]).filter((id): id is string => Boolean(id));
}
