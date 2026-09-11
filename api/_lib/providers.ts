import { GoogleGenerativeAI } from '@google/generative-ai';
import OpenAI from 'openai';

/**
 * Provedor de IA da PLATAFORMA. A chave é nossa (env do servidor), o custo é
 * nosso, e a cobrança da escola vem do plano — nunca mais chave de cliente no
 * navegador.
 *
 *   AI_PROVIDER = gemini | openai
 *   AI_API_KEY  = chave do provedor
 *   AI_MODEL    = modelo padrão
 *   AI_MODEL_<FEATURE> (opcional) = modelo por funcionalidade (REPORT, PEI, PEDAGOGICAL, PLANNING)
 */

export type Provider = 'gemini' | 'openai';

export interface Completion {
  text: string;
  inputTokens: number | null;
  outputTokens: number | null;
}

export function providerConfig(feature: string): { provider: Provider; model: string; apiKey: string } {
  const provider = (process.env.AI_PROVIDER ?? 'gemini') as Provider;
  if (provider !== 'gemini' && provider !== 'openai') throw new Error(`AI_PROVIDER inválido: ${provider}`);
  const apiKey = process.env.AI_API_KEY;
  if (!apiKey) throw new Error('AI_API_KEY não configurada no servidor.');
  const perFeature = process.env[`AI_MODEL_${feature.toUpperCase()}`];
  const model = perFeature || process.env.AI_MODEL || (provider === 'gemini' ? 'gemini-2.5-flash' : 'gpt-4o-mini');
  return { provider, model, apiKey };
}

export async function complete(
  cfg: { provider: Provider; model: string; apiKey: string },
  system: string,
  user: string,
): Promise<Completion> {
  if (cfg.provider === 'gemini') {
    const genAI = new GoogleGenerativeAI(cfg.apiKey);
    const model = genAI.getGenerativeModel({ model: cfg.model, systemInstruction: system });
    const result = await model.generateContent(user);
    const usage = result.response.usageMetadata;
    return {
      text: result.response.text(),
      inputTokens: usage?.promptTokenCount ?? null,
      outputTokens: usage?.candidatesTokenCount ?? null,
    };
  }

  const openai = new OpenAI({ apiKey: cfg.apiKey });
  const response = await openai.chat.completions.create({
    model: cfg.model,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
  });
  return {
    text: response.choices[0]?.message.content ?? '',
    inputTokens: response.usage?.prompt_tokens ?? null,
    outputTokens: response.usage?.completion_tokens ?? null,
  };
}
