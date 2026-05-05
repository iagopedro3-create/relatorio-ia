import { useMemo } from 'react';
import { Users, BookOpen, AlertCircle, CheckCircle2, Clock, GraduationCap, TrendingUp, BarChart3, PieChart } from 'lucide-react';
import { mockClasses, mockStudents, mockEnrollments, mockReports } from '../store/mockDb';
import { useUsers } from '../contexts/UserContext';
import { useAuth } from '../contexts/AuthContext';
import { Link } from 'react-router-dom';

function getStudentAnnualGrade(studentId: string) {
  const seed = studentId.charCodeAt(studentId.length - 1);
  const subjects = 7;
  let total = 0;
  for (let si = 0; si < subjects; si++) {
    const base1 = ((seed + si * 7 + 1 * 13) % 40) + 50; 
    const base2 = ((seed + si * 7 + 2 * 13) % 40) + 50; 
    const base3 = ((seed + si * 7 + 3 * 13) % 40) + 50; 
    const finalGrade = Math.min(100, (base1 + base2 + base3) / 3);
    total += finalGrade;
  }
  return total / subjects;
}

// Simple Donut Chart Component
function DonutChart({ percent, color, label }: { percent: number, color: string, label: string }) {
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percent / 100) * circumference;

  return (
    <div className="flex flex-col items-center">
      <div style={{ position: 'relative', width: '100px', height: '100px' }}>
        <svg width="100" height="100" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r={radius} stroke="#e2e8f0" strokeWidth="8" fill="none" />
          <circle
            cx="50" cy="50" r={radius}
            stroke={color} strokeWidth="8" fill="none"
            strokeDasharray={circumference} strokeDashoffset={offset}
            strokeLinecap="round" transform="rotate(-90 50 50)"
            style={{ transition: 'stroke-dashoffset 1s ease-out' }}
          />
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
          <span style={{ fontSize: '1.25rem', fontWeight: 800, color: '#1e293b', lineHeight: 1 }}>{percent}%</span>
        </div>
      </div>
      <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', marginTop: '0.5rem', textTransform: 'uppercase' }}>{label}</span>
    </div>
  );
}

// Simple Bar Component
function ProgressBar({ label, percent, color, value }: { label: string, percent: number, color: string, value: string }) {
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

import { useYear } from '../contexts/YearContext';

export function Management() {
  const { user } = useAuth();
  const { users } = useUsers();
  const { selectedYear } = useYear();

  // Mock attendance status for today — filtered by year
  const attendanceStatus = useMemo(() => {
    return mockClasses
      .filter(c => c.yearId === selectedYear.id)
      .map(c => {
        const teacher = users.find(u => u.id === c.teacherId);
        // Mocking some as done, some as pending based on ID to create variance
        const isDone = ['c1', 'c2', 'c3', 'c6', 'c7', 'c8'].includes(c.id); 
        return {
          ...c,
          teacherName: teacher?.name || 'Não vinculado',
          status: isDone ? 'COMPLETO' : 'PENDENTE',
          lastUpdate: isDone ? '08:45' : '--:--'
        };
      });
  }, [selectedYear]);

  const filteredStatus = useMemo(() => {
    if (user?.role === 'coordinator' && user.managedLevel !== 'all') {
      return attendanceStatus.filter(c => c.level === user.managedLevel);
    }
    return attendanceStatus;
  }, [user, attendanceStatus]);

  const ranking = useMemo(() => {
    const numericClasses = mockClasses
      .filter(c => c.yearId === selectedYear.id && c.evaluationType === 'numeric')
      .map(c => c.id);
    
    // Find students enrolled in these numeric classes for this year
    const enrolledStudentIds = mockEnrollments
      .filter(e => e.yearId === selectedYear.id && numericClasses.includes(e.classId))
      .map(e => e.studentId);
    
    const numericStudents = mockStudents.filter(s => enrolledStudentIds.includes(s.id));
    
    return numericStudents.map(s => {
      const cls = mockClasses.find(c => c.id === numericClasses.find(id => mockEnrollments.some(e => e.studentId === s.id && e.classId === id)));
      return {
        ...s,
        className: cls?.name,
        average: getStudentAnnualGrade(s.id)
      };
    }).sort((a, b) => b.average - a.average).slice(0, 5); // Top 5
  }, [selectedYear]);

  const stats = useMemo(() => {
    // Active students for this year
    const totalStudents = mockEnrollments.filter(e => e.yearId === selectedYear.id).length;
    
    const pendingAttendance = filteredStatus.filter(c => c.status === 'PENDENTE').length;
    const completedAttendance = filteredStatus.filter(c => c.status === 'COMPLETO').length;
    
    // Teachers assigned to any class this year
    const yearClassTeacherIds = mockClasses.filter(c => c.yearId === selectedYear.id).map(c => c.teacherId);
    const activeTeachers = users.filter(u => u.role === 'teacher' && yearClassTeacherIds.includes(u.id)).length;
    
    const totalClasses = filteredStatus.length;
    
    const completionRate = totalClasses === 0 ? 0 : Math.round((completedAttendance / totalClasses) * 100);

    const infantil = filteredStatus.filter(c => c.level === 'infantil');
    const fundamental = filteredStatus.filter(c => c.level === 'fundamental');
    
    const infantilRate = infantil.length ? Math.round((infantil.filter(c => c.status === 'COMPLETO').length / infantil.length) * 100) : 0;
    const fundamentalRate = fundamental.length ? Math.round((fundamental.filter(c => c.status === 'COMPLETO').length / fundamental.length) * 100) : 0;

    // Report specific stats
    const reportClasses = mockClasses.filter(c => c.yearId === selectedYear.id && (user?.managedLevel === 'all' || c.level === user?.managedLevel));
    const totalPossibleReports = mockEnrollments.filter(e => e.yearId === selectedYear.id && reportClasses.some(c => c.id === e.classId)).length;
    const totalReportsCreated = mockReports.filter(r => r.yearId === selectedYear.id).length;
    const totalReportsApproved = mockReports.filter(r => r.yearId === selectedYear.id && r.status === 'approved').length;

    return { 
      totalStudents, pendingAttendance, completedAttendance, activeTeachers, totalClasses, completionRate, 
      infantilRate, fundamentalRate,
      totalPossibleReports, totalReportsCreated, totalReportsApproved
    };
  }, [filteredStatus, selectedYear, user]);

  return (
    <div className="management-dashboard">
      <div className="flex justify-between items-center mb-8">
        <div className="mobile-hide">
          <h2 style={{ margin: 0, fontSize: '2rem', fontWeight: 800, color: '#0f172a' }}>Painel Administrativo</h2>
          <p className="text-muted" style={{ fontSize: '1.05rem', marginTop: '0.25rem' }}>Visão geral da escola, engajamento e pendências</p>
        </div>
        <div className="flex gap-3">
          <Link to="/students" className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Users size={18} /> <span className="mobile-hide">Cadastrar Aluno</span><span className="mobile-only">Novo Aluno</span>
          </Link>
        </div>
      </div>

      {/* Modern Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="card stat-card relative overflow-hidden" style={{ border: 'none', background: 'linear-gradient(135deg, #eff6ff 0%, #ffffff 100%)', boxShadow: '0 4px 20px rgba(10,115,255,0.08)' }}>
          <div className="absolute top-0 right-0 p-4 opacity-10"><Users size={80} /></div>
          <div className="relative z-10">
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#3b82f6', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Alunos Ativos</span>
            <h3 style={{ fontSize: '2.5rem', margin: '0.5rem 0', fontWeight: 900, color: '#1e3a8a' }}>{stats.totalStudents}</h3>
            <p style={{ fontSize: '0.8rem', margin: 0, color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <TrendingUp size={14} color="#10b981" /> +12% neste semestre
            </p>
          </div>
        </div>

        <div className="card stat-card relative overflow-hidden" style={{ border: 'none', background: 'linear-gradient(135deg, #f0fdf4 0%, #ffffff 100%)', boxShadow: '0 4px 20px rgba(16,185,129,0.08)' }}>
          <div className="absolute top-0 right-0 p-4 opacity-10"><GraduationCap size={80} /></div>
          <div className="relative z-10">
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#10b981', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Turmas em Gestão</span>
            <h3 style={{ fontSize: '2.5rem', margin: '0.5rem 0', fontWeight: 900, color: '#14532d' }}>{stats.totalClasses}</h3>
            <p style={{ fontSize: '0.8rem', margin: 0, color: '#64748b' }}>Divididas em 2 segmentos</p>
          </div>
        </div>

        <div className="card stat-card relative overflow-hidden" style={{ border: 'none', background: 'linear-gradient(135deg, #fff7ed 0%, #ffffff 100%)', boxShadow: '0 4px 20px rgba(245,158,11,0.08)' }}>
          <div className="absolute top-0 right-0 p-4 opacity-10"><BookOpen size={80} /></div>
          <div className="relative z-10">
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#f59e0b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Equipe Docente</span>
            <h3 style={{ fontSize: '2.5rem', margin: '0.5rem 0', fontWeight: 900, color: '#78350f' }}>{stats.activeTeachers}</h3>
            <p style={{ fontSize: '0.8rem', margin: 0, color: '#64748b' }}>Professores e auxiliares</p>
          </div>
        </div>

        <div className="card stat-card relative overflow-hidden" style={{ border: 'none', background: 'linear-gradient(135deg, #fef2f2 0%, #ffffff 100%)', boxShadow: '0 4px 20px rgba(239,68,68,0.08)' }}>
          <div className="absolute top-0 right-0 p-4 opacity-10"><Clock size={80} /></div>
          <div className="relative z-10">
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#ef4444', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Relatórios Pendentes</span>
            <h3 style={{ fontSize: '2.5rem', margin: '0.5rem 0', fontWeight: 900, color: '#7f1d1d' }}>{stats.totalPossibleReports - stats.totalReportsCreated}</h3>
            <p style={{ fontSize: '0.8rem', margin: 0, color: '#64748b' }}>De um total de {stats.totalPossibleReports}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '2rem', padding: '1.5rem', borderLeft: '4px solid #8b5cf6' }}>
          <div style={{ width: '60px', height: '60px', borderRadius: '50%', backgroundColor: '#f5f3ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <BookOpen size={24} color="#8b5cf6" />
          </div>
          <div>
            <p style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Status de Aprovação (Coordenador)</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800 }}>{stats.totalReportsApproved} / {stats.totalReportsCreated}</h3>
              <span style={{ fontSize: '0.8rem', backgroundColor: '#ecfdf5', color: '#10b981', padding: '0.2rem 0.6rem', borderRadius: '4px', fontWeight: 700 }}>
                {stats.totalReportsCreated > 0 ? Math.round((stats.totalReportsApproved / stats.totalReportsCreated) * 100) : 0}% OK
              </span>
            </div>
            <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '0.25rem' }}>Relatórios que já receberam o visto da coordenação.</p>
          </div>
        </div>
        
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '2rem', padding: '1.5rem', borderLeft: '4px solid #0a73ff' }}>
          <DonutChart percent={stats.totalPossibleReports > 0 ? Math.round((stats.totalReportsCreated / stats.totalPossibleReports) * 100) : 0} color="#0a73ff" label="Preenchimento Geral" />
          <div style={{ flex: 1 }}>
             <h4 style={{ margin: '0 0 0.5rem', fontSize: '0.9rem' }}>Progresso Bimestral</h4>
             <ProgressBar label="Relatórios Redigidos" percent={stats.totalPossibleReports > 0 ? (stats.totalReportsCreated / stats.totalPossibleReports) * 100 : 0} color="#0a73ff" value={`${stats.totalReportsCreated} / ${stats.totalPossibleReports}`} />
          </div>
        </div>
      </div>

      {/* Row 2: Two balanced columns */}
      <div className="management-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>

        {/* LEFT: Desempenho da Equipe */}
        <div className="card" style={{ border: 'none', boxShadow: '0 4px 24px rgba(0,0,0,0.04)' }}>
          <div className="flex items-center gap-2 mb-6">
            <PieChart size={20} color="var(--color-primary)" />
            <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Desempenho da Equipe</h3>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '2rem', marginBottom: '2rem' }}>
            <DonutChart percent={stats.completionRate} color="#0a73ff" label="Lançamentos Hoje" />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div className="flex items-center gap-2">
                <div style={{ width: '12px', height: '12px', borderRadius: '3px', backgroundColor: '#0a73ff' }}></div>
                <span style={{ fontSize: '0.85rem', color: '#64748b' }}>Completos ({stats.completedAttendance})</span>
              </div>
              <div className="flex items-center gap-2">
                <div style={{ width: '12px', height: '12px', borderRadius: '3px', backgroundColor: '#e2e8f0' }}></div>
                <span style={{ fontSize: '0.85rem', color: '#64748b' }}>Pendentes ({stats.pendingAttendance})</span>
              </div>
            </div>
          </div>
          <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '1.5rem' }}>
            <h4 style={{ fontSize: '0.85rem', color: '#64748b', textTransform: 'uppercase', marginBottom: '1rem', letterSpacing: '0.5px' }}>Engajamento por Segmento</h4>
            {(user?.role === 'admin' || user?.managedLevel === 'infantil' || user?.managedLevel === 'all') && (
              <ProgressBar label="Educação Infantil" percent={stats.infantilRate} color="#8b5cf6" value={`${stats.infantilRate}%`} />
            )}
            {(user?.role === 'admin' || user?.managedLevel === 'fundamental' || user?.managedLevel === 'all') && (
              <ProgressBar label="Ensino Fundamental" percent={stats.fundamentalRate} color="#10b981" value={`${stats.fundamentalRate}%`} />
            )}
          </div>
        </div>

        {/* RIGHT: Alertas + Ranking stacked */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Alertas */}
          <div className="card" style={{ border: 'none', boxShadow: '0 4px 24px rgba(0,0,0,0.04)', background: 'linear-gradient(135deg, #fffbeb 0%, #ffffff 100%)', borderLeft: '4px solid #f59e0b' }}>
            <h4 className="flex items-center gap-2" style={{ color: '#b45309', margin: '0 0 1rem 0' }}><AlertCircle size={18} /> Alertas Pedagógicos</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              {((user?.role === 'admin' || user?.managedLevel === 'infantil' || user?.managedLevel === 'all') && 
                filteredStatus.some(c => c.level === 'infantil' && c.status === 'PENDENTE')) && (
                <div style={{ fontSize: '0.85rem', backgroundColor: 'white', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid #fde68a', color: '#92400e', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#f59e0b', flexShrink: 0 }}></span>
                  Atraso de relatórios no Infantil
                </div>
              )}
              {(user?.role === 'admin' || user?.managedLevel === 'fundamental' || user?.managedLevel === 'all') && (
                <>
                  {filteredStatus.some(c => c.id === 'c6' && c.status === 'PENDENTE') && (
                    <div style={{ fontSize: '0.85rem', backgroundColor: 'white', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid #fde68a', color: '#92400e', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#f59e0b', flexShrink: 0 }}></span>
                      Relatórios atrasados no 1º Ano
                    </div>
                  )}
                  {filteredStatus.some(c => c.level === 'fundamental' && c.evaluationType === 'numeric' && c.status === 'PENDENTE') && (
                    <div style={{ fontSize: '0.85rem', backgroundColor: 'white', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid #fde68a', color: '#92400e', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#f59e0b', flexShrink: 0 }}></span>
                      Notas pendentes (2º ao 5º Ano)
                    </div>
                  )}
                </>
              )}
              {stats.pendingAttendance === 0 && (
                <div style={{ fontSize: '0.85rem', color: '#15803d', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, padding: '0.5rem 0' }}>
                  <CheckCircle2 size={16} /> Sem pendências no momento!
                </div>
              )}
            </div>
          </div>

          {/* Ranking */}
          <div className="card" style={{ border: 'none', boxShadow: '0 4px 24px rgba(0,0,0,0.04)', padding: 0, flex: 1 }}>
            <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'linear-gradient(135deg, #fffbeb 0%, #fff 100%)', borderTopLeftRadius: '12px', borderTopRightRadius: '12px' }}>
              <TrendingUp size={18} color="#d97706" />
              <h3 style={{ margin: 0, fontSize: '1rem', color: '#b45309' }}>Ranking de Alunos (Top 5)</h3>
            </div>
            <div style={{ padding: '1rem 1.25rem' }}>
              {ranking.map((s, idx) => (
                <div key={s.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.6rem 0', borderBottom: idx < ranking.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{
                      width: '26px', height: '26px', borderRadius: '50%',
                      backgroundColor: idx === 0 ? '#fef3c7' : (idx === 1 ? '#f1f5f9' : (idx === 2 ? '#ffedd5' : '#f8fafc')),
                      color: idx === 0 ? '#d97706' : (idx === 1 ? '#64748b' : (idx === 2 ? '#c2410c' : '#94a3b8')),
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.75rem'
                    }}>
                      {idx + 1}
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, color: '#1e293b', fontSize: '0.85rem' }}>{s.name}</div>
                      <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>{s.className}</div>
                    </div>
                  </div>
                  <div style={{ fontWeight: 900, color: '#166534', fontSize: '1rem' }}>
                    {s.average.toFixed(1)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Row 3: Full-width attendance table */}
      <div className="card" style={{ border: 'none', boxShadow: '0 4px 24px rgba(0,0,0,0.04)', padding: 0 }}>
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc', borderTopLeftRadius: '12px', borderTopRightRadius: '12px' }}>
          <div className="flex items-center gap-3">
            <BarChart3 size={20} color="var(--color-primary)" />
            <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Detalhamento de Frequência Diária</h3>
          </div>
          <span style={{ fontSize: '0.85rem', fontWeight: 700, backgroundColor: 'white', padding: '0.3rem 0.8rem', borderRadius: '20px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
            Hoje, {new Date().toLocaleDateString('pt-BR')}
          </span>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ textAlign: 'left', borderBottom: '2px solid #e2e8f0' }}>
                <th style={{ padding: '1rem 1.5rem', fontSize: '0.8rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Turma / Nível</th>
                <th style={{ padding: '1rem', fontSize: '0.8rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Professor(a)</th>
                <th style={{ padding: '1rem', textAlign: 'center', fontSize: '0.8rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Status</th>
                <th style={{ padding: '1rem', textAlign: 'center', fontSize: '0.8rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Atualizado</th>
                <th style={{ padding: '1rem 1.5rem', textAlign: 'right', fontSize: '0.8rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Ação</th>
              </tr>
            </thead>
            <tbody>
              {filteredStatus.map(c => (
                <tr key={c.id} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background-color 0.2s' }} className="hover:bg-slate-50">
                  <td style={{ padding: '0.85rem 1.5rem' }}>
                    <div style={{ fontWeight: 700, color: '#1e293b' }}>{c.name}</div>
                    <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600 }}>{c.level === 'infantil' ? 'Educação Infantil' : 'Ens. Fundamental'}</div>
                  </td>
                  <td style={{ padding: '0.85rem 1rem', fontWeight: 500, color: '#475569' }}>{c.teacherName}</td>
                  <td style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>
                    <span style={{ 
                      padding: '0.3rem 0.75rem', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 800,
                      backgroundColor: c.status === 'COMPLETO' ? '#dcfce7' : '#fee2e2',
                      color: c.status === 'COMPLETO' ? '#166534' : '#991b1b',
                      display: 'inline-flex', alignItems: 'center', gap: '6px'
                    }}>
                      {c.status === 'COMPLETO' ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
                      {c.status}
                    </span>
                  </td>
                  <td style={{ padding: '0.85rem 1rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.9rem', fontWeight: 500 }}>
                    {c.lastUpdate}
                  </td>
                  <td style={{ padding: '0.85rem 1.5rem', textAlign: 'right' }}>
                    {c.status === 'PENDENTE' && (
                      <button style={{ 
                        padding: '0.4rem 1rem', fontSize: '0.75rem', fontWeight: 700, borderRadius: '6px',
                        backgroundColor: 'white', border: '1px solid #cbd5e1', color: '#475569', cursor: 'pointer',
                        transition: 'all 0.2s', boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                      }}
                      onMouseOver={(e) => { e.currentTarget.style.borderColor = '#0a73ff'; e.currentTarget.style.color = '#0a73ff'; }}
                      onMouseOut={(e) => { e.currentTarget.style.borderColor = '#cbd5e1'; e.currentTarget.style.color = '#475569'; }}
                      >
                        Lembrar
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <style>{`
        .management-dashboard .stat-card { transition: transform 0.2s, box-shadow 0.2s; }
        .management-dashboard .stat-card:hover { transform: translateY(-4px); }
        @media (max-width: 1024px) {
          .management-grid { grid-template-columns: 1fr !important; }
        }
        .mobile-only { display: none; }
        @media (max-width: 768px) {
          .mobile-hide { display: none !important; }
          .mobile-only { display: inline !important; }
        }
      `}</style>
    </div>
  );
}
