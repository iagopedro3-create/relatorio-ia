/**
 * Campos de experiência da BNCC (Educação Infantil) e áreas extras, usados
 * pelos registros de observação e pela ficha do relatório. O `formKey` liga
 * cada campo ao texto livre correspondente em `StudentData` (ReportForm).
 */
export interface ObservationField {
  id: string;
  /** Nome oficial na BNCC. */
  label: string;
  /** Nome curto para chips e filtros. */
  short: string;
  /** Campo de texto da ficha do relatório que recebe esses registros. */
  formKey: 'fieldSocial' | 'fieldMotor' | 'fieldArts' | 'fieldLanguage' | 'fieldLogic' | 'fieldEnglish' | 'fieldPe' | 'generalObservations';
  /** Cor de identificação (token). */
  tone: 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'neutral';
}

export const OBSERVATION_FIELDS: ObservationField[] = [
  { id: 'social', label: 'O eu, o outro e o nós', short: 'Eu, outro, nós', formKey: 'fieldSocial', tone: 'secondary' },
  { id: 'motor', label: 'Corpo, gestos e movimentos', short: 'Corpo e movimento', formKey: 'fieldMotor', tone: 'success' },
  { id: 'arts', label: 'Traços, sons, cores e formas', short: 'Traços e sons', formKey: 'fieldArts', tone: 'warning' },
  { id: 'language', label: 'Escuta, fala, pensamento e imaginação', short: 'Escuta e fala', formKey: 'fieldLanguage', tone: 'primary' },
  { id: 'logic', label: 'Espaços, tempos, quantidades, relações e transformações', short: 'Espaços e quantidades', formKey: 'fieldLogic', tone: 'primary' },
  { id: 'english', label: 'Inglês', short: 'Inglês', formKey: 'fieldEnglish', tone: 'neutral' },
  { id: 'pe', label: 'Educação Física', short: 'Ed. Física', formKey: 'fieldPe', tone: 'neutral' },
  { id: 'general', label: 'Observação geral', short: 'Geral', formKey: 'generalObservations', tone: 'neutral' },
];

export const FIELD_BY_ID: Record<string, ObservationField> = Object.fromEntries(OBSERVATION_FIELDS.map(f => [f.id, f]));

export function fieldLabel(id: string): string {
  return FIELD_BY_ID[id]?.short ?? id;
}
