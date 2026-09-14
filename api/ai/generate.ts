import { adminClient, authenticate, body, handler, HttpError, requireProfile } from '../_lib/supabase.js';
import { complete, providerConfig } from '../_lib/providers.js';
import {
  buildPedagogicalPrompt, buildPeiPrompt, buildPlanningPrompt, buildReportPrompt,
  PEDAGOGICAL_SYSTEM_PROMPT, PEI_SYSTEM_PROMPT, PLANNING_SYSTEM_PROMPT, PROMPT_VERSION, REPORT_SYSTEM_PROMPT,
  splitPeiOutput,
} from '../_lib/prompts.js';
import type { EvidenceItem, PedagogicalInput, PeiInput, PlanningInput, ReportInput } from '../_lib/prompts.js';

type Feature = 'report' | 'pei' | 'pedagogical' | 'planning';

/** Registro de observação enviado pelo cliente para servir de evidência. */
interface EvidenceIn { id: string; date: string; field: string; text: string }

type Request =
  | { feature: 'report'; data: ReportInput; evidence?: EvidenceIn[] }
  | { feature: 'pei'; data: PeiInput; studentId: string; evidence?: EvidenceIn[] }
  | { feature: 'pedagogical'; data: PedagogicalInput }
  | { feature: 'planning'; data: PlanningInput };

const FEATURES: Feature[] = ['report', 'pei', 'pedagogical', 'planning'];

const MAX_EVIDENCE = 60;
const MAX_EVIDENCE_CHARS = 400;

/**
 * Numera os registros para o prompt e guarda o mapa n → id. Só texto, data e
 * campo saem para o provedor; ids ficam no servidor.
 */
function prepareEvidence(list: EvidenceIn[] | undefined): { items: EvidenceItem[]; map: Record<number, string> } {
  const items: EvidenceItem[] = [];
  const map: Record<number, string> = {};
  if (!Array.isArray(list)) return { items, map };
  const sorted = [...list].filter(e => e && typeof e.id === 'string' && typeof e.text === 'string' && e.text.trim())
    .sort((a, b) => String(a.date).localeCompare(String(b.date)))
    .slice(0, MAX_EVIDENCE);
  sorted.forEach((e, i) => {
    const n = i + 1;
    const iso = String(e.date);
    const br = /^\d{4}-\d{2}-\d{2}$/.test(iso) ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}` : iso;
    items.push({ n, date: br, field: String(e.field || 'Geral').slice(0, 80), text: e.text.trim().slice(0, MAX_EVIDENCE_CHARS) });
    map[n] = e.id;
  });
  return { items, map };
}

/** Trial vigente, ativa, ou em atraso dentro da carência de 7 dias. */
function subscriptionAllows(school: { status: string; trial_ends_at: string | null; updated_at: string }): boolean {
  const now = Date.now();
  if (school.status === 'active') return true;
  if (school.status === 'trial') return !school.trial_ends_at || new Date(school.trial_ends_at).getTime() > now;
  if (school.status === 'past_due') return new Date(school.updated_at).getTime() + 7 * 86_400_000 > now;
  return false;
}

/** Só o primeiro nome sai daqui, mesmo que o cliente mande o nome inteiro. */
function firstNameOnly(name: unknown): string {
  return String(name ?? '').trim().split(/\s+/)[0] || 'a criança';
}

export default handler(['POST'], async (req) => {
  const caller = await authenticate(req);
  const profile = requireProfile(caller);
  if (profile.role === 'guardian') throw new HttpError(403, 'Responsáveis não geram documentos.');

  const payload = body<Request>(req);
  if (!payload || !FEATURES.includes(payload.feature)) throw new HttpError(400, 'feature inválida.');
  if (!payload.data || typeof payload.data !== 'object') throw new HttpError(400, 'data ausente.');

  const db = adminClient();

  // Escola, plano e limites.
  const { data: school } = await db
    .from('schools')
    .select('id, status, trial_ends_at, updated_at, plan_id, feature_overrides')
    .eq('id', profile.school_id)
    .single();
  if (!school) throw new HttpError(403, 'Escola não encontrada.');
  if (!subscriptionAllows(school)) throw new HttpError(402, 'Assinatura inativa. Fale com a direção da escola.');

  let credits: number | null = null;
  let enabled = true;
  if (school.plan_id) {
    const { data: plan } = await db.from('plans').select('features, ai_monthly_credits').eq('id', school.plan_id).maybeSingle();
    if (plan) {
      credits = plan.ai_monthly_credits;
      const override = (school.feature_overrides as Record<string, boolean> | null)?.[payload.feature];
      enabled = override ?? Boolean((plan.features as Record<string, boolean>)?.[payload.feature]);
    }
  }
  if (!enabled) throw new HttpError(403, 'Esta funcionalidade não está incluída no plano da escola.');

  if (credits !== null) {
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
    const { count } = await db
      .from('ai_usage')
      .select('id', { count: 'exact', head: true })
      .eq('school_id', school.id)
      .eq('ok', true)
      .gte('created_at', monthStart);
    if ((count ?? 0) >= credits) {
      throw new HttpError(429, `A escola atingiu o limite de ${credits} gerações de IA neste mês.`);
    }
  }

  // Monta o prompt, garantindo pseudonimização mesmo se o cliente mandar demais.
  let system: string;
  let prompt: string;
  let evidenceMap: Record<number, string> = {};
  switch (payload.feature) {
    case 'report': {
      const ev = prepareEvidence(payload.evidence);
      evidenceMap = ev.map;
      const d = { ...payload.data, firstName: firstNameOnly(payload.data.firstName), evidence: ev.items };
      system = REPORT_SYSTEM_PROMPT; prompt = buildReportPrompt(d);
      break;
    }
    case 'pei': {
      // Dado sensível (diagnóstico): exige consentimento registrado no aluno.
      if (!payload.studentId) throw new HttpError(400, 'studentId ausente.');
      const { data: student } = await db
        .from('students').select('pei_consent_at, school_id').eq('id', payload.studentId).maybeSingle();
      if (!student || student.school_id !== school.id) throw new HttpError(404, 'Aluno não encontrado.');
      if (!student.pei_consent_at) {
        throw new HttpError(403, 'Registre o consentimento do responsável (LGPD) no cadastro do aluno antes de gerar o PEI.');
      }
      const ev = prepareEvidence(payload.evidence);
      evidenceMap = ev.map;
      const d = { ...payload.data, firstName: firstNameOnly(payload.data.firstName), evidence: ev.items };
      system = PEI_SYSTEM_PROMPT; prompt = buildPeiPrompt(d);
      break;
    }
    case 'pedagogical':
      system = PEDAGOGICAL_SYSTEM_PROMPT; prompt = buildPedagogicalPrompt(payload.data);
      break;
    case 'planning':
      if (!payload.data.prompt?.trim()) throw new HttpError(400, 'prompt vazio.');
      system = PLANNING_SYSTEM_PROMPT; prompt = buildPlanningPrompt(payload.data);
      break;
  }

  const cfg = providerConfig(payload.feature);
  const started = Date.now();
  try {
    const out = await complete(cfg, system, prompt);
    await db.from('ai_usage').insert({
      school_id: school.id,
      user_id: profile.id,
      feature: payload.feature,
      provider: cfg.provider,
      model: cfg.model,
      input_tokens: out.inputTokens,
      output_tokens: out.outputTokens,
      latency_ms: Date.now() - started,
      ok: true,
    });
    if (payload.feature === 'pei') {
      const { content, goals } = splitPeiOutput(out.text);
      return { content, goals, evidence: evidenceMap, model: cfg.model, promptVersion: PROMPT_VERSION };
    }
    if (payload.feature === 'report') {
      return { content: out.text, evidence: evidenceMap, model: cfg.model, promptVersion: PROMPT_VERSION };
    }
    return { content: out.text, model: cfg.model, promptVersion: PROMPT_VERSION };
  } catch (err) {
    await db.from('ai_usage').insert({
      school_id: school.id,
      user_id: profile.id,
      feature: payload.feature,
      provider: cfg.provider,
      model: cfg.model,
      latency_ms: Date.now() - started,
      ok: false,
      error: err instanceof Error ? err.message.slice(0, 500) : 'erro',
    });
    throw new HttpError(502, 'O provedor de IA falhou. Tente novamente em instantes.');
  }
});
