import { useState } from 'react';
import { Outlet, Navigate, useNavigate, useLocation } from 'react-router-dom';
import {
  LogOut, Users, Settings, LayoutDashboard, FileText,
  ShieldCheck, Brain, CalendarCheck, BookOpen, ClipboardList,
  GraduationCap, ChevronDown, BookOpenCheck,
  Sliders, UserCog, Baby, FileArchive, Printer, MessageSquareText, Menu, X
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { mockClasses } from '../store/mockDb';
import { motion, AnimatePresence } from 'framer-motion';

interface NavItem {
  name: string;
  path: string;
  icon: React.ReactNode;
}

interface NavGroup {
  label: string;
  icon: React.ReactNode;
  items: NavItem[];
}

export function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, loading } = useAuth();
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    acadêmico: true,
    administrativo: false,
    relatórios: true,
    configurações: false,
  });
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#f6f3dd]">
        <div className="loader"></div>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" />;

  const handleLogout = () => { logout(); navigate('/login'); };

  const toggleGroup = (label: string) => {
    setOpenGroups(prev => ({ ...prev, [label]: !prev[label] }));
  };

  const flatItems: NavItem[] = [];
  const groups: NavGroup[] = [];
  const isResponsible = user.role === 'responsible';

  flatItems.push({ name: 'Início', path: '/', icon: <LayoutDashboard size={18} /> });
  flatItems.push({ name: 'Agenda Digital', path: '/agenda', icon: <MessageSquareText size={18} /> });
  flatItems.push({ name: 'Planejamento de Aula', path: '/planning', icon: <BookOpenCheck size={18} /> });

  const academicoItems: NavItem[] = [];
  
  if (!isResponsible) {
    academicoItems.push({ name: 'Frequência', path: '/attendance', icon: <CalendarCheck size={18} /> });
    academicoItems.push({ name: 'Conteúdos', path: '/lessons', icon: <BookOpen size={18} /> });
    
    if ((user.role === 'admin' || user.role === 'coordinator' || user.specialty === 'english') && user.managedLevel !== 'infantil') {
      academicoItems.push({ name: 'Lançar Notas', path: '/grades', icon: <ClipboardList size={18} /> });
    }
  }

  const isInfantilTeacher = user.role === 'teacher' && mockClasses.find(c => c.teacherId === user.id)?.level === 'infantil';
  const isInfantilCoord = user.role === 'coordinator' && user.managedLevel === 'infantil';
  const hideBulletin = isInfantilTeacher || isInfantilCoord;

  if (!hideBulletin) {
    academicoItems.push({ name: 'Boletim', path: '/bulletin', icon: <BookOpenCheck size={18} /> });
  }
  
  if (!isResponsible) {
    academicoItems.push({ name: 'Imprimir Diário', path: '/diary', icon: <Printer size={18} /> });
    academicoItems.push({ name: 'Gerador de Histórico', path: '/transcript', icon: <FileArchive size={18} /> });
  }
  
  groups.push({ label: 'acadêmico', icon: <GraduationCap size={16} />, items: academicoItems });

  if (!isResponsible) {
    const relatoriosItems: NavItem[] = [
      { name: 'Relatório IA', path: '/reports', icon: <FileText size={18} /> },
    ];
    
    if (user.classId || user.role === 'admin' || user.role === 'coordinator') {
      relatoriosItems.push({ name: 'Gerar PEI', path: '/pei', icon: <Brain size={18} /> });
    }
    
    groups.push({ label: 'relatórios', icon: <FileText size={16} />, items: relatoriosItems });
  }

  if (user.role === 'admin' || user.role === 'coordinator') {
    const adminItems: NavItem[] = [
      { name: 'Turmas',             path: '/classes',    icon: <GraduationCap size={18} /> },
      { name: 'Alunos',            path: '/students',   icon: <Baby size={18} /> },
      { name: 'Usuários',          path: '/users',      icon: <Users size={18} /> },
    ];
    groups.push({ label: 'administrativo', icon: <UserCog size={16} />, items: adminItems });
  }

  if (user.role === 'admin') {
    const configItems: NavItem[] = [
      { name: 'Chave de API', path: '/settings', icon: <Sliders size={18} /> },
    ];
    groups.push({ label: 'configurações', icon: <Settings size={16} />, items: configItems });
  }

  const isActive = (path: string) => location.pathname === path;

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin': return 'Direção';
      case 'coordinator': return 'Coordenação';
      case 'teacher': return 'Professor(a)';
      default: return role;
    }
  };

  const getRoleColorClass = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-purple-600';
      case 'coordinator': return 'bg-[#0a73ff]';
      case 'teacher': return 'bg-[#fd852d]';
      default: return 'bg-slate-500';
    }
  };

  const isAdministrativePath = ['/classes', '/students', '/users', '/transcript'].includes(location.pathname);
  if (isAdministrativePath && user.role !== 'admin' && user.role !== 'coordinator') {
    return <Navigate to="/" />;
  }

  const isConfigPath = ['/settings'].includes(location.pathname);
  if (isConfigPath && user.role !== 'admin') {
    return <Navigate to="/" />;
  }

  return (
    <div className="flex min-h-screen bg-[#f6f3dd]">
      {/* Mobile Top Bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-14 bg-white border-b border-slate-200 z-40 flex items-center justify-between px-4">
        <button onClick={() => setMobileMenuOpen(true)} className="p-2 text-slate-700 bg-transparent border-none">
          <Menu size={24} />
        </button>
        <img src="/logo.png" alt="Vida de Aprendiz" className="h-8" />
        <div className="w-10"></div>
      </div>

      {/* Mobile Overlay */}
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
        {/* Logo + Close on mobile */}
        <div className="px-5 mb-6 flex items-center justify-between">
          <img src="/logo.png" alt="Vida de Aprendiz" className="max-w-[160px]" />
          <button className="md:hidden p-1 text-slate-400 bg-transparent border-none" onClick={() => setMobileMenuOpen(false)}>
            <X size={20} />
          </button>
        </div>

        {/* User Badge */}
        <div className="px-5 pb-4 mb-4 border-b border-slate-200">
          <p className="text-xs font-semibold text-slate-400 uppercase m-0">Bem-vindo(a)</p>
          <p className="font-bold text-slate-800 text-base my-1">{user.name}</p>
          <span className={`text-[10px] text-white px-2 py-0.5 rounded-full font-bold uppercase tracking-wider inline-flex items-center gap-1 ${getRoleColorClass(user.role)}`}>
            {user.role === 'admin' && <ShieldCheck size={10} />}
            {getRoleLabel(user.role)}
          </span>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 space-y-1">
          {/* Flat top items */}
          {flatItems.map(item => (
            <button 
              key={item.path} 
              onClick={() => { navigate(item.path); setMobileMenuOpen(false); }} 
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm transition-colors bg-transparent border-none cursor-pointer ${isActive(item.path) ? 'text-[#0a73ff] bg-blue-50 font-semibold' : 'text-slate-500 hover:bg-slate-50 font-medium'}`}
            >
              <div className={isActive(item.path) ? 'text-[#0a73ff]' : 'text-slate-400'}>
                {item.icon}
              </div>
              {item.name}
            </button>
          ))}

          {/* Grouped sections */}
          <div className="mt-4">
            {groups.map(group => {
              const isOpen = openGroups[group.label] ?? true;
              const hasActive = group.items.some(i => isActive(i.path));
              return (
                <div key={group.label} className="mb-2">
                  <button
                    onClick={() => toggleGroup(group.label)}
                    className={`w-full flex items-center justify-between px-4 py-2 text-xs font-bold tracking-widest uppercase transition-colors bg-transparent border-none cursor-pointer ${hasActive ? 'text-[#0a73ff]' : 'text-slate-400 hover:text-slate-600'}`}
                  >
                    <span className="flex items-center gap-2">
                      {group.icon}
                      {group.label}
                    </span>
                    <motion.div
                      animate={{ rotate: isOpen ? 180 : 0 }}
                      transition={{ duration: 0.2 }}
                    >
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
                              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm transition-colors bg-transparent border-none cursor-pointer ${isActive(item.path) ? 'text-[#0a73ff] bg-blue-50 font-semibold' : 'text-slate-500 hover:bg-slate-50 font-medium'}`}
                            >
                              <div className={isActive(item.path) ? 'text-[#0a73ff]' : 'text-slate-400'}>
                                {item.icon}
                              </div>
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

        {/* Logout */}
        <div className="px-5 pt-4 border-t border-slate-200 mt-auto">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border border-slate-200 rounded-lg text-slate-500 font-medium text-sm transition-colors hover:bg-slate-50 hover:text-red-500 bg-transparent cursor-pointer"
          >
            <LogOut size={16} /> Sair do Sistema
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 px-4 py-6 md:px-8 md:py-8 md:ml-64 pt-20 md:pt-8 min-h-screen">
        <Outlet />
      </main>
    </div>
  );
}
