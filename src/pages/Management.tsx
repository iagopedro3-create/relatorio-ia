import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Users, BookOpen, AlertCircle, CheckCircle2, Clock, GraduationCap, TrendingUp, BarChart3, PieChart } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useSchool } from '../contexts/SchoolContext';
import { useAsync } from '../lib/useAsync';
import { listEnrollments, listStudents, listAttendance, listDocuments, listGrades } from '../data';
import { gradedSubjects } from '../store/gradingConfig';
import { buildGradeBook, calcStudentOutcome, roundGrade } from '../lib/gradeEngine';
import { Badge, DataTable, EmptyState, PageHeader, SkeletonCard, SkeletonStats } from '../components/ui';
import type { Column } from '../components/ui';
import type { Student } from '../types/db';

function DonutChart({ percent, color, label }: { percent: number; color: string; label: string }) {
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percent / 100) * circumference;
  return (
    <div className="flex flex-col items-center">
      <div style={{ position: 'relative', width: '100px', height: '100px' }}>
        <svg width="100" height="100" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r={radius} stroke="var(--color-border)" strokeWidth="8" fill="none" />
          <circle cx="50" cy="50" r={radius} stroke={color} strokeWidth="8" fill="none" strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" transform="rotate(-90 50 50)" style={{ transition: 'stroke-dashoffset 1s ease-out' }} />
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-text)', lineHeight: 1 }}>{percent}%</span>
        </div>
      </div>
      <span style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--color-text-muted)', marginTop: '0.5rem', textTransform: 'uppercase' }}>{label}</span>
    </div>
  );
}

function ProgressBar({ label, percent, color, value }: { label: string; percent: number; color: string; value: string }) {
  return (
    <div className="mb-4">
      <div className="flex justify-between items-end mb-1">
        <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>{label}</span>
        <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-text)' }}>{value}</span>
      </div>
      <div style={{ height: '8px', backgroundColor: 'var(--color-border-soft)', borderRadius: '4px', overflow: 'hidden' }}>
        <div style={{ width: `${percent}%`, height: '100%', backgroundColor: color, borderRadius: '4px', transition: 'width 1s ease-out' }} />
      </div>
    </div>
  );
}

interface ClassStatus { id: string; name: string; level: string; teacherName: string; status: 'COMPLETO' | 'PENDENTE'; lastUpdate: string }

export function Management() {
  const { user } = useAuth();
  const { school, classes, classesLoading, staff, selectedYear, grading } = useSchool();
  const today = new Date().toISOString().slice(0, 10);

  const managedClasses = useMemo(() => user?.role === 'coordinator' && user.managed_level ? classes.filter(c => c.level === user.managed_level) : classes, [classes, user]);
  const classIds = useMemo(() => managedClasses.map(c => c.id), [managedClasses]);

  const enrollQ = useAsync(() => listEnrollments(classIds), [classIds.join(',')], []);
  const enrollmentIds = useMemo(() => enrollQ.data.map(e => e.id), [enrollQ.data]);
  const attTodayQ = useAsync(() => listAttendance(enrollmentIds, today, today), [enrollmentIds.join(','), today], []);
  const docsQ = useAsync(() => (school && selectedYear) ? listDocuments({ schoolId: school.id, yearId: selectedYear.id, kind: 'report' }) : Promise.resolve([]), [school?.id, selectedYear?.id], []);
  const studentsQ = useAsync(() => school ? listStudents(school.id) : Promise.resolve([] as Student[]), [school?.id], [] as Student[]);

  const numericEnrollmentIds = useMemo(() => {
    const numeric = new Set(managedClasses.filter(c => c.evaluation_type === 'numeric').map(c => c.id));
    return enrollQ.data.filter(e => numeric.has(e.class_id)).map(e => e.id);
  }, [enrollQ.data, managedClasses]);
  const gradesQ = useAsync(() => listGrades(numericEnrollmentIds), [numericEnrollmentIds.join(',')], []);

  const loading = classesLoading || enrollQ.loading || studentsQ.loading || docsQ.loading || attTodayQ.loading;

  // Frequência de hoje por turma: "completo" se alguma chamada foi lançada hoje.
  const attendanceStatus = useMemo<ClassStatus[]>(() => managedClasses.map(c => {
    const ids = enrollQ.data.filter(e => e.class_id === c.id).map(e => e.id);
    const todays = attTodayQ.data.filter(r => ids.includes(r.enrollment_id));
    const done = ids.length > 0 && todays.length > 0;
    const last = todays.map(r => r.updated_at).sort().at(-1);
    return {
      id: c.id,
      name: c.name,
      level: c.level,
      teacherName: staff.find(u => u.id === c.homeroom_teacher_id)?.name ?? 'Não vinculado',
      status: done ? 'COMPLETO' : 'PENDENTE',
      lastUpdate: last ? new Date(last).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '—',
    };
  }), [managedClasses, enrollQ.data, attTodayQ.data, staff]);

  const ranking = useMemo(() => {
    const subjects = gradedSubjects(grading.subjects);
    return enrollQ.data
      .filter(e => numericEnrollmentIds.includes(e.id))
      .map(e => {
        const entries = gradesQ.data.filter(g => g.enrollment_id === e.id).map(g => ({ subject_id: g.subject_id, period: g.period, component_id: g.component_id, value: Number(g.value) }));
        const outcome = calcStudentOutcome(subjects.map(s => buildGradeBook(entries, s.id)), subjects, null, grading.policy);
        // Média parcial: entre bimestres já lançados, para o ranking fazer sentido no meio do ano.
        const medias = outcome.subjects.flatMap(r => r.bimesters.filter(b => b.media !== null).map(b => b.media as number));
        const avg = medias.length > 0 ? medias.reduce((a, b) => a + b, 0) / medias.length : null;
        return { student: studentsQ.data.find(s => s.id === e.student_id), className: managedClasses.find(c => c.id === e.class_id)?.name, avg };
      })
      .filter(r => r.student && r.avg !== null)
      .sort((a, b) => (b.avg ?? 0) - (a.avg ?? 0))
      .slice(0, 5);
  }, [enrollQ.data, numericEnrollmentIds, gradesQ.data, studentsQ.data, managedClasses, grading]);

  const stats = useMemo(() => {
    const totalStudents = enrollQ.data.length;
    const pendingAttendance = attendanceStatus.filter(c => c.status === 'PENDENTE').length;
    const completedAttendance = attendanceStatus.filter(c => c.status === 'COMPLETO').length;
    const teacherIds = new Set(managedClasses.map(c => c.homeroom_teacher_id).filter(Boolean));
    const activeTeachers = staff.filter(u => u.role === 'teacher' && u.active && (teacherIds.has(u.id) || u.specialty)).length;
    const totalClasses = attendanceStatus.length;
    const completionRate = totalClasses === 0 ? 0 : Math.round((completedAttendance / totalClasses) * 100);
    const infantil = attendanceStatus.filter(c => c.level === 'infantil');
    const fundamental = attendanceStatus.filter(c => c.level === 'fundamental');
    const infantilRate = infantil.length ? Math.round((infantil.filter(c => c.status === 'COMPLETO').length / infantil.length) * 100) : 0;
    const fundamentalRate = fundamental.length ? Math.round((fundamental.filter(c => c.status === 'COMPLETO').length / fundamental.length) * 100) : 0;
    const reportClassIds = new Set(managedClasses.filter(c => c.evaluation_type === 'report').map(c => c.id));
    const totalPossibleReports = enrollQ.data.filter(e => reportClassIds.has(e.class_id)).length * grading.periods.length;
    const docs = docsQ.data.filter(d => d.class_id && reportClassIds.has(d.class_id));
    const totalReportsCreated = new Set(docs.map(d => `${d.student_id}|${d.period}`)).size;
    const totalReportsApproved = new Set(docs.filter(d => d.status === 'approved').map(d => `${d.student_id}|${d.period}`)).size;
    return { totalStudents, pendingAttendance, completedAttendance, activeTeachers, totalClasses, completionRate, infantilRate, fundamentalRate, totalPossibleReports, totalReportsCreated, totalReportsApproved };
  }, [enrollQ.data, attendanceStatus, managedClasses, staff, docsQ.data, grading.periods.length]);

  const showInfantil = user?.role === 'admin' || !user?.managed_level || user.managed_level === 'infantil';
  const showFundamental = user?.role === 'admin' || !user?.managed_level || user.managed_level === 'fundamental';
  const reportPct = stats.totalPossibleReports > 0 ? Math.round((stats.totalReportsCreated / stats.totalPossibleReports) * 100) : 0;
  const pendingReports = Math.max(0, stats.totalPossibleReports - stats.totalReportsCreated);

  // Cada indicador leva para a tela onde se age sobre ele.
  const kpis = [
    { label: 'Alunos ativos', value: stats.totalStudents, sub: 'matriculados no ano', icon: <Users size={22} />, to: '/students' },
    { label: 'Turmas', value: stats.totalClasses, sub: showInfantil && showFundamental ? 'infantil e fundamental' : 'em gestão', icon: <GraduationCap size={22} />, to: '/classes' },
    { label: 'Equipe docente', value: stats.activeTeachers, sub: 'professores ativos', icon: <BookOpen size={22} />, to: '/users' },
    { label: 'Relatórios a redigir', value: pendingReports, sub: `de ${stats.totalPossibleReports} no ano`, icon: <Clock size={22} />, to: '/reports', warn: pendingReports > 0 },
  ];

  const attendanceColumns: Column<ClassStatus>[] = [
    { key: 'class', header: 'Turma / nível', render: c => (
      <div>
        <div style={{ fontWeight: 600 }}>{c.name}</div>
        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-subtle)' }}>{c.level === 'infantil' ? 'Educação Infantil' : 'Ensino Fundamental'}</div>
      </div>
    ) },
    { key: 'teacher', header: 'Professor(a)', hideOnMobile: true, render: c => c.teacherName },
    { key: 'status', header: 'Chamada de hoje', align: 'center', render: c => c.status === 'COMPLETO'
      ? <Badge tone="success"><CheckCircle2 size={12} /> Lançada</Badge>
      : <Badge tone="warning"><AlertCircle size={12} /> Pendente</Badge> },
    { key: 'time', header: 'Atualizado', align: 'center', hideOnMobile: true, render: c => <span style={{ color: 'var(--color-text-subtle)' }}>{c.lastUpdate}</span> },
  ];

  return (
    <div className="management-dashboard">
      <PageHeader
        title="Painel da escola"
        subtitle={`${school?.name} · ${selectedYear?.label ?? ''} · ${new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}`}
        actions={<Link to="/students" className="btn btn-primary"><Users size={18} /> Cadastrar aluno</Link>}
      />

      {loading ? (
        <>
          <SkeletonStats count={4} />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6"><SkeletonCard lines={4} /><SkeletonCard lines={4} /></div>
        </>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 mb-8">
            {kpis.map(card => (
              <Link key={card.label} to={card.to} className="card card-clickable" style={{ textDecoration: 'none', color: 'inherit' }}>
                <div className="flex justify-between items-start gap-2">
                  <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{card.label}</span>
                  <span style={{ color: card.warn ? 'var(--color-warning)' : 'var(--color-primary)' }}>{card.icon}</span>
                </div>
                <h3 style={{ fontSize: '2rem', margin: '0.35rem 0 0', fontWeight: 800, color: card.warn ? 'var(--color-warning-text)' : 'var(--color-text)' }}>{card.value}</h3>
                <p style={{ fontSize: '0.78rem', margin: 0, color: 'var(--color-text-subtle)' }}>{card.sub}</p>
              </Link>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
              <DonutChart percent={reportPct} color="var(--color-primary)" label="Relatórios no ano" />
              <div style={{ flex: 1 }}>
                <h4 style={{ margin: '0 0 0.5rem', fontSize: '0.9rem' }}>Relatórios descritivos</h4>
                <ProgressBar label="Redigidos" percent={reportPct} color="var(--color-primary)" value={`${stats.totalReportsCreated} / ${stats.totalPossibleReports}`} />
                <ProgressBar label="Com visto da coordenação" percent={stats.totalReportsCreated > 0 ? Math.round((stats.totalReportsApproved / stats.totalReportsCreated) * 100) : 0} color="var(--color-success)" value={`${stats.totalReportsApproved} / ${stats.totalReportsCreated}`} />
              </div>
            </div>
            <div className="card">
              <div className="flex items-center gap-2 mb-4"><PieChart size={18} color="var(--color-primary)" /><h3 style={{ margin: 0, fontSize: '1rem' }}>Chamada de hoje</h3></div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                <DonutChart percent={stats.completionRate} color="var(--color-primary)" label="Turmas com chamada" />
                <div style={{ flex: 1 }}>
                  {showInfantil && <ProgressBar label="Educação Infantil" percent={stats.infantilRate} color="var(--color-secondary)" value={`${stats.infantilRate}%`} />}
                  {showFundamental && <ProgressBar label="Ensino Fundamental" percent={stats.fundamentalRate} color="var(--color-primary)" value={`${stats.fundamentalRate}%`} />}
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="card">
              <h4 className="flex items-center gap-2" style={{ margin: '0 0 1rem', fontSize: '1rem' }}><AlertCircle size={18} color="var(--color-warning)" /> Pendências de hoje</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {attendanceStatus.filter(c => c.status === 'PENDENTE').slice(0, 4).map(c => (
                  <Link key={c.id} to="/attendance" className="callout callout-warning" style={{ textDecoration: 'none' }}>
                    <AlertCircle size={16} /> Chamada pendente: <strong>{c.name}</strong>
                  </Link>
                ))}
                {pendingReports > 0 && (
                  <Link to="/reports" className="callout callout-warning" style={{ textDecoration: 'none' }}>
                    <Clock size={16} /> {pendingReports} relatório(s) descritivo(s) a redigir no ano
                  </Link>
                )}
                {stats.pendingAttendance === 0 && pendingReports <= 0 && (
                  <div className="callout callout-success"><CheckCircle2 size={16} /> Sem pendências no momento.</div>
                )}
              </div>
            </div>

            <div className="card">
              <div className="flex items-center gap-2 mb-4"><TrendingUp size={18} color="var(--color-primary)" /><h3 style={{ margin: 0, fontSize: '1rem' }}>Melhores médias (top 5)</h3></div>
              {ranking.map((r, idx) => (
                <div key={r.student!.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: idx < ranking.length - 1 ? '1px solid var(--color-border-soft)' : 'none' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ width: '26px', height: '26px', borderRadius: '50%', backgroundColor: idx === 0 ? 'var(--color-warning-soft)' : 'var(--color-border-soft)', color: idx === 0 ? 'var(--color-warning-text)' : 'var(--color-text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.75rem' }}>{idx + 1}</div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{r.student!.name}</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--color-text-subtle)' }}>{r.className}</div>
                    </div>
                  </div>
                  <div style={{ fontWeight: 800, color: 'var(--color-success-text)', fontSize: '1rem' }}>{roundGrade(r.avg ?? 0, grading.policy).toFixed(grading.policy.decimals)}</div>
                </div>
              ))}
              {ranking.length === 0 && <EmptyState title="Sem notas lançadas" description="O ranking aparece quando houver médias no ano." />}
            </div>
          </div>

          <div className="card p-0">
            <div className="flex justify-between items-center" style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--color-border)' }}>
              <div className="flex items-center gap-2"><BarChart3 size={18} color="var(--color-primary)" /><h3 style={{ margin: 0, fontSize: '1rem' }}>Frequência diária por turma</h3></div>
              <Badge tone="neutral">Hoje, {new Date().toLocaleDateString('pt-BR')}</Badge>
            </div>
            <DataTable
              bare
              columns={attendanceColumns}
              rows={attendanceStatus}
              rowKey={c => c.id}
              empty={<EmptyState icon={<GraduationCap size={36} />} title="Nenhuma turma no ano" description="Cadastre as turmas para acompanhar a chamada." action={<Link to="/classes" className="btn btn-primary btn-sm">Cadastrar turmas</Link>} />}
            />
          </div>
        </>
      )}
    </div>
  );
}
