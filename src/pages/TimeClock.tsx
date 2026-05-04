import { useState, useEffect, useMemo } from 'react';
import { 
  Clock, MapPin, Smartphone, ShieldCheck, History, 
  FileCheck, AlertTriangle, CheckCircle2, XCircle, 
  ChevronRight, Filter, Download, PlusCircle, Calendar
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { 
  mockPunches, mockAdjustments, PUNCH_LABELS, 
  type TimePunch, type TimeAdjustmentRequest, type PunchType 
} from '../store/timeClockDb';

export function TimeClock() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin' || user?.role === 'coordinator';
  
  const [activeTab, setActiveTab] = useState<'punch' | 'history' | 'admin'> (isAdmin ? 'admin' : 'punch');
  const [punches, setPunches] = useState<TimePunch[]>(mockPunches);
  const [adjustments, setAdjustments] = useState<TimeAdjustmentRequest[]>(mockAdjustments);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [lastPunch, setLastPunch] = useState<TimePunch | null>(null);

  // Update clock every second
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Get user's punches
  const myPunches = useMemo(() => {
    return punches.filter(p => p.userId === user?.id).sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  }, [punches, user]);

  useEffect(() => {
    if (myPunches.length > 0) {
      setLastPunch(myPunches[0]);
    }
  }, [myPunches]);

  const handlePunch = (type: PunchType) => {
    const newPunch: TimePunch = {
      id: `p${Date.now()}`,
      userId: user?.id || 'u0',
      userName: user?.name || 'Usuário',
      type,
      timestamp: new Date().toISOString(),
      deviceInfo: navigator.userAgent.substring(0, 50),
      hash: `rep-p-${Math.random().toString(36).substring(2, 15)}`,
      status: 'active'
    };
    
    setPunches([newPunch, ...punches]);
    alert(`${PUNCH_LABELS[type].label} registrado com sucesso!`);
  };

  const getNextPunchType = (): PunchType => {
    if (!lastPunch) return 'entry';
    if (lastPunch.type === 'entry') return 'break_start';
    if (lastPunch.type === 'break_start') return 'break_end';
    if (lastPunch.type === 'break_end') return 'exit';
    return 'entry';
  };

  const nextType = getNextPunchType();

  return (
    <div className="container" style={{ maxWidth: '1000px' }}>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Clock size={32} color="var(--color-primary)" /> Controle de Ponto
          </h1>
          <p className="text-muted">REP-P — Em conformidade com a Portaria 671/MTP</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {!isAdmin && <button onClick={() => setActiveTab('punch')} className={`btn ${activeTab === 'punch' ? 'btn-primary' : 'btn-secondary'}`} style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}>Registrar</button>}
          <button onClick={() => setActiveTab('history')} className={`btn ${activeTab === 'history' ? 'btn-primary' : 'btn-secondary'}`} style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}>Meu Histórico</button>
          {isAdmin && <button onClick={() => setActiveTab('admin')} className={`btn ${activeTab === 'admin' ? 'btn-primary' : 'btn-secondary'}`} style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}>Gestão</button>}
        </div>
      </div>

      {/* ===== PUNCH TAB (Employee) ===== */}
      {activeTab === 'punch' && (
        <div className="grid grid-cols-2" style={{ gridTemplateColumns: '1.2fr 0.8fr', gap: '1.5rem' }}>
          <div>
            <div className="card" style={{ textAlign: 'center', padding: '3rem 2rem' }}>
              <div style={{ marginBottom: '2rem' }}>
                <p style={{ fontSize: '1.25rem', color: '#64748b', margin: 0, fontWeight: 500 }}>{currentTime.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
                <h2 style={{ fontSize: '4rem', margin: '0.5rem 0', color: 'var(--color-text)', letterSpacing: '2px' }}>
                  {currentTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </h2>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: '300px', margin: '0 auto' }}>
                <button 
                  onClick={() => handlePunch(nextType)}
                  className="btn btn-primary" 
                  style={{ 
                    height: '100px', fontSize: '1.5rem', borderRadius: '50px',
                    backgroundColor: PUNCH_LABELS[nextType].color, border: 'none',
                    boxShadow: `0 10px 20px ${PUNCH_LABELS[nextType].color}44`
                  }}
                >
                  <PlusCircle size={24} /> {PUNCH_LABELS[nextType].label}
                </button>
                <p style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Proxima marcação sugerida baseada no seu último registro.</p>
              </div>

              <div style={{ marginTop: '3rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div style={{ padding: '1rem', backgroundColor: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                  <p style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700, marginBottom: '0.5rem' }}>Horas Hoje</p>
                  <p style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>06h 15m</p>
                </div>
                <div style={{ padding: '1rem', backgroundColor: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                  <p style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700, marginBottom: '0.5rem' }}>Saldo do Mês</p>
                  <p style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: '#10b981' }}>+02h 30m</p>
                </div>
              </div>
            </div>

            <div className="card" style={{ marginTop: '1.5rem', padding: '1.5rem' }}>
              <h3 style={{ margin: '0 0 1rem', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <ShieldCheck size={20} color="#10b981" /> Segurança e Localização
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                <div className="flex items-center gap-3">
                  <div style={{ padding: '0.5rem', backgroundColor: '#eff6ff', borderRadius: '8px' }}>
                    <MapPin size={20} color="#0a73ff" />
                  </div>
                  <div>
                    <p style={{ fontSize: '0.85rem', fontWeight: 700, margin: 0 }}>Localização Ativa</p>
                    <p style={{ fontSize: '0.75rem', color: '#94a3b8', margin: 0 }}>Escola Vida de Aprendiz (Sede)</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div style={{ padding: '0.5rem', backgroundColor: '#eff6ff', borderRadius: '8px' }}>
                    <Smartphone size={20} color="#0a73ff" />
                  </div>
                  <div>
                    <p style={{ fontSize: '0.85rem', fontWeight: 700, margin: 0 }}>Dispositivo</p>
                    <p style={{ fontSize: '0.75rem', color: '#94a3b8', margin: 0 }}>Browser / Mobile App</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="right-panel">
            <div className="card" style={{ height: '100%', padding: '1.5rem' }}>
              <h3 style={{ margin: '0 0 1.25rem', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <History size={20} color="#64748b" /> Registros Recentes
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {myPunches.slice(0, 6).map(p => (
                  <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem', border: '1px solid #f1f5f9', borderRadius: '10px' }}>
                    <div style={{ width: '4px', height: '24px', backgroundColor: PUNCH_LABELS[p.type].color, borderRadius: '2px' }} />
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: '0.85rem', fontWeight: 700, margin: 0 }}>{PUNCH_LABELS[p.type].label}</p>
                      <p style={{ fontSize: '0.75rem', color: '#94a3b8', margin: 0 }}>{new Date(p.timestamp).toLocaleDateString('pt-BR')}</p>
                    </div>
                    <p style={{ fontSize: '1rem', fontWeight: 800, color: '#1e293b' }}>
                      {new Date(p.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                ))}
                {myPunches.length === 0 && <p className="text-muted" style={{ textAlign: 'center', padding: '2rem' }}>Nenhum registro hoje.</p>}
              </div>
              <button onClick={() => setActiveTab('history')} style={{ width: '100%', marginTop: '1.5rem', background: 'none', border: '1px solid #e2e8f0', padding: '0.6rem', borderRadius: '8px', color: '#64748b', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                Ver histórico completo <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== HISTORY TAB (Employee) ===== */}
      {activeTab === 'history' && (
        <div>
          <div className="card" style={{ marginBottom: '1.5rem', padding: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <select style={{ padding: '0.4rem 0.75rem', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.85rem' }}>
                  <option>Maio / 2026</option>
                  <option>Abril / 2026</option>
                </select>
                <button className="btn btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}>
                  <Download size={16} /> Espelho de Ponto (PDF)
                </button>
              </div>
              <button className="btn btn-primary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}>
                <PlusCircle size={16} /> Solicitar Ajuste
              </button>
            </div>
          </div>

          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                <tr>
                  <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.8rem', color: '#64748b' }}>DATA</th>
                  <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.8rem', color: '#64748b' }}>ENTRADA</th>
                  <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.8rem', color: '#64748b' }}>INTERVALO</th>
                  <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.8rem', color: '#64748b' }}>RETORNO</th>
                  <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.8rem', color: '#64748b' }}>SAÍDA</th>
                  <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.8rem', color: '#64748b' }}>TOTAL</th>
                  <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.8rem', color: '#64748b' }}>STATUS</th>
                </tr>
              </thead>
              <tbody>
                {[...Array(5)].map((_, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '1rem', fontSize: '0.85rem', fontWeight: 600 }}>0{4-i}/05/2026</td>
                    <td style={{ padding: '1rem', fontSize: '0.85rem' }}>08:00</td>
                    <td style={{ padding: '1rem', fontSize: '0.85rem' }}>12:00</td>
                    <td style={{ padding: '1rem', fontSize: '0.85rem' }}>13:00</td>
                    <td style={{ padding: '1rem', fontSize: '0.85rem' }}>17:00</td>
                    <td style={{ padding: '1rem', fontSize: '0.85rem', fontWeight: 700 }}>08h 00m</td>
                    <td style={{ padding: '1rem' }}>
                      <span style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem', backgroundColor: '#f0fdf4', color: '#10b981', borderRadius: '4px', fontWeight: 700 }}>VALIDADO</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ===== ADMIN TAB (Management) ===== */}
      {activeTab === 'admin' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Admin Stats */}
          <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            <div className="card" style={{ padding: '1.25rem' }}>
              <p style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>Colaboradores Ativos</p>
              <p style={{ fontSize: '1.75rem', fontWeight: 800, margin: 0 }}>24 / 28</p>
            </div>
            <div className="card" style={{ padding: '1.25rem' }}>
              <p style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>Solicitações Pendentes</p>
              <p style={{ fontSize: '1.75rem', fontWeight: 800, margin: 0, color: 'var(--color-secondary)' }}>{adjustments.length}</p>
            </div>
            <div className="card" style={{ padding: '1.25rem' }}>
              <p style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>Horas Extras (Mês)</p>
              <p style={{ fontSize: '1.75rem', fontWeight: 800, margin: 0 }}>142h</p>
            </div>
            <div className="card" style={{ padding: '1.25rem' }}>
              <p style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>Alertas de Atraso</p>
              <p style={{ fontSize: '1.75rem', fontWeight: 800, margin: 0, color: '#ef4444' }}>03</p>
            </div>
          </div>

          <div className="grid grid-cols-2" style={{ gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
            {/* Pending Adjustments */}
            <div className="card" style={{ padding: '1.5rem' }}>
              <h3 style={{ margin: '0 0 1.25rem', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <AlertTriangle size={20} color="var(--color-secondary)" /> Ajustes Pendentes
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {adjustments.map(adj => (
                  <div key={adj.id} style={{ padding: '1rem', border: '1px solid #e2e8f0', borderRadius: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                      <p style={{ fontWeight: 700, fontSize: '0.9rem', margin: 0 }}>{adj.userName}</p>
                      <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>{new Date(adj.createdAt).toLocaleDateString()}</span>
                    </div>
                    <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '0.5rem 0' }}>
                      Solicitou <strong>{PUNCH_LABELS[adj.requestedType].label}</strong> para as <strong>{new Date(adj.requestedTime).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</strong>.
                    </p>
                    <p style={{ fontSize: '0.75rem', backgroundColor: '#f8fafc', padding: '0.5rem', borderRadius: '6px', fontStyle: 'italic' }}>
                      "{adj.reason}"
                    </p>
                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                      <button className="btn btn-primary" style={{ padding: '0.4rem 0.75rem', fontSize: '0.75rem', flex: 1 }}>Aprovar</button>
                      <button className="btn btn-secondary" style={{ padding: '0.4rem 0.75rem', fontSize: '0.75rem', flex: 1, backgroundColor: '#fecaca', color: '#991b1b', boxShadow: 'none' }}>Rejeitar</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* General Controls */}
            <div className="card" style={{ padding: '1.5rem' }}>
              <h3 style={{ margin: '0 0 1.25rem', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <FileCheck size={20} color="#0a73ff" /> Fechamento e Relatórios
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ padding: '1rem', backgroundColor: '#f0fdf4', borderRadius: '12px', border: '1px solid #bcf0da' }}>
                  <p style={{ fontWeight: 700, fontSize: '0.9rem', color: '#166534', marginBottom: '0.25rem' }}>Pronto para Fechamento</p>
                  <p style={{ fontSize: '0.8rem', color: '#166534', opacity: 0.8 }}>Folha de Abril/2026: 28/28 espelhos validados.</p>
                  <button className="btn btn-primary" style={{ marginTop: '1rem', width: '100%', fontSize: '0.85rem' }}>Fechar Folha de Ponto</button>
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <button className="btn btn-secondary" style={{ padding: '0.75rem', fontSize: '0.85rem', flex: 1 }}>
                    <Download size={16} /> Arquivo AFDT
                  </button>
                  <button className="btn btn-secondary" style={{ padding: '0.75rem', fontSize: '0.85rem', flex: 1 }}>
                    <Download size={16} /> Arquivo ACJEF
                  </button>
                </div>

                <div style={{ marginTop: '1rem' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Filtrar Visualização</label>
                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                    <select style={{ flex: 1, padding: '0.5rem', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.85rem' }}>
                      <option>Todos os Setores</option>
                      <option>Pedagógico</option>
                      <option>Administrativo</option>
                      <option>Limpeza/Cozinha</option>
                    </select>
                    <button className="btn btn-secondary" style={{ padding: '0.5rem' }}><Filter size={18} /></button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .btn-primary { background: var(--color-primary); color: white; border: none; }
        .btn-secondary { background: #f1f5f9; color: #64748b; border: 1px solid #e2e8f0; }
        @media (max-width: 768px) {
          .grid-cols-2 { grid-template-columns: 1fr !important; }
          .mobile-hide { display: none !important; }
        }
      `}</style>
    </div>
  );
}
