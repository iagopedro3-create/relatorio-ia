import React from 'react';
import { X, Printer, Download } from 'lucide-react';

interface PrintPreviewProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle: string;
  studentData: any;
  content: string;
  type: 'report' | 'pei';
}

export function PrintPreview({ isOpen, onClose, title, subtitle, studentData, content, type }: PrintPreviewProps) {
  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = () => {
    const element = document.querySelector('.print-area');
    if (!element) return;
    
    const opt = {
      margin: [10, 10, 10, 10],
      filename: `${type === 'pei' ? 'PEI' : 'Relatorio'}_${studentData.name}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };
    
    // @ts-ignore
    html2pdf().set(opt).from(element).save();
  };

  // Helper to render markdown-like content to ReactNode
  const renderContent = (text: string) => {
    const lines = text.split('\n');
    const result: React.ReactNode[] = [];
    let i = 0;

    while (i < lines.length) {
      const line = lines[i].trim();
      if (!line) {
        i++;
        continue;
      }

      // Table detection
      if (line.startsWith('|')) {
        const rows: string[][] = [];
        while (i < lines.length && lines[i].trim().startsWith('|')) {
          const tableLine = lines[i].trim();
          if (!tableLine.match(/^\|[:\s-]*\|/)) {
            const cells = tableLine.split('|').filter((_, idx, arr) => idx > 0 && idx < arr.length - 1).map(c => c.trim());
            rows.push(cells);
          }
          i++;
        }
        if (rows.length > 0) {
          result.push(
            <table key={`table-${i}`} style={{ width: '100%', borderCollapse: 'collapse', marginTop: '1.5rem', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ backgroundColor: '#f3f4f6' }}>
                  {rows[0].map((cell, idx) => (
                    <th key={idx} style={{ border: '1px solid #333', padding: '8px', fontWeight: 800 }}>{cell.replace(/\*\*/g, '')}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.slice(1).map((row, rIdx) => (
                  <tr key={rIdx}>
                    {row.map((cell, cIdx) => (
                      <td key={cIdx} style={{ border: '1px solid #333', padding: '8px' }}>{cell.replace(/\*\*/g, '')}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          );
        }
        continue;
      }

      // Headers
      if (line.startsWith('#')) {
        const level = line.match(/^#+/)?.[0].length || 1;
        const text = line.replace(/^#+\s*/, '').replace(/\*\*/g, '');
        const fontSize = level === 1 ? '1.4rem' : level === 2 ? '1.2rem' : '1.1rem';
        result.push(
          <h3 key={i} style={{ 
            fontSize, 
            marginTop: '1.5rem', 
            marginBottom: '0.5rem', 
            color: 'var(--color-primary)',
            fontWeight: 800,
            borderBottom: level <= 2 ? '1px solid #eee' : 'none',
            paddingBottom: '0.25rem'
          }}>
            {text}
          </h3>
        );
        i++;
        continue;
      }

      // Normal paragraph with bold support
      const parts = line.split(/(\*\*.*?\*\*)/g);
      result.push(
        <p key={i} style={{ marginBottom: '1rem', lineHeight: '1.6', textAlign: 'justify' }}>
          {parts.map((part, pIdx) => {
            if (part.startsWith('**') && part.endsWith('**')) {
              return <strong key={pIdx}>{part.slice(2, -2)}</strong>;
            }
            return part;
          })}
        </p>
      );
      i++;
    }
    return result;
  };

  return (
    <div className="print-preview-overlay no-print">
      <style>{`
        @media print {
          .page-break { page-break-before: always; }
          .print-preview-overlay { position: static; background: white; padding: 0; }
          .btn-group { display: none !important; }
        }
      `}</style>
      
      <div className="btn-group" style={{ position: 'fixed', top: '1rem', right: '2rem', display: 'flex', gap: '1rem', zIndex: 1001 }}>
        <button onClick={handleDownloadPDF} className="btn btn-primary" style={{ backgroundColor: '#10b981', boxShadow: 'none' }}>
          <Download size={20} /> Baixar PDF
        </button>
        <button onClick={handlePrint} className="btn btn-primary">
          <Printer size={20} /> Imprimir / Salvar PDF
        </button>
        <button onClick={onClose} className="btn btn-secondary" style={{ backgroundColor: '#ef4444', boxShadow: 'none' }}>
          <X size={20} /> Fechar
        </button>
      </div>

      <div className="print-page print-area">
        {/* Infantil Cover Page */}
        {(studentData.group && !studentData.group.includes('1º ANO') && type === 'report') && (
          <div className="cover-page" style={{ marginBottom: '50px' }}>
            <div style={{ 
              backgroundColor: 'var(--color-secondary)', color: 'white', 
              padding: '2rem 5rem', borderRadius: '1rem', transform: 'rotate(-2deg)',
              boxShadow: '0 10px 30px rgba(253, 133, 45, 0.3)'
            }}>
              <h1 style={{ color: 'white', margin: 0, fontSize: '3rem', fontWeight: 900, textTransform: 'uppercase' }}>
                Relatório Individual
              </h1>
            </div>
            
            <div style={{ marginTop: '5rem', textAlign: 'center' }}>
              <h2 style={{ fontSize: '2rem', color: 'var(--color-primary)', margin: 0 }}>{studentData.name?.toUpperCase()}</h2>
              <p style={{ fontSize: '1.2rem', color: 'var(--color-text-muted)', marginTop: '0.5rem' }}>{studentData.group}</p>
            </div>

            <div style={{ position: 'absolute', bottom: '4rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <img src="/logo.png" alt="Logo" style={{ height: '60px' }} />
              <div style={{ width: '2px', height: '40px', backgroundColor: 'var(--color-border)' }} />
              <p style={{ fontWeight: 800, color: 'var(--color-primary)', margin: 0 }}>ESCOLA VIDA DE APRENDIZ</p>
            </div>
            
            <div className="page-break" />
          </div>
        )}

        <div className="print-header">
          <img src="/logo.png" alt="Vida de Aprendiz" style={{ maxWidth: '200px', marginBottom: '1rem' }} />
          <h1 style={{ color: 'var(--color-primary)', margin: 0, fontSize: '1.6rem', fontWeight: 800 }}>{title}</h1>
          <h2 style={{ color: 'var(--color-secondary)', margin: '0.25rem 0 0 0', fontSize: '1.1rem', fontWeight: 600 }}>{subtitle}</h2>
        </div>

        <table className="print-table">
          <tbody>
            <tr>
              <td><strong>ALUNO(A):</strong> {studentData.name?.toUpperCase()}</td>
              <td><strong>TURMA:</strong> {studentData.group}</td>
            </tr>
            <tr>
              <td>
                {type === 'pei' ? (
                  <><strong>DIAGNÓSTICO:</strong> {studentData.diagnosis || '---'}</>
                ) : (
                  <><strong>PROFESSOR(A):</strong> {studentData.teacherName || '---'}</>
                )}
              </td>
              <td><strong>IDADE:</strong> {studentData.age} anos</td>
            </tr>
          </tbody>
        </table>

        <div className="print-content">
          <div style={{ width: '100%' }}>
            {renderContent(content)}
          </div>
          
          {(studentData.photo1 || studentData.photo2 || studentData.photo3) && type === 'report' && (
            <div className="photo-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '2rem', marginTop: '2rem' }}>
               {studentData.photo1 && (
                <div style={{ position: 'relative' }}>
                  <img src={studentData.photo1} alt="Atividade 1" style={{ width: '100%', borderRadius: '4px', boxShadow: '0 4px 10px rgba(0,0,0,0.15)', border: '8px solid white' }} />
                </div>
              )}
              {studentData.photo2 && (
                <div style={{ position: 'relative' }}>
                  <img src={studentData.photo2} alt="Atividade 2" style={{ width: '100%', borderRadius: '4px', boxShadow: '0 4px 10px rgba(0,0,0,0.15)', border: '8px solid white' }} />
                </div>
              )}
               {studentData.photo3 && (
                <div style={{ position: 'relative' }}>
                  <img src={studentData.photo3} alt="Atividade 3" style={{ width: '100%', borderRadius: '4px', boxShadow: '0 4px 10px rgba(0,0,0,0.15)', border: '8px solid white' }} />
                </div>
              )}
            </div>
          )}

          {type === 'report' && (studentData.positivePoints || studentData.attentionPoints) && (
            <div style={{ marginTop: '2rem', padding: '1rem', backgroundColor: '#fdfbf0', borderRadius: '8px', border: '1px solid #faefcc' }}>
              {studentData.positivePoints && <p><strong>Destaques:</strong> {studentData.positivePoints}</p>}
              {studentData.attentionPoints && <p><strong>Próximos Passos:</strong> {studentData.attentionPoints}</p>}
            </div>
          )}
        </div>

        <div className="print-signatures">
          <div>
            <div className="signature-line">
              {type === 'pei' ? 'Professor(a) Responsável' : (studentData.teacherName || 'Professor(a)')}
            </div>
            <div style={{ fontSize: '0.7rem', opacity: 0.7 }}>Docente</div>
          </div>
          <div>
            <div className="signature-line">Coordenação Pedagógica</div>
            <div style={{ fontSize: '0.7rem', opacity: 0.7 }}>Assinatura e Carimbo</div>
          </div>
        </div>
      </div>
    </div>
  );
}
