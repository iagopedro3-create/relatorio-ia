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
          {cleanContent}
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
