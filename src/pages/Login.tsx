import { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { mockUsers } from '../store/mockDb';
import { useAuth } from '../contexts/AuthContext';
import { Eye, EyeOff, LogIn, AlertCircle } from 'lucide-react';

export function Login() {
  const navigate = useNavigate();
  const { login, user, loading: authLoading } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd]   = useState(false);
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);

  if (authLoading) return null;
  if (user) return <Navigate to="/" replace />;

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    setTimeout(() => {
      const user = mockUsers.find(
        u => u.username.toLowerCase() === username.toLowerCase().trim() && u.password === password
      );

      if (user) {
        login(user);
        navigate('/');
      } else {
        setError('E-mail ou senha incorretos. Verifique seus dados e tente novamente.');
      }
      setLoading(false);
    }, 600); // simulate network delay
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      background: 'linear-gradient(135deg, #f0f7ff 0%, #fafafa 100%)',
    }}>
      {/* Left panel — branding */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '3rem',
        background: 'linear-gradient(160deg, #0a73ff 0%, #4f46e5 100%)',
        color: 'white',
        minWidth: '340px',
      }} className="no-mobile">
        <img src="/logo.png" alt="Vida de Aprendiz" style={{ maxWidth: '200px', marginBottom: '2.5rem' }} />
        <h1 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '1rem', textAlign: 'center', color: '#ffffff' }}>
          Portal Educacional
        </h1>
        <p style={{ opacity: 0.85, fontSize: '1.05rem', textAlign: 'center', maxWidth: '320px', lineHeight: 1.7 }}>
          Planejamento, relatórios e gestão escolar em um único lugar para a equipe da Vida de Aprendiz.
        </p>

        <div style={{ marginTop: '3rem', display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%', maxWidth: '300px' }}>
          {[
            { icon: '📋', text: 'Lançamento de notas e frequência' },
            { icon: '🤖', text: 'Relatórios descritivos com IA' },
            { icon: '📊', text: 'Boletim e acompanhamento de turmas' },
          ].map(item => (
            <div key={item.text} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', backgroundColor: 'rgba(255,255,255,0.12)', padding: '0.75rem 1rem', borderRadius: '10px' }}>
              <span style={{ fontSize: '1.2rem' }}>{item.icon}</span>
              <span style={{ fontSize: '0.9rem', opacity: 0.95 }}>{item.text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel — login form */}
      <div style={{
        width: '460px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '3rem 2.5rem',
        backgroundColor: 'white',
        boxShadow: '-4px 0 32px rgba(0,0,0,0.06)',
      }}>
        <div style={{ width: '100%', maxWidth: '360px' }}>
          {/* Logo — always visible on right panel */}
          <img src="/logo.png" alt="Vida de Aprendiz" style={{ maxWidth: '180px', marginBottom: '2rem', display: 'block' }} />

          <h2 style={{ margin: '0 0 0.5rem', fontSize: '1.6rem', fontWeight: 800 }}>Entrar no sistema</h2>
          <p style={{ margin: '0 0 2rem', color: '#64748b', fontSize: '0.95rem' }}>
            Use o usuário e senha criados pela Direção.
          </p>

          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div>
              <label style={{ display: 'block', fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.4rem' }}>
                Usuário
              </label>
              <input
                type="text"
                required
                autoComplete="username"
                placeholder="Ex: maria"
                value={username}
                onChange={e => setUsername(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem',
                  border: `2px solid ${error ? '#ef4444' : '#e2e8f0'}`,
                  borderRadius: '10px',
                  fontSize: '0.95rem',
                  outline: 'none',
                  transition: 'border-color 0.2s',
                  boxSizing: 'border-box',
                }}
                onFocus={e => { e.target.style.borderColor = '#0a73ff'; setError(''); }}
                onBlur={e => { if (!error) e.target.style.borderColor = '#e2e8f0'; }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.4rem' }}>
                Senha
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPwd ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.75rem 3rem 0.75rem 1rem',
                    border: `2px solid ${error ? '#ef4444' : '#e2e8f0'}`,
                    borderRadius: '10px',
                    fontSize: '0.95rem',
                    outline: 'none',
                    transition: 'border-color 0.2s',
                    boxSizing: 'border-box',
                  }}
                  onFocus={e => { e.target.style.borderColor = '#0a73ff'; setError(''); }}
                  onBlur={e => { if (!error) e.target.style.borderColor = '#e2e8f0'; }}
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(!showPwd)}
                  style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: '0.25rem' }}
                >
                  {showPwd ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {error && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1rem', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', color: '#991b1b', fontSize: '0.85rem' }}>
                <AlertCircle size={16} style={{ flexShrink: 0 }} />
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary"
              style={{ padding: '0.85rem', fontSize: '1rem', fontWeight: 700, borderRadius: '10px', marginTop: '0.25rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', opacity: loading ? 0.7 : 1 }}
            >
              {loading ? (
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" style={{ animation: 'spin 1s linear infinite' }}>
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="31.4" strokeDashoffset="10" />
                  </svg>
                  Entrando...
                </span>
              ) : (
                <><LogIn size={18} /> Entrar no sistema</>
              )}
            </button>
          </form>

          {/* Credentials hint (dev mode) */}
          <div style={{ marginTop: '2rem', padding: '1rem', backgroundColor: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
            <p style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 0.5rem' }}>
              Usuários de Teste
            </p>
            {[
              { label: 'Direção', user: 'diretora', pwd: 'direcao123' },
              { label: 'Coord. Infantil', user: 'coordinfantil', pwd: 'coord123' },
              { label: 'Coord. Fundamental', user: 'coordfundamental', pwd: 'coord123' },
              { label: 'Prof. Infantil', user: 'profinfantil', pwd: 'prof123' },
              { label: 'Prof. Fundamental', user: 'proffundamental', pwd: 'prof123' },
              { label: 'Responsável', user: 'pai', pwd: 'pai123' },
            ].map(c => (
              <button
                key={c.label + c.user}
                type="button"
                onClick={() => { setUsername(c.user); setPassword(c.pwd); setError(''); }}
                style={{ display: 'block', width: '100%', textAlign: 'left', background: 'none', border: 'none', padding: '0.35rem 0', cursor: 'pointer', fontSize: '0.82rem', color: '#0a73ff', fontFamily: 'inherit' }}
              >
                <strong>{c.label}:</strong> {c.user} / {c.pwd}
              </button>
            ))}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @media (max-width: 768px) { .no-mobile { display: none !important; } }
        @media (min-width: 769px) { .mobile-only { display: none !important; } }
      `}</style>
    </div>
  );
}
