import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Users, BookOpen, AlertCircle, CheckCircle2, Clock, GraduationCap, TrendingUp, BarChart3, PieChart } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useSchool } from '../contexts/SchoolContext';
import { useAsync } from '../lib/useAsync';
import { listEnrollments, listStudents, listAttendance, listDocuments, listGrades } from '../data';
import { gradedSubjects } from '../store/gradingConfig';
import { buildGradeBook, calcStudentOutcome, roundGrade } from '../lib/gradeEngine';
import type { Student } from '../types/db';

function DonutChart({ percent, color, label }: { percent: number; color: string; label: string }) {
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percent / 100) * circumference;
  return (
    <div className="flex flex-col items-center">
      <div style={{ position: 'relative', width: '100px', height: '100px' }}>
        <svg width="100" height="100" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r={radius} stroke="#e2e8f0" strokeWidth="8" fill="none" />
          <circle cx="50" cy="50" r={radius} stroke={color} strokeWidth="8" fill="none" strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" transform="rotate(-90 50 50)" style={{ transition: 'stroke-dashoffset 1s ease-out' }} />
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: '1.25rem', fontWeight: 800, color: '#1e293b', lineHeight: 1 }}>{percent}%</span>
        </div>
      </div>
      <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', marginTop: '0.5rem', textTransform: 'uppercase' }}>{label}</span>
    </div>
  );
}

function ProgressBar({ label, percent, color, value }: { label: string; percent: number; color: string; value: string }) {
  return (
    <div className="mb-4">
      <div className="flex justify-between items-end mb-1">
        <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#475569' }}>{label}</span>
        <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1e293b' }}>{value}</span>
      </div>
      <div style={{ height: '8px', backgroundColor: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
        <div style={{ width: `${percent}%`, height: '100%', backgroundColor: color, borderRadius: '4px', transition: 'width 1s ease-out' }} />
      </div>
    </div>
  );
}

export function Management() {
  const { user } = useAuth();
  const { school, classes, staff, selectedYear, grading } = useSchool();
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

  // Frequência de hoje por turma: "completo" se alguma chamada foi lançada hoje.
  const attendanceStatus = useMemo(() => managedClasses.map(c => {
    const ids = enrollQ.data.filter(e => e.class_id === c.id).map(e => e.id);
    const todays = attTodayQ.data.filter(r => ids.includes(r.enrollment_id));
    const done = ids.length > 0 && todays.length > 0;
    const last = todays.map(r => r.updated_at).sort().at(-1);
    return {
      ...c,
      teacherName: staff.find(u => u.id === c.homeroom_teacher_id)?.name ?? 'Não vinculado',
      status: done ? 'COMPLETO' : 'PENDENTE',
      lastUpdate: last ? new Date(last).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '--:--',
    };
  }), [managedClasses, enrollQ.data, attTodayQ.data, staff]);

  const ranking = useMemo(() => {
    const subjects = gradedSubjects(grading.subjects);
    const rows = enrollQ.data
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
    return rows;
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

  return (
    <div className="management-dashboard">
      <div className="flex justify-between items-center mb-8">
        <div className="mobile-hide">
          <h2 style={{ margin: 0, fontSize: '2rem', fontWeight: 800, color: '#0f172a' }}>Painel Administrativo</h2>
          <p className="text-muted" style={{ fontSize: '1.05rem', marginTop: '0.25rem' }}>{school?.name} · {selectedYear?.label}</p>
        </div>
        <div className="flex gap-3">
          <Link to="/students" className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Users size={18} /> <span className="mobile-hide">Cadastrar Aluno</span><span className="mobile-only">Novo Aluno</span>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        {[
          { label: 'Alunos Ativos', value: stats.totalStudents, sub: 'matriculados no ano', icon: <Users size={80} />, color: '#3b82f6', dark: '#1e3a8a', bg: '#eff6ff' },
          { label: 'Turmas em Gestão', value: stats.totalClasses, sub: `${showInfantil && showFundamental ? '2 segmentos' : '1 segmento'}`, icon: <GraduationCap size={80} />, color: '#10b981', dark: '#14532d', bg: '#f0fdf4' },
          { label: 'Equipe Docente', value: stats.activeTeachers, sub: 'professores ativos', icon: <BookOpen size={80} />, color: '#f59e0b', dark: '#78350f', bg: '#fff7ed' },
          { label: 'Relatórios Pendentes', value: Math.max(0, stats.totalPossibleReports - stats.totalReportsCreated), sub: `de um total de ${stats.totalPossibleReports} no ano`, icon: <Clock size={80} />, color: '#ef4444', dark: '#7f1d1d', bg: '#fef2f2' },
        ].map(card => (
          <div key={card.label} className="card stat-card relative overflow-hidden" style={{ border: 'none', background: `linear-gradient(135deg, ${card.bg} 0%, #ffffff 100%)` }}>
            <div className="absolute top-0 right-0 p-4 opacity-10">{card.icon}</div>
            <div className="relative z-10">
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: card.color, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{card.label}</span>
              <h3 style={{ fontSize: '2.5rem', margin: '0.5rem 0', fontWeight: 900, color: card.dark }}>{card.value}</h3>
              <p style={{ fontSize: '0.8rem', margin: 0, color: '#64748b' }}>{card.sub}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '2rem', padding: '1.5rem', borderLeft: '4px solid #8b5cf6' }}>
          <div style={{ width: '60px', height: '60px', borderRadius: '50%', backgroundColor: '#f5f3ff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><BookOpen size={24} color="#8b5cf6" /></div>
          <div>
            <p style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Relatórios com visto da coordenação</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800 }}>{stats.totalReportsApproved} / {stats.totalReportsCreated}</h3>
              <span style={{ fontSize: '0.8rem', backgroundColor: '#ecfdf5', color: '#10b981', padding: '0.2rem 0.6rem', borderRadius: '4px', fontWeight: 700 }}>
                {stats.totalReportsCreated > 0 ? Math.round((stats.totalReportsApproved / stats.totalReportsCreated) * 100) : 0}% OK
              </span>
            </div>
          </div>
        </div>
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '2rem', padding: '1.5rem', borderLeft: '4px solid var(--color-primary)' }}>
          <DonutChart percent={reportPct} color="var(--color-primary)" label="Relatórios no ano" />
          <div style={{ flex: 1 }}>
            <h4 style={{ margin: '0 0 0.5rem', fontSize: '0.9rem' }}>Progresso anual</h4>
            <ProgressBar label="Relatórios redigidos" percent={reportPct} color="var(--color-primary)" value={`${stats.totalReportsCreated} / ${stats.totalPossibleReports}`} />
          </div>
        </div>
      </div>

      <div className="management-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
        <div className="card" style={{ border: 'none' }}>
          <div className="flex items-center gap-2 mb-6"><PieChart size={20} color="var(--color-primary)" /><h3 style={{ margin: 0, fontSize: '1.1rem' }}>Chamada de hoje</h3></div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '2rem', marginBottom: '2rem' }}>
            <DonutChart percent={stats.completionRate} color="var(--color-primary)" label="Turmas com chamada" />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div className="flex items-center gap-2"><div style={{ width: '12px', height: '12px', borderRadius: '3px', backgroundColor: 'var(--color-primary)' }}></div><span style={{ fontSize: '0.85rem', color: '#64748b' }}>Completas ({stats.completedAttendance})</span></div>
              <div className="flex items-center gap-2"><div style={{ width: '12px', height: '12px', borderRadius: '3px', backgroundColor: '#e2e8f0' }}></div><span style={{ fontSize: '0.85rem', color: '#64748b' }}>Pendentes ({stats.pendingAttendance})</span></div>
            </div>
          </div>
          <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '1.5rem' }}>
            <h4 style={{ fontSize: '0.85rem', color: '#64748b', textTransform: 'uppercase', marginBottom: '1rem', letterSpacing: '0.5px' }}>Por segmento</h4>
            {showInfantil && <ProgressBar label="Educação Infantil" percent={stats.infantilRate} color="#8b5cf6" value={`${stats.infantilRate}%`} />}
            {showFundamental && <ProgressBar label="Ensino Fundamental" percent={stats.fundamentalRate} color="#10b981" value={`${stats.fundamentalRate}%`} />}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="card" style={{ border: 'none', background: 'linear-gradient(135deg, #fffbeb 0%, #ffffff 100%)', borderLeft: '4px solid #f59e0b' }}>
            <h4 className="flex items-center gap-2" style={{ color: '#b45309', margin: '0 0 1rem 0' }}><AlertCircle size={18} /> Alertas</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              {attendanceStatus.filter(c => c.status === 'PENDENTE').slice(0, 4).map(c => (
                <div key={c.id} style={{ fontSize: '0.85rem', backgroundColor: 'white', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid #fde68a', color: '#92400e', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#f59e0b', flexShrink: 0 }}></span>
                  Chamada de hoje pendente: {c.name}
                </div>
              ))}
              {stats.totalPossibleReports - stats.totalReportsCreated > 0 && (
                <div style={{ fontSize: '0.85rem', backgroundColor: 'white', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid #fde68a', color: '#92400e', fontWeight: 600 }}>
                  {stats.totalPossibleReports - stats.totalReportsCreated} relatório(s) descritivo(s) a redigir no ano
                </div>
              )}
              {stats.pendingAttendance === 0 && stats.totalPossibleReports - stats.totalReportsCreated <= 0 && (
                <div style={{ fontSize: '0.85rem', color: '#15803d', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, padding: '0.5rem 0' }}><CheckCircle2 size={16} /> Sem pendências no momento!</div>
              )}
            </div>
          </div>

          <div className="card" style={{ border: 'none', padding: 0, flex: 1 }}>
            <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'linear-gradient(135deg, #fffbeb 0%, #fff 100%)' }}>
              <TrendingUp size={18} color="#d97706" /><h3 style={{ margin: 0, fontSize: '1rem', color: '#b45309' }}>Melhores médias (Top 5)</h3>
            </div>
            <div style={{ padding: '1rem 1.25rem' }}>
              {ranking.map((r, idx) => (
                <div key={r.student!.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.6rem 0', borderBottom: idx < ranking.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ width: '26px', height: '26px', borderRadius: '50%', backgroundColor: idx === 0 ? '#fef3c7' : idx === 1 ? '#f1f5f9' : idx === 2 ? '#ffedd5' : '#f8fafc', color: idx === 0 ? '#d97706' : idx === 1 ? '#64748b' : idx === 2 ? '#c2410c' : '#94a3b8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.75rem' }}>{idx + 1}</div>
                    <div>
                      <div style={{ fontWeight: 700, color: '#1e293b', fontSize: '0.85rem' }}>{r.student!.name}</div>
                      <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>{r.className}</div>
                    </div>
                  </div>
                  <div style={{ fontWeight: 900, color: '#166534', fontSize: '1rem' }}>{roundGrade(r.avg ?? 0, grading.policy).toFixed(grading.policy.decimals)}</div>
                </div>
              ))}
              {ranking.length === 0 && <p className="text-muted" style={{ fontSize: '0.85rem', margin: 0 }}>Sem notas lançadas ainda.</p>}
            </div>
          </div>
        </div>
      </div>

      <div className="card" style={{ border: 'none', padding: 0 }}>
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc' }}>
          <div className="flex items-center gap-3"><BarChart3 size={20} color="var(--color-primary)" /><h3 style={{ margin: 0, fontSize: '1.1rem' }}>Frequência diária por turma</h3></div>
          <span style={{ fontSize: '0.85rem', fontWeight: 700, backgroundColor: 'white', padding: '0.3rem 0.8rem', borderRadius: '20px' }}>Hoje, {new Date().toLocaleDateString('pt-BR')}</span>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ textAlign: 'left', borderBottom: '2px solid #e2e8f0' }}>
                {['Turma / Nível', 'Professor(a)', 'Status', 'Atualizado'].map((h, i) => <th key={h} style={{ padding: i === 0 ? '1rem 1.5rem' : '1rem', fontSize: '0.8rem', color: '#64748b', textTransform: 'uppercase', textAlign: i >= 2 ? 'center' : 'left' }}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {attendanceStatus.map(c => (
                <tr key={c.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '0.85rem 1.5rem' }}>
                    <div style={{ fontWeight: 700, color: '#1e293b' }}>{c.name}</div>
                    <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600 }}>{c.level === 'infantil' ? 'Educação Infantil' : 'Ens. Fundamental'}</div>
                  </td>
                  <td style={{ padding: '0.85rem 1rem', fontWeight: 500, color: '#475569' }}>{c.teacherName}</td>
                  <td style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>
                    <span style={{ padding: '0.3rem 0.75rem', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 800, backgroundColor: c.status === 'COMPLETO' ? '#dcfce7' : '#fee2e2', color: c.status === 'COMPLETO' ? '#166534' : '#991b1b', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                      {c.status === 'COMPLETO' ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}{c.status}
                    </span>
                  </td>
                  <td style={{ padding: '0.85rem 1rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.9rem' }}>{c.lastUpdate}</td>
                </tr>
              ))}
              {attendanceStatus.length === 0 && <tr><td colSpan={4} style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>Nenhuma turma cadastrada no ano.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      <style>{`
        .management-dashboard .stat-card { transition: transform 0.2s, box-shadow 0.2s; }
        .management-dashboard .stat-card:hover { transform: translateY(-4px); }
        @media (max-width: 1024px) { .management-grid { grid-template-columns: 1fr !important; } }
        .mobile-only { display: none; }
        @media (max-width: 768px) { .mobile-hide { display: none !important; } .mobile-only { display: inline !important; } }
      `}</style>
    </div>
  );
}
