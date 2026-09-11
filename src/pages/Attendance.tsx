import { useState, useMemo } from 'react';
import { Save, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';
import { useSchool } from '../contexts/SchoolContext';
import { useAsync } from '../lib/useAsync';
import { listClassRoster, listAttendance, saveAttendance, listEvents } from '../data';
import type { AttendanceStatus } from '../types/db';
import { MONTHS } from '../lib/format';


type Cell = AttendanceStatus | '';

export function Attendance() {
  const { user } = useAuth();
  const { school, classes, selectedYear } = useSchool();
  const year = selectedYear ? parseInt(selectedYear.label, 10) || new Date().getFullYear() : new Date().getFullYear();
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [chosenClassId, setChosenClassId] = useState<string>('');
  const [edits, setEdits] = useState<Record<string, Record<string, Cell>>>({}); // enrollmentId -> date -> status
  const [selectedDay, setSelectedDay] = useState(new Date().getDate());
  const [saving, setSaving] = useState(false);

  // Turma selecionada cai na primeira disponível se a escolhida sumir (troca de ano, RLS).
  const selectedClassId = classes.some(c => c.id === chosenClassId) ? chosenClassId : (classes[0]?.id ?? '');
  const selectClass = (id: string) => { setChosenClassId(id); setEdits({}); };
  const selectMonth = (m: number) => { setSelectedMonth(m); setEdits({}); };

  const currentClass = classes.find(c => c.id === selectedClassId);
  const daysInMonth = new Date(year, selectedMonth + 1, 0).getDate();
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const from = `${year}-${String(selectedMonth + 1).padStart(2, '0')}-01`;
  const to = `${year}-${String(selectedMonth + 1).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`;
  const dateKey = (day: number) => `${year}-${String(selectedMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

  const rosterQ = useAsync(() => selectedClassId ? listClassRoster(selectedClassId) : Promise.resolve([]), [selectedClassId], []);
  const enrollmentIds = useMemo(() => rosterQ.data.map(r => r.enrollment.id), [rosterQ.data]);
  const recordsQ = useAsync(() => listAttendance(enrollmentIds, from, to), [enrollmentIds.join(','), from, to], []);
  const eventsQ = useAsync(() => school ? listEvents(school.id) : Promise.resolve([]), [school?.id], []);

  // Feriados vêm da agenda da escola (tipo 'feriado'), não de tabela chumbada.
  const holidays = useMemo(() => {
    const map: Record<string, string> = {};
    for (const e of eventsQ.data) if (e.type === 'feriado') map[e.date] = e.title;
    return map;
  }, [eventsQ.data]);

  const saved = useMemo(() => {
    const map: Record<string, Record<string, Cell>> = {};
    for (const r of recordsQ.data) {
      map[r.enrollment_id] = map[r.enrollment_id] ?? {};
      map[r.enrollment_id][r.date] = r.status;
    }
    return map;
  }, [recordsQ.data]);

  const statusOf = (enrollmentId: string, day: number): Cell => {
    const key = dateKey(day);
    const edited = edits[enrollmentId]?.[key];
    if (edited !== undefined) return edited;
    return saved[enrollmentId]?.[key] ?? '';
  };

  const isWeekend = (day: number) => {
    const dow = new Date(year, selectedMonth, day).getDay();
    return dow === 0 || dow === 6;
  };
  const getHoliday = (day: number) => holidays[dateKey(day)];

  const toggleStatus = (enrollmentId: string, day: number, target?: AttendanceStatus) => {
    const current = statusOf(enrollmentId, day);
    let next: Cell;
    if (target !== undefined) next = current === target ? '' : target;
    else next = current === '' ? 'P' : current === 'P' ? 'F' : '';
    setEdits(prev => ({ ...prev, [enrollmentId]: { ...(prev[enrollmentId] ?? {}), [dateKey(day)]: next } }));
  };

  const dirtyCount = Object.values(edits).reduce((n, m) => n + Object.keys(m).length, 0);

  const handleSave = async () => {
    if (!school || !user) return;
    const upserts: { enrollment_id: string; date: string; status: AttendanceStatus }[] = [];
    const deletes: { enrollment_id: string; date: string }[] = [];
    for (const [enrollment_id, byDate] of Object.entries(edits)) {
      for (const [date, status] of Object.entries(byDate)) {
        if (saved[enrollment_id]?.[date] === status) continue;
        if (status === '') { if (saved[enrollment_id]?.[date]) deletes.push({ enrollment_id, date }); }
        else upserts.push({ enrollment_id, date, status });
      }
    }
    if (upserts.length === 0 && deletes.length === 0) { toast.info('Nada para salvar.'); return; }
    setSaving(true);
    try {
      await saveAttendance(school.id, user.id, upserts, deletes);
      await recordsQ.reload();
      setEdits({});
      toast.success('Frequência salva.');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Falha ao salvar.');
    } finally {
      setSaving(false);
    }
  };

  const students = rosterQ.data;

  const mobileDaySelector = (
    <div className="mobile-only" style={{ display: 'none', marginBottom: '1rem' }}>
      <div className="flex items-center justify-between bg-white p-3 rounded-lg border border-slate-200">
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
        .desktop-grid::-webkit-scrollbar { height: 8px; }
        .desktop-grid::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
      `}</style>

      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 style={{ margin: 0 }}>Frequência</h2>
          <p className="text-muted no-mobile">Turma: {currentClass?.name ?? '—'} · {year}</p>
        </div>
        <button onClick={() => void handleSave()} className="btn btn-primary" disabled={saving || dirtyCount === 0}>
          <Save size={20} /> <span className="no-mobile">Salvar{dirtyCount > 0 ? ` (${dirtyCount})` : ''}</span>
        </button>
      </div>

      <div className="card mb-6" style={{ padding: '1.5rem', display: 'flex', gap: '1.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
        {classes.length > 1 && (
          <div className="flex items-center gap-2">
            <label style={{ margin: 0, fontWeight: 700, whiteSpace: 'nowrap' }}>Turma:</label>
            <select value={selectedClassId} onChange={e => selectClass(e.target.value)} style={{ width: '220px' }}>
              {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        )}
        <div className="flex items-center gap-2">
          <label style={{ margin: 0, fontWeight: 700, whiteSpace: 'nowrap' }}>Mês:</label>
          <div className="flex items-center gap-2">
            <button onClick={() => selectMonth(Math.max(0, selectedMonth - 1))} className="btn btn-secondary" style={{ padding: '0.5rem' }}><ChevronLeft size={20} /></button>
            <span style={{ fontWeight: 700, minWidth: '100px', textAlign: 'center' }}>{MONTHS[selectedMonth]}</span>
            <button onClick={() => selectMonth(Math.min(11, selectedMonth + 1))} className="btn btn-secondary" style={{ padding: '0.5rem' }}><ChevronRight size={20} /></button>
          </div>
        </div>
      </div>

      {classes.length === 0 && (
        <div className="card text-center p-12"><p className="text-muted">Você não tem turma vinculada neste ano letivo.</p></div>
      )}

      {classes.length > 0 && (
        <div className="card attendance-card" style={{ padding: '1.5rem' }}>
          <div className="flex items-center gap-4 mb-6">
            <div className="flex gap-4 ml-auto no-mobile">
              <div className="flex items-center gap-2"><div style={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: '#fef3c7' }}></div><span style={{ fontSize: '0.8rem' }}>Feriado</span></div>
              <div className="flex items-center gap-2"><div style={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: '#C6EFCE' }}></div><span style={{ fontSize: '0.8rem' }}>P</span></div>
              <div className="flex items-center gap-2"><div style={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: '#FFC7CE' }}></div><span style={{ fontSize: '0.8rem' }}>F</span></div>
            </div>
          </div>

          {mobileDaySelector}

          <div className="mobile-list" style={{ display: 'none' }}>
            {getHoliday(selectedDay) || isWeekend(selectedDay) ? (
              <div style={{ padding: '2rem', textAlign: 'center', backgroundColor: '#f9fafb', borderRadius: 'var(--radius-md)', border: '1px dashed #ddd' }}>
                <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#92400e' }}>{getHoliday(selectedDay) || 'Final de Semana'}</div>
                <p className="text-muted" style={{ marginTop: '0.5rem' }}>Sem aulas previstas para este dia.</p>
              </div>
            ) : students.length === 0 ? (
              <p className="text-center text-muted">Nenhum aluno matriculado nesta turma.</p>
            ) : (
              students.map(({ enrollment, student }) => {
                const status = statusOf(enrollment.id, selectedDay);
                return (
                  <div key={enrollment.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem', backgroundColor: 'var(--color-bg)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
                    <span style={{ fontWeight: 600 }}>{student.name}</span>
                    <div className="flex gap-2">
                      <button onClick={() => toggleStatus(enrollment.id, selectedDay, 'P')} style={{ padding: '0.5rem 1.5rem', borderRadius: 'var(--radius-sm)', border: '2px solid #C6EFCE', backgroundColor: status === 'P' ? '#C6EFCE' : 'white', fontWeight: 800, color: status === 'P' ? '#166534' : '#666' }}>P</button>
                      <button onClick={() => toggleStatus(enrollment.id, selectedDay, 'F')} style={{ padding: '0.5rem 1.5rem', borderRadius: 'var(--radius-sm)', border: '2px solid #FFC7CE', backgroundColor: status === 'F' ? '#FFC7CE' : 'white', fontWeight: 800, color: status === 'F' ? '#991b1b' : '#666' }}>F</button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="desktop-grid" style={{ overflowX: 'auto' }}>
            {rosterQ.loading ? (
              <p className="text-center text-muted p-8">Carregando...</p>
            ) : students.length === 0 ? (
              <p className="text-center text-muted p-8">Nenhum aluno matriculado nesta turma.</p>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left', padding: '0.75rem 1rem', borderBottom: '2px solid var(--color-border)', position: 'sticky', left: 0, backgroundColor: 'var(--color-surface)', zIndex: 10, minWidth: '150px', whiteSpace: 'nowrap', boxShadow: '2px 0 5px rgba(0,0,0,0.05)' }}>Aluno</th>
                    {days.map(day => {
                      const holiday = getHoliday(day);
                      const weekend = isWeekend(day);
                      return (
                        <th key={day} title={holiday} style={{ padding: '0.25rem', borderBottom: '2px solid var(--color-border)', minWidth: '30px', backgroundColor: holiday ? '#fef3c7' : weekend ? '#f3f4f6' : 'transparent', color: holiday ? '#92400e' : 'inherit', fontSize: '0.75rem' }}>{day}</th>
                      );
                    })}
                    <th style={{ padding: '0.25rem', borderBottom: '2px solid var(--color-border)', backgroundColor: '#f0fdf4', color: '#166534', minWidth: '35px' }}>P</th>
                    <th style={{ padding: '0.25rem', borderBottom: '2px solid var(--color-border)', backgroundColor: '#fef2f2', color: '#991b1b', minWidth: '35px' }}>F</th>
                    <th style={{ padding: '0.25rem', borderBottom: '2px solid var(--color-border)', backgroundColor: '#eff6ff', color: '#1e40af', minWidth: '45px' }}>%</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map(({ enrollment, student }) => {
                    let faltas = 0;
                    let presencas = 0;
                    days.forEach(day => {
                      const s = statusOf(enrollment.id, day);
                      if (s === 'F') faltas++;
                      if (s === 'P') presencas++;
                    });
                    const registrados = faltas + presencas;
                    return (
                      <tr key={enrollment.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                        <td style={{ padding: '0.5rem 1rem', fontWeight: 600, position: 'sticky', left: 0, backgroundColor: 'var(--color-surface)', zIndex: 9, borderRight: '1px solid var(--color-border)', boxShadow: '2px 0 5px rgba(0,0,0,0.05)', whiteSpace: 'nowrap' }}>
                          {student.name}
                        </td>
                        {days.map(day => {
                          const status = statusOf(enrollment.id, day);
                          const holiday = getHoliday(day);
                          const weekend = isWeekend(day);
                          const blocked = Boolean(holiday || weekend);
                          return (
                            <td
                              key={day}
                              onClick={() => !blocked && toggleStatus(enrollment.id, day)}
                              title={holiday}
                              style={{ textAlign: 'center', cursor: blocked ? 'not-allowed' : 'pointer', backgroundColor: holiday ? '#fef3c7' : weekend ? '#f9fafb' : status === 'P' ? '#C6EFCE' : status === 'F' ? '#FFC7CE' : 'transparent', opacity: blocked ? 0.6 : 1, fontSize: '0.65rem', borderLeft: '1px solid #f1f5f9', height: '32px' }}
                            >{holiday ? 'FER' : weekend ? '-' : status}</td>
                          );
                        })}
                        <td style={{ textAlign: 'center', fontWeight: 700, color: '#166534', backgroundColor: '#f0fdf4', borderLeft: '1px solid #C6EFCE' }}>{presencas || ''}</td>
                        <td style={{ textAlign: 'center', fontWeight: 700, color: '#991b1b', backgroundColor: '#fef2f2', borderLeft: '1px solid #FFC7CE' }}>{faltas || ''}</td>
                        <td style={{ textAlign: 'center', fontWeight: 800, color: '#1e40af', backgroundColor: '#eff6ff', borderLeft: '1px solid #bfdbfe' }}>
                          {registrados > 0 ? `${Math.round((presencas / registrados) * 100)}%` : '---'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
