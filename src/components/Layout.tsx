import { useState } from 'react';
import { Outlet, Navigate, useNavigate, useLocation } from 'react-router-dom';
import {
  LogOut, Users, Settings, LayoutDashboard, FileText,
  ShieldCheck, Brain, CalendarCheck, BookOpen, ClipboardList,
  GraduationCap, ChevronDown, ChevronRight, BookOpenCheck,
  Sliders, UserCog, Baby, FileArchive, Printer, MessageSquareText, Menu, X
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

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
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: 'var(--color-bg)' }}>
        <div className="loader"></div>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" />;

  const handleLogout = () => { logout(); navigate('/login'); };

  const toggleGroup = (label: string) => {
    setOpenGroups(prev => ({ ...prev, [label]: !prev[label] }));
  };

  // ----- Build nav structure based on role -----
  const flatItems: NavItem[] = [];
  const groups: NavGroup[] = [];

  // INÍCIO — everyone
  flatItems.push({ name: 'Início', path: '/', icon: <LayoutDashboard size={18} /> });
  flatItems.push({ name: 'Agenda Digital', path: '/agenda', icon: <MessageSquareText size={18} /> });

  // ACADÊMICO — everyone
  const academicoItems: NavItem[] = [
    { name: 'Frequência', path: '/attendance', icon: <CalendarCheck size={18} /> },
    { name: 'Conteúdos', path: '/lessons', icon: <BookOpen size={18} /> },
  ];

  // Specialists/Admins see grades
  if (user.role === 'admin' || user.role === 'coordinator' || user.specialty === 'english') {
    academicoItems.push({ name: 'Lançar Notas', path: '/grades', icon: <ClipboardList size={18} /> });
  }
  
  academicoItems.push({ name: 'Boletim', path: '/bulletin', icon: <BookOpenCheck size={18} /> });
  academicoItems.push({ name: 'Imprimir Diário', path: '/diary', icon: <Printer size={18} /> });
  
  groups.push({ label: 'acadêmico', icon: <GraduationCap size={16} />, items: academicoItems });

  // RELATÓRIOS — everyone
  const relatoriosItems: NavItem[] = [
    { name: 'Relatório IA', path: '/reports', icon: <FileText size={18} /> },
  ];
  
  // Class teachers see PEI
  if (user.classId || user.role === 'admin' || user.role === 'coordinator') {
    relatoriosItems.push({ name: 'Gerar PEI', path: '/pei', icon: <Brain size={18} /> });
  }
  
  groups.push({ label: 'relatórios', icon: <FileText size={16} />, items: relatoriosItems });

  // ADMINISTRATIVO — admin + coordinator only
  if (user.role === 'admin' || user.role === 'coordinator') {
    const adminItems: NavItem[] = [
      { name: 'Turmas',             path: '/classes',    icon: <GraduationCap size={18} /> },
      { name: 'Alunos',            path: '/students',   icon: <Baby size={18} /> },
      { name: 'Histórico Escolar', path: '/transcript', icon: <FileArchive size={18} /> },
      { name: 'Usuários',          path: '/users',      icon: <Users size={18} /> },
    ];
    groups.push({ label: 'administrativo', icon: <UserCog size={16} />, items: adminItems });
  }

  // CONFIGURAÇÕES — admin only
  if (user.role === 'admin') {
    const configItems: NavItem[] = [
      { name: 'Chave de API', path: '/settings', icon: <Sliders size={18} /> },
    ];
    groups.push({ label: 'configurações', icon: <Settings size={16} />, items: configItems });
  }

  const isActive = (path: string) => location.pathname === path;

  const navBtnStyle = (active: boolean): React.CSSProperties => ({
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    gap: '0.65rem',
    padding: '0.7rem 1.25rem 0.7rem 2rem',
    backgroundColor: active ? 'rgba(10, 115, 255, 0.1)' : 'transparent',
    color: active ? 'var(--color-primary)' : '#64748b',
    border: 'none',
    borderRight: active ? '3px solid var(--color-primary)' : '3px solid transparent',
    cursor: 'pointer',
    textAlign: 'left',
    fontFamily: 'var(--font-sans)',
    fontSize: '0.88rem',
    fontWeight: active ? 600 : 400,
    transition: 'all 0.15s',
  });

  const groupHeaderStyle: React.CSSProperties = {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0.55rem 1.25rem',
    backgroundColor: 'transparent',
    border: 'none',
    cursor: 'pointer',
    fontFamily: 'var(--font-sans)',
    fontSize: '0.7rem',
    fontWeight: 700,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    color: '#94a3b8',
    marginTop: '0.5rem',
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin': return 'Direção';
      case 'coordinator': return 'Coordenação';
      case 'teacher': return 'Professor(a)';
      default: return role;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return '#9333ea';
      case 'coordinator': return 'var(--color-primary)';
      case 'teacher': return 'var(--color-secondary)';
      default: return '#64748b';
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
    <div className="flex" style={{ minHeight: '100vh' }}>
      {/* Mobile Top Bar */}
      <div className="mobile-topbar" style={{
        display: 'none', position: 'fixed', top: 0, left: 0, right: 0, height: '56px',
        backgroundColor: 'var(--color-surface)', borderBottom: '1px solid var(--color-border)',
        zIndex: 1001, padding: '0 1rem', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <button onClick={() => setMobileMenuOpen(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.5rem' }}>
          <Menu size={24} color="var(--color-text)" />
        </button>
        <img src="/logo.png" alt="Vida de Aprendiz" style={{ height: '32px' }} />
        <div style={{ width: '40px' }} />
      </div>

      {/* Mobile Overlay */}
      {mobileMenuOpen && (
        <div onClick={() => setMobileMenuOpen(false)} style={{
          position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1002,
        }} />
      )}

      {/* Sidebar */}
      <aside className="app-sidebar" style={{
        width: '240px',
        backgroundColor: 'var(--color-surface)',
        borderRight: '1px solid var(--color-border)',
        display: 'flex',
        flexDirection: 'column',
        padding: '1.25rem 0',
        position: 'fixed',
        height: '100vh',
        overflowY: 'auto',
        zIndex: 1003,
        transition: 'transform 0.3s ease',
      }}>
        {/* Logo + Close on mobile */}
        <div style={{ padding: '0 1.25rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <img src="/logo.png" alt="Vida de Aprendiz" style={{ maxWidth: '160px' }} />
          <button className="mobile-close-btn" onClick={() => setMobileMenuOpen(false)} style={{ display: 'none', background: 'none', border: 'none', cursor: 'pointer', padding: '0.25rem' }}>
            <X size={20} color="#94a3b8" />
          </button>
        </div>

        {/* User Badge */}
        <div style={{ padding: '0.75rem 1.25rem', marginBottom: '1rem', borderBottom: '1px solid var(--color-border)' }}>
          <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: 0, fontWeight: 600, textTransform: 'uppercase' }}>Bem-vindo(a)</p>
          <p style={{ fontWeight: 700, color: 'var(--color-text)', fontSize: '0.95rem', margin: '0.2rem 0' }}>{user.name}</p>
          <span style={{
            fontSize: '0.65rem',
            backgroundColor: getRoleColor(user.role),
            color: '#fff',
            padding: '0.1rem 0.5rem',
            borderRadius: '1rem',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.25rem',
          }}>
            {user.role === 'admin' && <ShieldCheck size={10} />}
            {getRoleLabel(user.role)}
          </span>
        </div>

        <nav style={{ flex: 1 }}>
          {/* Flat top item: Início */}
          {flatItems.map(item => (
            <button key={item.path} onClick={() => { navigate(item.path); setMobileMenuOpen(false); }} style={navBtnStyle(isActive(item.path))}>
              {item.icon}
              {item.name}
            </button>
          ))}

          {/* Grouped sections */}
          {groups.map(group => {
            const isOpen = openGroups[group.label] ?? true;
            const hasActive = group.items.some(i => isActive(i.path));
            return (
              <div key={group.label}>
                <button
                  onClick={() => toggleGroup(group.label)}
                  style={{
                    ...groupHeaderStyle,
                    color: hasActive ? 'var(--color-primary)' : '#94a3b8',
                  }}
                >
                  <span className="flex items-center gap-2">
                    {group.icon}
                    {group.label}
                  </span>
                  {isOpen
                    ? <ChevronDown size={12} />
                    : <ChevronRight size={12} />}
                </button>

                {isOpen && (
                  <div>
                    {group.items.map(item => (
                      <button
                        key={item.path}
                        onClick={() => { navigate(item.path); setMobileMenuOpen(false); }}
                        style={navBtnStyle(isActive(item.path))}
                      >
                        {item.icon}
                        {item.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* Logout */}
        <div style={{ padding: '1rem 1.25rem', borderTop: '1px solid var(--color-border)' }}>
          <button
            onClick={handleLogout}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: '0.5rem',
              padding: '0.75rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)',
              backgroundColor: 'transparent', cursor: 'pointer', color: '#64748b',
              fontFamily: 'var(--font-sans)', fontWeight: 500, fontSize: '0.88rem',
              transition: 'all 0.15s',
            }}
          >
            <LogOut size={16} /> Sair do Sistema
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="app-main" style={{ flex: 1, padding: '2rem', marginLeft: '240px', minHeight: '100vh', backgroundColor: 'var(--color-bg)' }}>
        <Outlet />
      </main>

      <style>{`
        @media (max-width: 768px) {
          .mobile-topbar { display: flex !important; }
          .app-sidebar { transform: ${mobileMenuOpen ? 'translateX(0)' : 'translateX(-100%)'}; }
          .app-main { margin-left: 0 !important; padding: 1rem 0.75rem !important; padding-top: 72px !important; }
          .mobile-close-btn { display: block !important; }
        }
      `}</style>
    </div>
  );
}
