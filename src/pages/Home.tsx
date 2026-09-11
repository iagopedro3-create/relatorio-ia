import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Users, TrendingUp, AlertCircle, FileCheck, BookOpenCheck, MessageSquare, Bell, Heart, Clock, FileText, Printer } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';
import { useSchool } from '../contexts/SchoolContext';
import { useAsync } from '../lib/useAsync';
import { listEnrollments, listStudents, listDocuments, updateDocument, listMessages, listEvents, listAttendanceOfEnrollments } from '../data';
import { attendanceRate } from '../lib/gradeEngine';
import { Management } from './Management';
import { CATEGORY_LABELS, EVENT_TYPES } from '../store/agendaMeta';
import { PrintPreview } from '../components/PrintPreview';
import { renderMarkdown } from '../lib/markdown';
import type { Student, StudentDocument } from '../types/db';

export function Home() {
  const { user } = useAuth();
  const { school, classes, staff, years, selectedYear, setYear, grading, hasFeature } = useSchool();
  const [selectedPeriod, setSelectedPeriod] = useState(grading.periods[0]);

  const reportClasses = useMemo(() => classes.filter(c => c.evaluation_type === 'report'), [classes]);
  const reportClassIds = useMemo(() => reportClasses.map(c => c.id), [reportClasses]);
  const enrollQ = useAsync(() => listEnrollments(reportClassIds), [reportClassIds.join(',')], []);
  const studentsQ = useAsync(() => school ? listStudents(school.id) : Promise.resolve([] as Student[]), [school?.id], [] as Student[]);
  const docsQ = useAsync(() => (school && selectedYear) ? listDocuments({ schoolId: school.id, yearId: selectedYear.id, kind: 'report' }) : Promise.resolve([]), [school?.id, selectedYear?.id], []);

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
    <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', backgroundColor: 'var(--color-surface)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', flexWrap: 'wrap', alignItems: 'center' }}>
      <div className="flex items-center gap-2">
        <Calendar size={18} color="var(--color-primary)" />
        <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>Ano Letivo:</span>
      </div>
      {user?.role !== 'teacher' ? (
        <select value={selectedYear?.id ?? ''} onChange={(e) => setYear(e.target.value)} style={{ padding: '0.4rem', width: '150px' }}>
          {years.map(y => <option key={y.id} value={y.id}>{y.label}</option>)}
        </select>
      ) : (
        <div style={{ padding: '0.4rem 1rem', backgroundColor: 'var(--color-bg)', borderRadius: 'var(--radius-sm)', fontSize: '0.9rem', fontWeight: 600 }}>{selectedYear?.label}</div>
      )}
      <span style={{ fontWeight: 600, fontSize: '0.9rem', marginLeft: '1rem' }}>Período:</span>
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
    return (
      <div>
        <h2 className="mb-6">Olá, {user.name}!</h2>
        {periodSelector}
        <div className="grid grid-cols-3">
          <div className="card" style={{ borderLeft: '4px solid var(--color-primary)' }}>
            <div className="flex justify-between items-start">
              <div>
                <p className="text-muted" style={{ fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase' }}>Minhas turmas</p>
                <h3 style={{ margin: '0.25rem 0', fontSize: '1.3rem' }}>{classes.map(c => c.name).join(', ') || 'Sem turma este ano'}</h3>
              </div>
              <Users color="var(--color-primary)" />
            </div>
          </div>
          <div className="card" style={{ borderLeft: '4px solid var(--color-secondary)' }}>
            <div className="flex justify-between items-start">
              <div>
                <p className="text-muted" style={{ fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase' }}>Alunos (relatório)</p>
                <h3 style={{ margin: '0.25rem 0', fontSize: '1.5rem' }}>{myStudentsCount}</h3>
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
            <h3>Sua Meta: {selectedPeriod} / {selectedYear?.label}</h3>
            <p>Você concluiu {myDone} de {myStudentsCount} relatórios.</p>
            <div style={{ width: '100%', height: '12px', backgroundColor: 'var(--color-bg)', borderRadius: '6px', marginTop: '1rem', overflow: 'hidden' }}>
              <div style={{ width: `${myPercent}%`, height: '100%', backgroundColor: 'var(--color-success)', transition: 'width 0.5s ease' }}></div>
            </div>
            {reportClasses.length === 0 && <p className="text-muted mt-4" style={{ fontSize: '0.85rem' }}>Suas turmas usam notas numéricas — veja Lançar Notas.</p>}
          </div>
          <div className="card">
            <h3 className="flex items-center gap-2" style={{ color: 'var(--color-secondary)' }}><AlertCircle size={20} /> Alunos Pendentes</h3>
            <p className="text-muted mb-4">Relatórios que ainda precisam ser gerados:</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {myPending.map(s => <div key={s.id} style={{ padding: '0.75rem', backgroundColor: 'var(--color-bg)', borderRadius: 'var(--radius-sm)', fontWeight: 500, fontSize: '0.9rem' }}>• {s.name}</div>)}
              {myPending.length === 0 && <p style={{ fontWeight: 600, color: '#166534' }}>🎉 Tudo em dia para este período!</p>}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (user?.role === 'guardian') return <GuardianHome />;

  return (
    <div>
      <Management />

      <div style={{ marginTop: '3rem', borderTop: '1px solid var(--color-border)', paddingTop: '2rem' }}>
        <div className="flex justify-between items-center mb-6" style={{ flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h2 style={{ margin: 0 }}>Acompanhamento Pedagógico</h2>
            <p className="text-muted">Status dos relatórios descritivos por turma</p>
          </div>
          {periodSelector}
        </div>

        <div className="card mt-6" style={{ padding: 0 }}>
          <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><BookOpenCheck size={20} color="var(--color-primary)" /> Relatórios para Revisão</h3>
            <span className="text-muted" style={{ fontSize: '0.85rem' }}>{periodDocs.filter(r => r.status === 'submitted').length} aguardando visto</span>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ textAlign: 'left', borderBottom: '1px solid #e2e8f0', backgroundColor: '#f8fafc' }}>
                  <th style={{ padding: '1rem 1.5rem', fontSize: '0.75rem', textTransform: 'uppercase', color: '#64748b' }}>Aluno</th>
                  <th style={{ padding: '1rem', fontSize: '0.75rem', textTransform: 'uppercase', color: '#64748b' }}>Professor</th>
                  <th style={{ padding: '1rem', fontSize: '0.75rem', textTransform: 'uppercase', color: '#64748b' }}>Status</th>
                  <th style={{ padding: '1rem 1.5rem', textAlign: 'right', fontSize: '0.75rem', textTransform: 'uppercase', color: '#64748b' }}>Ação</th>
                </tr>
              </thead>
              <tbody>
                {periodDocs.filter(r => r.status !== 'draft').map(r => (
                  <tr key={r.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '0.75rem 1.5rem' }}>
                      <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{studentsQ.data.find(s => s.id === r.student_id)?.name ?? '—'}</div>
                      <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{classes.find(c => c.id === r.class_id)?.name}</div>
                    </td>
                    <td style={{ padding: '0.75rem 1rem', fontSize: '0.85rem' }}>{staff.find(u => u.id === r.author_id)?.name ?? '—'}</td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <span style={{ padding: '0.2rem 0.6rem', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 700, backgroundColor: r.status === 'approved' ? '#dcfce7' : '#fff7ed', color: r.status === 'approved' ? '#166534' : '#c2410c' }}>
                        {r.status === 'approved' ? 'APROVADO' : r.status === 'returned' ? 'DEVOLVIDO' : 'SUBMETIDO'}
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem 1.5rem', textAlign: 'right' }}>
                      {r.status !== 'approved' ? (
                        <button className="btn btn-primary" style={{ padding: '0.3rem 0.75rem', fontSize: '0.75rem', boxShadow: 'none' }} onClick={() => void approve(r)}>Dar OK</button>
                      ) : (
                        <span style={{ color: '#10b981', display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem', fontWeight: 600 }}><BookOpenCheck size={16} /> Visto</span>
                      )}
                    </td>
                  </tr>
                ))}
                {periodDocs.filter(r => r.status !== 'draft').length === 0 && (
                  <tr><td colSpan={4} style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>Nenhum relatório submetido para este período.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="grid grid-cols-2 mt-6">
          <div className="card">
            <h3 className="mb-6">Relatórios por Turma — {selectedPeriod}</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {classProgress.map(c => (
                <div key={c.id}>
                  <div className="flex justify-between mb-2" style={{ fontSize: '0.9rem' }}>
                    <span style={{ fontWeight: 600 }}>{c.name}</span>
                    <span className="text-muted">{c.done} / {c.total} alunos</span>
                  </div>
                  <div style={{ width: '100%', height: '8px', backgroundColor: 'var(--color-bg)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ width: `${c.percent}%`, height: '100%', backgroundColor: c.percent === 100 ? 'var(--color-success)' : 'var(--color-primary)', transition: 'width 0.5s ease' }}></div>
                  </div>
                </div>
              ))}
              {classProgress.length === 0 && <p className="text-muted">Nenhuma turma avaliada por relatório neste ano.</p>}
            </div>
          </div>

          <div className="card" style={{ borderTop: '4px solid var(--color-secondary)' }}>
            <h3 className="flex items-center gap-2 mb-6" style={{ color: 'var(--color-secondary)' }}><AlertCircle size={20} /> Relatórios Pendentes</h3>
            <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
              {Object.entries(pendingGrouped).length > 0 ? (
                Object.entries(pendingGrouped).map(([className, students]) => (
                  <div key={className} style={{ marginBottom: '1.5rem' }}>
                    <h4 style={{ fontSize: '0.85rem', textTransform: 'uppercase', color: 'var(--color-primary)', borderBottom: '1px solid var(--color-bg)', paddingBottom: '0.25rem', marginBottom: '0.5rem' }}>{className}</h4>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                      {students.map(s => <span key={s.id} style={{ padding: '0.25rem 0.6rem', backgroundColor: 'var(--color-bg)', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem' }}>{s.name}</span>)}
                    </div>
                  </div>
                ))
              ) : (
                <div style={{ textAlign: 'center', padding: '2rem' }}>
                  <FileCheck size={48} color="var(--color-success)" style={{ opacity: 0.3, marginBottom: '1rem' }} />
                  <p style={{ fontWeight: 600, color: '#166534' }}>🎉 Tudo em dia para este período!</p>
                </div>
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
  const { school, classes } = useSchool();
  const studentsQ = useAsync(() => school ? listStudents(school.id) : Promise.resolve([] as Student[]), [school?.id], [] as Student[]);
  const student = studentsQ.data[0];
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

  const freq = attendanceRate(attQ.data);
  const myEvents = eventsQ.data.filter(e => e.date >= new Date().toISOString().slice(0, 10)).slice(0, 3);
  const myMessages = messagesQ.data.slice(0, 3);

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
        <div style={{ width: '64px', height: '64px', borderRadius: '50%', backgroundColor: 'var(--color-primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', fontWeight: 800 }}>
          {student?.name.charAt(0) ?? '?'}
        </div>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.75rem' }}>Olá, {user?.name}!</h2>
          <p className="text-muted">{student ? <>Acompanhando o desenvolvimento de <strong>{student.name}</strong>{studentClass ? ` • ${studentClass.name}` : ''}</> : 'Nenhum aluno vinculado ao seu acesso ainda.'}</p>
        </div>
      </div>

      <div className="grid grid-cols-3 mb-8">
        <div className="card" style={{ padding: '1.5rem', borderBottom: '4px solid #10b981' }}>
          <div className="flex justify-between items-start mb-2">
            <span className="text-muted" style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase' }}>Frequência</span>
            <FileCheck size={20} color="#10b981" />
          </div>
          <h3 style={{ margin: 0, fontSize: '1.5rem' }}>{freq === null ? '—' : `${freq.toFixed(0)}%`}</h3>
          <p style={{ margin: '0.25rem 0 0', fontSize: '0.8rem', color: '#10b981', fontWeight: 600 }}>{freq === null ? 'Sem registros ainda' : freq >= 90 ? 'Excelente presença' : 'Acompanhe as faltas'}</p>
        </div>
        <div className="card" style={{ padding: '1.5rem', borderBottom: '4px solid var(--color-primary)' }}>
          <div className="flex justify-between items-start mb-2">
            <span className="text-muted" style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase' }}>Próximo Evento</span>
            <Calendar size={20} color="var(--color-primary)" />
          </div>
          <h3 style={{ margin: 0, fontSize: '1.1rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{myEvents[0]?.title || 'Sem eventos'}</h3>
          <p style={{ margin: '0.25rem 0 0', fontSize: '0.8rem', color: 'var(--color-primary)', fontWeight: 600 }}>{myEvents[0] ? new Date(myEvents[0].date + 'T00:00:00').toLocaleDateString('pt-BR') : '-'}</p>
        </div>
        <div className="card" style={{ padding: '1.5rem', borderBottom: '4px solid var(--color-secondary)' }}>
          <div className="flex justify-between items-start mb-2">
            <span className="text-muted" style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase' }}>Comunicados</span>
            <BookOpenCheck size={20} color="var(--color-secondary)" />
          </div>
          <h3 style={{ margin: 0, fontSize: '1.5rem' }}>{messagesQ.data.length}</h3>
          <p style={{ margin: '0.25rem 0 0', fontSize: '0.8rem', color: 'var(--color-secondary)', fontWeight: 600 }}>na agenda</p>
        </div>
      </div>

      <div className="grid grid-cols-2">
        <div>
          <div className="flex justify-between items-center mb-4">
            <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}><MessageSquare size={20} color="var(--color-primary)" /> Últimos Comunicados</h3>
            <button onClick={() => navigate('/agenda')} style={{ background: 'none', border: 'none', color: 'var(--color-primary)', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer' }}>Ver tudo</button>
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
                      <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>{new Date(msg.created_at).toLocaleDateString('pt-BR')}</span>
                    </div>
                    <p style={{ margin: '0.25rem 0 0', fontSize: '0.85rem', color: '#64748b', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{msg.content}</p>
                  </div>
                </div>
              </div>
            ))}
            {myMessages.length === 0 && <p className="text-muted">Nenhum comunicado ainda.</p>}
          </div>
        </div>

        <div>
          <div className="flex justify-between items-center mb-4">
            <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Calendar size={20} color="var(--color-primary)" /> Calendário Escolar</h3>
            <button onClick={() => navigate('/agenda')} style={{ background: 'none', border: 'none', color: 'var(--color-primary)', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer' }}>Ver agenda</button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {myEvents.map(ev => (
              <div key={ev.id} className="card" style={{ padding: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ textAlign: 'center', paddingRight: '1rem', borderRight: '1px solid #e2e8f0', minWidth: '50px' }}>
                    <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--color-primary)' }}>{new Date(ev.date + 'T00:00:00').getDate()}</div>
                    <div style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', color: '#94a3b8' }}>{new Date(ev.date + 'T00:00:00').toLocaleString('pt-BR', { month: 'short' })}</div>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div className="flex items-center gap-2"><span>{EVENT_TYPES[ev.type]?.icon}</span><h4 style={{ margin: 0, fontSize: '0.95rem' }}>{ev.title}</h4></div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem' }}><Clock size={12} color="#94a3b8" /><span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{ev.time || 'Dia inteiro'}</span></div>
                  </div>
                </div>
              </div>
            ))}
            {myEvents.length === 0 && <p className="text-muted">Nenhum evento próximo.</p>}
          </div>

          <div className="mt-6">
            <h3 style={{ margin: '0 0 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><FileText size={20} color="var(--color-primary)" /> Relatórios e documentos</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {docsQ.data.map(d => (
                <div key={d.id} className="card" style={{ padding: '1rem' }}>
                  <div className="flex justify-between items-center" style={{ gap: '1rem', flexWrap: 'wrap' }}>
                    <div>
                      <h4 style={{ margin: 0, fontSize: '0.95rem' }}>{d.kind === 'pei' ? 'Plano Educacional Individualizado' : 'Relatório descritivo'}{d.period ? ` · ${d.period}` : ''}</h4>
                      <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Aprovado pela escola em {new Date(d.updated_at).toLocaleDateString('pt-BR')}</span>
                    </div>
                    <div className="flex gap-2">
                      <button className="btn btn-secondary" style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem' }} onClick={() => setOpenDoc(d)}><FileText size={14} /> Ler</button>
                      <button className="btn btn-primary" style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem' }} onClick={() => setPrintDoc(d)}><Printer size={14} /> Imprimir</button>
                    </div>
                  </div>
                </div>
              ))}
              {docsQ.data.length === 0 && <p className="text-muted" style={{ fontSize: '0.85rem' }}>Nenhum relatório aprovado ainda.</p>}
            </div>
          </div>

          {studentClass?.evaluation_type === 'numeric' && (
            <div className="card mt-6" style={{ backgroundColor: '#fff7ed', border: '1px dashed #fdba74', textAlign: 'center', padding: '1.5rem' }}>
              <Heart size={32} color="#f97316" style={{ margin: '0 auto 0.5rem', opacity: 0.6 }} />
              <h4 style={{ margin: '0 0 0.5rem', color: '#9a3412' }}>Espaço do Aluno</h4>
              <p style={{ fontSize: '0.85rem', color: '#c2410c', margin: 0 }}>Acesse o boletim para acompanhar {student?.name.split(' ')[0]}.</p>
              <button className="btn btn-secondary mt-4" onClick={() => navigate('/bulletin')} style={{ width: '100%', fontSize: '0.9rem' }}>Acessar Boletim</button>
            </div>
          )}
        </div>
      </div>

      {openDoc && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }} onClick={() => setOpenDoc(null)}>
          <div className="card" style={{ maxWidth: '800px', width: '100%', maxHeight: '85vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 style={{ margin: 0 }}>{openDoc.kind === 'pei' ? 'PEI' : 'Relatório descritivo'}{openDoc.period ? ` · ${openDoc.period}` : ''}</h3>
              <button className="btn btn-secondary" style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem' }} onClick={() => setOpenDoc(null)}>Fechar</button>
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
