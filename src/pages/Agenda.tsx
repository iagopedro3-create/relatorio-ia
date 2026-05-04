import { useState, useMemo } from 'react';
import { MessageSquare, CalendarDays, Send, Pin, Paperclip, Search, Filter, ChevronLeft, ChevronRight, X, CheckCircle2, Clock, Eye, Bell, FileText, Plus, Reply, CornerDownRight } from 'lucide-react';
import { mockMessages, mockEvents, CATEGORY_LABELS, EVENT_TYPES } from '../store/agendaDb';
import type { AgendaMessage, CalendarEvent } from '../store/agendaDb';
import { mockClasses, mockStudents } from '../store/mockDb';
import type { ClassGroup, Student } from '../store/mockDb';
import { useAuth } from '../contexts/AuthContext';

const MONTHS = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

function timeAgo(dateStr: string) {
  const d = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const days = Math.floor(diff / 86400000);
  if (days > 30) return d.toLocaleDateString('pt-BR');
  if (days > 0) return `${days}d atrás`;
  const hours = Math.floor(diff / 3600000);
  if (hours > 0) return `${hours}h atrás`;
  return 'Agora';
}

export function Agenda() {
  const { user } = useAuth();
  const isResponsible = user?.role === 'responsible';
  
  const TABS = useMemo(() => [
    { id: 'feed', label: 'Feed', icon: <MessageSquare size={18} /> },
    { id: 'calendar', label: 'Calendário', icon: <CalendarDays size={18} /> },
    { id: 'compose', label: 'Nova Mensagem', icon: <Send size={18} /> },
  ], []);

  const [activeTab, setActiveTab] = useState<'feed' | 'calendar' | 'compose'>('feed');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCat, setFilterCat] = useState('');
  const [messages, setMessages] = useState<AgendaMessage[]>(mockMessages);
  const [events] = useState<CalendarEvent[]>(mockEvents);
  const [calMonth, setCalMonth] = useState(new Date().getMonth());
  const [calYear, setCalYear] = useState(new Date().getFullYear());

  // Reply state
  const [replyText, setReplyText] = useState('');
  const [replyingToId, setReplyingToId] = useState<string | null>(null);

  // Compose state
  const [compSubject, setCompSubject] = useState('');
  const [compContent, setCompContent] = useState('');
  const [compCategory, setCompCategory] = useState<string>('comunicado');
  const [compTarget, setCompTarget] = useState<'all' | 'class' | 'student' | 'staff'>(isResponsible ? 'staff' : 'all');
  const [compTargetIds, setCompTargetIds] = useState<string[]>([]);
  const [compPinned, setCompPinned] = useState(false);

  // Feed filters
  const filteredMessages = useMemo(() => {
    if (!user) return [];
    const student = isResponsible ? mockStudents.find(s => s.id === user.studentId) : null;

    let result = messages.filter(m => {
      if (!isResponsible) return true;
      // Filter for parents:
      return (
        m.targetType === 'all' || 
        (m.targetType === 'class' && student?.classId && m.targetIds.includes(student.classId)) ||
        (m.targetType === 'student' && user.studentId && m.targetIds.includes(user.studentId))
      );
    });

    result = [...result].sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    if (searchTerm) result = result.filter((m: AgendaMessage) => m.subject.toLowerCase().includes(searchTerm.toLowerCase()) || m.content.toLowerCase().includes(searchTerm.toLowerCase()));
    if (filterCat) result = result.filter((m: AgendaMessage) => m.category === filterCat);
    return result;
  }, [messages, searchTerm, filterCat, isResponsible, user]);

  // Calendar
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(calYear, calMonth, 1).getDay();
  const calendarDays = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const eventsInMonth = events.filter((e: CalendarEvent) => {
    if (!user) return false;
    const d = new Date(e.date);
    const isInMonth = d.getMonth() === calMonth && d.getFullYear() === calYear;
    if (!isInMonth) return false;
    
    if (!isResponsible) return true;
    
    const student = mockStudents.find(s => s.id === user.studentId);
    return !e.classIds.length || (student?.classId && e.classIds.includes(student.classId));
  });

  const handleSendMessage = () => {
    if (!compSubject.trim() || !compContent.trim()) { alert('Preencha assunto e mensagem.'); return; }
    const newMsg: AgendaMessage = {
      id: `m${Date.now()}`, subject: compSubject, content: compContent,
      category: compCategory as AgendaMessage['category'],
      senderName: user?.name || 'Usuário', senderRole: (user?.role || 'admin') as AgendaMessage['senderRole'],
      targetType: compTarget, targetIds: compTargetIds, pinned: compPinned,
      createdAt: new Date().toISOString(), attachments: [], readBy: [], deliveredTo: [],
    };
    setMessages((prev: AgendaMessage[]) => [newMsg, ...prev]);
    setCompSubject(''); setCompContent(''); setCompCategory('comunicado');
    setCompTarget('all'); setCompTargetIds([]); setCompPinned(false);
    setActiveTab('feed');
  };

  const handleReply = (msgId: string) => {
    if (!replyText.trim()) return;
    setMessages(prev => prev.map(m => {
      if (m.id !== msgId) return m;
      return {
        ...m,
        replies: [
          ...m.replies,
          {
            id: `rep${Date.now()}`,
            senderName: user?.name || 'Responsável',
            senderRole: user?.role || 'responsible',
            content: replyText,
            createdAt: new Date().toISOString()
          }
        ]
      };
    }));
    setReplyText('');
    setReplyingToId(null);
  };

  const getStatusIcon = (msg: AgendaMessage) => {
    if (msg.readBy.length > 0) return <Eye size={14} color="#10b981" />;
    if (msg.deliveredTo.length > 0) return <CheckCircle2 size={14} color="#3b82f6" />;
    return <Clock size={14} color="#94a3b8" />;
  };

  const tabStyle = (id: string): React.CSSProperties => ({
    padding: '0.75rem 1.5rem', border: 'none', cursor: 'pointer', fontFamily: 'inherit',
    fontSize: '0.9rem', fontWeight: activeTab === id ? 700 : 500, display: 'flex', alignItems: 'center', gap: '0.5rem',
    color: activeTab === id ? '#0a73ff' : '#64748b', borderBottom: activeTab === id ? '3px solid #0a73ff' : '3px solid transparent',
    backgroundColor: 'transparent', transition: 'all 0.2s',
  });

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div className="mobile-hide">
          <h2 style={{ margin: 0, fontSize: '1.75rem', fontWeight: 800 }}>Agenda Digital</h2>
          <p className="text-muted">Comunicação, eventos e acompanhamento escolar</p>
        </div>
        <button className="btn btn-primary" onClick={() => setActiveTab('compose')} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Plus size={18} /> <span className="mobile-hide">Nova Mensagem</span><span className="mobile-only">Nova</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="agenda-tabs" style={{ 
        display: 'flex', borderBottom: '1px solid #e2e8f0', marginBottom: '1.5rem', 
        backgroundColor: 'white', borderRadius: '12px 12px 0 0', padding: '0 0.5rem',
        overflowX: 'auto', whiteSpace: 'nowrap', msOverflowStyle: 'none', scrollbarWidth: 'none'
      }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)} style={tabStyle(t.id)}>{t.icon} {t.label}</button>
        ))}
      </div>

      {/* ===== FEED TAB ===== */}
      {activeTab === 'feed' && (
        <div>
          {/* Search & Filter Bar */}
          <div className="card" style={{ padding: '0.75rem 1rem', display: 'flex', gap: '0.75rem', alignItems: 'center', marginBottom: '1rem' }}>
            <Search size={18} color="#94a3b8" />
            <input type="text" placeholder="Buscar mensagens..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
              style={{ border: 'none', outline: 'none', flex: 1, fontFamily: 'inherit', fontSize: '0.9rem', background: 'transparent' }} />
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <Filter size={16} color="#94a3b8" />
              <select value={filterCat} onChange={e => setFilterCat(e.target.value)} style={{ fontSize: '0.8rem', padding: '0.3rem 0.5rem', border: '1px solid #e2e8f0', borderRadius: '6px' }}>
                <option value="">Todas</option>
                {Object.entries(CATEGORY_LABELS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
              {(searchTerm || filterCat) && <button onClick={() => { setSearchTerm(''); setFilterCat(''); }} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={16} color="#94a3b8" /></button>}
            </div>
          </div>

          {/* Message Feed */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {filteredMessages.length === 0 && (
              <div className="card" style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
                <MessageSquare size={40} style={{ margin: '0 auto 1rem', opacity: 0.3 }} />
                <p>Nenhuma mensagem encontrada.</p>
              </div>
            )}
            {filteredMessages.map((msg: AgendaMessage) => {
              const cat = CATEGORY_LABELS[msg.category];
              return (
                <div key={msg.id} className="card" style={{ padding: 0, overflow: 'hidden', borderLeft: `4px solid ${cat.color}`, transition: 'box-shadow 0.2s' }}>
                  {/* Header */}
                  <div style={{ padding: '1rem 1.25rem 0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem', flexWrap: 'wrap' }}>
                        {msg.pinned && <Pin size={14} color="#f59e0b" style={{ transform: 'rotate(45deg)' }} />}
                        <span style={{ fontSize: '0.7rem', padding: '0.15rem 0.5rem', borderRadius: '4px', fontWeight: 700, backgroundColor: cat.bg, color: cat.color, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{cat.label}</span>
                        <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>•</span>
                        <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>{msg.senderName}</span>
                      </div>
                      <h4 style={{ margin: '0 0 0.25rem', fontSize: '1.05rem', color: '#0f172a' }}>{msg.subject}</h4>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
                      {getStatusIcon(msg)}
                      <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 500 }}>{timeAgo(msg.createdAt)}</span>
                    </div>
                  </div>
                  {/* Content */}
                  <div style={{ padding: '0 1.25rem 1rem' }}>
                    <p style={{ margin: 0, fontSize: '0.9rem', color: '#475569', lineHeight: 1.6 }}>{msg.content}</p>
                  </div>
                  {/* Fo                   <div style={{ padding: '0.6rem 1.25rem', backgroundColor: '#f8fafc', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem' }}>
                    <div style={{ display: 'flex', gap: '1rem', color: '#94a3b8' }}>
                      {msg.attachments.length > 0 && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          <Paperclip size={12} /> {msg.attachments.length} anexo{msg.attachments.length > 1 ? 's' : ''}
                        </span>
                      )}
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        {msg.targetType === 'all' ? '🏫 Toda a escola' : msg.targetType === 'class' ? `📚 ${msg.targetIds.length} turma(s)` : `👤 Aluno específico`}
                      </span>
                      {isResponsible && (
                        <button onClick={() => setReplyingToId(replyingToId === msg.id ? null : msg.id)} style={{ background: 'none', border: 'none', color: '#0a73ff', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Reply size={12} /> Responder
                        </button>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: '0.75rem', color: '#64748b', fontWeight: 600 }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Eye size={12} color="#10b981" /> {msg.readBy.length} lido(s)</span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><CheckCircle2 size={12} color="#3b82f6" /> {msg.deliveredTo.length} entregue(s)</span>
                    </div>
                  </div>

                  {/* Replies Section */}
                  {(msg.replies.length > 0 || replyingToId === msg.id) && (
                    <div style={{ backgroundColor: '#f1f5f9', padding: '1rem 1.25rem', borderTop: '1px solid #e2e8f0' }}>
                      {msg.replies.map(rep => (
                        <div key={rep.id} style={{ display: 'flex', gap: '0.75rem', marginBottom: '0.75rem' }}>
                          <CornerDownRight size={16} color="#94a3b8" style={{ marginTop: '0.25rem' }} />
                          <div style={{ backgroundColor: 'white', padding: '0.6rem 0.85rem', borderRadius: '12px', flex: 1, boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#1e293b' }}>{rep.senderName}</span>
                              <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>{timeAgo(rep.createdAt)}</span>
                            </div>
                            <p style={{ margin: 0, fontSize: '0.85rem', color: '#475569', lineHeight: 1.5 }}>{rep.content}</p>
                          </div>
                        </div>
                      ))}

                      {replyingToId === msg.id && (
                        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.75rem' }}>
                          <CornerDownRight size={16} color="#94a3b8" style={{ marginTop: '0.75rem' }} />
                          <div style={{ flex: 1, display: 'flex', gap: '0.5rem' }}>
                            <input 
                              type="text" 
                              placeholder="Escreva sua resposta..." 
                              value={replyText}
                              onChange={e => setReplyText(e.target.value)}
                              onKeyPress={e => e.key === 'Enter' && handleReply(msg.id)}
                              style={{ flex: 1, padding: '0.5rem 0.85rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', outline: 'none' }}
                              autoFocus
                            />
                            <button onClick={() => handleReply(msg.id)} className="btn btn-primary" style={{ padding: '0.5rem' }}>
                              <Send size={16} />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })} );
            })}
          </div>
        </div>
      )}

      {/* ===== CALENDAR TAB ===== */}
      {activeTab === 'calendar' && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          {/* Calendar Header */}
          <div style={{ padding: '1.25rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
            <button onClick={() => { if (calMonth === 0) { setCalMonth(11); setCalYear(calYear - 1); } else setCalMonth(calMonth - 1); }}
              style={{ background: 'none', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0.4rem', cursor: 'pointer' }}>
              <ChevronLeft size={18} color="#64748b" />
            </button>
            <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700 }}>{MONTHS[calMonth]} {calYear}</h3>
            <button onClick={() => { if (calMonth === 11) { setCalMonth(0); setCalYear(calYear + 1); } else setCalMonth(calMonth + 1); }}
              style={{ background: 'none', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0.4rem', cursor: 'pointer' }}>
              <ChevronRight size={18} color="#64748b" />
            </button>
          </div>

          {/* Calendar Grid */}
          <div style={{ padding: '1rem', overflowX: 'auto' }}>
            <div style={{ minWidth: '320px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px', marginBottom: '0.5rem' }}>
              {['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'].map(d => (
                <div key={d} style={{ textAlign: 'center', fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', padding: '0.5rem', textTransform: 'uppercase' }}>{d}</div>
              ))}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px' }}>
              {Array.from({ length: firstDayOfWeek }).map((_, i) => <div key={`e${i}`} />)}
              {calendarDays.map(day => {
                const dateStr = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                const dayEvents = eventsInMonth.filter((e: CalendarEvent) => e.date === dateStr);
                const isToday = new Date().toISOString().split('T')[0] === dateStr;
                return (
                  <div key={day} style={{
                    minHeight: '70px', padding: '0.35rem', borderRadius: '8px', border: isToday ? '2px solid #0a73ff' : '1px solid #f1f5f9',
                    backgroundColor: isToday ? '#eff6ff' : 'white', transition: 'background 0.2s',
                  }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: isToday ? 800 : 600, color: isToday ? '#0a73ff' : '#334155', marginBottom: '0.2rem' }}>{day}</div>
                    {dayEvents.map((ev: CalendarEvent) => {
                      const evType = EVENT_TYPES[ev.type];
                      return (
                        <div key={ev.id} style={{
                          fontSize: '0.65rem', padding: '0.15rem 0.3rem', borderRadius: '4px', marginBottom: '2px',
                          backgroundColor: `${evType.color}15`, color: evType.color, fontWeight: 600,
                          overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis',
                        }} title={ev.title}>
                          {evType.icon} {ev.title}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
            </div>
          </div>

          {/* Events List */}
          <div style={{ borderTop: '1px solid #e2e8f0', padding: '1.25rem 1.5rem' }}>
            <h4 style={{ margin: '0 0 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Bell size={16} color="#0a73ff" /> Próximos Eventos</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              {events.filter((e: CalendarEvent) => {
                const isFuture = new Date(e.date) >= new Date();
                if (!isFuture) return false;
                if (!isResponsible) return true;
                const student = mockStudents.find(s => s.id === user.studentId);
                return !e.classIds.length || (student?.classId && e.classIds.includes(student.classId));
              }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()).slice(0, 5).map((ev: CalendarEvent) => {
                const evType = EVENT_TYPES[ev.type];
                return (
                  <div key={ev.id} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.75rem 1rem', borderRadius: '10px', backgroundColor: '#f8fafc', border: '1px solid #f1f5f9' }}>
                    <div style={{ width: '42px', height: '42px', borderRadius: '10px', backgroundColor: `${evType.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', flexShrink: 0 }}>
                      {evType.icon}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#1e293b' }}>{ev.title}</div>
                      <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{ev.description}</div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontSize: '0.85rem', fontWeight: 700, color: evType.color }}>{new Date(ev.date).toLocaleDateString('pt-BR')}</div>
                      {ev.time && <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{ev.time}</div>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ===== COMPOSE TAB ===== */}
      {activeTab === 'compose' && (
        <div className="card" style={{ borderTop: '4px solid #0a73ff' }}>
          <h3 style={{ margin: '0 0 1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Send size={20} color="#0a73ff" /> Enviar Mensagem</h3>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
            <div>
              <label style={{ display: 'block', fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.4rem' }}>Destinatário</label>
              {isResponsible ? (
                <select value={compTargetIds[0] || ''} onChange={e => setCompTargetIds([e.target.value])} style={{ width: '100%' }}>
                  <option value="">Selecione o canal...</option>
                  <option value="secretaria">Secretaria</option>
                  <option value="direcao">Direção</option>
                  <option value="coordenacao">Coordenação</option>
                  <option value="professor">Professor(a) da Turma</option>
                </select>
              ) : (
                <select value={compTarget} onChange={e => { setCompTarget(e.target.value as any); setCompTargetIds([]); }} style={{ width: '100%' }}>
                  <option value="all">Toda a Escola</option>
                  <option value="class">Turma(s) Específica(s)</option>
                  <option value="student">Aluno(s) Específico(s)</option>
                </select>
              )}
            </div>
            {!isResponsible && (
              <div>
                <label style={{ display: 'block', fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.4rem' }}>Categoria</label>
                <select value={compCategory} onChange={e => setCompCategory(e.target.value)} style={{ width: '100%' }}>
                  {Object.entries(CATEGORY_LABELS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
              </div>
            )}
          </div>

          {!isResponsible && compTarget === 'class' && (
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.4rem' }}>Selecionar Turmas</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {mockClasses.map(c => (
                  <button key={c.id} type="button" onClick={() => setCompTargetIds(prev => prev.includes(c.id) ? prev.filter(id => id !== c.id) : [...prev, c.id])}
                    style={{ padding: '0.3rem 0.7rem', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', border: compTargetIds.includes(c.id) ? '2px solid #0a73ff' : '2px solid #e2e8f0', backgroundColor: compTargetIds.includes(c.id) ? '#eff6ff' : 'white', color: compTargetIds.includes(c.id) ? '#0a73ff' : '#64748b', transition: 'all 0.15s', fontFamily: 'inherit' }}>
                    {c.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {!isResponsible && compTarget === 'student' && (
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.4rem' }}>Selecionar Alunos</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', maxHeight: '150px', overflowY: 'auto' }}>
                {mockStudents.map((s: Student) => (
                  <button key={s.id} type="button" onClick={() => setCompTargetIds((prev: string[]) => prev.includes(s.id) ? prev.filter((id: string) => id !== s.id) : [...prev, s.id])}
                    style={{ padding: '0.3rem 0.7rem', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', border: compTargetIds.includes(s.id) ? '2px solid #0a73ff' : '2px solid #e2e8f0', backgroundColor: compTargetIds.includes(s.id) ? '#eff6ff' : 'white', color: compTargetIds.includes(s.id) ? '#0a73ff' : '#64748b', transition: 'all 0.15s', fontFamily: 'inherit' }}>
                    {s.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.4rem' }}>Assunto</label>
            <input type="text" value={compSubject} onChange={e => setCompSubject(e.target.value)} placeholder="Título da mensagem..." style={{ width: '100%', boxSizing: 'border-box' }} />
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.4rem' }}>Mensagem</label>
            <textarea value={compContent} onChange={e => setCompContent(e.target.value)} placeholder="Escreva sua mensagem para os responsáveis..." rows={6}
              style={{ width: '100%', boxSizing: 'border-box', fontFamily: 'inherit', fontSize: '0.9rem', lineHeight: 1.6, resize: 'vertical', borderRadius: '8px', padding: '0.75rem', border: '1px solid #e2e8f0' }} />
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button type="button" style={{ background: 'none', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0.5rem 0.75rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', color: '#64748b', fontFamily: 'inherit' }}>
                <Paperclip size={16} /> Anexar Arquivo
              </button>
              <button type="button" style={{ background: 'none', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0.5rem 0.75rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', color: '#64748b', fontFamily: 'inherit' }}>
                <FileText size={16} /> Anexar Relatório
              </button>
              <button type="button" onClick={() => setCompPinned(!compPinned)}
                style={{ background: compPinned ? '#fffbeb' : 'none', border: compPinned ? '1px solid #fde68a' : '1px solid #e2e8f0', borderRadius: '8px', padding: '0.5rem 0.75rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', color: compPinned ? '#d97706' : '#64748b', fontFamily: 'inherit' }}>
                <Pin size={16} style={{ transform: 'rotate(45deg)' }} /> {compPinned ? 'Fixada' : 'Fixar'}
              </button>
            </div>
            <button className="btn btn-primary" onClick={handleSendMessage} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Send size={18} /> Enviar Mensagem
            </button>
          </div>
        </div>
      )}
      <style>{`
        .agenda-tabs::-webkit-scrollbar { display: none; }
        @media (max-width: 768px) {
          .mobile-hide { display: none !important; }
          .mobile-only { display: block !important; }
          .card { padding: 1rem !important; }
          .grid-cols-2 { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}
