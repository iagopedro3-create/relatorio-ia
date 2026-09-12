import { useState, useMemo } from 'react';
import { Printer, BookOpen, Users, FileText } from 'lucide-react';
import { useSchool } from '../contexts/SchoolContext';
import { useAsync } from '../lib/useAsync';
import { listClassRoster, listAttendance, listLessons, listEvents } from '../data';
import { MONTHS } from '../lib/format';
import { periodMonths, periodRange, periodIndexForDate } from '../lib/periods';
import { PRODUCT_NAME } from '../lib/branding';
import { EmptyState, PageHeader, SkeletonCard } from '../components/ui';


export function ClassDiary() {
  const { school, classes, staff, grading, selectedYear } = useSchool();
  const [chosenClassId, setSelectedClassId] = useState('');
  const [periodIdx, setPeriodIdx] = useState(() => periodIndexForDate(selectedYear, grading.periods.length));
  const year = selectedYear ? parseInt(selectedYear.label, 10) || new Date().getFullYear() : new Date().getFullYear();
  const selectedClassId = classes.some(c => c.id === chosenClassId) ? chosenClassId : (classes[0]?.id ?? '');

  const currentClass = classes.find(c => c.id === selectedClassId);
  const teacher = staff.find(u => u.id === currentClass?.homeroom_teacher_id);
  const months = periodMonths(selectedYear, grading.periods.length, periodIdx);
  const pad = (n: number) => String(n).padStart(2, '0');
  const { start: from, end: to } = periodRange(selectedYear, grading.periods.length, periodIdx);

  const rosterQ = useAsync(() => selectedClassId ? listClassRoster(selectedClassId) : Promise.resolve([]), [selectedClassId], []);
  const enrollmentIds = useMemo(() => rosterQ.data.map(r => r.enrollment.id), [rosterQ.data]);
  const attQ = useAsync(() => listAttendance(enrollmentIds, from, to), [enrollmentIds.join(','), from, to], []);
  const lessonsQ = useAsync(() => selectedClassId ? listLessons(selectedClassId) : Promise.resolve([]), [selectedClassId], []);
  const eventsQ = useAsync(() => school ? listEvents(school.id) : Promise.resolve([]), [school?.id], []);

  const holidays = useMemo(() => {
    const map: Record<string, string> = {};
    for (const e of eventsQ.data) if (e.type === 'feriado') map[e.date] = e.title;
    return map;
  }, [eventsQ.data]);

  const attMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const r of attQ.data) m.set(`${r.enrollment_id}|${r.date}`, r.status);
    return m;
  }, [attQ.data]);

  const relevantLessons = useMemo(
    () => lessonsQ.data.filter(l => l.date >= from && l.date <= to).sort((a, b) => a.date.localeCompare(b.date)),
    [lessonsQ.data, from, to],
  );

  const subjectName = (id: string) => grading.subjects.find(s => s.id === id)?.name ?? (id === 'vivencias' ? 'Vivências' : id);
  const isWeekend = (m: number, d: number) => { const dow = new Date(year, m, d).getDay(); return dow === 0 || dow === 6; };

  return (
    <div className="diary-generator">
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .page-break { page-break-before: always; }
          body { background-color: white !important; padding: 0 !important; }
          main { margin: 0 !important; padding: 0 !important; }
          .card { border: none !important; box-shadow: none !important; padding: 0 !important; }
          .diary-print-container { padding: 0 !important; width: 100% !important; }
          table { font-size: 10px !important; }
          th, td { padding: 4px !important; }
          @page { size: landscape; margin: 1cm; }
        }
        .attendance-table th, .attendance-table td { border: 1px solid #ddd; text-align: center; min-width: 20px; }
        .attendance-table th:first-child, .attendance-table td:first-child { text-align: left; padding-left: 8px; min-width: 150px; }
        .lesson-log-table { width: 100%; border-collapse: collapse; margin-top: 1rem; }
        .lesson-log-table th, .lesson-log-table td { border: 1px solid #333; padding: 8px; text-align: left; font-size: 12px; }
        .lesson-log-table th { background-color: var(--color-surface-2); }
      `}</style>

      <div className="no-print">
        <PageHeader
          icon={<BookOpen size={22} />}
          title="Diário de classe"
          subtitle="Frequência mensal e registro de conteúdos, prontos para imprimir em paisagem."
          actions={<button onClick={() => window.print()} className="btn btn-primary" disabled={!currentClass || rosterQ.loading}><Printer size={18} /> Imprimir diário</button>}
        />
      </div>
      <div className="no-print card mb-6">
        <div className="grid grid-cols-2 gap-4">
          <div className="form-group">
            <label>Turma</label>
            <select value={selectedClassId} onChange={e => setSelectedClassId(e.target.value)}>
              {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>Período</label>
            <select value={periodIdx} onChange={e => setPeriodIdx(Number(e.target.value))}>
              {grading.periods.map((p, i) => <option key={p} value={i}>{p}</option>)}
            </select>
          </div>
        </div>
        <div className="callout callout-info mt-2">
          <FileText size={18} />
          <span>Feriados cadastrados na Agenda aparecem marcados; fins de semana ficam em cinza.</span>
        </div>
      </div>

      {!currentClass && !rosterQ.loading && <div className="card no-print"><EmptyState icon={<BookOpen size={36} />} title="Nenhuma turma disponível" description="Cadastre turmas no ano letivo para gerar o diário." /></div>}
      {currentClass && rosterQ.loading && <div className="no-print"><SkeletonCard lines={10} /></div>}
      {currentClass && !rosterQ.loading && (
        <div className="diary-print-container bg-white p-8 rounded-lg shadow-sm border border-slate-200">
          <div className="text-center mb-8 border-b-2 border-black pb-4">
            <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 800, color: '#000' }}>{(school?.legal_name || school?.name || '').toUpperCase()}</h1>
            <p style={{ margin: '5px 0', fontSize: '14px', fontWeight: 600 }}>DIÁRIO ESCOLAR - {year}</p>
            <div className="flex justify-center gap-8 mt-4">
              <div className="text-left">
                <p style={{ margin: 0, fontSize: '12px' }}><strong>TURMA:</strong> {currentClass.name}</p>
                <p style={{ margin: 0, fontSize: '12px' }}><strong>NÍVEL:</strong> {currentClass.level === 'infantil' ? 'EDUCAÇÃO INFANTIL' : 'ENSINO FUNDAMENTAL'}</p>
              </div>
              <div className="text-left">
                <p style={{ margin: 0, fontSize: '12px' }}><strong>PROFESSOR(A):</strong> {teacher?.name ?? 'Não atribuído'}</p>
                <p style={{ margin: 0, fontSize: '12px' }}><strong>PERÍODO:</strong> {grading.periods[periodIdx]}</p>
              </div>
            </div>
          </div>

          <div className="mb-12">
            <h3 className="flex items-center gap-2 mb-4 border-b border-gray-300 pb-2"><Users size={18} /> Controle de Frequência</h3>
            {months.map((monthIdx, mIdx) => {
              const daysInMonth = new Date(year, monthIdx + 1, 0).getDate();
              const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
              return (
                <div key={monthIdx} className={mIdx > 0 ? 'mt-8' : ''}>
                  <h4 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '8px', color: '#333' }}>Mês: {MONTHS[monthIdx]}</h4>
                  <div style={{ overflowX: 'auto' }}>
                    <table className="attendance-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ backgroundColor: 'var(--color-surface-2)' }}>
                          <th style={{ width: '200px' }}>Alunos</th>
                          {days.map(d => {
                            const key = `${year}-${pad(monthIdx + 1)}-${pad(d)}`;
                            const holiday = holidays[key];
                            const weekend = isWeekend(monthIdx, d);
                            return <th key={d} style={{ backgroundColor: holiday ? 'var(--color-warning-soft)' : weekend ? 'var(--color-surface-2)' : 'transparent', fontSize: '9px' }}>{d}</th>;
                          })}
                        </tr>
                      </thead>
                      <tbody>
                        {rosterQ.data.map(({ enrollment, student }) => (
                          <tr key={enrollment.id}>
                            <td style={{ fontWeight: 600, fontSize: '11px' }}>{student.name}</td>
                            {days.map(d => {
                              const key = `${year}-${pad(monthIdx + 1)}-${pad(d)}`;
                              const holiday = holidays[key];
                              const weekend = isWeekend(monthIdx, d);
                              const status = attMap.get(`${enrollment.id}|${key}`) ?? '.';
                              return (
                                <td key={d} style={{ backgroundColor: holiday ? 'var(--color-warning-soft)' : weekend ? 'var(--color-surface-2)' : 'transparent', color: holiday ? 'var(--color-warning-text)' : status === 'F' ? 'var(--color-danger-text)' : 'inherit', fontSize: '10px', fontWeight: status !== '.' ? 700 : 400 }}>
                                  {holiday ? 'FER' : weekend ? '-' : status}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                        {rosterQ.data.length === 0 && <tr><td colSpan={daysInMonth + 1} style={{ padding: '1rem', color: 'var(--color-text-subtle)' }}>Nenhum aluno matriculado.</td></tr>}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="page-break"></div>

          <div className="mt-8">
            <h3 className="flex items-center gap-2 mb-4 border-b border-gray-300 pb-2"><BookOpen size={18} /> Registro de Conteúdos e Atividades</h3>
            <table className="lesson-log-table">
              <thead>
                <tr>
                  <th style={{ width: '80px' }}>Data</th>
                  <th style={{ width: '150px' }}>Disciplina</th>
                  <th>Conteúdo Ministrado</th>
                  <th style={{ width: '150px' }}>Observações</th>
                </tr>
              </thead>
              <tbody>
                {relevantLessons.map(lesson => (
                  <tr key={lesson.id}>
                    <td style={{ fontWeight: 700 }}>{new Date(lesson.date + 'T00:00:00').toLocaleDateString('pt-BR')}</td>
                    <td style={{ fontWeight: 600, color: 'var(--color-primary)' }}>{subjectName(lesson.subject_id)}</td>
                    <td>{lesson.content}</td>
                    <td style={{ fontSize: '11px', color: '#666' }}>{lesson.observations || '-'}</td>
                  </tr>
                ))}
                {relevantLessons.length === 0 && <tr><td colSpan={4} style={{ color: 'var(--color-text-subtle)' }}>Nenhum conteúdo registrado neste período.</td></tr>}
              </tbody>
            </table>
          </div>

          <div className="mt-16 grid grid-cols-2 gap-12">
            <div className="text-center">
              <div style={{ borderTop: '1px solid black', width: '250px', margin: '0 auto', paddingTop: '5px' }}>
                <p style={{ margin: 0, fontSize: '12px', fontWeight: 700 }}>Professor(a)</p>
                <p style={{ margin: 0, fontSize: '10px', color: '#666' }}>{teacher?.name ?? ''}</p>
              </div>
            </div>
            <div className="text-center">
              <div style={{ borderTop: '1px solid black', width: '250px', margin: '0 auto', paddingTop: '5px' }}>
                <p style={{ margin: 0, fontSize: '12px', fontWeight: 700 }}>Coordenação / Direção</p>
                <p style={{ margin: 0, fontSize: '10px', color: '#666' }}>{school?.name}</p>
              </div>
            </div>
          </div>

          <div className="mt-12 text-right text-xs text-gray-400">
            Documento gerado em {new Date().toLocaleString('pt-BR')} via {PRODUCT_NAME}
          </div>
        </div>
      )}
    </div>
  );
}
