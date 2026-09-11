import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import { parseGradingConfig, DEFAULT_GRADING_CONFIG } from '../store/gradingConfig';
import type { GradingConfig } from '../store/gradingConfig';
import type { ClassGroup, Plan, Profile, School, SchoolYear } from '../types/db';
import { applyBranding } from '../lib/branding';

/** Funcionalidades que o plano pode ligar/desligar. */
export type FeatureKey =
  | 'report' | 'pei' | 'planning' | 'pedagogical' | 'agenda'
  | 'grades' | 'bulletin' | 'transcript';

interface SchoolContextType {
  school: School | null;
  plan: Plan | null;
  /** Flags finais = plano + sobrescritas da escola. */
  features: Record<FeatureKey, boolean>;
  hasFeature: (key: FeatureKey) => boolean;
  /** Assinatura permite usar o sistema (trial vigente, ativa ou em atraso com carência). */
  subscriptionOk: boolean;
  subscriptionMessage: string | null;
  grading: GradingConfig;
  years: SchoolYear[];
  selectedYear: SchoolYear | null;
  setYear: (id: string) => void;
  /** Turmas do ano selecionado, já filtradas pela RLS (o professor só vê as dele). */
  classes: ClassGroup[];
  /** Turmas do ano ainda não chegaram — as telas mostram esqueleto em vez de "0 turmas". */
  classesLoading: boolean;
  /** Equipe da escola (todos os perfis). */
  staff: Profile[];
  aiUsage: { used: number; limit: number | null };
  loading: boolean;
  refresh: () => Promise<void>;
  refreshClasses: () => void;
  refreshAiUsage: () => Promise<void>;
}

const ALL_FEATURES: FeatureKey[] = ['report', 'pei', 'planning', 'pedagogical', 'agenda', 'grades', 'bulletin', 'transcript'];

const SchoolContext = createContext<SchoolContextType | null>(null);

// eslint-disable-next-line react-refresh/only-export-components -- hook + provider no mesmo módulo, de propósito
export function useSchool() {
  const ctx = useContext(SchoolContext);
  if (!ctx) throw new Error('useSchool must be used within SchoolProvider');
  return ctx;
}

/** Dias de carência após vencer (past_due) antes de bloquear. */
const PAST_DUE_GRACE_DAYS = 7;

function evaluateSubscription(school: School | null): { ok: boolean; message: string | null } {
  if (!school) return { ok: false, message: null };
  const now = Date.now();
  switch (school.status) {
    case 'active':
      return { ok: true, message: null };
    case 'trial': {
      if (!school.trial_ends_at) return { ok: true, message: null };
      const ends = new Date(school.trial_ends_at).getTime();
      if (ends < now) return { ok: false, message: 'O período de avaliação terminou. Fale com o suporte para ativar a assinatura.' };
      const days = Math.ceil((ends - now) / 86_400_000);
      return { ok: true, message: days <= 7 ? `Período de avaliação: ${days} dia(s) restante(s).` : null };
    }
    case 'past_due': {
      const since = new Date(school.updated_at).getTime();
      const grace = since + PAST_DUE_GRACE_DAYS * 86_400_000;
      return grace > now
        ? { ok: true, message: 'Pagamento pendente. Regularize para evitar a suspensão do acesso.' }
        : { ok: false, message: 'Acesso suspenso por pagamento pendente.' };
    }
    case 'suspended':
      return { ok: false, message: 'Acesso suspenso. Fale com o suporte.' };
    case 'canceled':
      return { ok: false, message: 'Assinatura encerrada.' };
  }
}

export function SchoolProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [school, setSchool] = useState<School | null>(null);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [years, setYears] = useState<SchoolYear[]>([]);
  const [selectedYearId, setSelectedYearId] = useState<string | null>(null);
  const [classes, setClasses] = useState<ClassGroup[]>([]);
  // Chave (ano + versão) que produziu `classes`; derivar o loading disso evita setState síncrono no efeito.
  const [classesKey, setClassesKey] = useState<string | null>(null);
  const [staff, setStaff] = useState<Profile[]>([]);
  const [aiUsed, setAiUsed] = useState(0);
  const [classesVersion, setClassesVersion] = useState(0);
  const [loading, setLoading] = useState(true);

  const refreshAiUsage = useCallback(async () => {
    const { data } = await supabase.rpc('my_ai_usage_this_month');
    setAiUsed(typeof data === 'number' ? data : 0);
  }, []);

  const refresh = useCallback(async () => {
    if (!user) {
      setSchool(null); setPlan(null); setYears([]); setClasses([]); setStaff([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const [schoolRes, yearsRes, staffRes] = await Promise.all([
      supabase.from('schools').select('*').eq('id', user.school_id).single(),
      supabase.from('school_years').select('*').eq('school_id', user.school_id).order('label'),
      supabase.from('profiles').select('*').eq('school_id', user.school_id).order('name'),
    ]);
    const s = (schoolRes.data as School | null) ?? null;
    setSchool(s);
    applyBranding(s);
    const ys = (yearsRes.data as SchoolYear[] | null) ?? [];
    setYears(ys);
    setStaff((staffRes.data as Profile[] | null) ?? []);
    setSelectedYearId(prev => prev && ys.some(y => y.id === prev) ? prev : (ys.find(y => y.active)?.id ?? ys.at(-1)?.id ?? null));

    if (s?.plan_id) {
      const { data: p } = await supabase.from('plans').select('*').eq('id', s.plan_id).maybeSingle();
      setPlan((p as Plan | null) ?? null);
    } else {
      setPlan(null);
    }
    void refreshAiUsage();
    setLoading(false);
  }, [user, refreshAiUsage]);

  // Sincroniza com o Supabase quando o usuário muda. O setLoading(true) síncrono
  // dentro de refresh() é intencional: é o estado "buscando" do provider.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void refresh(); }, [refresh]);

  // Turmas do ano selecionado.
  const wantedClassesKey = selectedYearId ? `${selectedYearId}#${classesVersion}` : null;
  useEffect(() => {
    if (!selectedYearId) return;
    let active = true;
    const key = `${selectedYearId}#${classesVersion}`;
    supabase.from('classes').select('*').eq('year_id', selectedYearId).order('name').then(({ data }) => {
      if (!active) return;
      setClasses((data as ClassGroup[] | null) ?? []);
      setClassesKey(key);
    });
    return () => { active = false; };
  }, [selectedYearId, classesVersion]);

  const gradingJson = school?.grading_config ?? null;
  const grading = useMemo(() => (gradingJson ? parseGradingConfig(gradingJson) : DEFAULT_GRADING_CONFIG), [gradingJson]);

  const features = useMemo(() => {
    const out = {} as Record<FeatureKey, boolean>;
    for (const k of ALL_FEATURES) {
      const fromPlan = plan?.features?.[k];
      const override = school?.feature_overrides?.[k];
      // Sem plano cadastrado (ex.: escola criada à mão), libera tudo — a
      // cobrança é responsabilidade do backoffice, não do front.
      out[k] = override ?? fromPlan ?? (plan ? false : true);
    }
    return out;
  }, [plan, school?.feature_overrides]);

  const subscription = useMemo(() => evaluateSubscription(school), [school]);

  const value: SchoolContextType = {
    school,
    plan,
    features,
    hasFeature: (k) => features[k],
    subscriptionOk: subscription.ok,
    subscriptionMessage: subscription.message,
    grading,
    years,
    selectedYear: years.find(y => y.id === selectedYearId) ?? null,
    setYear: setSelectedYearId,
    classes: selectedYearId ? classes : [],
    classesLoading: loading || (wantedClassesKey !== null && classesKey !== wantedClassesKey),
    staff,
    aiUsage: { used: aiUsed, limit: plan?.ai_monthly_credits ?? null },
    loading,
    refresh,
    refreshClasses: () => setClassesVersion(v => v + 1),
    refreshAiUsage,
  };

  return <SchoolContext.Provider value={value}>{children}</SchoolContext.Provider>;
}
