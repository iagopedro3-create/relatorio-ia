import { useYear } from '../contexts/YearContext';
import { mockStudents, mockReports, mockClasses, mockEnrollments } from '../store/mockDb';

const BIMESTRES = ['1º Bimestre', '2º Bimestre', '3º Bimestre', '4º Bimestre'];

export function Home() {
  const { user } = useAuth();
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

  // Find students enrolled in the managed classes for this year
  const studentsInManagedClasses = useMemo(() => {
    const classIds = managedClasses.map(c => c.id);
    const enrolledIds = mockEnrollments
      .filter(e => e.yearId === selectedYear.id && classIds.includes(e.classId))
      .map(e => e.studentId);
    
    return mockStudents.filter(s => enrolledIds.includes(s.id));
  }, [managedClasses, selectedYear]);

  // Filter reports based on selected year, bimestre and managed classes
  const filteredReports = useMemo(() => {
    const classIds = managedClasses.map(c => c.id);
    return mockReports.filter(r => 
      r.yearId === selectedYear.id && 
      r.context === selectedBimestre &&
      classIds.includes(r.classId)
    );
  }, [managedClasses, selectedYear, selectedBimestre]);

  const getProgressByClass = () => {
    return managedClasses
      .filter(c => c.evaluationType === 'report')
      .map(c => {
        const studentIdsInClass = mockEnrollments
          .filter(e => e.classId === c.id && e.yearId === selectedYear.id)
          .map(e => e.studentId);
        
        const studentsCount = studentIdsInClass.length;
        const reportsCount = filteredReports.filter(r => r.classId === c.id).length;
        const percent = studentsCount > 0 ? Math.round((reportsCount / studentsCount) * 100) : 0;
        return { ...c, percent, total: studentsCount, done: reportsCount };
      });
  };

  const classProgress = getProgressByClass();

  // Find pending students
  const getPendingStudents = () => {
    const reportClasses = managedClasses.filter(c => c.evaluationType === 'report');
    const grouped: Record<string, typeof mockStudents> = {};
    
    reportClasses.forEach(c => {
      const studentIdsInClass = mockEnrollments
        .filter(e => e.classId === c.id && e.yearId === selectedYear.id)
        .map(e => e.studentId);
      
      const students = mockStudents.filter(s => studentIdsInClass.includes(s.id));
      const pending = students.filter(s => !filteredReports.some(r => r.studentId === s.id));
      
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
      .filter(e => e.classId === myClass?.id && e.yearId === selectedYear.id)
      .map(e => e.studentId);
    
    const myStudents = mockStudents.filter(s => studentIds.includes(s.id));
    const myReports = filteredReports.filter(r => r.classId === myClass?.id);
    const myPercent = myStudents.length > 0 ? Math.round((myReports.length / myStudents.length) * 100) : 0;
    
    const myPending = myStudents.filter(s => !myReports.some(r => r.studentId === s.id));

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
            {classProgress.map(c => (
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
