import { useState, useMemo, useCallback } from 'react';
import { Sparkles, Copy, CheckCircle, FileText, Brain, Printer, Eye, Pencil } from 'lucide-react';
import { ReviewActions, VersionHistory, type ReviewChange } from '../components/DocumentReview';
import { toast } from 'sonner';
import { PeiForm, type PeiData } from '../components/PeiForm';
import { PrintPreview } from '../components/PrintPreview';
import type { RosterStudent } from '../components/ReportForm';
import { generatePei, firstName } from '../lib/aiService';
import { exportPeiToDocx } from '../lib/exportDocx';
import { useAuth } from '../contexts/AuthContext';
import { useSchool } from '../contexts/SchoolContext';
import { useAsync } from '../lib/useAsync';
import { PageHeader, SkeletonCard, StatusBadge } from '../components/ui';
import { listEnrollments, listStudents, createDocument, updateDocument, listDocuments, listGoals, createGoals, listGoalEvidence, listObservations, notifyDocumentStatus } from '../data';
import { toEvidence, stripCitations, citedNumbers, type EvidenceMap } from '../lib/evidence';
import { renderMarkdown } from '../lib/markdown';
import { FIELD_BY_ID } from '../store/bnccFields';
import { formatDate } from '../lib/format';
import { periodRange } from '../lib/periods';
import { EvidencePanel } from '../components/EvidencePanel';
import type { PeiGoal, Student, StudentDocument } from '../types/db';
import { GoalsPanel } from '../components/GoalsPanel';

export function PeiGenerator() {
  const { user } = useAuth();
  const { school, classes, staff, selectedYear, grading, refreshAiUsage } = useSchool();
  const [isLoading, setIsLoading] = useState(false);
  const [peiResult, setPeiResult] = useState('');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [doc, setDoc] = useState<StudentDocument | null>(null);
  const [saving, setSaving] = useState(false);
  const [currentData, setCurrentData] = useState<PeiData | null>(null);
  const [goals, setGoals] = useState<PeiGoal[]>([]);
  const [evidenceCounts, setEvidenceCounts] = useState<Record<string, number>>({});
  const [loadingExisting, setLoadingExisting] = useState(false);
  const [evidenceMap, setEvidenceMap] = useState<EvidenceMap>({});
  const [editing, setEditing] = useState(false);
  const [studentId, setStudentId] = useState<string | null>(null);
  const isManager = user?.role === 'admin' || user?.role === 'coordinator';

  // Registros de observação do aluno no ano letivo: evidência para o PEI e origem dos marcadores [n].
  const yearRange = { start: periodRange(selectedYear, grading.periods.length, 0).start, end: periodRange(selectedYear, grading.periods.length, grading.periods.length - 1).end };
  const observationsQ = useAsync(
    () => (school && studentId) ? listObservations({ schoolId: school.id, studentId, from: yearRange.start, to: yearRange.end, limit: 80 }) : Promise.resolve([]),
    [school?.id, studentId, yearRange.start, yearRange.end], [],
  );
  const observationById = useMemo(() => new Map(observationsQ.data.map(o => [o.id, o])), [observationsQ.data]);
  const citeTitle = (n: number) => {
    const o = observationById.get(evidenceMap[String(n)] ?? '');
    return o ? `${formatDate(o.date)} · ${FIELD_BY_ID[o.field_id]?.short ?? 'Geral'}: ${o.text}` : null;
  };
  const usedObservations = citedNumbers(peiResult).map(n => observationById.get(evidenceMap[String(n)] ?? '')).filter((o): o is NonNullable<typeof o> => Boolean(o));

  const classIds = useMemo(() => classes.map(c => c.id), [classes]);
  const enrollQ = useAsync(() => listEnrollments(classIds), [classIds.join(',')], []);
  const studentsQ = useAsync(() => school ? listStudents(school.id) : Promise.resolve([] as Student[]), [school?.id], [] as Student[]);
  const rosterLoading = enrollQ.loading || studentsQ.loading;
  const roster = useMemo<RosterStudent[]>(() => enrollQ.data
    .map(e => ({ student: studentsQ.data.find(s => s.id === e.student_id), cls: classes.find(c => c.id === e.class_id) }))
    .filter((r): r is RosterStudent => Boolean(r.student && r.cls))
    .sort((a, b) => a.student.name.localeCompare(b.student.name, 'pt-BR')), [enrollQ.data, studentsQ.data, classes]);

  const loadGoals = useCallback(async (d: StudentDocument) => {
    const gs = await listGoals({ schoolId: d.school_id, documentId: d.id });
    setGoals(gs);
    const ev = await listGoalEvidence({ schoolId: d.school_id, goalIds: gs.map(g => g.id) });
    const counts: Record<string, number> = {};
    for (const e of ev) counts[e.goal_id] = (counts[e.goal_id] ?? 0) + 1;
    setEvidenceCounts(counts);
  }, []);

  /** PEI vivo: ao escolher o aluno, abre o PEI mais recente dele (com as metas) em vez de começar do zero. */
  const handleStudentChange = useCallback(async (studentId: string | null) => {
    setDoc(null); setPeiResult(''); setGoals([]); setEvidenceCounts({}); setCurrentData(null); setError(''); setEvidenceMap({}); setEditing(false);
    setStudentId(studentId);
    if (!studentId || !school) return;
    setLoadingExisting(true);
    try {
      const docs = await listDocuments({ schoolId: school.id, kind: 'pei', studentId });
      const latest = docs[0];
      if (latest) {
        setDoc(latest);
        setPeiResult(latest.content);
        setCurrentData(latest.form_data as unknown as PeiData);
        setEvidenceMap(((latest.form_data as { evidence?: EvidenceMap }).evidence) ?? {});
        await loadGoals(latest);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Falha ao carregar o PEI atual.');
    } finally {
      setLoadingExisting(false);
    }
  }, [school, loadGoals]);

  const handleGeneratePei = async (data: PeiData) => {
    if (!school || !user) return;
    setIsLoading(true);
    setError('');
    setPeiResult('');
    setCopied(false);
    setDoc(null);
    setGoals([]);
    setEvidenceCounts({});
    setEvidenceMap({});
    setEditing(false);
    setCurrentData(data);

    try {
      const evidenceIn = toEvidence(observationsQ.data);
      const { content: result, goals: draftGoals, evidence } = await generatePei(data.studentId, {
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
      }, evidenceIn);
      setPeiResult(result);
      setEvidenceMap(evidence);
      void refreshAiUsage();
      const created = await createDocument({
        school_id: school.id,
        student_id: data.studentId,
        class_id: data.classId || null,
        year_id: selectedYear?.id ?? null,
        kind: 'pei',
        period: selectedYear?.label ?? null,
        author_id: user.id,
        form_data: { ...data, evidence, observationIds: evidenceIn.map(e => e.id) } as unknown as Record<string, unknown>,
        content: result,
        status: 'draft',
      });
      setDoc(created);
      if (draftGoals.length > 0) {
        const saved = await createGoals(draftGoals.map((g, i) => ({
          school_id: school.id, document_id: created.id, student_id: data.studentId,
          axis: g.axis, title: g.title, criterion: g.criterion ?? null, context: g.context ?? null,
          term: g.term, sort_order: i, created_by: user.id,
        })));
        setGoals(saved);
      } else {
        toast.message('A IA não devolveu metas estruturadas. Cadastre as metas no painel abaixo do texto.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao gerar o PEI.');
    } finally {
      setIsLoading(false);
    }
  };

  const persist = async (change?: ReviewChange) => {
    if (!doc) return;
    setSaving(true);
    try {
      const updated = await updateDocument(doc.id, { content: peiResult, ...(change ?? {}) });
      setDoc(updated);
      const s = change?.status;
      toast.success(s === 'submitted' ? 'PEI enviado para a coordenação.' : s === 'approved' ? 'PEI aprovado — a família já pode ver.' : s === 'returned' ? 'Devolvido à professora com o comentário.' : 'PEI salvo.');
      if (s && s !== doc.status) {
        const n = await notifyDocumentStatus(updated.id);
        if (n.sent > 0) toast.message(`${n.sent} pessoa(s) avisada(s) por e-mail.`);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Falha ao salvar.');
    } finally {
      setSaving(false);
    }
  };

  const handleCopy = () => {
    void navigator.clipboard.writeText(stripCitations(peiResult));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadDoc = () => {
    if (peiResult && currentData && school) {
      void exportPeiToDocx(stripCitations(peiResult), currentData, { schoolName: school.legal_name || school.name, year: selectedYear?.label ?? '' });
    }
  };

  return (
    <div>
      <PageHeader
        icon={<Brain size={22} />}
        title="PEI — Plano Educacional Individualizado"
        subtitle={rosterLoading ? 'Carregando alunos…' : 'Educação inclusiva: só para alunos com consentimento LGPD registrado no cadastro.'}
      />

      <div className="grid grid-cols-2" style={{ gridTemplateColumns: 'minmax(0, 1.3fr) minmax(0, 0.7fr)', gap: '2rem' }}>
        <div className="left-panel">
          {rosterLoading ? <SkeletonCard lines={8} /> : <PeiForm students={roster} onSubmit={handleGeneratePei} isLoading={isLoading} onStudentChange={id => void handleStudentChange(id)} />}
        </div>

        <div className="right-panel">
          <div className="card result-card" style={{ minHeight: '480px', maxHeight: '70vh', display: 'flex', flexDirection: 'column', boxShadow: 'var(--shadow-lg)' }}>
            <div className="flex justify-between items-center mb-4" style={{ flexWrap: 'wrap', gap: '0.5rem' }}>
              <h2 style={{ marginBottom: 0, color: 'var(--color-text)', fontSize: '1.1rem' }} className="flex items-center gap-2"><Brain size={20} color="var(--color-secondary)" /> Plano elaborado {doc && <StatusBadge status={doc.status} />}</h2>
              {peiResult && (
                <div className="flex gap-2" style={{ flexWrap: 'wrap' }}>
                  <button onClick={() => setEditing(e => !e)} className="btn btn-secondary btn-sm" title={editing ? 'Ver com evidências' : 'Editar o texto'}>{editing ? <Eye size={14} /> : <Pencil size={14} />} {editing ? 'Ver' : 'Editar'}</button>
                  <button onClick={() => setShowPrintPreview(true)} className="btn btn-primary btn-sm"><Printer size={14} /> PDF</button>
                  <button onClick={handleDownloadDoc} className="btn btn-secondary btn-sm"><FileText size={14} /> Word</button>
                  <button onClick={handleCopy} className="btn btn-secondary btn-sm" title="Copiar texto">{copied ? <CheckCircle size={14} /> : <Copy size={14} />}</button>
                </div>
              )}
            </div>

            <div className="result-content" style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: 0, minHeight: 0 }}>
              {isLoading || loadingExisting ? (
                <div className="flex justify-center items-center" style={{ height: '100%', flexDirection: 'column', gap: '1rem', color: 'var(--color-text-muted)', padding: '2rem' }}>
                  <div className="loader" style={{ borderTopColor: 'var(--color-primary)', borderColor: 'rgba(0,0,0,0.1)' }}></div>
                  <p>{loadingExisting ? 'Abrindo o PEI atual do aluno…' : 'A IA está rascunhando o PEI a partir dos indicadores informados…'}</p>
                </div>
              ) : peiResult ? (
                editing ? (
                  <textarea value={peiResult} onChange={(e) => setPeiResult(e.target.value)} style={{ flex: 1, border: 'none', background: 'transparent', padding: '1.5rem', fontSize: '1rem', lineHeight: '1.7', resize: 'none', fontFamily: 'inherit', color: '#222', minHeight: '300px' }} />
                ) : (
                  <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem', minHeight: '300px' }}>
                    {renderMarkdown(peiResult, { cite: citeTitle })}
                  </div>
                )
              ) : (
                <div className="flex justify-center items-center" style={{ height: '100%', color: 'var(--color-text-muted)', textAlign: 'center', padding: '2rem' }}>
                  <div style={{ opacity: 0.5 }}>
                    <Sparkles size={48} style={{ marginBottom: '1rem' }} />
                    <p>Preencha as observações pedagógicas para gerar um PEI técnico e humanizado.</p>
                  </div>
                </div>
              )}
            </div>
            {doc && peiResult && user && (
              <>
                <ReviewActions doc={doc} role={user.role} saving={saving} kindLabel="PEI" onSave={change => void persist(change)} />
                <VersionHistory doc={doc} staff={staff} refreshKey={doc.updated_at} />
              </>
            )}
            {error && <div className="callout callout-danger mt-4">{error}</div>}
          </div>

          {peiResult && !isLoading && !loadingExisting && (
            <EvidencePanel used={usedObservations} hasMap={Object.keys(evidenceMap).length > 0} totalAvailable={observationsQ.data.length} />
          )}
          {doc && (
            <div className="card mt-4">
              <GoalsPanel
                goals={goals}
                doc={doc}
                canEditStructure={isManager || doc.status !== 'approved'}
                canTrack={user?.role !== 'guardian'}
                evidenceCounts={evidenceCounts}
                onChange={setGoals}
                userId={user?.id ?? null}
              />
            </div>
          )}
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
