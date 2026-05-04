import { useState, useRef } from 'react';
import { Sparkles, Copy, CheckCircle, FileText, Brain, Printer } from 'lucide-react';
import { PeiForm, type PeiData } from '../components/PeiForm';
import { PrintPreview } from '../components/PrintPreview';
import { generatePei } from '../lib/aiService';
import { exportToDocx, exportPeiToDocx } from '../lib/exportDocx';
import { useSettings } from '../contexts/SettingsContext';

export function PeiGenerator() {
  const { settings } = useSettings();
  const [isLoading, setIsLoading] = useState(false);
  const [peiResult, setPeiResult] = useState('');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  
  const currentDataRef = useRef<PeiData | null>(null);

  const handleGeneratePei = async (data: PeiData) => {
    if (!settings.apiKey) {
      setError('A chave da API não foi configurada.');
      return;
    }

    setIsLoading(true);
    setError('');
    setPeiResult('');
    setCopied(false);
    currentDataRef.current = data;

    try {
      const result = await generatePei(data, {
        provider: settings.aiProvider,
        modelId: settings.aiModel,
        apiKey: settings.apiKey
      });
      setPeiResult(result);
    } catch (err: any) {
      setError(err.message || 'Erro ao gerar o PEI.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(peiResult);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadDoc = () => {
    if (peiResult && currentDataRef.current) {
      exportPeiToDocx(peiResult, currentDataRef.current);
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 style={{ margin: 0 }}>Gestão de Educação Inclusiva</h2>
          <p className="text-muted">Elaboração de Planos Educacionais Individualizados (PEI) baseados em evidências</p>
        </div>
      </div>

      <div className="grid grid-cols-2" style={{ gridTemplateColumns: 'minmax(0, 1.3fr) minmax(0, 0.7fr)', gap: '2rem' }}>
        <div className="left-panel">
          <PeiForm onSubmit={handleGeneratePei} isLoading={isLoading} />
        </div>
        
        <div className="right-panel">
          <div className="card result-card" style={{ 
            minHeight: '600px', 
            maxHeight: 'calc(100vh - 100px)', 
            display: 'flex', 
            flexDirection: 'column', 
            position: 'sticky', 
            top: '2rem',
            boxShadow: 'var(--shadow-lg)',
            borderTop: '4px solid var(--color-secondary)'
          }}>
            <div className="flex justify-between items-center mb-4">
              <h2 style={{ marginBottom: 0, color: 'var(--color-secondary)', fontSize: '1.2rem' }} className="flex items-center gap-2">
                <Brain size={20} /> Plano Elaborado
              </h2>
              {peiResult && (
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
              backgroundColor: 'rgba(255, 255, 255, 0.4)',
              borderRadius: 'var(--radius-sm)'
            }}>
              {isLoading ? (
                <div className="flex justify-center items-center" style={{ height: '100%', flexDirection: 'column', gap: '1rem', color: 'var(--color-text-muted)' }}>
                  <div className="loader"></div>
                  <p>A IA está estruturando o PEI conforme as diretrizes pedagógicas...</p>
                </div>
              ) : peiResult ? (
                <textarea 
                  value={peiResult} 
                  onChange={(e) => setPeiResult(e.target.value)}
                  style={{ 
                    flex: 1, 
                    border: 'none', 
                    background: 'transparent', 
                    padding: '1.5rem', 
                    fontSize: '1rem', 
                    lineHeight: '1.7', 
                    resize: 'none',
                    fontFamily: 'inherit',
                    color: '#222'
                  }}
                />
              ) : (
                <div className="flex justify-center items-center" style={{ height: '100%', color: 'var(--color-text-muted)', textAlign: 'center', padding: '2rem' }}>
                  <div style={{ opacity: 0.5 }}>
                    <Sparkles size={48} style={{ marginBottom: '1rem' }} />
                    <p>Preencha as observações pedagógicas para gerar um PEI técnico e humanizado.</p>
                  </div>
                </div>
              )}
            </div>
            {error && <div style={{ color: 'var(--color-error)', padding: '1rem', backgroundColor: '#fef2f2', borderRadius: 'var(--radius-sm)', marginTop: '1rem' }}>{error}</div>}
          </div>
        </div>
      </div>

      <PrintPreview 
        isOpen={showPrintPreview}
        onClose={() => setShowPrintPreview(false)}
        title="ESCOLA VIDA DE APRENDIZ"
        subtitle="PLANO EDUCACIONAL INDIVIDUALIZADO (PEI) - 2026"
        studentData={currentDataRef.current || {}}
        content={peiResult}
        type="pei"
      />
    </div>
  );
}
