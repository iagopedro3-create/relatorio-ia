import React, { useState, useMemo, useEffect } from 'react';
import { MessageSquare, CalendarDays, Send, Pin, Search, Filter, ChevronLeft, ChevronRight, X, Eye, Bell, FileText, Plus, Reply, CornerDownRight, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';
import { useSchool } from '../contexts/SchoolContext';
import { useAsync } from '../lib/useAsync';
import { EmptyState, PageHeader, SkeletonCard, useConfirm } from '../components/ui';
import { listMessages, createMessage, deleteMessage, listReplies, createReply, listAllReads, listMyReads, markRead, listEvents, createEvent, deleteEvent, listStudents } from '../data';
import { CATEGORY_LABELS, EVENT_TYPES, timeAgo } from '../store/agendaMeta';
import type { AgendaCategory, AgendaEventType, AgendaMessage, AgendaTarget, Student } from '../types/db';

const MONTHS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

export function Agenda() {
  const { user } = useAuth();
  const { school, classes, staff } = useSchool();
  const askConfirm = useConfirm();
  const isGuardian = user?.role === 'guardian';
  const isManager = user?.role === 'admin' || user?.role === 'coordinator';

  const [activeTab, setActiveTab] = useState<'feed' | 'calendar' | 'compose'>('feed');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCat, setFilterCat] = useState('');
  const [calMonth, setCalMonth] = useState(new Date().getMonth());
  const [calYear, setCalYear] = useState(new Date().getFullYear());
  const [replyText, setReplyText] = useState('');
  const [replyingToId, setReplyingToId] = useState<string | null>(null);

  const messagesQ = useAsync(() => school ? listMessages(school.id) : Promise.resolve([]), [school?.id], []);
  const messageIds = useMemo(() => messagesQ.data.map(m => m.id), [messagesQ.data]);
  const repliesQ = useAsync(() => listReplies(messageIds), [messageIds.join(',')], []);
  const readsQ = useAsync(() => isManager ? listAllReads(messageIds) : (user ? listMyReads(user.id).then(r => r.map(x => ({ message_id: x.message_id, profile_id: user.id }))) : Promise.resolve([])), [messageIds.join(','), user?.id, isManager], []);
  const eventsQ = useAsync(() => school ? listEvents(school.id) : Promise.resolve([]), [school?.id], []);
  const studentsQ = useAsync(() => (school && !isGuardian) ? listStudents(school.id) : Promise.resolve([] as Student[]), [school?.id, isGuardian], [] as Student[]);

  // Responsável: marca como lidas as mensagens que apareceram no feed.
  useEffect(() => {
    if (!user || !isGuardian || messagesQ.data.length === 0) return;
    const read = new Set(readsQ.data.map(r => r.message_id));
    for (const m of messagesQ.data) if (!read.has(m.id)) void markRead(m.id, user.id);
  }, [messagesQ.data, readsQ.data, user, isGuardian]);

  // Compose
  const [compSubject, setCompSubject] = useState('');
  const [compContent, setCompContent] = useState('');
  const [compCategory, setCompCategory] = useState<AgendaCategory>('comunicado');
  const [compTarget, setCompTarget] = useState<AgendaTarget>(isGuardian ? 'staff' : 'all');
  const [compTargetIds, setCompTargetIds] = useState<string[]>([]);
  const [compPinned, setCompPinned] = useState(false);
  const [isDailyReport, setIsDailyReport] = useState(false);
  const [reportType, setReportType] = useState<'fundamental' | 'infantil'>('fundamental');
  const [reportSubjects, setReportSubjects] = useState<string[]>([]);
  const [reportParticipation, setReportParticipation] = useState('');
  const [reportHomework, setReportHomework] = useState('');
  const [reportToilet, setReportToilet] = useState('');
  const [reportMeals, setReportMeals] = useState('');
  const [reportSleep, setReportSleep] = useState('');
  const [sending, setSending] = useState(false);

  // Evento
  const [evTitle, setEvTitle] = useState('');
  const [evDate, setEvDate] = useState('');
  const [evTime, setEvTime] = useState('');
  const [evType, setEvType] = useState<AgendaEventType>('evento');
  const [evDesc, setEvDesc] = useState('');
  const [evClassIds, setEvClassIds] = useState<string[]>([]);
  const [showEventForm, setShowEventForm] = useState(false);

  const filteredMessages = useMemo(() => {
    let result = messagesQ.data;
    if (filterCat) result = result.filter(m => m.category === filterCat);
    if (searchTerm) result = result.filter(m => m.subject.toLowerCase().includes(searchTerm.toLowerCase()) || m.content.toLowerCase().includes(searchTerm.toLowerCase()));
    return result;
  }, [messagesQ.data, filterCat, searchTerm]);

  const authorName = (id: string | null) => staff.find(u => u.id === id)?.name ?? 'Escola';
  const repliesOf = (id: string) => repliesQ.data.filter(r => r.message_id === id);
  const readsOf = (id: string) => readsQ.data.filter(r => r.message_id === id).length;

  const eventsInMonth = eventsQ.data.filter(e => { const d = new Date(e.date + 'T00:00:00'); return d.getMonth() === calMonth && d.getFullYear() === calYear; });
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(calYear, calMonth, 1).getDay();
  const calendarDays = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const handleSendMessage = async () => {
    if (!school || !user) return;
    if (!compSubject.trim() && !isDailyReport) { toast.error('Informe o assunto.'); return; }
    if (!compContent.trim() && !isDailyReport) { toast.error('Escreva a mensagem.'); return; }
    if ((compTarget === 'class' || compTarget === 'student') && compTargetIds.length === 0) { toast.error('Selecione o destinatário.'); return; }

    let finalContent = compContent;
    if (isDailyReport) {
      finalContent = reportType === 'fundamental'
        ? `📌 AULA DE HOJE:\n${reportSubjects.length > 0 ? reportSubjects.join(', ') : 'Não informado'}\n\n🎭 PARTICIPAÇÃO:\n${reportParticipation || 'Não informado'}\n\n📝 ATIVIDADE DE CASA:\n${reportHomework || 'Não informado'}\n\n📝 OBSERVAÇÕES:\n${compContent || 'Sem observações adicionais.'}`
        : `🚽 BANHEIRO:\n${reportToilet || 'Não informado'}\n\n🍴 ALIMENTAÇÃO:\n${reportMeals || 'Não informado'}\n\n💤 SONO:\n${reportSleep || 'Não informado'}\n\n📝 OBSERVAÇÕES:\n${compContent || 'Sem observações adicionais.'}`;
    }

    setSending(true);
    try {
      await createMessage({
        school_id: school.id,
        author_id: user.id,
        subject: isDailyReport ? `Relatório Diário - ${new Date().toLocaleDateString('pt-BR')}` : compSubject.trim(),
        content: finalContent,
        category: isDailyReport ? 'pedagogico' : compCategory,
        target_type: isGuardian ? 'staff' : compTarget,
        target_class_ids: compTarget === 'class' ? compTargetIds : [],
        target_student_ids: compTarget === 'student' ? compTargetIds : [],
        pinned: compPinned,
      });
      await messagesQ.reload();
      setCompSubject(''); setCompContent(''); setCompCategory('comunicado'); setCompTarget(isGuardian ? 'staff' : 'all'); setCompTargetIds([]); setCompPinned(false);
      setIsDailyReport(false); setReportSubjects([]); setReportParticipation(''); setReportHomework(''); setReportToilet(''); setReportMeals(''); setReportSleep('');
      setActiveTab('feed');
      toast.success('Mensagem enviada.');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Falha ao enviar.');
    } finally {
      setSending(false);
    }
  };

  const handleReply = async (msgId: string) => {
    if (!replyText.trim() || !school || !user) return;
    try {
      await createReply({ school_id: school.id, message_id: msgId, author_id: user.id, content: replyText.trim() });
      await repliesQ.reload();
      setReplyText('');
      setReplyingToId(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Falha ao responder.');
    }
  };

  const handleDeleteMessage = async (m: AgendaMessage) => {
    if (!(await askConfirm({ title: 'Excluir esta mensagem?', description: 'Ela some do feed de todos os destinatários.', danger: true }))) return;
    try { await deleteMessage(m.id); await messagesQ.reload(); } catch (e) { toast.error(e instanceof Error ? e.message : 'Falha.'); }
  };

  const handleCreateEvent = async () => {
    if (!school || !user) return;
    if (!evTitle.trim() || !evDate) { toast.error('Título e data são obrigatórios.'); return; }
    try {
      await createEvent({ school_id: school.id, title: evTitle.trim(), date: evDate, time: evTime || null, type: evType, description: evDesc.trim() || null, class_ids: evClassIds, notify: true, created_by: user.id });
      await eventsQ.reload();
      setEvTitle(''); setEvDate(''); setEvTime(''); setEvType('evento'); setEvDesc(''); setEvClassIds([]); setShowEventForm(false);
      toast.success('Evento criado.');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Falha ao criar evento.');
    }
  };

  const handleDeleteEvent = async (id: string) => {
    if (!(await askConfirm({ title: 'Excluir este evento?', danger: true }))) return;
    try { await deleteEvent(id); await eventsQ.reload(); } catch (e) { toast.error(e instanceof Error ? e.message : 'Falha.'); }
  };

  const tabStyle = (id: string): React.CSSProperties => ({
    padding: '0.75rem 1.5rem', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.9rem',
    fontWeight: activeTab === id ? 700 : 500, display: 'flex', alignItems: 'center', gap: '0.5rem',
    color: activeTab === id ? 'var(--color-primary)' : 'var(--color-text-muted)', borderBottom: activeTab === id ? '3px solid var(--color-primary)' : '3px solid transparent',
    backgroundColor: 'transparent', transition: 'all 0.2s',
  });

  const chip = (on: boolean): React.CSSProperties => ({
    padding: '0.3rem 0.7rem', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer',
    border: on ? '2px solid var(--color-primary)' : '2px solid var(--color-border)', backgroundColor: on ? 'var(--color-primary-soft)' : 'white', color: on ? 'var(--color-primary)' : 'var(--color-text-muted)', fontFamily: 'inherit',
  });

  const TABS = [
    { id: 'feed' as const, label: 'Feed', icon: <MessageSquare size={18} /> },
    { id: 'calendar' as const, label: 'Calendário', icon: <CalendarDays size={18} /> },
    { id: 'compose' as const, label: 'Nova Mensagem', icon: <Send size={18} /> },
  ];

  return (
    <div>
      <PageHeader
        title="Agenda digital"
        subtitle={isGuardian ? 'Comunicados da escola, calendário e canal com a equipe.' : 'Comunicados, eventos e relatório do dia para as famílias.'}
        actions={<button className="btn btn-primary" onClick={() => setActiveTab('compose')}><Plus size={18} /> Nova mensagem</button>}
      />

      <div className="agenda-tabs" style={{ display: 'flex', borderBottom: '1px solid var(--color-border)', marginBottom: '1.5rem', backgroundColor: 'white', borderRadius: '12px 12px 0 0', padding: '0 0.5rem', overflowX: 'auto', whiteSpace: 'nowrap' }}>
        {TABS.map(t => <button key={t.id} onClick={() => setActiveTab(t.id)} style={tabStyle(t.id)}>{t.icon} {t.label}</button>)}
      </div>

      {activeTab === 'feed' && (
        <div>
          <div className="card" style={{ padding: '0.75rem 1rem', display: 'flex', gap: '0.75rem', alignItems: 'center', marginBottom: '1rem' }}>
            <Search size={18} color="var(--color-text-subtle)" />
            <input type="text" placeholder="Buscar mensagens..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} style={{ border: 'none', outline: 'none', flex: 1, fontFamily: 'inherit', fontSize: '0.9rem', background: 'transparent', padding: 0 }} />
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <Filter size={16} color="var(--color-text-subtle)" />
              <select value={filterCat} onChange={e => setFilterCat(e.target.value)} style={{ fontSize: '0.8rem', padding: '0.3rem 0.5rem', width: 'auto' }}>
                <option value="">Todas</option>
                {Object.entries(CATEGORY_LABELS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
              {(searchTerm || filterCat) && <button onClick={() => { setSearchTerm(''); setFilterCat(''); }} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={16} color="var(--color-text-subtle)" /></button>}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {messagesQ.loading && <><SkeletonCard lines={2} /><SkeletonCard lines={3} /></>}
            {!messagesQ.loading && filteredMessages.length === 0 && (
              <div className="card">
                {(searchTerm || filterCat)
                  ? <EmptyState icon={<Search size={36} />} title="Nada com esse filtro" description="Tente outra palavra ou limpe a busca." action={<button className="btn btn-secondary btn-sm" onClick={() => { setSearchTerm(''); setFilterCat(''); }}>Limpar filtros</button>} />
                  : <EmptyState icon={<MessageSquare size={36} />} title="Nenhum comunicado ainda" description={isGuardian ? 'Quando a escola publicar algo, aparece aqui.' : 'Publique o primeiro comunicado para as famílias.'} action={!isGuardian ? <button className="btn btn-primary btn-sm" onClick={() => setActiveTab('compose')}><Plus size={16} /> Nova mensagem</button> : undefined} />}
              </div>
            )}
            {filteredMessages.map(msg => {
              const cat = CATEGORY_LABELS[msg.category] ?? CATEGORY_LABELS.comunicado;
              const replies = repliesOf(msg.id);
              const reads = readsOf(msg.id);
              return (
                <div key={msg.id} className="card" style={{ padding: 0, overflow: 'hidden', borderLeft: `4px solid ${cat.color}` }}>
                  <div style={{ padding: '1rem 1.25rem 0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem', flexWrap: 'wrap' }}>
                        {msg.pinned && <Pin size={14} color="var(--color-warning)" style={{ transform: 'rotate(45deg)' }} />}
                        <span style={{ fontSize: '0.7rem', padding: '0.15rem 0.5rem', borderRadius: '4px', fontWeight: 700, backgroundColor: cat.bg, color: cat.color, textTransform: 'uppercase' }}>{cat.label}</span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--color-text-subtle)' }}>•</span>
                        <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>{authorName(msg.author_id)}</span>
                      </div>
                      <h4 style={{ margin: '0 0 0.25rem', fontSize: '1.05rem', color: 'var(--color-text)' }}>{msg.subject}</h4>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--color-text-subtle)', fontWeight: 500 }}>{timeAgo(msg.created_at)}</span>
                      {(isManager || msg.author_id === user?.id) && <button onClick={() => void handleDeleteMessage(msg)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-border-strong)' }}><Trash2 size={14} /></button>}
                    </div>
                  </div>
                  <div style={{ padding: '0 1.25rem 1rem' }}>
                    <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--color-text-muted)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{msg.content}</p>
                  </div>
                  <div style={{ padding: '0.6rem 1.25rem', backgroundColor: 'var(--color-surface-2)', borderTop: '1px solid var(--color-border-soft)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <div style={{ display: 'flex', gap: '1rem', color: 'var(--color-text-subtle)', alignItems: 'center' }}>
                      <span>{msg.target_type === 'all' ? '🏫 Toda a escola' : msg.target_type === 'class' ? `📚 ${msg.target_class_ids.map(id => classes.find(c => c.id === id)?.name ?? '').filter(Boolean).join(', ') || 'turma(s)'}` : msg.target_type === 'student' ? '👤 Aluno específico' : '🏢 Equipe'}</span>
                      <button onClick={() => setReplyingToId(replyingToId === msg.id ? null : msg.id)} style={{ background: 'none', border: 'none', color: 'var(--color-primary)', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontFamily: 'inherit' }}>
                        <Reply size={12} /> Responder
                      </button>
                    </div>
                    {(isManager || msg.author_id === user?.id) && (
                      <div style={{ display: 'flex', gap: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Eye size={12} color="var(--color-success)" /> {reads} lido(s)</span>
                      </div>
                    )}
                  </div>

                  {(replies.length > 0 || replyingToId === msg.id) && (
                    <div style={{ backgroundColor: 'var(--color-border-soft)', padding: '1rem 1.25rem', borderTop: '1px solid var(--color-border)' }}>
                      {replies.map(rep => (
                        <div key={rep.id} style={{ display: 'flex', gap: '0.75rem', marginBottom: '0.75rem' }}>
                          <CornerDownRight size={16} color="var(--color-text-subtle)" style={{ marginTop: '0.25rem' }} />
                          <div style={{ backgroundColor: 'white', padding: '0.6rem 0.85rem', borderRadius: '12px', flex: 1 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                              <span style={{ fontSize: '0.75rem', fontWeight: 700 }}>{authorName(rep.author_id)}</span>
                              <span style={{ fontSize: '0.7rem', color: 'var(--color-text-subtle)' }}>{timeAgo(rep.created_at)}</span>
                            </div>
                            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--color-text-muted)', lineHeight: 1.5 }}>{rep.content}</p>
                          </div>
                        </div>
                      ))}
                      {replyingToId === msg.id && (
                        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.75rem' }}>
                          <CornerDownRight size={16} color="var(--color-text-subtle)" style={{ marginTop: '0.75rem' }} />
                          <div style={{ flex: 1, display: 'flex', gap: '0.5rem' }}>
                            <input type="text" placeholder="Escreva sua resposta..." value={replyText} onChange={e => setReplyText(e.target.value)} onKeyDown={e => e.key === 'Enter' && void handleReply(msg.id)} style={{ flex: 1, padding: '0.5rem 0.85rem', borderRadius: '8px', fontSize: '0.85rem' }} autoFocus />
                            <button onClick={() => void handleReply(msg.id)} className="btn btn-primary" style={{ padding: '0.5rem' }}><Send size={16} /></button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {activeTab === 'calendar' && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '1.25rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--color-surface-2)', borderBottom: '1px solid var(--color-border)' }}>
            <button onClick={() => { if (calMonth === 0) { setCalMonth(11); setCalYear(calYear - 1); } else setCalMonth(calMonth - 1); }} style={{ background: 'none', border: '1px solid var(--color-border)', borderRadius: '8px', padding: '0.4rem', cursor: 'pointer' }}><ChevronLeft size={18} color="var(--color-text-muted)" /></button>
            <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700 }}>{MONTHS[calMonth]} {calYear}</h3>
            <div className="flex items-center gap-2">
              {!isGuardian && <button className="btn btn-primary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }} onClick={() => setShowEventForm(v => !v)}><Plus size={14} /> Evento</button>}
              <button onClick={() => { if (calMonth === 11) { setCalMonth(0); setCalYear(calYear + 1); } else setCalMonth(calMonth + 1); }} style={{ background: 'none', border: '1px solid var(--color-border)', borderRadius: '8px', padding: '0.4rem', cursor: 'pointer' }}><ChevronRight size={18} color="var(--color-text-muted)" /></button>
            </div>
          </div>

          {showEventForm && !isGuardian && (
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--color-border)', backgroundColor: 'var(--color-warning-soft)' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem' }}>
                <input type="text" placeholder="Título" value={evTitle} onChange={e => setEvTitle(e.target.value)} />
                <input type="date" value={evDate} onChange={e => setEvDate(e.target.value)} />
                <input type="time" value={evTime} onChange={e => setEvTime(e.target.value)} />
                <select value={evType} onChange={e => setEvType(e.target.value as AgendaEventType)}>
                  {Object.entries(EVENT_TYPES).map(([k, v]) => <option key={k} value={k}>{v.icon} {v.label}</option>)}
                </select>
              </div>
              <input type="text" placeholder="Descrição (opcional)" value={evDesc} onChange={e => setEvDesc(e.target.value)} style={{ marginTop: '0.75rem' }} />
              <div className="flex flex-wrap gap-2 mt-3">
                <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', alignSelf: 'center' }}>Turmas (vazio = toda a escola):</span>
                {classes.map(c => <button key={c.id} type="button" onClick={() => setEvClassIds(prev => prev.includes(c.id) ? prev.filter(id => id !== c.id) : [...prev, c.id])} style={chip(evClassIds.includes(c.id))}>{c.name}</button>)}
              </div>
              <div className="flex justify-end gap-2 mt-3">
                <button className="btn btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }} onClick={() => setShowEventForm(false)}>Cancelar</button>
                <button className="btn btn-primary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }} onClick={() => void handleCreateEvent()}>Salvar evento</button>
              </div>
              <p className="text-muted" style={{ fontSize: '0.75rem', marginTop: '0.5rem' }}>Eventos do tipo <strong>Feriado</strong> bloqueiam o dia na chamada e no diário.</p>
            </div>
          )}

          <div style={{ padding: '1rem', overflowX: 'auto' }}>
            <div style={{ minWidth: '320px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px', marginBottom: '0.5rem' }}>
                {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(d => <div key={d} style={{ textAlign: 'center', fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-subtle)', padding: '0.5rem', textTransform: 'uppercase' }}>{d}</div>)}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px' }}>
                {Array.from({ length: firstDayOfWeek }).map((_, i) => <div key={`e${i}`} />)}
                {calendarDays.map(day => {
                  const dateStr = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                  const dayEvents = eventsInMonth.filter(e => e.date === dateStr);
                  const isToday = new Date().toISOString().split('T')[0] === dateStr;
                  return (
                    <div key={day} style={{ minHeight: '70px', padding: '0.35rem', borderRadius: '8px', border: isToday ? '2px solid var(--color-primary)' : '1px solid var(--color-border-soft)', backgroundColor: isToday ? 'var(--color-primary-soft)' : 'white' }}>
                      <div style={{ fontSize: '0.8rem', fontWeight: isToday ? 800 : 600, color: isToday ? 'var(--color-primary)' : 'var(--color-text)', marginBottom: '0.2rem' }}>{day}</div>
                      {dayEvents.map(ev => {
                        const t = EVENT_TYPES[ev.type] ?? EVENT_TYPES.evento;
                        return <div key={ev.id} style={{ fontSize: '0.65rem', padding: '0.15rem 0.3rem', borderRadius: '4px', marginBottom: '2px', backgroundColor: `${t.color}15`, color: t.color, fontWeight: 600, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }} title={ev.title}>{t.icon} {ev.title}</div>;
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div style={{ borderTop: '1px solid var(--color-border)', padding: '1.25rem 1.5rem' }}>
            <h4 style={{ margin: '0 0 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Bell size={16} color="var(--color-primary)" /> Próximos Eventos</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              {eventsQ.data.filter(e => e.date >= new Date().toISOString().slice(0, 10)).slice(0, 6).map(ev => {
                const t = EVENT_TYPES[ev.type] ?? EVENT_TYPES.evento;
                return (
                  <div key={ev.id} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.75rem 1rem', borderRadius: '10px', backgroundColor: 'var(--color-surface-2)', border: '1px solid var(--color-border-soft)' }}>
                    <div style={{ width: '42px', height: '42px', borderRadius: '10px', backgroundColor: `${t.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', flexShrink: 0 }}>{t.icon}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--color-text)' }}>{ev.title}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>{ev.description}</div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontSize: '0.85rem', fontWeight: 700, color: t.color }}>{new Date(ev.date + 'T00:00:00').toLocaleDateString('pt-BR')}</div>
                      {ev.time && <div style={{ fontSize: '0.75rem', color: 'var(--color-text-subtle)' }}>{ev.time}</div>}
                    </div>
                    {!isGuardian && <button onClick={() => void handleDeleteEvent(ev.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-border-strong)' }}><Trash2 size={14} /></button>}
                  </div>
                );
              })}
              {eventsQ.data.length === 0 && <p className="text-muted" style={{ fontSize: '0.85rem' }}>Nenhum evento cadastrado.</p>}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'compose' && (
        <div className="card" style={{ borderTop: '4px solid var(--color-primary)' }}>
          <h3 style={{ margin: '0 0 1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Send size={20} color="var(--color-primary)" /> Enviar Mensagem</h3>

          {isGuardian ? (
            <p className="text-muted" style={{ fontSize: '0.9rem' }}>Sua mensagem vai para a equipe da escola.</p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
              <div>
                <label style={{ fontSize: '0.85rem' }}>Destinatário</label>
                <select value={compTarget} onChange={e => { setCompTarget(e.target.value as AgendaTarget); setCompTargetIds([]); }}>
                  <option value="all">Toda a Escola</option>
                  <option value="class">Turma(s) Específica(s)</option>
                  <option value="student">Aluno(s) Específico(s)</option>
                  <option value="staff">Só a equipe</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: '0.85rem' }}>Categoria</label>
                <select value={compCategory} onChange={e => setCompCategory(e.target.value as AgendaCategory)}>
                  {Object.entries(CATEGORY_LABELS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
              </div>
            </div>
          )}

          {!isGuardian && compTarget === 'class' && (
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ fontSize: '0.85rem' }}>Selecionar Turmas</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {classes.map(c => <button key={c.id} type="button" onClick={() => setCompTargetIds(prev => prev.includes(c.id) ? prev.filter(id => id !== c.id) : [...prev, c.id])} style={chip(compTargetIds.includes(c.id))}>{c.name}</button>)}
              </div>
            </div>
          )}

          {!isGuardian && compTarget === 'student' && (
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ fontSize: '0.85rem' }}>Selecionar Alunos</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', maxHeight: '150px', overflowY: 'auto' }}>
                {studentsQ.data.map(s => <button key={s.id} type="button" onClick={() => setCompTargetIds(prev => prev.includes(s.id) ? prev.filter(id => id !== s.id) : [...prev, s.id])} style={chip(compTargetIds.includes(s.id))}>{s.name}</button>)}
              </div>
            </div>
          )}

          {!isDailyReport && (
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ fontSize: '0.85rem' }}>Assunto</label>
              <input type="text" value={compSubject} onChange={e => setCompSubject(e.target.value)} placeholder="Título da mensagem..." />
            </div>
          )}

          {isDailyReport && (
            <div style={{ marginBottom: '1.5rem', padding: '1rem', backgroundColor: 'var(--color-surface-2)', borderRadius: '12px', border: '1px solid var(--color-border)' }}>
              <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '1rem' }}>
                {(['fundamental', 'infantil'] as const).map(t => (
                  <button key={t} onClick={() => setReportType(t)} style={{ padding: '0.5rem 1rem', borderRadius: '8px', border: 'none', backgroundColor: reportType === t ? 'var(--color-primary)' : 'transparent', color: reportType === t ? 'white' : 'var(--color-text-muted)', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>{t === 'fundamental' ? 'Ensino Fundamental' : 'Educação Infantil'}</button>
                ))}
              </div>
              {reportType === 'fundamental' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  <div>
                    <label style={{ fontSize: '0.85rem', fontWeight: 700 }}>📌 AULA DE HOJE</label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '0.5rem' }}>
                      {['Português', 'Matemática', 'História', 'Geografia', 'Ciências', 'Artes', 'Leitura', 'Ed. Física', 'Inglês'].map(sub => (
                        <label key={sub} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', cursor: 'pointer', padding: '0.4rem', backgroundColor: 'white', borderRadius: '6px', border: '1px solid var(--color-border)', fontWeight: 400 }}>
                          <input type="checkbox" checked={reportSubjects.includes(sub)} onChange={() => setReportSubjects(prev => prev.includes(sub) ? prev.filter(s => s !== sub) : [...prev, sub])} />{sub}
                        </label>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label style={{ fontSize: '0.85rem', fontWeight: 700 }}>🎭 PARTICIPAÇÃO</label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '0.5rem' }}>
                      {['Muito participativo(a) 🤩', 'Interessado(a) 🧐', 'Pouco participativo 🥱', 'Desinteressado 😴'].map(opt => (
                        <label key={opt} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', cursor: 'pointer', padding: '0.4rem', backgroundColor: 'white', borderRadius: '6px', border: '1px solid var(--color-border)', fontWeight: 400 }}>
                          <input type="radio" name="participation" checked={reportParticipation === opt} onChange={() => setReportParticipation(opt)} />{opt}
                        </label>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label style={{ fontSize: '0.85rem', fontWeight: 700 }}>📝 ATIVIDADE DE CASA</label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                      {['Hoje tem atividade no livro 📚', 'Hoje tem atividade em folha 📄', 'Hoje tem atividade no caderno 📒', 'Hoje não tem atividade ❌'].map(opt => (
                        <label key={opt} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', cursor: 'pointer', padding: '0.5rem 0.75rem', backgroundColor: 'white', borderRadius: '8px', border: '1px solid var(--color-border)', fontWeight: 400 }}>
                          <input type="radio" name="homework" checked={reportHomework === opt} onChange={() => setReportHomework(opt)} />{opt}
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  {[
                    ['🚽 BANHEIRO', ['Xixi ✅', 'Cocô 💩', 'Trocou fralda 👶'], reportToilet, setReportToilet, 'toilet'],
                    ['🍴 ALIMENTAÇÃO', ['Comeu tudo 😋', 'Comeu pouco 🥣', 'Não comeu ❌'], reportMeals, setReportMeals, 'meals'],
                    ['💤 SONO', ['Dormiu bem 😴', 'Dormiu pouco ⏰', 'Não dormiu 👀'], reportSleep, setReportSleep, 'sleep'],
                  ].map(([title, opts, val, set, name]) => (
                    <div key={name as string}>
                      <label style={{ fontSize: '0.85rem', fontWeight: 700 }}>{title as string}</label>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        {(opts as string[]).map(opt => (
                          <label key={opt} style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', cursor: 'pointer', padding: '0.5rem', backgroundColor: 'white', borderRadius: '6px', border: '1px solid var(--color-border)', fontWeight: 400 }}>
                            <input type="radio" name={name as string} checked={val === opt} onChange={() => (set as (v: string) => void)(opt)} />{opt}
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ fontSize: '0.85rem' }}>{isDailyReport ? '📝 Observações Adicionais' : 'Mensagem'}</label>
            <textarea value={compContent} onChange={e => setCompContent(e.target.value)} placeholder={isDailyReport ? 'Algo importante sobre o dia de hoje...' : 'Escreva sua mensagem...'} rows={isDailyReport ? 3 : 6} />
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {!isGuardian && (
                <button type="button" onClick={() => setIsDailyReport(!isDailyReport)} style={{ background: isDailyReport ? 'var(--color-primary)' : 'none', border: '1px solid var(--color-border)', borderRadius: '8px', padding: '0.5rem 0.75rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', color: isDailyReport ? 'white' : 'var(--color-text-muted)', fontWeight: 600, fontFamily: 'inherit' }}>
                  <FileText size={16} /> Relatório Diário
                </button>
              )}
              {!isGuardian && (
                <button type="button" onClick={() => setCompPinned(!compPinned)} style={{ background: compPinned ? 'var(--color-warning-soft)' : 'none', border: compPinned ? '1px solid var(--color-warning-border)' : '1px solid var(--color-border)', borderRadius: '8px', padding: '0.5rem 0.75rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', color: compPinned ? 'var(--color-warning)' : 'var(--color-text-muted)', fontFamily: 'inherit' }}>
                  <Pin size={16} style={{ transform: 'rotate(45deg)' }} /> {compPinned ? 'Fixada' : 'Fixar'}
                </button>
              )}
            </div>
            <button className="btn btn-primary" onClick={() => void handleSendMessage()} disabled={sending}><Send size={18} /> Enviar {isDailyReport ? 'Relatório' : 'Mensagem'}</button>
          </div>
        </div>
      )}
      <style>{`.agenda-tabs::-webkit-scrollbar { display: none; }`}</style>
    </div>
  );
}
