import type { CSSProperties } from 'react';

/** Bloco cinza animado. Use no lugar do conteúdo enquanto os dados chegam. */
export function Skeleton({ width = '100%', height = '1rem', className, style }: { width?: string | number; height?: string | number; className?: string; style?: CSSProperties }) {
  return <div className={`skeleton${className ? ` ${className}` : ''}`} style={{ width, height, ...style }} aria-hidden />;
}

/** Linhas de texto. */
export function SkeletonText({ lines = 3 }: { lines?: number }) {
  return (
    <div className="flex flex-col gap-2">
      {Array.from({ length: lines }, (_, i) => <Skeleton key={i} width={i === lines - 1 ? '60%' : '100%'} height="0.85rem" />)}
    </div>
  );
}

/** Cartão com título e linhas. */
export function SkeletonCard({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <div className={`card${className ? ` ${className}` : ''}`} aria-busy>
      <Skeleton width="40%" height="1.1rem" className="mb-4" />
      <SkeletonText lines={lines} />
    </div>
  );
}

/** Grade de cartões de indicador (KPI). */
export function SkeletonStats({ count = 3 }: { count?: number }) {
  return (
    <div className={`grid grid-cols-1 md:grid-cols-${count} gap-6`}>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="card" aria-busy>
          <Skeleton width="50%" height="0.75rem" className="mb-3" />
          <Skeleton width="35%" height="1.75rem" />
        </div>
      ))}
    </div>
  );
}

/** Linhas de tabela — use dentro de <tbody>. */
export function SkeletonRows({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <>
      {Array.from({ length: rows }, (_, r) => (
        <tr key={r} aria-busy>
          {Array.from({ length: cols }, (_, c) => (
            <td key={c}><Skeleton height="0.85rem" width={c === 0 ? '70%' : '50%'} /></td>
          ))}
        </tr>
      ))}
    </>
  );
}

/** Tela inteira: cabeçalho + indicadores + um cartão grande. */
export function PageSkeleton() {
  return (
    <div aria-busy>
      <Skeleton width="220px" height="1.5rem" className="mb-2" />
      <Skeleton width="320px" height="0.85rem" className="mb-6" />
      <SkeletonStats count={3} />
      <div className="mt-6"><SkeletonCard lines={5} /></div>
    </div>
  );
}
