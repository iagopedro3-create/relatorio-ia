import { useState } from 'react';
import { Outlet, Navigate, useNavigate, useLocation } from 'react-router-dom';
import {
  LogOut, Users, Settings, LayoutDashboard, FileText,
  ShieldCheck, Brain, CalendarCheck, BookOpen, ClipboardList,
  GraduationCap, ChevronDown, BookOpenCheck,
  Sliders, UserCog, Baby, FileArchive, Printer, MessageSquareText, Menu, X, Building2, AlertTriangle, Sparkles,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useSchool } from '../contexts/SchoolContext';
import type { FeatureKey } from '../contexts/SchoolContext';
import { logoUrl, PRODUCT_NAME } from '../lib/branding';
import { motion, AnimatePresence } from 'framer-motion';

interface NavItem {
  name: string;
  path: string;
  icon: React.ReactNode;
  feature?: FeatureKey;
}

interface NavGroup {
  label: string;
  icon: React.ReactNode;
  items: NavItem[];
}

const ROLE_LABEL: Record<string, string> = {
  admin: 'Direção',
  coordinator: 'Coordenação',
  teacher: 'Professor(a)',
  guardian: 'Responsável',
};

const ROLE_CLASS: Record<string, string> = {
  admin: 'bg-[var(--color-primary-text)]',
  coordinator: 'bg-[var(--color-primary)]',
  teacher: 'bg-[var(--color-secondary)]',
  guardian: 'bg-slate-500',
};

export function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, session, isPlatformAdmin, loading, signOut } = useAuth();
  const { school, classes, hasFeature, subscriptionOk, subscriptionMessage, aiUsage, loading: schoolLoading } = useSchool();
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    acadêmico: true,
    administrativo: false,
    relatórios: true,
    configurações: false,
  });
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  if (loading || (session && user && schoolLoading && !school)) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[var(--color-bg)]">
        <div className="loader" style={{ borderTopColor: 'var(--color-primary)', borderColor: 'rgba(0,0,0,0.1)' }}></div>
      </div>
    );
  }

  if (!session) return <Navigate to="/login" />;

  // Admin da plataforma sem perfil em escola: só o backoffice faz sentido.
  if (!user) {
    if (isPlatformAdmin) {
      if (location.pathname !== '/admin') return <Navigate to="/admin" />;
      return (
        <div className="min-h-screen bg-[var(--color-bg)]">
          <div className="max-w-6xl mx-auto px-4 py-6 md:px-8">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2 font-bold text-slate-700"><Building2 size={20} /> {PRODUCT_NAME} · Operação</div>
              <button onClick={() => { void signOut(); navigate('/login'); }} className="btn btn-secondary" style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}>
                <LogOut size={16} /> Sair
              </button>
            </div>
            <Outlet />
          </div>
        </div>
      );
    }
    return (
      <div className="flex items-center justify-center min-h-screen bg-[var(--color-bg)] p-6">
        <div className="card text-center max-w-md">
          <AlertTriangle size={40} className="mx-auto mb-4" color="var(--color-warning)" />
          <h2>Conta sem escola vinculada</h2>
          <p className="text-muted">Seu login existe, mas nenhuma escola te cadastrou como usuário. Peça à direção da sua escola para criar seu acesso.</p>
          <button onClick={() => { void signOut(); navigate('/login'); }} className="btn btn-primary mt-4"><LogOut size={16} /> Sair</button>
        </div>
      </div>
    );
  }

  const handleLogout = () => { void signOut(); navigate('/login'); };

  const toggleGroup = (label: string) => {
    setOpenGroups(prev => ({ ...prev, [label]: !prev[label] }));
  };

  const isGuardian = user.role === 'guardian';
  const isManager = user.role === 'admin' || user.role === 'coordinator';
  const isInfantilTeacher = user.role === 'teacher' && classes.some(c => c.homeroom_teacher_id === user.id && c.level === 'infantil');
  const isInfantilCoord = user.role === 'coordinator' && user.managed_level === 'infantil';

  const flatItems: NavItem[] = [{ name: 'Início', path: '/', icon: <LayoutDashboard size={18} /> }];
  flatItems.push({ name: 'Agenda Digital', path: '/agenda', icon: <MessageSquareText size={18} />, feature: 'agenda' });
  if (!isGuardian) flatItems.push({ name: 'Planejamento de Aula', path: '/planning', icon: <BookOpenCheck size={18} />, feature: 'planning' });

  const groups: NavGroup[] = [];
  const academicoItems: NavItem[] = [];

  if (!isGuardian) {
    academicoItems.push({ name: 'Frequência', path: '/attendance', icon: <CalendarCheck size={18} /> });
    academicoItems.push({ name: 'Conteúdos', path: '/lessons', icon: <BookOpen size={18} /> });
    if (!isInfantilTeacher && !isInfantilCoord) {
      academicoItems.push({ name: 'Lançar Notas', path: '/grades', icon: <ClipboardList size={18} />, feature: 'grades' });
    }
  }
  // Responsável só vê Boletim se algum filho estiver em turma com nota.
  const guardianHasNumeric = !isGuardian || classes.some(c => c.evaluation_type === 'numeric');
  if (!isInfantilTeacher && !isInfantilCoord && guardianHasNumeric) {
    academicoItems.push({ name: 'Boletim', path: '/bulletin', icon: <BookOpenCheck size={18} />, feature: 'bulletin' });
  }
  if (!isGuardian) {
    academicoItems.push({ name: 'Imprimir Diário', path: '/diary', icon: <Printer size={18} /> });
    academicoItems.push({ name: 'Inteligência Pedagógica', path: '/intelligence', icon: <Sparkles size={18} />, feature: 'pedagogical' });
  }
  if (isManager) {
    academicoItems.push({ name: 'Histórico Escolar', path: '/transcript', icon: <FileArchive size={18} />, feature: 'transcript' });
  }
  groups.push({ label: 'acadêmico', icon: <GraduationCap size={16} />, items: academicoItems });

  if (!isGuardian) {
    groups.push({
      label: 'relatórios',
      icon: <FileText size={16} />,
      items: [
        { name: 'Relatório IA', path: '/reports', icon: <FileText size={18} />, feature: 'report' },
        { name: 'Gerar PEI', path: '/pei', icon: <Brain size={18} />, feature: 'pei' },
      ],
    });
  }

  if (isManager) {
    groups.push({
      label: 'administrativo',
      icon: <UserCog size={16} />,
      items: [
        { name: 'Turmas', path: '/classes', icon: <GraduationCap size={18} /> },
        { name: 'Alunos', path: '/students', icon: <Baby size={18} /> },
        { name: 'Usuários', path: '/users', icon: <Users size={18} /> },
      ],
    });
  }

  if (user.role === 'admin') {
    groups.push({
      label: 'configurações',
      icon: <Settings size={16} />,
      items: [{ name: 'Escola e Marca', path: '/settings', icon: <Sliders size={18} /> }],
    });
  }

  if (isPlatformAdmin) {
    groups.push({
      label: 'plataforma',
      icon: <Building2 size={16} />,
      items: [{ name: 'Backoffice', path: '/admin', icon: <Building2 size={18} /> }],
    });
  }

  // Esconde o que o plano não inclui.
  for (const g of groups) g.items = g.items.filter(i => !i.feature || hasFeature(i.feature));
  const visibleFlat = flatItems.filter(i => !i.feature || hasFeature(i.feature));
  const visibleGroups = groups.filter(g => g.items.length > 0);

  const isActive = (path: string) => location.pathname === path;

  // Guardas de rota.
  const managerPaths = ['/classes', '/students', '/users', '/transcript'];
  if (managerPaths.includes(location.pathname) && !isManager) return <Navigate to="/" />;
  if (location.pathname === '/settings' && user.role !== 'admin') return <Navigate to="/" />;
  if (location.pathname === '/admin' && !isPlatformAdmin) return <Navigate to="/" />;
  if (location.pathname.startsWith('/students/') && isGuardian) return <Navigate to="/" />;
  const blockedWhenInactive = !subscriptionOk && location.pathname !== '/settings' && location.pathname !== '/';

  const logo = logoUrl(school);
  const schoolName = school?.name ?? PRODUCT_NAME;

  return (
    <div className="flex min-h-screen bg-[var(--color-bg)]">
      {/* Mobile Top Bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-14 bg-white border-b border-slate-200 z-40 flex items-center justify-between px-4">
        <button onClick={() => setMobileMenuOpen(true)} className="p-2 text-slate-700 bg-transparent border-none">
          <Menu size={24} />
        </button>
        <img src={logo} alt={schoolName} className="h-8 max-w-[160px] object-contain" />
        <div className="w-10"></div>
      </div>

      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setMobileMenuOpen(false)}
            className="fixed inset-0 bg-black/50 z-40 md:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside className={`fixed top-0 left-0 h-full w-64 bg-white border-r border-slate-200 z-50 transform transition-transform duration-300 ease-in-out md:translate-x-0 ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} flex flex-col py-5 shadow-xl md:shadow-none`}>
        <div className="px-5 mb-6 flex items-center justify-between">
          <img src={logo} alt={schoolName} className="max-w-[160px] max-h-16 object-contain" />
          <button className="md:hidden p-1 text-slate-400 bg-transparent border-none" onClick={() => setMobileMenuOpen(false)}>
            <X size={20} />
          </button>
        </div>

        <div className="px-5 pb-4 mb-4 border-b border-slate-200">
          <p className="text-xs font-semibold text-slate-400 uppercase m-0">{schoolName}</p>
          <p className="font-bold text-slate-800 text-base my-1">{user.name}</p>
          <span className={`text-[10px] text-white px-2 py-0.5 rounded-full font-bold uppercase tracking-wider inline-flex items-center gap-1 ${ROLE_CLASS[user.role]}`}>
            {user.role === 'admin' && <ShieldCheck size={10} />}
            {ROLE_LABEL[user.role]}
          </span>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 space-y-1">
          {visibleFlat.map(item => (
            <button
              key={item.path}
              onClick={() => { navigate(item.path); setMobileMenuOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm transition-colors bg-transparent border-none cursor-pointer ${isActive(item.path) ? 'text-[var(--color-primary)] bg-slate-100 font-semibold' : 'text-slate-500 hover:bg-slate-50 font-medium'}`}
            >
              <div className={isActive(item.path) ? 'text-[var(--color-primary)]' : 'text-slate-400'}>{item.icon}</div>
              {item.name}
            </button>
          ))}

          <div className="mt-4">
            {visibleGroups.map(group => {
              const isOpen = openGroups[group.label] ?? true;
              const hasActive = group.items.some(i => isActive(i.path));
              return (
                <div key={group.label} className="mb-2">
                  <button
                    onClick={() => toggleGroup(group.label)}
                    className={`w-full flex items-center justify-between px-4 py-2 text-xs font-bold tracking-widest uppercase transition-colors bg-transparent border-none cursor-pointer ${hasActive ? 'text-[var(--color-primary)]' : 'text-slate-400 hover:text-slate-600'}`}
                  >
                    <span className="flex items-center gap-2">{group.icon}{group.label}</span>
                    <motion.div animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
                      <ChevronDown size={14} />
                    </motion.div>
                  </button>
                  <AnimatePresence>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="mt-1 space-y-1">
                          {group.items.map(item => (
                            <button
                              key={item.path}
                              onClick={() => { navigate(item.path); setMobileMenuOpen(false); }}
                              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm transition-colors bg-transparent border-none cursor-pointer ${isActive(item.path) ? 'text-[var(--color-primary)] bg-slate-100 font-semibold' : 'text-slate-500 hover:bg-slate-50 font-medium'}`}
                            >
                              <div className={isActive(item.path) ? 'text-[var(--color-primary)]' : 'text-slate-400'}>{item.icon}</div>
                              {item.name}
                            </button>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </nav>

        {aiUsage.limit !== null && isManager && (
          <div className="px-5 pb-3 text-[11px] text-slate-400">
            IA este mês: <strong className="text-slate-600">{aiUsage.used}</strong> / {aiUsage.limit}
          </div>
        )}

        <div className="px-5 pt-4 border-t border-slate-200 mt-auto">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border border-slate-200 rounded-lg text-slate-500 font-medium text-sm transition-colors hover:bg-slate-50 hover:text-red-500 bg-transparent cursor-pointer"
          >
            <LogOut size={16} /> Sair do Sistema
          </button>
        </div>
      </aside>

      <main className="flex-1 min-w-0 px-4 py-6 md:px-8 md:py-8 md:ml-64 pt-20 md:pt-8 min-h-screen">
        {subscriptionMessage && (
          <div className={`no-print mb-6 rounded-lg px-4 py-3 text-sm flex items-center gap-2 ${subscriptionOk ? 'bg-amber-50 text-amber-800 border border-amber-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
            <AlertTriangle size={16} /> {subscriptionMessage}
          </div>
        )}
        {blockedWhenInactive ? (
          <div className="card text-center max-w-lg mx-auto">
            <AlertTriangle size={40} className="mx-auto mb-4" color="var(--color-danger)" />
            <h2>Acesso indisponível</h2>
            <p className="text-muted">{subscriptionMessage}</p>
          </div>
        ) : (
          <Outlet />
        )}
      </main>
    </div>
  );
}
