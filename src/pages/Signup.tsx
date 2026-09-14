import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AlertCircle, Rocket } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { PRODUCT_NAME } from '../lib/branding';

/**
 * Cadastro self-serve da escola: 4 campos e a coordenação entra na hora, em
 * trial. O primeiro valor tem de aparecer em minutos — nada de operador,
 * planilha ou senha repassada por WhatsApp.
 */
export function Signup() {
  const navigate = useNavigate();
  const { signIn } = useAuth();
  const [form, setForm] = useState({ school_name: '', admin_name: '', email: '', password: '', website: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm(prev => ({ ...prev, [k]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/public/signup', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(json.error || 'Não foi possível criar a conta.');
      await signIn(form.email.trim(), form.password);
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível criar a conta.');
    } finally {
      setLoading(false);
    }
  };

  const input: React.CSSProperties = { width: '100%', padding: '0.75rem 1rem', border: '2px solid var(--color-border)', borderRadius: '10px', fontSize: '0.95rem', boxSizing: 'border-box' };
  const label: React.CSSProperties = { display: 'block', fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.4rem' };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem 1rem', background: 'linear-gradient(135deg, var(--color-primary-soft) 0%, var(--color-surface-2) 100%)' }}>
      <div className="card" style={{ width: '100%', maxWidth: '480px', padding: '2.5rem 2rem' }}>
        <img src="/logo.svg" alt={PRODUCT_NAME} style={{ maxWidth: '160px', marginBottom: '1.5rem', display: 'block' }} />
        <h1 style={{ margin: '0 0 0.5rem', fontSize: '1.5rem', fontWeight: 800 }}>Criar a conta da escola</h1>
        <p style={{ margin: '0 0 1.75rem', color: 'var(--color-text-muted)', fontSize: '0.95rem', lineHeight: 1.6 }}>
          30 dias grátis, sem cartão. Em 15 minutos você importa os alunos, estrutura o primeiro PEI e convida a professora.
        </p>

        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
          <div>
            <label style={label}>Nome da escola</label>
            <input required minLength={3} value={form.school_name} onChange={set('school_name')} placeholder="Escola Sementinha" style={input} autoFocus />
          </div>
          <div>
            <label style={label}>Seu nome</label>
            <input required minLength={2} value={form.admin_name} onChange={set('admin_name')} placeholder="Maria (coordenação)" style={input} />
          </div>
          <div>
            <label style={label}>Seu e-mail</label>
            <input required type="email" autoComplete="username" value={form.email} onChange={set('email')} placeholder="voce@escola.com.br" style={input} />
          </div>
          <div>
            <label style={label}>Senha</label>
            <input required type="password" minLength={8} autoComplete="new-password" value={form.password} onChange={set('password')} placeholder="mínimo 8 caracteres" style={input} />
          </div>
          {/* honeypot: fica invisível; bots preenchem */}
          <input tabIndex={-1} autoComplete="off" value={form.website} onChange={set('website')} name="website" style={{ position: 'absolute', left: '-9999px', width: 1, height: 1, opacity: 0 }} aria-hidden="true" />

          {error && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1rem', backgroundColor: 'var(--color-danger-soft)', border: '1px solid var(--color-danger-border)', borderRadius: '8px', color: 'var(--color-danger-text)', fontSize: '0.85rem' }}>
              <AlertCircle size={16} style={{ flexShrink: 0 }} /> {error}
            </div>
          )}

          <button type="submit" className="btn btn-primary" disabled={loading} style={{ padding: '0.85rem', fontSize: '1rem', fontWeight: 700, borderRadius: '10px' }}>
            {loading ? 'Criando…' : <><Rocket size={18} /> Criar conta e entrar</>}
          </button>
          <p className="text-muted" style={{ fontSize: '0.78rem', margin: 0, lineHeight: 1.5 }}>
            Ao criar a conta você concorda com os termos de uso e a política de privacidade. Dados de crianças só entram com consentimento dos responsáveis, e você exporta tudo quando quiser.
          </p>
          <p style={{ fontSize: '0.85rem', margin: 0, textAlign: 'center' }}>
            Já tem conta? <Link to="/login" style={{ color: 'var(--color-primary)', fontWeight: 600 }}>Entrar</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
