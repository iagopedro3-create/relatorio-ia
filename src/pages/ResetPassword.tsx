import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { KeyRound } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../lib/supabase';
import { PRODUCT_NAME } from '../lib/branding';

/** Destino do link de "esqueci minha senha". O Supabase abre a sessão de recuperação pela URL. */
export function ResetPassword() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setReady(Boolean(data.session)));
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') setReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) { toast.error('A senha precisa ter ao menos 8 caracteres.'); return; }
    if (password !== confirm) { toast.error('As senhas não conferem.'); return; }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    toast.success('Senha redefinida. Bem-vindo(a) de volta!');
    navigate('/');
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-bg)', padding: '1.5rem' }}>
      <div className="card" style={{ maxWidth: '420px', width: '100%' }}>
        <img src="/logo.svg" alt={PRODUCT_NAME} style={{ maxWidth: '160px', marginBottom: '1.5rem' }} />
        <h2 className="flex items-center gap-2"><KeyRound size={22} /> Nova senha</h2>
        {!ready ? (
          <p className="text-muted">Validando o link... Se esta tela não mudar, abra o link do e-mail novamente.</p>
        ) : (
          <form onSubmit={submit} className="flex flex-col gap-4">
            <div className="form-group" style={{ margin: 0 }}>
              <label>Nova senha</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} autoComplete="new-password" required minLength={8} />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label>Confirmar senha</label>
              <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} autoComplete="new-password" required minLength={8} />
            </div>
            <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? 'Salvando...' : 'Salvar nova senha'}</button>
          </form>
        )}
      </div>
    </div>
  );
}
