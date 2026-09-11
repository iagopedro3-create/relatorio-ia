import { useState, useMemo } from 'react';
import { Sparkles, Copy, CheckCircle, FileText, Brain, Printer, Save } from 'lucide-react';
import { toast } from 'sonner';
import { PeiForm, type PeiData } from '../components/PeiForm';
import { PrintPreview } from '../components/PrintPreview';
import type { RosterStudent } from '../components/ReportForm';
import { generatePei, firstName } from '../lib/aiService';
import { exportPeiToDocx } from '../lib/exportDocx';
import { useAuth } from '../contexts/AuthContext';
import { useSchool } from '../contexts/SchoolContext';
import { useAsync } from '../lib/useAsync';
import { listEnrollments, listStudents, createDocument, updateDocument } from '../data';
import type { Student, StudentDocument } from '../types/db';

export function PeiGenerator() {
  const { user } = useAuth();
  const { school, classes, selectedYear, refreshAiUsage } = useSchool();
  const [isLoading, setIsLoading] = useState(false);
  const [peiResult, setPeiResult] = useState('');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [doc, setDoc] = useState<StudentDocument | null>(null);
  const [saving, setSaving] = useState(false);
  const [currentData, setCurrentData] = useState<PeiData | null>(null);

  const classIds = useMemo(() => classes.map(c => c.id), [classes]);
  const enrollQ = useAsync(() => listEnrollments(classIds), [classIds.join(',')], []);
  const studentsQ = useAsync(() => school ? listStudents(school.id) : Promise.resolve([] as Student[]), [school?.id], [] as Student[]);
  const roster = useMemo<RosterStudent[]>(() => enrollQ.data
    .map(e => ({ student: studentsQ.data.find(s => s.id === e.student_id), cls: classes.find(c => c.id === e.class_id) }))
    .filter((r): r is RosterStudent => Boolean(r.student && r.cls))
    .sort((a, b) => a.student.name.localeCompare(b.student.name, 'pt-BR')), [enrollQ.data, studentsQ.data, classes]);

  const handleGeneratePei = async (data: PeiData) => {
    if (!school || !user) return;
    setIsLoading(true);
    setError('');
    setPeiResult('');
    setCopied(false);
    setDoc(null);
    setCurrentData(data);

    try {
      const result = await generatePei(data.studentId, {
        firstName: firstName(data.name),
        age: data.age,
        group: data.group,
        diagnosis: data.diagnosis,
        selectedComm: data.selectedComm, communication: data.communication,
        selectedSocial: data.selectedSocial, social: data.social,
        selectedBehavior: data.selectedBehavior, behavior: data.behavior,
        selectedEmotional: data.selectedEmotional, emotional: data.emotional,
        selectedLearning: data.selectedLearning, learning: data.learning,
        selectedMotor: data.selectedMotor, motor: data.motor,
        selectedAutonomy: data.selectedAutonomy, autonomy: data.autonomy,
        selectedSensory: data.selectedSensory, sensory: data.sensory,
      });
      setPeiResult(result);
      void refreshAiUsage();
      const created = await createDocument({
        school_id: school.id,
        student_id: data.studentId,
        class_id: data.classId || null,
        year_id: selectedYear?.id ?? null,
        kind: 'pei',
        period: selectedYear?.label ?? null,
        author_id: user.id,
        form_data: data as unknown as Record<string, unknown>,
        content: result,
        status: 'draft',
      });
      setDoc(created);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao gerar o PEI.');
    } finally {
      setIsLoading(false);
    }
  };

  const persist = async () => {
    if (!doc) return;
    setSaving(true);
    try {
      setDoc(await updateDocument(doc.id, { content: peiResult }));
      toast.success('PEI salvo.');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Falha ao salvar.');
    } finally {
      setSaving(false);
    }
  };

  const handleCopy = () => {
    void navigator.clipboard.writeText(peiResult);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadDoc = () => {
    if (peiResult && currentData && school) {
      void exportPeiToDocx(peiResult, currentData, { schoolName: school.legal_name || school.name, year: selectedYear?.label ?? '' });
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 style={{ margin: 0 }}>Gestão de Educação Inclusiva</h2>
          <p className="text-muted">Planos Educacionais Individualizados (PEI) baseados em evidências</p>
        </div>
      </div>

      <div className="grid grid-cols-2" style={{ gridTemplateColumns: 'minmax(0, 1.3fr) minmax(0, 0.7fr)', gap: '2rem' }}>
        <div className="left-panel">
          <PeiForm students={roster} onSubmit={handleGeneratePei} isLoading={isLoading} />
        </div>

        <div className="right-panel">
          <div className="card result-card" style={{ minHeight: '600px', maxHeight: 'calc(100vh - 100px)', display: 'flex', flexDirection: 'column', position: 'sticky', top: '2rem', boxShadow: 'var(--shadow-lg)' }}>
            <div className="flex justify-between items-center mb-4" style={{ flexWrap: 'wrap', gap: '0.5rem' }}>
              <h2 style={{ marginBottom: 0, color: 'var(--color-secondary)', fontSize: '1.2rem' }} className="flex items-center gap-2"><Brain size={20} /> Plano Elaborado</h2>
              {peiResult && (
                <div className="flex gap-2">
                  <button onClick={() => setShowPrintPreview(true)} className="btn btn-primary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}><Printer size={14} /> PDF</button>
                  <button onClick={handleDownloadDoc} className="btn btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}><FileText size={14} /> Word</button>
                  <button onClick={handleCopy} className="btn btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}>{copied ? <CheckCircle size={14} /> : <Copy size={14} />}</button>
                </div>
              )}
            </div>

            <div className="result-content" style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: 0, minHeight: 0 }}>
              {isLoading ? (
                <div className="flex justify-center items-center" style={{ height: '100%', flexDirection: 'column', gap: '1rem', color: 'var(--color-text-muted)', padding: '2rem' }}>
                  <div className="loader" style={{ borderTopColor: 'var(--color-primary)', borderColor: 'rgba(0,0,0,0.1)' }}></div>
                  <p>A IA está estruturando o PEI conforme as diretrizes pedagógicas...</p>
                </div>
              ) : peiResult ? (
                <textarea value={peiResult} onChange={(e) => setPeiResult(e.target.value)} style={{ flex: 1, border: 'none', background: 'transparent', padding: '1.5rem', fontSize: '1rem', lineHeight: '1.7', resize: 'none', fontFamily: 'inherit', color: '#222', minHeight: '300px' }} />
              ) : (
                <div className="flex justify-center items-center" style={{ height: '100%', color: 'var(--color-text-muted)', textAlign: 'center', padding: '2rem' }}>
                  <div style={{ opacity: 0.5 }}>
                    <Sparkles size={48} style={{ marginBottom: '1rem' }} />
                    <p>Preencha as observações pedagógicas para gerar um PEI técnico e humanizado.</p>
                  </div>
                </div>
              )}
            </div>
            {doc && peiResult && (
              <button className="btn btn-secondary mt-4" style={{ padding: '0.6rem', fontSize: '0.85rem' }} disabled={saving} onClick={() => void persist()}><Save size={16} /> Salvar edições</button>
            )}
            {error && <div style={{ color: '#991b1b', padding: '1rem', backgroundColor: '#fef2f2', borderRadius: 'var(--radius-sm)', marginTop: '1rem', fontSize: '0.9rem' }}>{error}</div>}
          </div>
        </div>
      </div>

      <PrintPreview
        isOpen={showPrintPreview}
        onClose={() => setShowPrintPreview(false)}
        subtitle={`PLANO EDUCACIONAL INDIVIDUALIZADO (PEI) · ${selectedYear?.label ?? ''}`}
        studentData={currentData ?? {}}
        content={peiResult}
        type="pei"
      />
    </div>
  );
}
