/**
 * Cliente das funções de IA. Toda geração passa por /api/ai/generate, que
 * usa a chave da plataforma, checa plano/limite e registra o uso. O
 * navegador nunca vê chave de provedor.
 *
 * Os payloads carregam só o primeiro nome do aluno (LGPD) — o servidor
 * reforça isso, mas a regra começa aqui.
 */
import { callApi } from './supabase';

export type ItemStatus = 'none' | 'developing' | 'consolidated';
type ItemMap = Record<string, ItemStatus>;

export interface ReportInput {
  firstName: string;
  age: string;
  group: string;
  teacherName?: string;
  subject?: string;
  reportContext?: string;
  reportTone: 'affectionate' | 'pedagogical' | 'concise';
  generalObservations?: string;
  socialMap?: ItemMap; fieldSocial?: string;
  motorMap?: ItemMap; fieldMotor?: string;
  artsMap?: ItemMap; fieldArts?: string;
  languageMap?: ItemMap; fieldLanguage?: string;
  logicMap?: ItemMap; fieldLogic?: string;
  englishMap?: ItemMap; fieldEnglish?: string;
  peMap?: ItemMap; fieldPe?: string;
  positivePoints?: string;
  attentionPoints?: string;
}

export interface PeiInput {
  firstName: string;
  age: string;
  group: string;
  diagnosis?: string;
  selectedComm?: string[]; communication?: string;
  selectedSocial?: string[]; social?: string;
  selectedBehavior?: string[]; behavior?: string;
  selectedEmotional?: string[]; emotional?: string;
  selectedLearning?: string[]; learning?: string;
  selectedMotor?: string[]; motor?: string;
  selectedAutonomy?: string[]; autonomy?: string;
  selectedSensory?: string[]; sensory?: string;
}

export interface PedagogicalInput {
  assessmentName: string;
  subject: string;
  skills: string;
  results: string;
}

interface AiResponse {
  content: string;
  model: string;
  promptVersion: string;
}

export function firstName(fullName: string): string {
  return fullName.trim().split(/\s+/)[0] || '';
}

export async function generateAIReport(data: ReportInput): Promise<string> {
  const res = await callApi<AiResponse>('/api/ai/generate', { feature: 'report', data });
  return res.content;
}

export async function generatePei(studentId: string, data: PeiInput): Promise<string> {
  const res = await callApi<AiResponse>('/api/ai/generate', { feature: 'pei', studentId, data });
  return res.content;
}

export async function generatePedagogicalIntelligence(data: PedagogicalInput): Promise<string> {
  const res = await callApi<AiResponse>('/api/ai/generate', { feature: 'pedagogical', data });
  return res.content;
}

export async function generateLessonPlanSuggestion(prompt: string): Promise<string> {
  const res = await callApi<AiResponse>('/api/ai/generate', { feature: 'planning', data: { prompt } });
  return res.content;
}
