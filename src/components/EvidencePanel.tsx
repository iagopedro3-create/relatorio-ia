import { Link2, AlertTriangle } from 'lucide-react';
import { Badge } from './ui';
import { FIELD_BY_ID } from '../store/bnccFields';
import { formatDate } from '../lib/format';
import type { Observation } from '../types/db';

interface Props {
  /** Registros citados no texto ([n]), na ordem em que aparecem. */
  used: Observation[];
  /** Campos BNCC do período sem nenhum registro (só relatório). */
  missingFields?: string[];
  /** O documento foi gerado com mapa de evidência (documentos antigos não têm). */
  hasMap: boolean;
  /** Quantos registros estavam disponíveis (PEI). */
  totalAvailable?: number;
}

/**
 * De onde veio o texto: lista os registros de observação citados e aponta as
 * lacunas. É a diferença entre "a IA escreveu" e "a IA escreveu a partir do
 * que a professora registrou".
 */
export function EvidencePanel({ used, missingFields = [], hasMap, totalAvailable }: Props) {
  return (
    <div className="card mt-4" style={{ padding: '0.9rem 1.25rem' }}>
      <h4 className="flex items-center gap-2" style={{ fontSize: '0.85rem', margin: '0 0 0.5rem' }}>
        <Link2 size={15} /> Origem do texto
        <Badge tone={used.length > 0 ? 'success' : 'warning'}>{used.length} registro{used.length === 1 ? '' : 's'} citado{used.length === 1 ? '' : 's'}</Badge>
      </h4>
      {!hasMap && (
        <p className="text-muted" style={{ fontSize: '0.8rem', margin: '0 0 0.5rem' }}>Este documento foi gerado sem registros de observação ligados. Gere de novo para ver a origem de cada frase.</p>
      )}
      {hasMap && used.length === 0 && (
        <p className="text-muted" style={{ fontSize: '0.8rem', margin: '0 0 0.5rem' }}>
          {totalAvailable === 0 ? 'Não havia registros de observação para esta criança; o texto veio só da ficha.' : 'O texto não cita nenhum registro. Revise com atenção: o que está escrito veio da ficha, não de evidência do período.'}
        </p>
      )}
      {used.length > 0 && (
        <ol style={{ margin: 0, paddingLeft: '1.2rem', display: 'grid', gap: '0.3rem', maxHeight: '220px', overflowY: 'auto' }}>
          {used.map(o => (
            <li key={o.id} style={{ fontSize: '0.8rem', lineHeight: 1.45 }}>
              <span className="text-muted">{formatDate(o.date)} · {FIELD_BY_ID[o.field_id]?.short ?? 'Geral'}: </span>{o.text}
            </li>
          ))}
        </ol>
      )}
      {missingFields.length > 0 && (
        <p className="flex items-start gap-2 mt-2" style={{ fontSize: '0.8rem', margin: '0.6rem 0 0', color: 'var(--color-warning-text)' }}>
          <AlertTriangle size={14} style={{ marginTop: 2, flexShrink: 0 }} />
          <span>Sem registro no período em: {missingFields.join(', ')}. O que o texto disser sobre esses campos não tem evidência registrada.</span>
        </p>
      )}
    </div>
  );
}
