import { X, Printer, Download } from 'lucide-react';
import { renderMarkdown } from '../lib/markdown';
import html2pdf from 'html2pdf.js';
import { useSchool } from '../contexts/SchoolContext';
import { logoUrl } from '../lib/branding';

interface PrintableStudent {
  name?: string;
  group?: string;
  age?: string;
  teacherName?: string;
  diagnosis?: string;
  ageGroupId?: string;
  positivePoints?: string;
  attentionPoints?: string;
  photo1?: string;
  photo2?: string;
  photo3?: string;
}

interface PrintPreviewProps {
  isOpen: boolean;
  onClose: () => void;
  subtitle: string;
  studentData: PrintableStudent;
  content: string;
  type: 'report' | 'pei';
}

export function PrintPreview({ isOpen, onClose, subtitle, studentData, content, type }: PrintPreviewProps) {
  const { school } = useSchool();
  if (!isOpen) return null;

  const schoolName = (school?.legal_name || school?.name || '').toUpperCase();
  const tagline = school?.branding?.tagline;
  const logo = logoUrl(school);

  const handleDownloadPDF = () => {
    const element = document.querySelector('.print-area');
    if (!element) return;
    void html2pdf().set({
      margin: [10, 10, 10, 10],
      filename: `${type === 'pei' ? 'PEI' : 'Relatorio'}_${studentData.name ?? 'aluno'}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
    }).from(element as HTMLElement).save();
  };

  const showCover = type === 'report' && studentData.ageGroupId && studentData.ageGroupId !== 'fundamental_1';

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
        <button onClick={handleDownloadPDF} className="btn btn-primary" style={{ backgroundColor: '#10b981', boxShadow: 'none' }}><Download size={20} /> Baixar PDF</button>
        <button onClick={() => window.print()} className="btn btn-primary"><Printer size={20} /> Imprimir</button>
        <button onClick={onClose} className="btn btn-secondary" style={{ backgroundColor: '#ef4444', boxShadow: 'none' }}><X size={20} /> Fechar</button>
      </div>

      <div className="print-page print-area">
        {showCover && (
          <div className="cover-page" style={{ position: 'relative', height: '270mm', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
            <div style={{ backgroundColor: 'var(--color-secondary)', color: 'white', padding: '3.5rem 6rem', borderRadius: '1.5rem', transform: 'rotate(-1.5deg)', boxShadow: '0 10px 40px rgba(0,0,0,0.2)', textAlign: 'center', marginBottom: '5rem' }}>
              <h1 style={{ color: 'white', margin: 0, fontSize: '4rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '3px' }}>Relatório<br />Individual</h1>
            </div>
            <div style={{ textAlign: 'center', backgroundColor: 'rgba(255,255,255,0.8)', padding: '2rem 4rem', borderRadius: '1rem' }}>
              <h2 style={{ fontSize: '2.8rem', color: 'var(--color-primary)', margin: 0, fontWeight: 900 }}>{studentData.name?.toUpperCase()}</h2>
              <p style={{ fontSize: '1.5rem', color: 'var(--color-text-muted)', marginTop: '0.75rem', fontWeight: 600 }}>{studentData.group}</p>
            </div>
            <div style={{ position: 'absolute', bottom: '2rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1.5rem' }}>
              <img src={logo} alt="Logo" style={{ height: '75px' }} />
              <div style={{ width: '2px', height: '55px', backgroundColor: 'var(--color-primary)', opacity: 0.4 }} />
              <div style={{ textAlign: 'left' }}>
                <p style={{ fontWeight: 900, color: 'var(--color-primary)', margin: 0, fontSize: '1.2rem', letterSpacing: '0.05em' }}>{schoolName}</p>
                {tagline && <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--color-text-muted)', fontWeight: 500 }}>{tagline}</p>}
              </div>
            </div>
            <div style={{ pageBreakAfter: 'always' }} />
          </div>
        )}

        <div className="print-header">
          <img src={logo} alt={schoolName} style={{ maxWidth: '200px', maxHeight: '90px', marginBottom: '1rem' }} />
          <h1 style={{ color: 'var(--color-primary)', margin: 0, fontSize: '1.6rem', fontWeight: 800 }}>{schoolName}</h1>
          <h2 style={{ color: 'var(--color-secondary)', margin: '0.25rem 0 0 0', fontSize: '1.1rem', fontWeight: 600 }}>{subtitle}</h2>
        </div>

        <table className="print-table" style={{ border: '2px solid var(--color-primary)', borderRadius: '8px', overflow: 'hidden' }}>
          <tbody>
            <tr>
              <td style={{ backgroundColor: '#f8fafc', width: '65%' }}><strong>ALUNO(A):</strong> <span style={{ color: 'var(--color-primary)', fontWeight: 800 }}>{studentData.name?.toUpperCase()}</span></td>
              <td style={{ backgroundColor: '#f8fafc' }}><strong>TURMA:</strong> {studentData.group}</td>
            </tr>
            <tr>
              <td>{type === 'pei' ? <><strong>DIAGNÓSTICO:</strong> {studentData.diagnosis || '---'}</> : <><strong>PROFESSOR(A):</strong> {studentData.teacherName || '---'}</>}</td>
              <td><strong>IDADE:</strong> {studentData.age} anos</td>
            </tr>
          </tbody>
        </table>

        <div className="print-content">
          <div style={{ width: '100%' }}>{renderMarkdown(content)}</div>

          {(studentData.photo1 || studentData.photo2 || studentData.photo3) && type === 'report' && (
            <div className="photo-grid" style={{ display: 'grid', gridTemplateColumns: studentData.photo3 ? '1fr 1fr 1fr' : '1fr 1fr', gap: '1.5rem', marginTop: '3rem', pageBreakInside: 'avoid' }}>
              {[studentData.photo1, studentData.photo2, studentData.photo3].map((photo, i) => photo && (
                <div key={i} style={{ textAlign: 'center' }}>
                  <img src={photo} alt={`Atividade ${i + 1}`} style={{ width: '100%', height: '180px', objectFit: 'cover', borderRadius: '4px', boxShadow: '0 4px 10px rgba(0,0,0,0.1)', border: '4px solid white' }} />
                  <p style={{ fontSize: '0.7rem', color: '#666', marginTop: '0.5rem' }}>Registros de Atividades {['I', 'II', 'III'][i]}</p>
                </div>
              ))}
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
            <div className="signature-line">{type === 'pei' ? 'Professor(a) Responsável' : (studentData.teacherName || 'Professor(a)')}</div>
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
