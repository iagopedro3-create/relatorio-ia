import React from 'react';

export interface RenderOptions {
  /**
   * Como mostrar os marcadores de evidência [n]. Sem esta função eles são
   * removidos (impressão, família). Com ela, viram um sobrescrito com o texto
   * do registro no title — a coordenação vê de onde cada frase veio.
   */
  cite?: (n: number) => string | null;
}

const CITE_SPLIT = /(\[\d{1,3}\])/g;

function renderCites(text: string, opts: RenderOptions | undefined, keyPrefix: string): React.ReactNode[] {
  const chunks = text.split(CITE_SPLIT);
  const nodes: React.ReactNode[] = [];
  chunks.forEach((chunk, idx) => {
    const m = chunk.match(/^\[(\d{1,3})\]$/);
    if (!m) { if (chunk) nodes.push(chunk); return; }
    if (!opts?.cite) return; // sem visualização de evidência: o marcador some
    const n = Number(m[1]);
    const title = opts.cite(n);
    nodes.push(
      <sup key={`${keyPrefix}-c${idx}`} className="cite" title={title ?? `Registro ${n} não encontrado`} style={{ fontSize: '0.65em', fontWeight: 700, color: title ? 'var(--color-secondary)' : 'var(--color-danger)', marginLeft: '1px', cursor: 'help' }}>[{n}]</sup>,
    );
  });
  return nodes;
}

function inline(text: string, opts: RenderOptions | undefined, keyPrefix: string): React.ReactNode[] {
  const parts = text.split(/(\*\*.*?\*\*)/g);
  const nodes: React.ReactNode[] = [];
  parts.forEach((part, pIdx) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      nodes.push(<strong key={`${keyPrefix}-b${pIdx}`}>{renderCites(part.slice(2, -2), opts, `${keyPrefix}-b${pIdx}`)}</strong>);
    } else {
      nodes.push(...renderCites(part, opts, `${keyPrefix}-t${pIdx}`));
    }
  });
  return nodes;
}

/** Renderiza o markdown simples que a IA devolve (títulos, negrito, tabelas, marcadores de evidência). */
export function renderMarkdown(text: string, opts?: RenderOptions): React.ReactNode[] {
  const lines = text.split('\n');
  const result: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i].trim();
    if (!line) { i++; continue; }

    if (line.startsWith('|')) {
      const rows: string[][] = [];
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        const tableLine = lines[i].trim();
        if (!tableLine.match(/^\|[:\s-]*\|/)) {
          rows.push(tableLine.split('|').filter((_, idx, arr) => idx > 0 && idx < arr.length - 1).map(c => c.trim()));
        }
        i++;
      }
      if (rows.length > 0) {
        result.push(
          <table key={`table-${i}`} style={{ width: '100%', borderCollapse: 'collapse', margin: '1.5rem 0', fontSize: '0.9rem' }}>
            <thead>
              <tr style={{ backgroundColor: '#f3f4f6' }}>
                {rows[0].map((cell, idx) => <th key={idx} style={{ border: '1px solid #333', padding: '8px', fontWeight: 800 }}>{renderCites(cell.replace(/\*\*/g, ''), opts, `th-${i}-${idx}`)}</th>)}
              </tr>
            </thead>
            <tbody>
              {rows.slice(1).map((row, rIdx) => (
                <tr key={rIdx}>{row.map((cell, cIdx) => <td key={cIdx} style={{ border: '1px solid #333', padding: '8px' }}>{renderCites(cell.replace(/\*\*/g, ''), opts, `td-${i}-${rIdx}-${cIdx}`)}</td>)}</tr>
              ))}
            </tbody>
          </table>,
        );
      }
      continue;
    }

    if (line.startsWith('#')) {
      const level = line.match(/^#+/)?.[0].length || 1;
      const txt = line.replace(/^#+\s*/, '').replace(/\*\*/g, '').replace(/\s?\[\d{1,3}\]/g, '');
      result.push(
        <h3 key={i} style={{ fontSize: level === 1 ? '1.4rem' : level === 2 ? '1.2rem' : '1.1rem', marginTop: '1.5rem', marginBottom: '0.5rem', color: 'var(--color-primary)', fontWeight: 800, borderBottom: level <= 2 ? '1px solid #eee' : 'none', paddingBottom: '0.25rem' }}>{txt}</h3>,
      );
      i++;
      continue;
    }

    result.push(
      <p key={i} style={{ marginBottom: '0.75rem', lineHeight: '1.7', textAlign: 'justify', fontSize: '11.5pt' }}>
        {inline(line, opts, `p${i}`)}
      </p>,
    );
    i++;
  }
  return result;
}
