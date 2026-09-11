import type { ReactNode } from 'react';
import { SkeletonRows } from './Skeleton';

export interface Column<T> {
  key: string;
  header: ReactNode;
  render: (row: T) => ReactNode;
  align?: 'left' | 'center' | 'right';
  width?: string;
  /** Some no celular. */
  hideOnMobile?: boolean;
}

interface Props<T> {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  loading?: boolean;
  /** Mostrado quando não há linhas (e não está carregando). */
  empty?: ReactNode;
  compact?: boolean;
  onRowClick?: (row: T) => void;
  /** Sem o cartão em volta (para embutir em outro card). */
  bare?: boolean;
}

/**
 * Tabela padrão: cabeçalho uniforme, scroll horizontal próprio, esqueleto
 * enquanto carrega e estado vazio com ação. Não pagina — as listas de uma
 * escola cabem na tela; se um dia não couberem, pagina aqui e não nas telas.
 */
export function DataTable<T>({ columns, rows, rowKey, loading, empty, compact, onRowClick, bare }: Props<T>) {
  const alignClass = (a?: Column<T>['align']) => a === 'center' ? 'center' : a === 'right' ? 'right' : '';
  const table = (
    <div className="table-wrap">
      <table className={`table${compact ? ' table-compact' : ''}`}>
        <thead>
          <tr>
            {columns.map(c => (
              <th key={c.key} className={`${alignClass(c.align)}${c.hideOnMobile ? ' mobile-hide' : ''}`} style={c.width ? { width: c.width } : undefined}>{c.header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading && <SkeletonRows rows={5} cols={columns.length} />}
          {!loading && rows.length === 0 && (
            <tr><td colSpan={columns.length} style={{ padding: 0 }}>{empty ?? <p className="text-muted text-center" style={{ padding: '2rem', margin: 0 }}>Nada por aqui ainda.</p>}</td></tr>
          )}
          {!loading && rows.map(row => (
            <tr key={rowKey(row)} onClick={onRowClick ? () => onRowClick(row) : undefined} style={onRowClick ? { cursor: 'pointer' } : undefined}>
              {columns.map(c => (
                <td key={c.key} className={`${alignClass(c.align)}${c.hideOnMobile ? ' mobile-hide' : ''}`}>{c.render(row)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
  return bare ? table : <div className="card p-0">{table}</div>;
}
