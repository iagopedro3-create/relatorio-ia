import { useState, useMemo } from 'react';
import { Sparkles, Copy, CheckCircle, FileText, Printer, AlertCircle, Send, Save, History } from 'lucide-react';
import { toast } from 'sonner';
import { ReportForm, type StudentData, type RosterStudent } from '../components/ReportForm';
import { PrintPreview } from '../components/PrintPreview';
import { generateAIReport, firstName } from '../lib/aiService';
import { exportToDocx } from '../lib/exportDocx';
import { useAuth } from '../contexts/AuthContext';
import { useSchool } from '../contexts/SchoolContext';
import { useAsync } from '../lib/useAsync';
import { PageHeader, SkeletonCard, StatusBadge } from '../components/ui';
import { listEnrollments, listStudents, createDocument, updateDocument, listDocuments, listObservations } from '../data';
import { periodRange } from '../lib/periods';
import type { Student, StudentDocument } from '../types/db';

export function ReportGenerator() {
  const { user } = useAuth();
  const { school, classes, selectedYear, grading, refreshAiUsage } = useSchool();
  const [isLoading, setIsLoading] = useState(false);
  const [reportResult, setReportResult] = useState('');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [doc, setDoc] = useState<StudentDocument | null>(null);
  const [saving, setSaving] = useState(false);
  const [currentStudent, setCurrentStudent] = useState<StudentData | null>(null);
  const [formStudentId, setFormStudentId] = useState<string | null>(null);

  // Alunos das turmas visíveis (a RLS já limitou as turmas ao que o usuário pode ver).
  const classIds = useMemo(() => classes.map(c => c.id), [classes]);
  const enrollQ = useAsync(() => listEnrollments(classIds), [classIds.join(',')], []);
  const studentsQ = useAsync(() => school ? listStudents(school.id) : Promise.resolve([] as Student[]), [school?.id], [] as Student[]);
  const rosterLoading = enrollQ.loading || studentsQ.loading;
  const roster = useMemo<RosterStudent[]>(() => {
    return enrollQ.data
      .map(e => ({ student: studentsQ.data.find(s => s.id === e.student_id), cls: classes.find(c => c.id === e.class_id) }))
      .filter((r): r is RosterStudent => Boolean(r.student && r.cls))
      .sort((a, b) => a.student.name.localeCompare(b.student.name, 'pt-BR'));
  }, [enrollQ.data, studentsQ.data, classes]);

  // Histórico segue o aluno escolhido na ficha; cai no aluno do documento aberto.
  const currentStudentId = formStudentId ?? currentStudent?.studentId;
  const historyQ = useAsync(
    () => (school && currentStudentId) ? listDocuments({ schoolId: school.id, studentId: currentStudentId, kind: 'report' }) : Promise.resolve([]),
    [school?.id, doc?.id, currentStudentId], [],
  );

  // Registros de observação do aluno no ano letivo (a ficha filtra por período).
  const yearRange = { start: periodRange(selectedYear, grading.periods.length, 0).start, end: periodRange(selectedYear, grading.periods.length, grading.periods.length - 1).end };
  const observationsQ = useAsync(
    () => (school && currentStudentId) ? listObservations({ schoolId: school.id, studentId: currentStudentId, from: yearRange.start, to: yearRange.end }) : Promise.resolve([]),
    [school?.id, currentStudentId, yearRange.start, yearRange.end], [],
  );

  // Fotos são base64 pesadas e só servem para a impressão: não vão para o banco.
  const stripPhotos = (d: StudentData): Partial<StudentData> => {
    const copy: Partial<StudentData> = { ...d };
    delete copy.photo1; delete copy.photo2; delete copy.photo3;
    return copy;
  };

  const handleGenerateReport = async (data: StudentData) => {
    if (!school || !user) return;
    setIsLoading(true);
    setError('');
    setReportResult('');
    setCopied(false);
    setDoc(null);
    setCurrentStudent(data);

    try {
      const result = await generateAIReport({
        firstName: firstName(data.name),
        age: data.age,
        group: data.group,
        teacherName: data.teacherName,
        subject: data.subject,
        reportContext: data.reportContext,
        reportTone: data.reportTone,
        generalObservations: data.generalObservations,
        socialMap: data.socialMap, fieldSocial: data.fieldSocial,
        motorMap: data.motorMap, fieldMotor: data.fieldMotor,
        artsMap: data.artsMap, fieldArts: data.fieldArts,
        languageMap: data.languageMap, fieldLanguage: data.fieldLanguage,
        logicMap: data.logicMap, fieldLogic: data.fieldLogic,
        englishMap: data.englishMap, fieldEnglish: data.fieldEnglish,
        peMap: data.peMap, fieldPe: data.fieldPe,
        positivePoints: data.positivePoints,
        attentionPoints: data.attentionPoints,
      });
      setReportResult(result);
      void refreshAiUsage();

      // Salva como rascunho já na geração: nada se perde se a aba fechar.
      const created = await createDocument({
        school_id: school.id,
        student_id: data.studentId,
        class_id: data.classId || null,
        year_id: selectedYear?.id ?? null,
        kind: 'report',
        period: data.reportContext,
        subject_id: data.subject === 'Inglês' ? 'ing' : data.subject === 'Educação Física' ? 'ef' : null,
        author_id: user.id,
        form_data: stripPhotos(data) as unknown as Record<string, unknown>,
        content: result,
        status: 'draft',
      });
      setDoc(created);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao gerar o relatório.');
    } finally {
      setIsLoading(false);
    }
  };

  const persist = async (status: StudentDocument['status']) => {
    if (!doc) return;
    setSaving(true);
    try {
      const updated = await updateDocument(doc.id, { content: reportResult, status });
      setDoc(updated);
      toast.success(status === 'submitted' ? 'Relatório enviado para a coordenação.' : 'Relatório salvo.');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Falha ao salvar.');
    } finally {
      setSaving(false);
    }
  };

  const handleCopy = () => {
    void navigator.clipboard.writeText(reportResult);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadDoc = () => {
    if (reportResult && currentStudent && school) {
      void exportToDocx(reportResult, currentStudent, { schoolName: school.legal_name || school.name, year: selectedYear?.label ?? '' });
    }
  };

  const loadPrevious = (d: StudentDocument) => {
    setDoc(d);
    setReportResult(d.content);
    const fd = d.form_data as unknown as StudentData;
    setCurrentStudent({ ...fd, name: fd.name ?? '', studentId: d.student_id });
  };

  return (
    <div>
      <PageHeader
        icon={<FileText size={22} />}
        title="Relatório descritivo com IA"
        subtitle={rosterLoading ? 'Carregando alunos…' : `${roster.length} aluno(s) disponíveis · ${selectedYear?.label ?? ''}`}
      />

      <div className="grid grid-cols-2" style={{ gridTemplateColumns: 'minmax(0, 1.3fr) minmax(0, 0.7fr)', gap: '2rem' }}>
        <div className="left-panel">
          {rosterLoading ? <SkeletonCard lines={8} /> : <ReportForm students={roster} onSubmit={handleGenerateReport} isLoading={isLoading} onStudentChange={setFormStudentId} observations={observationsQ.data} />}
        </div>

        <div className="right-panel">
          <div style={{ position: 'sticky', top: '2rem' }}>
          {historyQ.data.length > 0 && (
            <div className="card mb-4" style={{ padding: '0.9rem 1.25rem' }}>
              <h4 className="flex items-center gap-2 mb-2" style={{ fontSize: '0.85rem', margin: 0 }}><History size={15} /> Relatórios anteriores deste aluno</h4>
              <div style={{ maxHeight: '120px', overflowY: 'auto' }}>
                {historyQ.data.map(d => (
                  <button key={d.id} onClick={() => loadPrevious(d)} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', background: d.id === doc?.id ? 'var(--color-primary-soft)' : 'none', border: '1px solid var(--color-border-soft)', borderRadius: '6px', padding: '0.4rem 0.75rem', marginTop: '0.4rem', cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.8rem' }}>
                    <span style={{ fontWeight: 600 }}>{d.period ?? 'Relatório'}</span>
                    <span className="text-muted flex items-center gap-2">{new Date(d.updated_at).toLocaleDateString('pt-BR')} <StatusBadge status={d.status} /></span>
                  </button>
                ))}
              </div>
            </div>
          )}
          <div className="card result-card" style={{ minHeight: '520px', maxHeight: 'calc(100vh - 160px)', display: 'flex', flexDirection: 'column', boxShadow: 'var(--shadow-lg)' }}>
            <div className="flex justify-between items-center mb-4" style={{ flexWrap: 'wrap', gap: '0.5rem' }}>
              <h2 style={{ marginBottom: 0, color: 'var(--color-text)', fontSize: '1.1rem' }} className="flex items-center gap-2">
                <Sparkles size={20} color="var(--color-secondary)" /> Relatório
                {doc && <StatusBadge status={doc.status} />}
              </h2>
              {reportResult && (
                <div className="flex gap-2" style={{ flexWrap: 'wrap' }}>
                  <button onClick={() => setShowPrintPreview(true)} className="btn btn-primary btn-sm"><Printer size={14} /> PDF</button>
                  <button onClick={handleDownloadDoc} className="btn btn-secondary btn-sm"><FileText size={14} /> Word</button>
                  <button onClick={handleCopy} className="btn btn-secondary btn-sm" title="Copiar texto">{copied ? <CheckCircle size={14} /> : <Copy size={14} />}</button>
                </div>
              )}
            </div>

            <div className="result-content" style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: 0, minHeight: 0 }}>
              {isLoading ? (
                <div className="flex justify-center items-center" style={{ height: '100%', flexDirection: 'column', gap: '1rem', color: 'var(--color-text-muted)', padding: '2rem' }}>
                  <div className="loader" style={{ borderTopColor: 'var(--color-primary)', borderColor: 'rgba(0,0,0,0.1)' }}></div>
                  <p>A IA está redigindo o relatório...</p>
                </div>
              ) : reportResult ? (
                <textarea value={reportResult} onChange={(e) => setReportResult(e.target.value)} style={{ flex: 1, border: 'none', background: 'transparent', padding: '1.5rem', fontSize: '1rem', lineHeight: '1.7', resize: 'none', fontFamily: 'inherit', color: '#222', minHeight: '300px' }} />
              ) : (
                <div className="flex justify-center items-center" style={{ height: '100%', color: 'var(--color-text-muted)', textAlign: 'center', padding: '2rem' }}>
                  <div style={{ opacity: 0.5 }}>
                    <Sparkles size={48} style={{ marginBottom: '1rem' }} />
                    <p>Preencha a ficha e gere o relatório. Ele fica salvo como rascunho e pode ser editado aqui.</p>
                  </div>
                </div>
              )}
            </div>

            {doc && reportResult && (
              <div className="mt-4">
                <p className="text-muted" style={{ fontSize: '0.78rem', margin: '0 0 0.5rem' }}>
                  {doc.status === 'draft' && 'Rascunho salvo automaticamente. Revise o texto e envie para a coordenação.'}
                  {doc.status === 'submitted' && 'Enviado. A coordenação vai revisar e aprovar; depois disso a família passa a ver.'}
                  {doc.status === 'returned' && 'Devolvido pela coordenação: ajuste o texto e envie de novo.'}
                  {doc.status === 'approved' && 'Aprovado — já visível para a família no portal.'}
                </p>
                <div className="flex gap-2" style={{ flexWrap: 'wrap' }}>
                  {(doc.status !== 'approved' || user?.role === 'admin' || user?.role === 'coordinator') && (
                    <button className="btn btn-secondary btn-sm" style={{ flex: 1 }} disabled={saving} onClick={() => void persist(doc.status === 'approved' ? 'approved' : 'draft')}>
                      <Save size={16} /> Salvar edições
                    </button>
                  )}
                  {user?.role === 'teacher' && doc.status !== 'approved' && (
                    <button className="btn btn-primary btn-sm" style={{ flex: 1 }} disabled={saving} onClick={() => void persist('submitted')}>
                      <Send size={16} /> {doc.status === 'submitted' ? 'Reenviar' : 'Enviar para coordenação'}
                    </button>
                  )}
                  {(user?.role === 'admin' || user?.role === 'coordinator') && doc.status !== 'approved' && (
                    <button className="btn btn-primary btn-sm" style={{ flex: 1 }} disabled={saving} onClick={() => void persist('approved')}>
                      <CheckCircle size={16} /> Aprovar
                    </button>
                  )}
                </div>
              </div>
            )}

            {error && (
              <div className="callout callout-danger mt-4">
                <AlertCircle size={18} /> {error}
              </div>
            )}
          </div>

          </div>
        </div>
      </div>

      <PrintPreview
        isOpen={showPrintPreview}
        onClose={() => setShowPrintPreview(false)}
        subtitle={`RELATÓRIO PEDAGÓGICO DESCRITIVO · ${currentStudent?.reportContext ?? ''} · ${selectedYear?.label ?? ''}`}
        studentData={currentStudent ?? {}}
        content={reportResult}
        type="report"
      />
    </div>
  );
}
