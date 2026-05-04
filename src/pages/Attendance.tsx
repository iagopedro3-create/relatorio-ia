import { useState, useMemo } from 'react';
import { Save, ChevronLeft, ChevronRight } from 'lucide-react';
import { mockStudents, mockClasses } from '../store/mockDb';
import type { ClassGroup, Student } from '../store/mockDb';
import { useAuth } from '../contexts/AuthContext';

const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

const HOLIDAYS_2026: Record<string, string> = {
  '2026-01-01': 'Ano Novo',
  '2026-02-16': 'Carnaval',
  '2026-02-17': 'Carnaval',
  '2026-02-18': 'Cinzas',
  '2026-04-03': 'Sexta Santa',
  '2026-04-21': 'Tiradentes',
  '2026-04-23': 'São Jorge (Estadual RJ)',
  '2026-05-01': 'Dia do Trabalho',
  '2026-06-04': 'Corpus Christi',
  '2026-06-29': 'São Pedro (Mun. Cabo Frio)',
  '2026-08-15': 'Nsa. Sra. Assunção (Mun. Cabo Frio)',
  '2026-09-07': 'Independência',
  '2026-10-12': 'Nsa. Sra. Aparecida',
  '2026-11-02': 'Finados',
  '2026-11-13': 'Aniv. Cabo Frio (Municipal)',
  '2026-11-15': 'Procl. República',
  '2026-11-20': 'Consciência Negra',
  '2026-12-25': 'Natal'
};

export function Attendance() {
  const { user } = useAuth();
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedClassId, setSelectedClassId] = useState<string>(user?.classId || '');
  const [attendanceData, setAttendanceData] = useState<Record<string, Record<string, 'P' | 'F' | ''>>>({});

  const managedClasses = useMemo(() => {
    if (user?.role === 'teacher') return mockClasses.filter((c: ClassGroup) => c.id === user.classId);
    if (user?.role === 'coordinator' && user.managedLevel !== 'all') {
      return mockClasses.filter((c: ClassGroup) => c.level === user.managedLevel);
    }
    return mockClasses;
  }, [user]);

  // Set default selected class if not set
  useMemo(() => {
    if (!selectedClassId && managedClasses.length > 0) {
      setSelectedClassId(managedClasses[0].id);
    }
  }, [managedClasses, selectedClassId]);

  const currentClass = useMemo(() => 
    mockClasses.find((c: ClassGroup) => c.id === selectedClassId), 
    [selectedClassId]
  );

  const isWeekend = (day: number) => {
    const d = new Date(2026, selectedMonth, day);
    const dayOfWeek = d.getDay();
    return dayOfWeek === 0 || dayOfWeek === 6; // 0 = Dom, 6 = Sáb
  };

  const getHoliday = (day: number) => {
    const dateKey = `2026-${String(selectedMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return HOLIDAYS_2026[dateKey];
  };

  // Filter students by selected class
  const students = useMemo(() => 
    mockStudents.filter((s: Student) => s.classId === selectedClassId),
    [selectedClassId]
  );

  // Generate days for the selected month
  const year = 2026;
  const daysInMonth = new Date(year, selectedMonth + 1, 0).getDate();
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const toggleStatus = (studentId: string, day: number) => {
    const dateKey = `${year}-${String(selectedMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    setAttendanceData(prev => {
      const studentDays = prev[studentId] || {};
      const currentStatus = studentDays[dateKey];
      let nextStatus: 'P' | 'F' | '' = '';
      
      if (currentStatus === '') nextStatus = 'P';
      else if (currentStatus === 'P') nextStatus = 'F';
      else nextStatus = '';

      return {
        ...prev,
        [studentId]: { ...studentDays, [dateKey]: nextStatus }
      };
    });
  };

  const [selectedDay, setSelectedDay] = useState(new Date().getDate());

  const handleSave = () => {
    alert('Frequência salva com sucesso!');
  };

  const MobileDaySelector = () => (
    <div className="mobile-only" style={{ display: 'none', marginBottom: '1rem' }}>
      <div className="flex items-center justify-between bg-surface p-3 rounded-lg border border-border">
        <button onClick={() => setSelectedDay(d => Math.max(1, d - 1))} className="btn btn-secondary" style={{ padding: '0.5rem' }}><ChevronLeft size={20} /></button>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '0.8rem', opacity: 0.6 }}>Dia Selecionado</div>
          <div style={{ fontSize: '1.2rem', fontWeight: 800 }}>{selectedDay} de {MONTHS[selectedMonth]}</div>
        </div>
        <button onClick={() => setSelectedDay(d => Math.min(daysInMonth, d + 1))} className="btn btn-secondary" style={{ padding: '0.5rem' }}><ChevronRight size={20} /></button>
      </div>
    </div>
  );

  return (
    <div className="attendance-module">
      <style>{`
        @media (max-width: 768px) {
          .desktop-grid { display: none !important; }
          .mobile-only { display: block !important; }
          .mobile-list { display: flex !important; flex-direction: column; gap: 0.75rem; }
          .attendance-card { padding: 1rem !important; }
        }
      `}</style>
      
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 style={{ margin: 0 }}>Frequência</h2>
          <p className="text-muted no-mobile">Turma: {currentClass?.name} - 2026</p>
        </div>
        <button onClick={handleSave} className="btn btn-primary">
          <Save size={20} /> <span className="no-mobile">Salvar</span>
        </button>
      </div>

      <div className="card mb-6" style={{ padding: '1.5rem', display: 'flex', gap: '1.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
        {managedClasses.length > 1 && (
          <div className="flex items-center gap-2">
            <label style={{ margin: 0, fontWeight: 700, whiteSpace: 'nowrap' }}>Turma:</label>
            <select 
              value={selectedClassId} 
              onChange={e => setSelectedClassId(e.target.value)}
              style={{ width: '220px' }}
            >
              {managedClasses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        )}
        
        <div className="flex items-center gap-2">
          <label style={{ margin: 0, fontWeight: 700, whiteSpace: 'nowrap' }}>Mês:</label>
          <div className="flex items-center gap-2">
            <button onClick={() => setSelectedMonth(m => Math.max(0, m - 1))} className="btn btn-secondary" style={{ padding: '0.5rem' }}><ChevronLeft size={20} /></button>
            <span style={{ fontWeight: 700, minWidth: '100px', textAlign: 'center' }}>{MONTHS[selectedMonth]}</span>
            <button onClick={() => setSelectedMonth(m => Math.min(11, m + 1))} className="btn btn-secondary" style={{ padding: '0.5rem' }}><ChevronRight size={20} /></button>
          </div>
        </div>
      </div>

      <div className="card attendance-card" style={{ padding: '1.5rem' }}>
        <div className="flex items-center gap-4 mb-6">
          <div className="flex gap-4 ml-auto no-mobile">
            <div className="flex items-center gap-2">
              <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#fef3c7' }}></div>
              <span style={{ fontSize: '0.8rem' }}>Feriado</span>
            </div>
            <div className="flex items-center gap-2">
              <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#C6EFCE' }}></div>
              <span style={{ fontSize: '0.8rem' }}>P</span>
            </div>
          </div>
        </div>

        <MobileDaySelector />

        {/* Mobile View: List by Day */}
        <div className="mobile-list" style={{ display: 'none' }}>
          {getHoliday(selectedDay) || isWeekend(selectedDay) ? (
            <div style={{ padding: '2rem', textAlign: 'center', backgroundColor: '#f9fafb', borderRadius: 'var(--radius-md)', border: '1px dashed #ddd' }}>
              <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#92400e' }}>
                {getHoliday(selectedDay) || 'Final de Semana'}
              </div>
              <p className="text-muted" style={{ marginTop: '0.5rem' }}>Sem aulas previstas para este dia.</p>
            </div>
          ) : students.length === 0 ? (
            <p className="text-center text-muted">Nenhum aluno encontrado para esta turma.</p>
          ) : (
            students.map(student => {
              const dateKey = `${year}-${String(selectedMonth + 1).padStart(2, '0')}-${String(selectedDay).padStart(2, '0')}`;
              const status = attendanceData[student.id]?.[dateKey] || '';
              return (
                <div key={student.id} style={{ 
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', 
                  padding: '1rem', backgroundColor: 'var(--color-bg)', borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--color-border)'
                }}>
                  <span style={{ fontWeight: 600 }}>{student.name}</span>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => toggleStatus(student.id, selectedDay)}
                      style={{ 
                        padding: '0.5rem 1rem', borderRadius: 'var(--radius-sm)', border: '1px solid #C6EFCE',
                        backgroundColor: status === 'P' ? '#C6EFCE' : 'white',
                        fontWeight: 700, color: status === 'P' ? '#166534' : '#666'
                      }}
                    >P</button>
                    <button 
                      onClick={() => toggleStatus(student.id, selectedDay)}
                      style={{ 
                        padding: '0.5rem 1rem', borderRadius: 'var(--radius-sm)', border: '1px solid #FFC7CE',
                        backgroundColor: status === 'F' ? '#FFC7CE' : 'white',
                        fontWeight: 700, color: status === 'F' ? '#991b1b' : '#666'
                      }}
                    >F</button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Desktop View: Full Grid */}
        <div className="desktop-grid" style={{ overflowX: 'auto' }}>
          {students.length === 0 ? (
            <p className="text-center text-muted p-8">Nenhum aluno encontrado para esta turma.</p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', padding: '1rem', borderBottom: '2px solid var(--color-border)', position: 'sticky', left: 0, backgroundColor: 'var(--color-surface)', zIndex: 10 }}>Aluno</th>
                  {days.map(day => {
                    const holiday = getHoliday(day);
                    const weekend = isWeekend(day);
                    return (
                      <th key={day} title={holiday} style={{ 
                        padding: '0.5rem', borderBottom: '2px solid var(--color-border)', minWidth: '35px',
                        backgroundColor: holiday ? '#fef3c7' : weekend ? '#f3f4f6' : 'transparent',
                        color: holiday ? '#92400e' : 'inherit'
                      }}>{day}</th>
                    );
                  })}
                  <th style={{ padding: '0.5rem', borderBottom: '2px solid var(--color-border)', backgroundColor: '#f0fdf4', color: '#166534', minWidth: '45px' }}>P</th>
                  <th style={{ padding: '0.5rem', borderBottom: '2px solid var(--color-border)', backgroundColor: '#fef2f2', color: '#991b1b', minWidth: '45px' }}>F</th>
                  <th style={{ padding: '0.5rem', borderBottom: '2px solid var(--color-border)', backgroundColor: '#eff6ff', color: '#1e40af', minWidth: '60px' }}>%</th>
                </tr>
              </thead>
              <tbody>
                {students.map(student => {
                  let totalFaltas = 0;
                  let totalPresencas = 0;
                  let totalDiasUteis = 0;
                  
                  days.forEach(day => {
                    if (!isWeekend(day) && !getHoliday(day)) totalDiasUteis++;
                  });

                  return (
                    <tr key={student.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                      <td style={{ padding: '0.75rem 1rem', fontWeight: 600, position: 'sticky', left: 0, backgroundColor: 'var(--color-surface)', zIndex: 9, borderRight: '1px solid var(--color-border)' }}>
                        {student.name}
                      </td>
                      {days.map(day => {
                        const dateKey = `${year}-${String(selectedMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                        const status = attendanceData[student.id]?.[dateKey] || '';
                        const holiday = getHoliday(day);
                        const weekend = isWeekend(day);
                        if (status === 'F') totalFaltas++;
                        if (status === 'P') totalPresencas++;
                        
                        return (
                          <td 
                            key={day} 
                            onClick={() => !(holiday || weekend) && toggleStatus(student.id, day)}
                            title={holiday}
                            style={{ 
                              textAlign: 'center', cursor: (holiday || weekend) ? 'not-allowed' : 'pointer',
                              backgroundColor: holiday ? '#fef3c7' : weekend ? '#f9fafb' : status === 'P' ? '#C6EFCE' : status === 'F' ? '#FFC7CE' : 'transparent',
                              opacity: (holiday || weekend) ? 0.6 : 1, fontSize: '0.7rem'
                            }}
                          >{holiday ? 'FER' : weekend ? '-' : status}</td>
                        );
                      })}
                      <td style={{ textAlign: 'center', fontWeight: 700, color: '#166534', backgroundColor: '#f0fdf4' }}>{totalPresencas > 0 ? totalPresencas : ''}</td>
                      <td style={{ textAlign: 'center', fontWeight: 700, color: '#991b1b', backgroundColor: '#fef2f2' }}>{totalFaltas > 0 ? totalFaltas : ''}</td>
                      <td style={{ textAlign: 'center', fontWeight: 800, color: '#1e40af', backgroundColor: '#eff6ff' }}>
                        {totalDiasUteis > 0 ? `${Math.round(((totalDiasUteis - totalFaltas) / totalDiasUteis) * 100)}%` : '---'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

