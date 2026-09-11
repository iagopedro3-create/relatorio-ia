import React from 'react';

/** Renderiza o markdown simples que a IA devolve (títulos, negrito, tabelas). */
export function renderMarkdown(text: string): React.ReactNode[] {
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
                {rows[0].map((cell, idx) => <th key={idx} style={{ border: '1px solid #333', padding: '8px', fontWeight: 800 }}>{cell.replace(/\*\*/g, '')}</th>)}
              </tr>
            </thead>
            <tbody>
              {rows.slice(1).map((row, rIdx) => (
                <tr key={rIdx}>{row.map((cell, cIdx) => <td key={cIdx} style={{ border: '1px solid #333', padding: '8px' }}>{cell.replace(/\*\*/g, '')}</td>)}</tr>
              ))}
            </tbody>
          </table>,
        );
      }
      continue;
    }

    if (line.startsWith('#')) {
      const level = line.match(/^#+/)?.[0].length || 1;
      const txt = line.replace(/^#+\s*/, '').replace(/\*\*/g, '');
      result.push(
        <h3 key={i} style={{ fontSize: level === 1 ? '1.4rem' : level === 2 ? '1.2rem' : '1.1rem', marginTop: '1.5rem', marginBottom: '0.5rem', color: 'var(--color-primary)', fontWeight: 800, borderBottom: level <= 2 ? '1px solid #eee' : 'none', paddingBottom: '0.25rem' }}>{txt}</h3>,
      );
      i++;
      continue;
    }

    const parts = line.split(/(\*\*.*?\*\*)/g);
    result.push(
      <p key={i} style={{ marginBottom: '0.75rem', lineHeight: '1.7', textAlign: 'justify', fontSize: '11.5pt' }}>
        {parts.map((part, pIdx) => part.startsWith('**') && part.endsWith('**') ? <strong key={pIdx}>{part.slice(2, -2)}</strong> : part)}
      </p>,
    );
    i++;
  }
  return result;
}
