import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Users, TrendingUp, AlertCircle, FileCheck, BookOpenCheck, MessageSquare, Bell, Heart, Clock, FileText, Printer, Inbox, NotebookPen, Brain } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';
import { useSchool } from '../contexts/SchoolContext';
import { useAsync } from '../lib/useAsync';
import { listEnrollments, listStudents, listDocuments, updateDocument, listMessages, listEvents, listAttendanceOfEnrollments, listObservations, signObservationPhotos, listLessonPlans } from '../data';
import { FIELD_BY_ID } from '../store/bnccFields';
import { attendanceRate } from '../lib/gradeEngine';
import { currentPeriodIndex } from '../lib/format';
import { Management } from './Management';
import { CATEGORY_LABELS, EVENT_TYPES } from '../store/agendaMeta';
import { PrintPreview } from '../components/PrintPreview';
import { OnboardingChecklist } from '../components/OnboardingChecklist';
import { DataTable, EmptyState, PageHeader, SkeletonCard, SkeletonStats, StatusBadge } from '../components/ui';
import type { Column } from '../components/ui';
import { renderMarkdown } from '../lib/markdown';
import type { Student, StudentDocument } from '../types/db';

export function Home() {
  const { user } = useAuth();
  const { school, classes, classesLoading, staff, years, selectedYear, setYear, grading, hasFeature } = useSchool();
  // Começa no período corrente pela data, não no 1º: no meio do ano a meta é do bimestre atual.
  const [selectedPeriod, setSelectedPeriod] = useState(() => grading.periods[currentPeriodIndex(grading.periods.length)] ?? grading.periods[0]);

  const reportClasses = useMemo(() => classes.filter(c => c.evaluation_type === 'report'), [classes]);
  const reportClassIds = useMemo(() => reportClasses.map(c => c.id), [reportClasses]);
  const enrollQ = useAsync(() => listEnrollments(reportClassIds), [reportClassIds.join(',')], []);
  const studentsQ = useAsync(() => school ? listStudents(school.id) : Promise.resolve([] as Student[]), [school?.id], [] as Student[]);
  const docsQ = useAsync(() => (school && selectedYear) ? listDocuments({ schoolId: school.id, yearId: selectedYear.id, kind: 'report' }) : Promise.resolve([]), [school?.id, selectedYear?.id], []);
  // Fila da coordenação além dos relatórios: PEIs e planos de aula enviados.
  const peiQ = useAsync(() => (school && selectedYear && user?.role !== 'guardian') ? listDocuments({ schoolId: school.id, yearId: selectedYear.id, kind: 'pei' }) : Promise.resolve([]), [school?.id, selectedYear?.id, user?.role], []);
  const plansQ = useAsync(() => (school && user?.role !== 'guardian') ? listLessonPlans(school.id) : Promise.resolve([]), [school?.id, user?.role], []);
  const loading = classesLoading || enrollQ.loading || studentsQ.loading || docsQ.loading;

  const periodDocs = useMemo(() => docsQ.data.filter(d => d.period === selectedPeriod), [docsQ.data, selectedPeriod]);

  const classProgress = useMemo(() => reportClasses.map(c => {
    const ids = enrollQ.data.filter(e => e.class_id === c.id).map(e => e.student_id);
    const done = new Set(periodDocs.filter(d => d.class_id === c.id).map(d => d.student_id)).size;
    return { ...c, total: ids.length, done, percent: ids.length > 0 ? Math.round((done / ids.length) * 100) : 0 };
  }), [reportClasses, enrollQ.data, periodDocs]);

  const pendingGrouped = useMemo(() => {
    const grouped: Record<string, Student[]> = {};
    for (const c of reportClasses) {
      const ids = enrollQ.data.filter(e => e.class_id === c.id).map(e => e.student_id);
      const pending = studentsQ.data.filter(s => ids.includes(s.id) && !periodDocs.some(d => d.student_id === s.id));
      if (pending.length > 0) grouped[c.name] = pending;
    }
    return grouped;
  }, [reportClasses, enrollQ.data, studentsQ.data, periodDocs]);

  const approve = async (d: StudentDocument) => {
    try {
      await updateDocument(d.id, { status: 'approved', reviewed_by: user?.id ?? null });
      await docsQ.reload();
      toast.success('Relatório aprovado.');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Falha ao aprovar.');
    }
  };

  const periodSelector = (
    <div className="card flex items-center gap-4 flex-wrap" style={{ padding: '0.75rem 1rem', marginBottom: '1.5rem' }}>
      <div className="flex items-center gap-2">
        <Calendar size={18} color="var(--color-primary)" />
        <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>Ano letivo</span>
      </div>
      {user?.role !== 'teacher' ? (
        <select value={selectedYear?.id ?? ''} onChange={(e) => setYear(e.target.value)} style={{ padding: '0.4rem', width: '130px' }}>
          {years.map(y => <option key={y.id} value={y.id}>{y.label}</option>)}
        </select>
      ) : (
        <span className="badge badge-neutral">{selectedYear?.label}</span>
      )}
      <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>Período</span>
      <select value={selectedPeriod} onChange={(e) => setSelectedPeriod(e.target.value)} style={{ padding: '0.4rem', width: '150px' }}>
        {grading.periods.map(b => <option key={b} value={b}>{b}</option>)}
      </select>
    </div>
  );

  if (user?.role === 'teacher') {
    const myStudentsCount = enrollQ.data.length;
    const myDone = new Set(periodDocs.map(d => d.student_id)).size;
    const myPercent = myStudentsCount > 0 ? Math.round((myDone / myStudentsCount) * 100) : 0;
    const myPending = Object.values(pendingGrouped).flat();
    const returned = [...docsQ.data, ...peiQ.data].filter(d => d.status === 'returned' && d.author_id === user.id);
    const returnedPlans = plansQ.data.filter(p => p.status === 'returned' && p.teacher_id === user.id);
    return (
      <div>
        <PageHeader title={`Olá, ${user.name.split(' ')[0]}!`} subtitle={classes.length > 0 ? `Suas turmas: ${classes.map(c => c.name).join(', ')}` : 'Você ainda não está vinculado(a) a nenhuma turma este ano.'} />
        {periodSelector}
        {(returned.length > 0 || returnedPlans.length > 0) && (
          <div className="callout callout-danger mb-6"><AlertCircle size={16} /><span>
            {returned.length > 0 && <><strong>{returned.length} documento(s) devolvido(s)</strong> pela coordenação: {returned.map(d => `${d.kind === 'pei' ? 'PEI' : 'relatório'} de ${studentsQ.data.find(s => s.id === d.student_id)?.name.split(' ')[0] ?? ''}`).join(', ')}. </>}
            {returnedPlans.length > 0 && <><strong>{returnedPlans.length} plano(s) de aula</strong> devolvido(s) com orientações.</>}
          </span></div>
        )}
        {loading ? (
          <>
            <SkeletonStats count={3} />
            <div className="grid grid-cols-2 mt-6"><SkeletonCard /><SkeletonCard /></div>
          </>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="card">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-muted" style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', margin: 0 }}>Minhas turmas</p>
                    <h3 style={{ margin: '0.25rem 0', fontSize: '1.2rem' }}>{classes.map(c => c.name).join(', ') || '—'}</h3>
                  </div>
                  <Users color="var(--color-primary)" />
                </div>
              </div>
              <div className="card">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-muted" style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', margin: 0 }}>Alunos (relatório)</p>
                    <h3 style={{ margin: '0.25rem 0', fontSize: '1.5rem' }}>{myStudentsCount}</h3>
                  </div>
                  <Users color="var(--color-primary)" />
                </div>
              </div>
              <div className="card">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-muted" style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', margin: 0 }}>Progresso no período</p>
                    <h3 style={{ margin: '0.25rem 0', fontSize: '1.5rem' }}>{myPercent}%</h3>
                  </div>
                  <TrendingUp color={myPercent === 100 ? 'var(--color-success)' : 'var(--color-primary)'} />
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 mt-6">
              <div className="card">
                <h3 style={{ marginBottom: '0.5rem' }}>Sua meta: {selectedPeriod} / {selectedYear?.label}</h3>
                <p className="text-muted">Você concluiu {myDone} de {myStudentsCount} relatórios.</p>
                <div style={{ width: '100%', height: '10px', backgroundColor: 'var(--color-border-soft)', borderRadius: '5px', overflow: 'hidden' }}>
                  <div style={{ width: `${myPercent}%`, height: '100%', backgroundColor: 'var(--color-success)', transition: 'width 0.5s ease' }}></div>
                </div>
                {reportClasses.length === 0 && <p className="text-muted mt-4" style={{ fontSize: '0.85rem', margin: '1rem 0 0' }}>Suas turmas usam notas numéricas — veja Lançar Notas.</p>}
              </div>
              <div className="card">
                <h3 className="flex items-center gap-2" style={{ marginBottom: '0.5rem' }}><AlertCircle size={20} color="var(--color-warning)" /> Alunos pendentes</h3>
                <p className="text-muted" style={{ fontSize: '0.875rem' }}>Relatórios que ainda precisam ser gerados neste período.</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  {myPending.map(s => <div key={s.id} style={{ padding: '0.6rem 0.75rem', backgroundColor: 'var(--color-surface-2)', borderRadius: 'var(--radius-sm)', fontWeight: 500, fontSize: '0.9rem' }}>{s.name}</div>)}
                  {myPending.length === 0 && myStudentsCount > 0 && <p style={{ fontWeight: 600, color: 'var(--color-success-text)', margin: 0 }}>Tudo em dia para este período.</p>}
                  {myStudentsCount === 0 && <p className="text-muted" style={{ margin: 0, fontSize: '0.875rem' }}>Nenhum aluno em turma de relatório.</p>}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    );
  }

  if (user?.role === 'guardian') return <GuardianHome />;

  const reviewRows = periodDocs.filter(r => r.status !== 'draft');
  const reviewColumns: Column<StudentDocument>[] = [
    { key: 'student', header: 'Aluno', render: r => (
      <div>
        <div style={{ fontWeight: 600 }}>{studentsQ.data.find(s => s.id === r.student_id)?.name ?? '—'}</div>
        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-subtle)' }}>{classes.find(c => c.id === r.class_id)?.name}</div>
      </div>
    ) },
    { key: 'author', header: 'Professor(a)', hideOnMobile: true, render: r => staff.find(u => u.id === r.author_id)?.name ?? '—' },
    { key: 'status', header: 'Status', render: r => <StatusBadge status={r.status} /> },
    { key: 'action', header: '', align: 'right', render: r => r.status !== 'approved'
      ? <button className="btn btn-primary btn-sm" onClick={() => void approve(r)}>Aprovar</button>
      : <span className="badge badge-success"><BookOpenCheck size={12} /> Visto</span> },
  ];

  return (
    <div>
      {user?.role === 'admin' && <OnboardingChecklist studentsCount={studentsQ.data.length} loading={studentsQ.loading || classesLoading} />}
      <Management />

      <div style={{ marginTop: '2.5rem', borderTop: '1px solid var(--color-border)', paddingTop: '2rem' }}>
        <PageHeader title="Acompanhamento pedagógico" subtitle="Relatórios descritivos por turma e período" />
        {periodSelector}

        {(peiQ.data.some(d => d.status === 'submitted') || plansQ.data.some(p => p.status === 'submitted')) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {peiQ.data.filter(d => d.status === 'submitted').length > 0 && (
              <a href="/pei" className="callout callout-warning" style={{ textDecoration: 'none' }}>
                <Brain size={16} /><span><strong>{peiQ.data.filter(d => d.status === 'submitted').length} PEI(s)</strong> aguardando aprovação: {peiQ.data.filter(d => d.status === 'submitted').map(d => studentsQ.data.find(s => s.id === d.student_id)?.name.split(' ')[0]).filter(Boolean).join(', ')}</span>
              </a>
            )}
            {plansQ.data.filter(p => p.status === 'submitted').length > 0 && (
              <a href="/planning" className="callout callout-warning" style={{ textDecoration: 'none' }}>
                <BookOpenCheck size={16} /><span><strong>{plansQ.data.filter(p => p.status === 'submitted').length} plano(s) de aula</strong> aguardando revisão</span>
              </a>
            )}
          </div>
        )}

        <div className="card p-0 mb-6">
          <div className="flex justify-between items-center" style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--color-border)' }}>
            <h3 style={{ margin: 0, fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><BookOpenCheck size={18} color="var(--color-primary)" /> Relatórios para revisão</h3>
            <span className="badge badge-warning">{periodDocs.filter(r => r.status === 'submitted').length} aguardando</span>
          </div>
          <DataTable
            bare
            columns={reviewColumns}
            rows={reviewRows}
            rowKey={r => r.id}
            loading={loading}
            empty={<EmptyState icon={<Inbox size={36} />} title="Nenhum relatório enviado" description={`Os professores ainda não enviaram relatórios do ${selectedPeriod}.`} />}
          />
        </div>

        <div className="grid grid-cols-2">
          <div className="card">
            <h3 style={{ fontSize: '1rem', marginBottom: '1.25rem' }}>Relatórios por turma — {selectedPeriod}</h3>
            {loading ? <SkeletonCard lines={4} className="border-none p-0" /> : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {classProgress.map(c => (
                  <div key={c.id}>
                    <div className="flex justify-between mb-2" style={{ fontSize: '0.9rem' }}>
                      <span style={{ fontWeight: 600 }}>{c.name}</span>
                      <span className="text-muted">{c.done} / {c.total} alunos</span>
                    </div>
                    <div style={{ width: '100%', height: '8px', backgroundColor: 'var(--color-border-soft)', borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{ width: `${c.percent}%`, height: '100%', backgroundColor: c.percent === 100 ? 'var(--color-success)' : 'var(--color-primary)', transition: 'width 0.5s ease' }}></div>
                    </div>
                  </div>
                ))}
                {classProgress.length === 0 && <EmptyState title="Nenhuma turma por relatório" description="Turmas da Educação Infantil são avaliadas por relatório descritivo." />}
              </div>
            )}
          </div>

          <div className="card">
            <h3 className="flex items-center gap-2" style={{ fontSize: '1rem', marginBottom: '1.25rem' }}><AlertCircle size={18} color="var(--color-warning)" /> Relatórios pendentes</h3>
            <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
              {loading ? <SkeletonCard lines={4} className="border-none p-0" /> : Object.entries(pendingGrouped).length > 0 ? (
                Object.entries(pendingGrouped).map(([className, students]) => (
                  <div key={className} style={{ marginBottom: '1.25rem' }}>
                    <h4 style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--color-text-muted)', borderBottom: '1px solid var(--color-border-soft)', paddingBottom: '0.25rem', marginBottom: '0.5rem' }}>{className}</h4>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                      {students.map(s => <span key={s.id} className="badge badge-neutral" style={{ textTransform: 'none', fontWeight: 500 }}>{s.name}</span>)}
                    </div>
                  </div>
                ))
              ) : (
                <EmptyState icon={<FileCheck size={36} />} title="Tudo em dia" description="Todos os alunos têm relatório neste período." />
              )}
            </div>
          </div>
        </div>
      </div>
      {!hasFeature('report') && <p className="text-muted mt-4" style={{ fontSize: '0.85rem' }}>Relatórios com IA não estão no plano atual da escola.</p>}
    </div>
  );
}

/** Portal da família: a RLS já devolve só os alunos, mensagens e eventos do responsável. */
function GuardianHome() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { school, classes, classesLoading } = useSchool();
  const studentsQ = useAsync(() => school ? listStudents(school.id) : Promise.resolve([] as Student[]), [school?.id], [] as Student[]);
  // Responsável com mais de um filho escolhe qual acompanhar.
  const [chosenStudentId, setChosenStudentId] = useState('');
  const student = studentsQ.data.find(s => s.id === chosenStudentId) ?? studentsQ.data[0];
  const classIds = useMemo(() => classes.map(c => c.id), [classes]);
  const enrollQ = useAsync(() => listEnrollments(classIds), [classIds.join(',')], []);
  const enrollment = enrollQ.data.find(e => e.student_id === student?.id);
  const studentClass = classes.find(c => c.id === enrollment?.class_id);
  const attQ = useAsync(() => enrollment ? listAttendanceOfEnrollments([enrollment.id]) : Promise.resolve([]), [enrollment?.id], []);
  const messagesQ = useAsync(() => school ? listMessages(school.id) : Promise.resolve([]), [school?.id], []);
  const eventsQ = useAsync(() => school ? listEvents(school.id) : Promise.resolve([]), [school?.id], []);
  // A RLS só devolve ao responsável os documentos já aprovados pela escola.
  const docsQ = useAsync(() => (school && student) ? listDocuments({ schoolId: school.id, studentId: student.id }) : Promise.resolve([]), [school?.id, student?.id], []);
  const [openDoc, setOpenDoc] = useState<StudentDocument | null>(null);
  const [printDoc, setPrintDoc] = useState<StudentDocument | null>(null);
  // Momentos: registros que a professora marcou para a família ver.
  const momentsQ = useAsync(() => (school && student) ? listObservations({ schoolId: school.id, studentId: student.id, sharedOnly: true, limit: 12 }) : Promise.resolve([]), [school?.id, student?.id], []);
  const momentPhotosQ = useAsync(() => signObservationPhotos(momentsQ.data.map(o => o.photo_path ?? '')), [momentsQ.data.map(o => o.photo_path).join(',')], {} as Record<string, string>);

  const loading = classesLoading || studentsQ.loading || enrollQ.loading;
  const freq = attendanceRate(attQ.data);
  const myEvents = eventsQ.data.filter(e => e.date >= new Date().toISOString().slice(0, 10)).slice(0, 3);
  const myMessages = messagesQ.data.slice(0, 3);
  const firstName = (s?: Student) => s?.name.split(' ')[0] ?? '';

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
        <div style={{ width: '64px', height: '64px', borderRadius: '50%', backgroundColor: 'var(--color-primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', fontWeight: 800, flexShrink: 0 }}>
          {student?.name.charAt(0) ?? '?'}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h2 style={{ margin: 0, fontSize: '1.6rem', color: 'var(--color-text)' }}>Olá, {user?.name}!</h2>
          <p className="text-muted" style={{ margin: 0 }}>
            {loading ? 'Carregando…' : student
              ? <>Acompanhando <strong>{student.name}</strong>{studentClass ? ` • ${studentClass.name}` : ''}</>
              : 'Nenhum aluno vinculado ao seu acesso ainda. Fale com a secretaria da escola.'}
          </p>
        </div>
        {studentsQ.data.length > 1 && (
          <select value={student?.id ?? ''} onChange={e => setChosenStudentId(e.target.value)} style={{ width: 'auto', padding: '0.5rem 0.75rem' }} aria-label="Escolher filho(a)">
            {studentsQ.data.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        )}
      </div>

      {loading ? <SkeletonStats count={3} /> : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="card">
            <div className="flex justify-between items-start mb-2">
              <span className="text-muted" style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase' }}>Frequência</span>
              <FileCheck size={20} color="var(--color-success)" />
            </div>
            <h3 style={{ margin: 0, fontSize: '1.5rem' }}>{freq === null ? '—' : `${freq.toFixed(0)}%`}</h3>
            <p style={{ margin: '0.25rem 0 0', fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>{freq === null ? 'A escola ainda não lançou a chamada' : freq >= 90 ? 'Excelente presença' : 'Acompanhe as faltas'}</p>
          </div>
          <div className="card">
            <div className="flex justify-between items-start mb-2">
              <span className="text-muted" style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase' }}>Próximo evento</span>
              <Calendar size={20} color="var(--color-primary)" />
            </div>
            <h3 style={{ margin: 0, fontSize: '1.1rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{myEvents[0]?.title || 'Sem eventos marcados'}</h3>
            <p style={{ margin: '0.25rem 0 0', fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>{myEvents[0] ? new Date(myEvents[0].date + 'T00:00:00').toLocaleDateString('pt-BR') : 'Você será avisado(a) aqui'}</p>
          </div>
          <div className="card">
            <div className="flex justify-between items-start mb-2">
              <span className="text-muted" style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase' }}>Comunicados</span>
              <MessageSquare size={20} color="var(--color-secondary)" />
            </div>
            <h3 style={{ margin: 0, fontSize: '1.5rem' }}>{messagesQ.data.length}</h3>
            <p style={{ margin: '0.25rem 0 0', fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>na agenda digital</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2">
        <div>
          <div className="flex justify-between items-center mb-4">
            <h3 style={{ margin: 0, fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><MessageSquare size={18} color="var(--color-primary)" /> Últimos comunicados</h3>
            <button onClick={() => navigate('/agenda')} className="btn btn-ghost btn-sm" style={{ color: 'var(--color-primary)', fontWeight: 700 }}>Ver tudo</button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {messagesQ.loading && <SkeletonCard lines={2} />}
            {myMessages.map(msg => (
              <div key={msg.id} className="card card-clickable" style={{ padding: '1rem' }} onClick={() => navigate('/agenda')}>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '10px', backgroundColor: CATEGORY_LABELS[msg.category].bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Bell size={18} color={CATEGORY_LABELS[msg.category].color} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="flex justify-between items-start gap-2">
                      <h4 style={{ margin: 0, fontSize: '0.95rem' }}>{msg.subject}</h4>
                      <span style={{ fontSize: '0.7rem', color: 'var(--color-text-subtle)', whiteSpace: 'nowrap' }}>{new Date(msg.created_at).toLocaleDateString('pt-BR')}</span>
                    </div>
                    <p style={{ margin: '0.25rem 0 0', fontSize: '0.85rem', color: 'var(--color-text-muted)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{msg.content}</p>
                  </div>
                </div>
              </div>
            ))}
            {!messagesQ.loading && myMessages.length === 0 && <div className="card"><EmptyState icon={<Inbox size={32} />} title="Nenhum comunicado ainda" description="Quando a escola publicar algo, aparece aqui." /></div>}
          </div>
        </div>

        <div>
          <div className="flex justify-between items-center mb-4">
            <h3 style={{ margin: 0, fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Calendar size={18} color="var(--color-primary)" /> Calendário escolar</h3>
            <button onClick={() => navigate('/agenda')} className="btn btn-ghost btn-sm" style={{ color: 'var(--color-primary)', fontWeight: 700 }}>Ver agenda</button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {myEvents.map(ev => (
              <div key={ev.id} className="card" style={{ padding: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ textAlign: 'center', paddingRight: '1rem', borderRight: '1px solid var(--color-border)', minWidth: '50px' }}>
                    <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--color-primary)' }}>{new Date(ev.date + 'T00:00:00').getDate()}</div>
                    <div style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-text-subtle)' }}>{new Date(ev.date + 'T00:00:00').toLocaleString('pt-BR', { month: 'short' })}</div>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div className="flex items-center gap-2"><span>{EVENT_TYPES[ev.type]?.icon}</span><h4 style={{ margin: 0, fontSize: '0.95rem' }}>{ev.title}</h4></div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem' }}><Clock size={12} color="var(--color-text-subtle)" /><span style={{ fontSize: '0.8rem', color: 'var(--color-text-subtle)' }}>{ev.time || 'Dia inteiro'}</span></div>
                  </div>
                </div>
              </div>
            ))}
            {!eventsQ.loading && myEvents.length === 0 && <p className="text-muted" style={{ fontSize: '0.875rem' }}>Nenhum evento próximo.</p>}
          </div>

          <div className="mt-6">
            <h3 style={{ margin: '0 0 1rem', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><FileText size={18} color="var(--color-primary)" /> Relatórios e documentos</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {docsQ.data.map(d => (
                <div key={d.id} className="card" style={{ padding: '1rem' }}>
                  <div className="flex justify-between items-center" style={{ gap: '1rem', flexWrap: 'wrap' }}>
                    <div>
                      <h4 style={{ margin: 0, fontSize: '0.95rem' }}>{d.kind === 'pei' ? 'Plano Educacional Individualizado' : 'Relatório descritivo'}{d.period ? ` · ${d.period}` : ''}</h4>
                      <span style={{ fontSize: '0.75rem', color: 'var(--color-text-subtle)' }}>Aprovado pela escola em {new Date(d.updated_at).toLocaleDateString('pt-BR')}</span>
                    </div>
                    <div className="flex gap-2">
                      <button className="btn btn-secondary btn-sm" onClick={() => setOpenDoc(d)}><FileText size={14} /> Ler</button>
                      <button className="btn btn-primary btn-sm" onClick={() => setPrintDoc(d)}><Printer size={14} /> Imprimir</button>
                    </div>
                  </div>
                </div>
              ))}
              {!docsQ.loading && docsQ.data.length === 0 && <p className="text-muted" style={{ fontSize: '0.85rem' }}>Os relatórios de {firstName(student) || 'seu filho(a)'} aparecem aqui assim que a escola aprovar.</p>}
            </div>
          </div>

          {studentClass?.evaluation_type === 'numeric' && (
            <div className="card mt-6" style={{ backgroundColor: 'var(--color-warning-soft)', border: '1px dashed var(--color-warning-border)', textAlign: 'center', padding: '1.5rem' }}>
              <Heart size={32} color="var(--color-warning)" style={{ margin: '0 auto 0.5rem', opacity: 0.7 }} />
              <h4 style={{ margin: '0 0 0.5rem', color: 'var(--color-warning-text)' }}>Boletim</h4>
              <p style={{ fontSize: '0.85rem', color: 'var(--color-warning-text)', margin: 0 }}>Acompanhe as notas de {firstName(student)}.</p>
              <button className="btn btn-primary mt-4" onClick={() => navigate('/bulletin')} style={{ width: '100%', fontSize: '0.9rem' }}>Acessar boletim</button>
            </div>
          )}
        </div>
      </div>

      {momentsQ.data.length > 0 && (
        <div className="mt-8">
          <h3 style={{ margin: '0 0 1rem', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><NotebookPen size={18} color="var(--color-primary)" /> Momentos de {firstName(student)}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {momentsQ.data.map(o => {
              const f = FIELD_BY_ID[o.field_id];
              const url = o.photo_path ? momentPhotosQ.data[o.photo_path] : undefined;
              return (
                <div key={o.id} className="card p-0" style={{ overflow: 'hidden' }}>
                  {url && <img src={url} alt="" style={{ width: '100%', maxHeight: 220, objectFit: 'cover', display: 'block' }} />}
                  <div style={{ padding: '0.9rem 1rem' }}>
                    <div className="flex items-center gap-2 flex-wrap" style={{ fontSize: '0.75rem', color: 'var(--color-text-subtle)', marginBottom: '0.35rem' }}><span>{new Date(o.date + 'T00:00:00').toLocaleDateString('pt-BR')}</span>{f && f.id !== 'general' && <span className={`badge badge-${f.tone}`}>{f.short}</span>}</div>
                    <p style={{ margin: 0, fontSize: '0.9rem', lineHeight: 1.55 }}>{o.text}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {openDoc && (
        <div className="dialog-overlay" onClick={() => setOpenDoc(null)}>
          <div className="card" style={{ maxWidth: '800px', width: '100%', maxHeight: '85vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 style={{ margin: 0 }}>{openDoc.kind === 'pei' ? 'PEI' : 'Relatório descritivo'}{openDoc.period ? ` · ${openDoc.period}` : ''}</h3>
              <button className="btn btn-secondary btn-sm" onClick={() => setOpenDoc(null)}>Fechar</button>
            </div>
            <div>{renderMarkdown(openDoc.content)}</div>
          </div>
        </div>
      )}

      {printDoc && (
        <PrintPreview
          isOpen
          onClose={() => setPrintDoc(null)}
          subtitle={`${printDoc.kind === 'pei' ? 'PLANO EDUCACIONAL INDIVIDUALIZADO (PEI)' : 'RELATÓRIO PEDAGÓGICO DESCRITIVO'}${printDoc.period ? ` · ${printDoc.period}` : ''}`}
          studentData={{ name: student?.name, group: studentClass?.name, ...(printDoc.form_data as { age?: string; teacherName?: string; ageGroupId?: string; diagnosis?: string }) }}
          content={printDoc.content}
          type={printDoc.kind}
        />
      )}
    </div>
  );
}
