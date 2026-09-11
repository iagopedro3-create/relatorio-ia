import { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { Eye, EyeOff, LogIn, AlertCircle, Mail } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { PRODUCT_NAME } from '../lib/branding';

/**
 * Tela pública: antes do login não sabemos a escola, então usa a identidade
 * neutra do produto. A marca da escola entra depois que o perfil carrega.
 */
export function Login() {
  const navigate = useNavigate();
  const { signIn, session, loading: authLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [forgot, setForgot] = useState(false);

  if (authLoading) return null;
  if (session) return <Navigate to="/" replace />;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await signIn(email.trim(), password);
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao entrar.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) { setError('Informe o e-mail.'); return; }
    setLoading(true);
    const { error: err } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/redefinir-senha`,
    });
    setLoading(false);
    if (err) { setError(err.message); return; }
    toast.success('Se o e-mail existir, você receberá o link para redefinir a senha.');
    setForgot(false);
  };

  const inputStyle = (hasError: boolean): React.CSSProperties => ({
    width: '100%',
    padding: '0.75rem 1rem',
    border: `2px solid ${hasError ? 'var(--color-danger)' : 'var(--color-border)'}`,
    borderRadius: '10px',
    fontSize: '0.95rem',
    outline: 'none',
    transition: 'border-color 0.2s',
    boxSizing: 'border-box',
  });

  return (
    <div style={{ minHeight: '100vh', display: 'flex', background: 'linear-gradient(135deg, var(--color-primary-soft) 0%, var(--color-surface-2) 100%)' }}>
      <div
        style={{
          flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          padding: '3rem', background: 'linear-gradient(160deg, var(--color-primary) 0%, var(--color-primary-hover) 100%)', color: 'white', minWidth: '340px',
        }}
        className="no-mobile"
      >
        <img src="/logo.svg" alt={PRODUCT_NAME} style={{ maxWidth: '200px', marginBottom: '2.5rem' }} />
        <h1 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '1rem', textAlign: 'center', color: '#ffffff' }}>
          Portal Educacional
        </h1>
        <p style={{ opacity: 0.85, fontSize: '1.05rem', textAlign: 'center', maxWidth: '320px', lineHeight: 1.7 }}>
          Relatórios descritivos com IA, PEI, planejamento e gestão pedagógica em um único lugar.
        </p>
        <div style={{ marginTop: '3rem', display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%', maxWidth: '300px' }}>
          {[
            { icon: '🤖', text: 'Relatórios descritivos com IA' },
            { icon: '🧩', text: 'PEI com metas estruturadas' },
            { icon: '📋', text: 'Notas, frequência e boletim' },
          ].map(item => (
            <div key={item.text} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', backgroundColor: 'rgba(255,255,255,0.12)', padding: '0.75rem 1rem', borderRadius: '10px' }}>
              <span style={{ fontSize: '1.2rem' }}>{item.icon}</span>
              <span style={{ fontSize: '0.9rem', opacity: 0.95 }}>{item.text}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ width: '460px', maxWidth: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '3rem 2.5rem', backgroundColor: 'white', boxShadow: '-4px 0 32px rgba(0,0,0,0.06)' }}>
        <div style={{ width: '100%', maxWidth: '360px' }}>
          <img src="/logo.svg" alt={PRODUCT_NAME} style={{ maxWidth: '180px', marginBottom: '2rem', display: 'block' }} />

          <h2 style={{ margin: '0 0 0.5rem', fontSize: '1.6rem', fontWeight: 800 }}>{forgot ? 'Recuperar senha' : 'Entrar no sistema'}</h2>
          <p style={{ margin: '0 0 2rem', color: 'var(--color-text-muted)', fontSize: '0.95rem' }}>
            {forgot ? 'Informe o e-mail cadastrado e enviaremos o link.' : 'Use o e-mail e a senha criados pela direção da sua escola.'}
          </p>

          <form onSubmit={forgot ? handleForgot : handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div>
              <label style={{ display: 'block', fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.4rem' }}>E-mail</label>
              <input
                type="email"
                required
                autoComplete="username"
                placeholder="voce@escola.com.br"
                value={email}
                onChange={e => setEmail(e.target.value)}
                style={inputStyle(Boolean(error))}
                onFocus={e => { e.target.style.borderColor = 'var(--color-primary)'; setError(''); }}
                onBlur={e => { if (!error) e.target.style.borderColor = 'var(--color-border)'; }}
              />
            </div>

            {!forgot && (
              <div>
                <label style={{ display: 'block', fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.4rem' }}>Senha</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPwd ? 'text' : 'password'}
                    required
                    autoComplete="current-password"
                    placeholder="••••••••"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    style={{ ...inputStyle(Boolean(error)), padding: '0.75rem 3rem 0.75rem 1rem' }}
                    onFocus={e => { e.target.style.borderColor = 'var(--color-primary)'; setError(''); }}
                    onBlur={e => { if (!error) e.target.style.borderColor = 'var(--color-border)'; }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd(!showPwd)}
                    style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-subtle)', padding: '0.25rem' }}
                  >
                    {showPwd ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
            )}

            {error && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1rem', backgroundColor: 'var(--color-danger-soft)', border: '1px solid var(--color-danger-border)', borderRadius: '8px', color: 'var(--color-danger-text)', fontSize: '0.85rem' }}>
                <AlertCircle size={16} style={{ flexShrink: 0 }} />
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary"
              style={{ padding: '0.85rem', fontSize: '1rem', fontWeight: 700, borderRadius: '10px', marginTop: '0.25rem', opacity: loading ? 0.7 : 1 }}
            >
              {loading ? 'Aguarde...' : forgot ? <><Mail size={18} /> Enviar link</> : <><LogIn size={18} /> Entrar no sistema</>}
            </button>

            <button
              type="button"
              onClick={() => { setForgot(!forgot); setError(''); }}
              style={{ background: 'none', border: 'none', color: 'var(--color-primary)', fontWeight: 600, cursor: 'pointer', fontSize: '0.85rem', fontFamily: 'inherit' }}
            >
              {forgot ? 'Voltar para o login' : 'Esqueci minha senha'}
            </button>
          </form>
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) { .no-mobile { display: none !important; } }
      `}</style>
    </div>
  );
}
