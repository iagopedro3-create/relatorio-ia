import { useState, useRef } from 'react';
import { Sparkles, Copy, CheckCircle, FileText, Search, Printer, AlertCircle } from 'lucide-react';
import { ReportForm, type StudentData } from '../components/ReportForm';
import { PrintPreview } from '../components/PrintPreview';
import { generateAIReport } from '../lib/aiService';
import { exportToDocx } from '../lib/exportDocx';
import { mockStudents, mockClasses } from '../store/mockDb';
import { useAuth } from '../contexts/AuthContext';
import { useSettings } from '../contexts/SettingsContext';

export function ReportGenerator() {
  const { user } = useAuth();
  const { settings } = useSettings();
  const [isLoading, setIsLoading] = useState(false);
  const [reportResult, setReportResult] = useState('');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  
  const currentStudentRef = useRef<StudentData | null>(null);

  // Filter students based on role
  const availableStudents = mockStudents.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase());
    if (user?.role === 'teacher' && user.classId) {
      // In a real app, s.classId would exist. In our mock it's simpler
      return matchesSearch;
    }
    return matchesSearch;
  });

  const handleGenerateReport = async (data: StudentData) => {
    if (!settings.apiKey) {
      setError('A chave da API não foi configurada pela Direção.');
      return;
    }

    setIsLoading(true);
    setError('');
    setReportResult('');
    setCopied(false);
    currentStudentRef.current = data;

    try {
      const result = await generateAIReport(data, {
        provider: settings.aiProvider,
        modelId: settings.aiModel,
        apiKey: settings.apiKey
      });
      setReportResult(result);
    } catch (err: any) {
      setError(err.message || 'Erro ao gerar o relatório.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(reportResult);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadDoc = () => {
    if (reportResult && currentStudentRef.current) {
      exportToDocx(reportResult, currentStudentRef.current);
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 style={{ margin: 0 }}>Gerador de Relatórios</h2>
          <p className="text-muted">
            {user?.role === 'teacher' 
              ? `Visualizando alunos da sua turma: ${mockClasses.find(c => c.id === user.classId)?.name}`
              : 'Acesso total aos alunos da escola'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2" style={{ gridTemplateColumns: 'minmax(0, 1.3fr) minmax(0, 0.7fr)', gap: '2rem' }}>
        <div className="left-panel">
          <ReportForm onSubmit={handleGenerateReport} isLoading={isLoading} />
        </div>
        
        <div className="right-panel">
          <div className="card" style={{ marginBottom: '1.5rem', padding: '1rem' }}>
            <h3 style={{ fontSize: '1rem', marginBottom: '1rem' }}>Pesquisar Aluno</h3>
            <div className="form-group" style={{ position: 'relative', margin: 0 }}>
              <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
              <input 
                type="text" 
                placeholder="Nome do aluno..." 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                style={{ paddingLeft: '40px' }}
              />
            </div>
            
            <div style={{ marginTop: '1rem', maxHeight: '200px', overflowY: 'auto' }}>
              {availableStudents.map(s => (
                <div key={s.id} style={{ 
                  padding: '0.75rem', borderBottom: '1px solid var(--color-bg)', 
                  cursor: 'pointer', fontSize: '0.9rem', display: 'flex', justifyContent: 'space-between' 
                }}>
                  <span>{s.name}</span>
                </div>
              ))}
              {availableStudents.length === 0 && <p className="text-muted" style={{ textAlign: 'center', padding: '1rem' }}>Nenhum aluno encontrado.</p>}
            </div>
          </div>

          <div className="card result-card" style={{ 
            minHeight: '500px', 
            maxHeight: 'calc(100vh - 100px)', 
            display: 'flex', 
            flexDirection: 'column', 
            position: 'sticky', 
            top: '2rem',
            boxShadow: 'var(--shadow-lg)'
          }}>
            <div className="flex justify-between items-center mb-4">
              <h2 style={{ marginBottom: 0, color: 'var(--color-secondary)', fontSize: '1.2rem' }} className="flex items-center gap-2">
                <Sparkles size={20} /> Resultado
              </h2>
              {reportResult && (
                <div className="flex gap-2">
                  <button onClick={() => setShowPrintPreview(true)} className="btn btn-primary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}>
                    <Printer size={14} /> PDF / Imprimir
                  </button>
                  <button onClick={handleDownloadDoc} className="btn btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}>
                    <FileText size={14} /> Word
                  </button>
                  <button onClick={handleCopy} className="btn btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', background: 'var(--color-surface)' }}>
                    {copied ? <CheckCircle size={14} /> : <Copy size={14} />}
                  </button>
                </div>
              )}
            </div>

            <div className="result-content" style={{ 
              flex: 1, 
              display: 'flex',
              flexDirection: 'column',
              backgroundColor: 'rgba(255, 255, 255, 0.3)',
              borderRadius: 'var(--radius-sm)'
            }}>
              {isLoading ? (
                <div className="flex justify-center items-center" style={{ height: '100%', flexDirection: 'column', gap: '1rem', color: 'var(--color-text-muted)' }}>
                  <div className="loader"></div>
                  <p>A IA está redigindo o relatório...</p>
                </div>
              ) : reportResult ? (
                <textarea 
                  value={reportResult} 
                  onChange={(e) => setReportResult(e.target.value)}
                  style={{ 
                    flex: 1, 
                    border: 'none', 
                    background: 'transparent', 
                    padding: '1.5rem', 
                    fontSize: '1rem', 
                    lineHeight: '1.7', 
                    resize: 'none',
                    fontFamily: 'inherit',
                    color: '#333'
                  }}
                />
              ) : error ? (
                <div className="flex justify-center items-center" style={{ height: '100%', color: '#991b1b', textAlign: 'center', padding: '2rem', backgroundColor: 'rgba(254, 226, 226, 0.5)' }}>
                  <div>
                    <AlertCircle size={40} style={{ margin: '0 auto 1rem' }} />
                    <p style={{ fontWeight: 600 }}>{error}</p>
                    <p style={{ fontSize: '0.85rem', marginTop: '0.5rem' }}>Verifique as configurações ou tente novamente.</p>
                  </div>
                </div>
              ) : (
                <div className="flex justify-center items-center" style={{ height: '100%', color: 'var(--color-text-muted)', textAlign: 'center', padding: '2rem' }}>
                  <p>Os dados preenchidos serão transformados em um relatório pedagógico aqui.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <PrintPreview 
        isOpen={showPrintPreview}
        onClose={() => setShowPrintPreview(false)}
        title="ESCOLA VIDA DE APRENDIZ"
        subtitle="Relatório Pedagógico Descritivo - 2026"
        studentData={currentStudentRef.current || {}}
        content={reportResult}
        type="report"
      />
    </div>
  );
}
