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

  // Clean markdown artifacts from content for printing
  const cleanContent = content.replace(/(\*\*|###|##|#|\|---|\|)/g, '').trim();

  return (
    <div className="print-preview-overlay no-print">
      <style>{`
        @media print {
          .page-break { page-break-before: always; }
        }
        .cover-page {
          height: 297mm;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          position: relative;
          background: white;
          overflow: hidden;
        }
        .rocket-svg { position: absolute; top: 10%; left: 10%; width: 150px; opacity: 0.8; }
        .clouds-svg { position: absolute; bottom: 0; left: 0; width: 100%; height: 200px; opacity: 0.6; }
        .stars-svg { position: absolute; top: 5%; right: 5%; width: 100px; }
      `}</style>
      <div style={{ position: 'fixed', top: '1rem', right: '2rem', display: 'flex', gap: '1rem', zIndex: 1001 }}>
      <div style={{ position: 'fixed', top: '1rem', right: '2rem', display: 'flex', gap: '1rem', zIndex: 1001 }}>
        <button onClick={handleDownloadPDF} className="btn btn-primary" style={{ backgroundColor: '#10b981', boxShadow: 'none' }}>
          <Download size={20} /> Baixar PDF direto
        </button>
        <button onClick={handlePrint} className="btn btn-primary">
          <Printer size={20} /> Imprimir agora / Salvar PDF
        </button>
        <button onClick={onClose} className="btn btn-secondary" style={{ backgroundColor: '#ef4444', boxShadow: 'none' }}>
          <X size={20} /> Fechar
        </button>
      </div>
      </div>

      <div className="print-page print-area">
        {/* Infantil Cover Page */}
        {(studentData.group && !studentData.group.includes('1º ANO') && type === 'report') && (
          <div className="cover-page no-print-break" style={{ marginBottom: '50px' }}>
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

        <div className="print-content" style={{ display: 'flex', gap: '2rem', alignItems: 'flex-start' }}>
          <div style={{ flex: 1 }}>
            {cleanContent.split('\n\n').slice(0, Math.ceil(cleanContent.split('\n\n').length / 3)).map((p, i) => (
              <p key={i} style={{ marginBottom: '1rem' }}>{p}</p>
            ))}
          </div>
          {studentData.photo1 && (
            <div style={{ width: '250px', position: 'relative', marginTop: '1rem' }}>
              <div style={{ 
                position: 'absolute', top: '-15px', right: '20px', width: '80px', height: '30px', 
                backgroundColor: 'rgba(255, 203, 100, 0.8)', transform: 'rotate(15deg)', zIndex: 1,
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
              }} />
              <img src={studentData.photo1} alt="Atividade 1" style={{ width: '100%', borderRadius: '4px', boxShadow: '0 4px 10px rgba(0,0,0,0.15)', border: '8px solid white' }} />
            </div>
          )}
        </div>

        {/* 2nd Part and 2nd photo */}
        {type === 'report' && studentData.photo2 && (
          <div style={{ marginTop: '2rem', display: 'flex', gap: '2rem', alignItems: 'flex-start' }}>
            <div style={{ flex: 1 }}>
              {cleanContent.split('\n\n').slice(Math.ceil(cleanContent.split('\n\n').length / 3), Math.ceil(cleanContent.split('\n\n').length * 2 / 3)).map((p, i) => (
                <p key={i} style={{ marginBottom: '1rem' }}>{p}</p>
              ))}
            </div>
            <div style={{ width: '250px', position: 'relative', marginTop: '1rem' }}>
              <div style={{ 
                position: 'absolute', top: '-15px', left: '20px', width: '80px', height: '30px', 
                backgroundColor: 'rgba(10, 115, 255, 0.6)', transform: 'rotate(-10deg)', zIndex: 1,
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
              }} />
              <img src={studentData.photo2} alt="Atividade 2" style={{ width: '100%', borderRadius: '4px', boxShadow: '0 4px 10px rgba(0,0,0,0.15)', border: '8px solid white' }} />
            </div>
          </div>
        )}

        {/* 3rd Part and 3rd photo */}
        {type === 'report' && (
          <div style={{ marginTop: '2rem', display: 'flex', gap: '2rem', alignItems: 'flex-start' }}>
            <div style={{ flex: 1 }}>
              {cleanContent.split('\n\n').slice(Math.ceil(cleanContent.split('\n\n').length * 2 / 3)).map((p, i) => (
                <p key={i} style={{ marginBottom: '1rem' }}>{p}</p>
              ))}
              
              {(studentData.positivePoints || studentData.attentionPoints) && (
                <div style={{ marginTop: '2rem', padding: '1rem', backgroundColor: '#fdfbf0', borderRadius: '8px', border: '1px solid #faefcc' }}>
                  {studentData.positivePoints && <p><strong>Destaques:</strong> {studentData.positivePoints}</p>}
                  {studentData.attentionPoints && <p><strong>Próximos Passos:</strong> {studentData.attentionPoints}</p>}
                </div>
              )}
            </div>
            {studentData.photo3 && (
              <div style={{ width: '250px', position: 'relative', marginTop: '1rem' }}>
                <div style={{ 
                  position: 'absolute', top: '-15px', right: '40px', width: '80px', height: '30px', 
                  backgroundColor: 'rgba(239, 68, 68, 0.6)', transform: 'rotate(5deg)', zIndex: 1,
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                }} />
                <img src={studentData.photo3} alt="Atividade 3" style={{ width: '100%', borderRadius: '4px', boxShadow: '0 4px 10px rgba(0,0,0,0.15)', border: '8px solid white' }} />
              </div>
            )}
          </div>
        )}

        {type === 'pei' && (
           <div className="print-content" style={{ marginTop: '2rem' }}>
            {cleanContent.split('\n\n').slice(Math.ceil(cleanContent.split('\n\n').length / 2)).map((p, i) => (
              <p key={i} style={{ marginBottom: '1rem' }}>{p}</p>
            ))}
          </div>
        )}

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
