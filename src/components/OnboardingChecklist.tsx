import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, Circle, Rocket, X } from 'lucide-react';
import { useSchool } from '../contexts/SchoolContext';

interface Props {
  /** Total de alunos cadastrados (vem da tela, que já carrega a lista). */
  studentsCount: number;
  loading?: boolean;
}

/**
 * Primeiros passos da escola, na ordem em que o sistema precisa deles:
 * ano letivo → turmas → alunos → equipe → marca. Some quando tudo está feito
 * (ou quando a direção fecha, por escola, no navegador).
 */
export function OnboardingChecklist({ studentsCount, loading }: Props) {
  const navigate = useNavigate();
  const { school, years, classes, staff } = useSchool();
  const storageKey = `onboarding-hidden:${school?.id ?? ''}`;
  const [hidden, setHidden] = useState(() => {
    try { return localStorage.getItem(storageKey) === '1'; } catch { return false; }
  });

  if (!school || hidden || loading) return null;

  const steps = [
    { id: 'year', label: 'Criar o ano letivo', hint: 'Turmas e matrículas pertencem a um ano.', done: years.length > 0, path: '/settings?tab=years' },
    { id: 'classes', label: 'Cadastrar as turmas', hint: 'Série, nível e professor(a) regente.', done: classes.length > 0, path: '/classes' },
    { id: 'students', label: 'Cadastrar ou importar alunos', hint: 'Planilha .xlsx com nome, nascimento e responsável.', done: studentsCount > 0, path: '/students' },
    { id: 'staff', label: 'Criar acessos da equipe', hint: 'Coordenação e professores recebem login próprio.', done: staff.some(p => p.role !== 'admin' && p.active), path: '/users' },
    { id: 'brand', label: 'Colocar a marca da escola', hint: 'Logo e cores aparecem em todas as telas e documentos.', done: Boolean(school.branding?.logo_url), path: '/settings?tab=brand' },
  ];
  const doneCount = steps.filter(s => s.done).length;
  const allDone = doneCount === steps.length;

  const hide = () => {
    try { localStorage.setItem(storageKey, '1'); } catch { /* sem storage, só some nesta sessão */ }
    setHidden(true);
  };

  return (
    <div className="card card-accent mb-8">
      <div className="flex justify-between items-start gap-4 mb-4">
        <div>
          <h3 className="flex items-center gap-2" style={{ margin: 0, fontSize: '1.1rem' }}><Rocket size={20} color="var(--color-primary)" /> {allDone ? 'Escola pronta para usar' : 'Primeiros passos'}</h3>
          <p className="text-muted" style={{ margin: '0.25rem 0 0', fontSize: '0.875rem' }}>
            {allDone ? 'Tudo configurado. Bom trabalho!' : `${doneCount} de ${steps.length} concluídos · siga a ordem para não travar depois.`}
          </p>
        </div>
        {allDone && <button className="btn btn-ghost" onClick={hide} aria-label="Ocultar"><X size={18} /></button>}
      </div>
      <div style={{ height: '6px', background: 'var(--color-border-soft)', borderRadius: '3px', overflow: 'hidden', marginBottom: '1rem' }}>
        <div style={{ width: `${(doneCount / steps.length) * 100}%`, height: '100%', background: 'var(--color-success)', transition: 'width 0.4s ease' }} />
      </div>
      <ol style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: '0.4rem' }}>
        {steps.map((s, i) => (
          <li key={s.id}>
            <button
              onClick={() => navigate(s.path)}
              className="w-full flex items-center gap-3 text-left bg-transparent border-none cursor-pointer rounded-lg px-3 py-2 hover:bg-[var(--color-surface-2)]"
              style={{ fontFamily: 'inherit', opacity: s.done ? 0.6 : 1 }}
            >
              {s.done ? <CheckCircle2 size={20} color="var(--color-success)" /> : <Circle size={20} color="var(--color-text-subtle)" />}
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ fontWeight: 600, fontSize: '0.9rem', textDecoration: s.done ? 'line-through' : 'none' }}>{i + 1}. {s.label}</span>
                <span className="text-muted mobile-hide" style={{ fontSize: '0.8rem', marginLeft: '0.5rem' }}>{s.hint}</span>
              </span>
              {!s.done && <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-primary)' }}>Fazer agora →</span>}
            </button>
          </li>
        ))}
      </ol>
    </div>
  );
}
