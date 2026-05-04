import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Users, TrendingUp, AlertCircle, FileCheck } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useYear } from '../contexts/YearContext';
import { mockStudents, mockReports, mockClasses, mockEnrollments } from '../store/mockDb';
import type { ClassGroup, ReportRecord, Enrollment } from '../store/mockDb';
import { Management } from './Management';
import { mockMessages, mockEvents, CATEGORY_LABELS, EVENT_TYPES } from '../store/agendaDb';
import { MessageSquare, Bell, Heart, BookOpenCheck, Clock } from 'lucide-react';

const BIMESTRES = ['1º Bimestre', '2º Bimestre', '3º Bimestre', '4º Bimestre'];

export function Home() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { selectedYear, availableYears, setYear } = useYear();
  const [selectedBimestre, setSelectedBimestre] = useState('1º Bimestre');
  
  const isTeacher = user?.role === 'teacher';

  // Filter classes based on selected year and permissions
  const managedClasses = useMemo(() => {
    let classes = mockClasses.filter(c => c.yearId === selectedYear.id);
    
    if (user?.role === 'teacher') {
      // Find the class where this teacher is assigned for this year
      return classes.filter(c => c.teacherId === user.id);
    }
    
    if (user?.role === 'coordinator' && user.managedLevel !== 'all') {
      return classes.filter(c => c.level === user.managedLevel);
    }
    
    return classes;
  }, [user, selectedYear]);


  // Filter reports based on selected year, bimestre and managed classes
  const filteredReports = useMemo(() => {
    const classIds = managedClasses.map((c: ClassGroup) => c.id);
    return mockReports.filter((r: ReportRecord) => 
      r.yearId === selectedYear.id && 
      r.context === selectedBimestre &&
      classIds.includes(r.classId)
    );
  }, [managedClasses, selectedYear, selectedBimestre]);

  const getProgressByClass = () => {
    return managedClasses
      .filter((c: ClassGroup) => c.evaluationType === 'report')
      .map((c: ClassGroup) => {
        const studentIdsInClass = mockEnrollments
          .filter((e: Enrollment) => e.classId === c.id && e.yearId === selectedYear.id)
          .map((e: Enrollment) => e.studentId);
        
        const studentsCount = studentIdsInClass.length;
        const reportsCount = filteredReports.filter((r: ReportRecord) => r.classId === c.id).length;
        const percent = studentsCount > 0 ? Math.round((reportsCount / studentsCount) * 100) : 0;
        return { ...c, percent, total: studentsCount, done: reportsCount };
      });
  };

  const classProgress = getProgressByClass();

  // Find pending students
  const getPendingStudents = () => {
    const reportClasses = managedClasses.filter((c: ClassGroup) => c.evaluationType === 'report');
    const grouped: Record<string, typeof mockStudents> = {};
    
    reportClasses.forEach((c: ClassGroup) => {
      const studentIdsInClass = mockEnrollments
        .filter((e: Enrollment) => e.classId === c.id && e.yearId === selectedYear.id)
        .map((e: Enrollment) => e.studentId);
      
      const students = mockStudents.filter(s => studentIdsInClass.includes(s.id));
      const pending = students.filter(s => !filteredReports.some((r: ReportRecord) => r.studentId === s.id));
      
      if (pending.length > 0) {
        grouped[c.name] = pending;
      }
    });
    
    return grouped;
  };

  const pendingGrouped = getPendingStudents();

  // Common Header for Period Selection
  const PeriodSelector = () => (
    <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', backgroundColor: 'var(--color-surface)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
      <div className="flex items-center gap-2">
        <Calendar size={18} color="var(--color-primary)" />
        <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>Ano Letivo:</span>
      </div>
      {!isTeacher ? (
        <select 
          value={selectedYear.id} 
          onChange={(e) => setYear(e.target.value)}
          style={{ padding: '0.4rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)', width: '150px' }}
        >
          {availableYears.map(y => <option key={y.id} value={y.id}>{y.label}</option>)}
        </select>
      ) : (
        <div style={{ padding: '0.4rem 1rem', backgroundColor: 'var(--color-bg)', borderRadius: 'var(--radius-sm)', fontSize: '0.9rem', fontWeight: 600 }}>{selectedYear.label}</div>
      )}
      
      <div className="flex items-center gap-2 ml-4">
        <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>Período:</span>
      </div>
      <select 
        value={selectedBimestre} 
        onChange={(e) => setSelectedBimestre(e.target.value)}
        style={{ padding: '0.4rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)', width: '150px' }}
      >
        {BIMESTRES.map(b => <option key={b} value={b}>{b}</option>)}
      </select>
    </div>
  );

  // Teacher View
  if (user?.role === 'teacher') {
    const myClass = managedClasses[0]; // For this year
    const studentIds = mockEnrollments
      .filter((e: Enrollment) => e.classId === myClass?.id && e.yearId === selectedYear.id)
      .map((e: Enrollment) => e.studentId);
    
    const myStudents = mockStudents.filter(s => studentIds.includes(s.id));
    const myReports = filteredReports.filter((r: ReportRecord) => r.classId === myClass?.id);
    const myPercent = myStudents.length > 0 ? Math.round((myReports.length / myStudents.length) * 100) : 0;
    
    const myPending = myStudents.filter(s => !myReports.some((r: ReportRecord) => r.studentId === s.id));

    return (
      <div>
        <h2 className="mb-6">Olá, {user.name}!</h2>
        <PeriodSelector />
        
        <div className="grid grid-cols-3">
          <div className="card" style={{ borderLeft: '4px solid var(--color-primary)' }}>
            <div className="flex justify-between items-start">
              <div>
                <p className="text-muted" style={{ fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase' }}>Minha Turma</p>
                <h3 style={{ margin: '0.25rem 0', fontSize: '1.5rem' }}>{myClass?.name || 'Sem turma este ano'}</h3>
              </div>
              <Users color="var(--color-primary)" />
            </div>
          </div>
          
          <div className="card" style={{ borderLeft: '4px solid var(--color-secondary)' }}>
            <div className="flex justify-between items-start">
              <div>
                <p className="text-muted" style={{ fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase' }}>Alunos</p>
                <h3 style={{ margin: '0.25rem 0', fontSize: '1.5rem' }}>{myStudents.length}</h3>
              </div>
              <Users color="var(--color-secondary)" />
            </div>
          </div>

          <div className="card" style={{ borderLeft: '4px solid var(--color-success)' }}>
            <div className="flex justify-between items-start">
              <div>
                <p className="text-muted" style={{ fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase' }}>Seu Progresso</p>
                <h3 style={{ margin: '0.25rem 0', fontSize: '1.5rem' }}>{myPercent}%</h3>
              </div>
              <TrendingUp color="var(--color-success)" />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 mt-6">
          <div className="card">
            <h3>Sua Meta: {selectedBimestre} / {selectedYear.label}</h3>
            <p>Você concluiu {myReports.length} de {myStudents.length} relatórios.</p>
            <div style={{ width: '100%', height: '12px', backgroundColor: 'var(--color-bg)', borderRadius: '6px', marginTop: '1rem', overflow: 'hidden' }}>
              <div style={{ width: `${myPercent}%`, height: '100%', backgroundColor: 'var(--color-success)', transition: 'width 0.5s ease' }}></div>
            </div>
          </div>

          <div className="card">
            <h3 className="flex items-center gap-2" style={{ color: 'var(--color-secondary)' }}>
              <AlertCircle size={20} /> Alunos Pendentes
            </h3>
            <p className="text-muted mb-4">Relatórios que ainda precisam ser gerados:</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {myPending.map(s => (
                <div key={s.id} style={{ padding: '0.75rem', backgroundColor: 'var(--color-bg)', borderRadius: 'var(--radius-sm)', fontWeight: 500, fontSize: '0.9rem' }}>
                  • {s.name}
                </div>
              ))}
              {myPending.length === 0 && <p className="text-success" style={{ fontWeight: 600 }}>🎉 Tudo em dia para este período!</p>}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Parent/Responsible View
  if (user?.role === 'responsible') {
    const student = mockStudents.find(s => s.id === user.studentId);
    const studentClass = mockClasses.find(c => c.id === student?.classId);
    
    const myEvents = mockEvents
      .filter(e => !e.classIds.length || (student?.classId && e.classIds.includes(student.classId)))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(0, 3);
      
    const myMessages = mockMessages
      .filter(m => m.targetType === 'all' || (m.targetType === 'class' && student?.classId && m.targetIds.includes(student.classId)) || (m.targetType === 'student' && m.targetIds.includes(user.studentId!)))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 3);

    return (
      <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
          <div style={{ width: '64px', height: '64px', borderRadius: '50%', backgroundColor: 'var(--color-primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', fontWeight: 800 }}>
            {student?.name.charAt(0)}
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.75rem' }}>Olá, {user.name}!</h2>
            <p className="text-muted">Acompanhando o desenvolvimento de <strong>{student?.name}</strong> • {studentClass?.name}</p>
          </div>
        </div>

        <div className="grid grid-cols-3 mb-8">
          <div className="card" style={{ padding: '1.5rem', borderBottom: '4px solid #10b981' }}>
            <div className="flex justify-between items-start mb-2">
              <span className="text-muted" style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase' }}>Frequência</span>
              <FileCheck size={20} color="#10b981" />
            </div>
            <h3 style={{ margin: 0, fontSize: '1.5rem' }}>98%</h3>
            <p style={{ margin: '0.25rem 0 0', fontSize: '0.8rem', color: '#10b981', fontWeight: 600 }}>Excelente presença</p>
          </div>

          <div className="card" style={{ padding: '1.5rem', borderBottom: '4px solid var(--color-primary)' }}>
            <div className="flex justify-between items-start mb-2">
              <span className="text-muted" style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase' }}>Próximo Evento</span>
              <Calendar size={20} color="var(--color-primary)" />
            </div>
            <h3 style={{ margin: 0, fontSize: '1.1rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {myEvents[0]?.title || 'Sem eventos'}
            </h3>
            <p style={{ margin: '0.25rem 0 0', fontSize: '0.8rem', color: 'var(--color-primary)', fontWeight: 600 }}>
              {myEvents[0] ? new Date(myEvents[0].date).toLocaleDateString('pt-BR') : '-'}
            </p>
          </div>

          <div className="card" style={{ padding: '1.5rem', borderBottom: '4px solid var(--color-secondary)' }}>
            <div className="flex justify-between items-start mb-2">
              <span className="text-muted" style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase' }}>Última Nota</span>
              <BookOpenCheck size={20} color="var(--color-secondary)" />
            </div>
            <h3 style={{ margin: 0, fontSize: '1.5rem' }}>9.5</h3>
            <p style={{ margin: '0.25rem 0 0', fontSize: '0.8rem', color: 'var(--color-secondary)', fontWeight: 600 }}>Português • 1º Bim</p>
          </div>
        </div>

        <div className="grid grid-cols-2">
          {/* Recent Messages */}
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}><MessageSquare size={20} color="var(--color-primary)" /> Últimos Comunicados</h3>
              <button className="text-primary" onClick={() => navigate('/agenda')} style={{ background: 'none', border: 'none', color: 'var(--color-primary)', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer' }}>Ver tudo</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {myMessages.map(msg => (
                <div key={msg.id} className="card" style={{ padding: '1rem', cursor: 'pointer' }} onClick={() => navigate('/agenda')}>
                  <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '10px', backgroundColor: CATEGORY_LABELS[msg.category].bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Bell size={18} color={CATEGORY_LABELS[msg.category].color} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div className="flex justify-between items-start">
                        <h4 style={{ margin: 0, fontSize: '0.95rem' }}>{msg.subject}</h4>
                        <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>{new Date(msg.createdAt).toLocaleDateString('pt-BR')}</span>
                      </div>
                      <p style={{ margin: '0.25rem 0 0', fontSize: '0.85rem', color: '#64748b', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{msg.content}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Upcoming Events */}
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Calendar size={20} color="var(--color-primary)" /> Calendário Escolar</h3>
              <button className="text-primary" onClick={() => navigate('/agenda')} style={{ background: 'none', border: 'none', color: 'var(--color-primary)', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer' }}>Ver agenda</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {myEvents.map(ev => (
                <div key={ev.id} className="card" style={{ padding: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ textAlign: 'center', paddingRight: '1rem', borderRight: '1px solid #e2e8f0', minWidth: '50px' }}>
                      <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--color-primary)' }}>{new Date(ev.date).getDate()}</div>
                      <div style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', color: '#94a3b8' }}>{new Date(ev.date).toLocaleString('pt-BR', { month: 'short' })}</div>
                    </div>
                    <div style={{ flex: 1 }}>
                      <div className="flex items-center gap-2">
                        <span style={{ fontSize: '1rem' }}>{EVENT_TYPES[ev.type].icon}</span>
                        <h4 style={{ margin: 0, fontSize: '0.95rem' }}>{ev.title}</h4>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem' }}>
                        <Clock size={12} color="#94a3b8" />
                        <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{ev.time || 'Dia inteiro'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="card mt-6" style={{ backgroundColor: '#fff7ed', border: '1px dashed #fdba74', textAlign: 'center', padding: '1.5rem' }}>
              <Heart size={32} color="#f97316" style={{ margin: '0 auto 0.5rem', opacity: 0.6 }} />
              <h4 style={{ margin: '0 0 0.5rem', color: '#9a3412' }}>Espaço do Aluno</h4>
              <p style={{ fontSize: '0.85rem', color: '#c2410c', margin: 0 }}>Acesse o boletim completo e relatórios pedagógicos para acompanhar o Lucas.</p>
              <button className="btn btn-secondary mt-4" onClick={() => navigate('/bulletin')} style={{ width: '100%', fontSize: '0.9rem' }}>Acessar Boletim</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Admin/Coordinator View
  return (
    <div>
      <Management />

      <div style={{ marginTop: '3rem', borderTop: '1px solid var(--color-border)', paddingTop: '2rem' }}>
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 style={{ margin: 0 }}>Acompanhamento Pedagógico</h2>
            <p className="text-muted">Status de geração de relatórios de IA por turma</p>
          </div>
          <PeriodSelector />
        </div>

      <div className="grid grid-cols-2 mt-6">
        {/* Class Progress — report classes only */}
        <div className="card">
          <h3 className="mb-6">Relatórios por Turma — {selectedBimestre}</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {classProgress.map((c: any) => (
              <div key={c.id}>
                <div className="flex justify-between mb-2" style={{ fontSize: '0.9rem' }}>
                  <span style={{ fontWeight: 600 }}>{c.name}</span>
                  <span className="text-muted">{c.done} / {c.total} alunos</span>
                </div>
                <div style={{ width: '100%', height: '8px', backgroundColor: 'var(--color-bg)', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ 
                    width: `${c.percent}%`, 
                    height: '100%', 
                    backgroundColor: c.percent === 100 ? 'var(--color-success)' : 'var(--color-primary)', 
                    transition: 'width 0.5s ease' 
                  }}></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Pending Reports List */}
        <div className="card" style={{ borderTop: '4px solid var(--color-secondary)' }}>
          <h3 className="flex items-center gap-2 mb-6" style={{ color: 'var(--color-secondary)' }}>
            <AlertCircle size={20} /> Relatórios Pendentes
          </h3>
          <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
            {Object.entries(pendingGrouped).length > 0 ? (
              Object.entries(pendingGrouped).map(([className, students]) => (
                <div key={className} style={{ marginBottom: '1.5rem' }}>
                  <h4 style={{ fontSize: '0.85rem', textTransform: 'uppercase', color: 'var(--color-primary)', borderBottom: '1px solid var(--color-bg)', paddingBottom: '0.25rem', marginBottom: '0.5rem' }}>
                    {className}
                  </h4>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                    {students.map(s => (
                      <span key={s.id} style={{ padding: '0.25rem 0.6rem', backgroundColor: 'var(--color-bg)', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem' }}>
                        {s.name}
                      </span>
                    ))}
                  </div>
                </div>
              ))
            ) : (
              <div style={{ textAlign: 'center', padding: '2rem' }}>
                <FileCheck size={48} color="var(--color-success)" style={{ opacity: 0.3, marginBottom: '1rem' }} />
                <p className="text-success" style={{ fontWeight: 600 }}>Parabéns! Todos os relatórios foram lançados para este período.</p>
              </div>
            )}
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}
