import { GoogleGenerativeAI } from '@google/generative-ai';
import OpenAI from 'openai';
export interface AIConfig {
  provider: 'gemini' | 'openai';
  modelId: string;
  apiKey: string;
}

const REPORT_SYSTEM_PROMPT = `Você é um assistente especializado em redação pedagógica. Sua tarefa é transformar observações de professores em relatórios descritivos profissionais, acolhedores e focados no desenvolvimento do aluno. 

Se uma DISCIPLINA específica for fornecida (como Inglês ou Educação Física), foque o relatório no desenvolvimento das competências específicas daquela área para a faixa etária do aluno. 

Use uma linguagem clara, evite termos excessivamente técnicos sem explicação e siga rigorosamente a BNCC.`;

function formatMap(map: any) {
  if (!map) return 'Nenhum item avaliado';
  const entries = Object.entries(map).filter(([_, status]) => status !== 'none');
  if (entries.length === 0) return 'Nenhum item marcado como observado/em desenvolvimento';
  
  return entries.map(([item, status]) => {
    const statusLabel = status === 'consolidated' ? '[CONSOLIDADO]' : '[EM DESENVOLVIMENTO]';
    return `- ${item} ${statusLabel}`;
  }).join('\n');
}

export async function generateAIReport(studentData: any, aiConfig: AIConfig) {
  const { provider, modelId, apiKey } = aiConfig;
  if (!apiKey) throw new Error('API Key não configurada');

  const prompt = `
Gere o relatório descritivo para:
- Nome: ${studentData.name}
- Idade: ${studentData.age}
- Turma: ${studentData.group}
- Professor(a): ${studentData.teacherName}
- DISCIPLINA: ${studentData.subject || 'Avaliação Geral (Regência)'}
- Responsáveis: ${studentData.parentsName}
- FINALIDADE DO RELATÓRIO: ${studentData.reportContext || 'Bimestral'}
- Tom Solicitado: ${studentData.reportTone}

INFORMAÇÕES ADICIONAIS:
${studentData.generalObservations || 'Nenhuma'}

DADOS DA AVALIAÇÃO (BNCC):
1. O eu, o outro e o nós: ${formatMap(studentData.socialMap)}
2. Corpo, gestos e movimentos: ${formatMap(studentData.motorMap)}
3. Traços, sons, cores e formas: ${formatMap(studentData.artsMap)}
4. Escuta, fala, pensamento e imaginação: ${formatMap(studentData.languageMap)}
5. Espaços, tempos, quantidades, relações e transformações: ${formatMap(studentData.logicMap)}
6. Inglês (se aplicável): ${formatMap(studentData.englishMap)}
7. Educação Física (se aplicável): ${formatMap(studentData.peMap)}

Potencialidades: ${studentData.positivePoints}
Pontos de Atenção: ${studentData.attentionPoints}

INSTRUÇÕES DE REDAÇÃO:
- Integre os itens de forma natural no texto.
- Não use listas. O relatório deve ser um texto corrido fluido.
`;

  if (provider === 'gemini') {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: modelId, systemInstruction: REPORT_SYSTEM_PROMPT });
    const result = await model.generateContent(prompt);
    return result.response.text();
  } else {
    const openai = new OpenAI({ apiKey, dangerouslyAllowBrowser: true });
    const response = await openai.chat.completions.create({
      model: modelId,
      messages: [
        { role: 'system', content: REPORT_SYSTEM_PROMPT },
        { role: 'user', content: prompt }
      ],
    });
    return response.choices[0].message.content || '';
  }
}

const PEI_SYSTEM_INSTRUCTION = `Você é um especialista em educação inclusiva, psicopedagogia e desenvolvimento infantil. Sua missão é gerar um Plano Educacional Individualizado (PEI) técnico, humanizado e extremamente estruturado.

DIRETRIZES DE REDAÇÃO:
- Use os indicadores selecionados como base direta das metas. Se indicadores como "heteroagressão" foram marcados, a meta deve endereçar isso especificamente.
- Se um eixo não possui indicadores marcados, não gere metas para ele.
- Use negrito APENAS em títulos de seções e termos-chave essenciais. Evite negrito excessivo no corpo do texto.
- Estruture o documento com hierarquia visual clara.

METAS SMART (OBRIGATÓRIO):
Cada meta deve conter:
1. Comportamento observável e específico.
2. Contexto de observação (ex: "em momentos de transição", "durante a alimentação").
3. Critério de sucesso mensurável (ex: "em 8 de 10 oportunidades", "por pelo menos 15 minutos").
4. Prazo (Curto, Médio ou Longo Prazo).
5. Nota de rodapé na meta orientando a professora a registrar a linha de base na primeira semana.

ESTRUTURA OBRIGATÓRIA:
1. PERFIL DO ESTUDANTE (Resumo técnico baseado no diagnóstico e idade)
2. DIRETRIZES GERAIS (Abordagem pedagógica recomendada)
3. ESTRATÉGIAS DE SALA DE AULA (Acomodações e manejo)
4. QUADRO DE METAS SMART (Apresentado obrigatoriamente em formato de TABELA Markdown com colunas: Eixo | Meta | Prazo | Como medir)
5. AVALIAÇÃO E MONITORAMENTO
6. ORIENTAÇÕES À FAMÍLIA`;

export async function generatePei(peiData: any, aiConfig: AIConfig) {
  const { provider, modelId, apiKey } = aiConfig;
  if (!apiKey) throw new Error('API Key não configurada');

  const prompt = `
Gere um PEI detalhado para o aluno:
- Nome: ${peiData.name}
- Idade: ${peiData.age}
- Turma: ${peiData.group}
- Diagnóstico: ${peiData.diagnosis || 'Não informado'}

DADOS COLETADOS POR EIXO (INDICADORES + OBSERVAÇÕES):

1. Comunicação e Linguagem:
   - Indicadores: ${peiData.selectedComm?.join(', ') || 'Nenhum'}
   - Observações: ${peiData.communication || 'Nenhuma'}

2. Interação Social:
   - Indicadores: ${peiData.selectedSocial?.join(', ') || 'Nenhum'}
   - Observações: ${peiData.social || 'Nenhuma'}

3. Comportamento e Flexibilidade:
   - Indicadores: ${peiData.selectedBehavior?.join(', ') || 'Nenhum'}
   - Observações: ${peiData.behavior || 'Nenhuma'}

4. Aspectos Emocionais:
   - Indicadores: ${peiData.selectedEmotional?.join(', ') || 'Nenhum'}
   - Observações: ${peiData.emotional || 'Nenhuma'}

5. Processos de Aprendizagem:
   - Indicadores: ${peiData.selectedLearning?.join(', ') || 'Nenhum'}
   - Observações: ${peiData.learning || 'Nenhuma'}

6. Desenvolvimento Motor:
   - Indicadores: ${peiData.selectedMotor?.join(', ') || 'Nenhum'}
   - Observações: ${peiData.motor || 'Nenhuma'}

7. Autonomia e Vida Diária:
   - Indicadores: ${peiData.selectedAutonomy?.join(', ') || 'Nenhum'}
   - Observações: ${peiData.autonomy || 'Nenhuma'}

8. Perfil Sensorial:
   - Indicadores: ${peiData.selectedSensory?.join(', ') || 'Nenhum'}
   - Observações: ${peiData.sensory || 'Nenhuma'}

INSTRUÇÃO ADICIONAL:
As metas devem ser correlacionadas aos indicadores marcados. Exemplo: se "Autoagressão" foi marcado em Comportamento, a meta deve focar na redução/substituição desse comportamento com critérios SMART.
`;

  if (provider === 'gemini') {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: modelId, systemInstruction: PEI_SYSTEM_INSTRUCTION });
    const result = await model.generateContent(prompt);
    return result.response.text();
  } else {
    const openai = new OpenAI({ apiKey, dangerouslyAllowBrowser: true });
    const response = await openai.chat.completions.create({
      model: modelId,
      messages: [
        { role: 'system', content: PEI_SYSTEM_INSTRUCTION },
        { role: 'user', content: prompt }
      ],
    });
    return response.choices[0].message.content || '';
  }
}

// --- PEDAGOGICAL INTELLIGENCE ---

const PEDAGOGICAL_SYSTEM_PROMPT = `Você é um especialista em avaliação educacional, análise de dados pedagógicos e desenvolvimento infantil, com domínio da BNCC para o Ensino Fundamental I (1º ao 5º ano). Sua função é analisar dados de avaliações de uma turma e gerar um painel completo de inteligência pedagógica, com insights acionáveis para professores e coordenação.

SAÍDA OBRIGATÓRIA (ESTRUTURE EM SEÇÕES CLARAS):
1. VISÃO GERAL DA TURMA (Média, Nível, Diagnóstico Coletivo)
2. DISTRIBUIÇÃO DE DESEMPENHO (Faixas: Excelente, Bom, Regular, Abaixo)
3. ANÁLISE POR COMPETÊNCIA / HABILIDADE BNCC (Consolidada, Em desenvolvimento, Crítica)
4. ANÁLISE POR CONTEÚDO (Gargalos e Domínios)
5. DESEMPENHO INDIVIDUAL (Resumo por aluno)
6. ALERTAS PEDAGÓGICOS (Atenção imediata)
7. RECOMENDAÇÕES COLETIVAS (Estratégias práticas)
8. RECOMENDAÇÕES INDIVIDUAIS (O que e como desenvolver)
9. INSIGHTS PARA GESTÃO (Coordenação pedagógica)

REGRAS: Linguagem profissional, sem rótulos negativos, foco em evolução, BNCC aplicada.`;

export async function generatePedagogicalIntelligence(assessmentData: any, aiConfig: AIConfig) {
  const { provider, modelId, apiKey } = aiConfig;
  if (!apiKey) throw new Error('API Key não configurada');

  const prompt = `
DADOS DA AVALIAÇÃO:
Ano Escolar: ${assessmentData.year}
Disciplina: ${assessmentData.subject}
Habilidades Avaliadas: ${assessmentData.skills}
Resultados (Acertos/Erros por Aluno):
${assessmentData.results}

Analise esses dados e gere o painel completo de Inteligência Pedagógica.
`;

  if (provider === 'gemini') {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: modelId, systemInstruction: PEDAGOGICAL_SYSTEM_PROMPT });
    const result = await model.generateContent(prompt);
    return result.response.text();
  } else {
    const openai = new OpenAI({ apiKey, dangerouslyAllowBrowser: true });
    const response = await openai.chat.completions.create({
      model: modelId,
      messages: [
        { role: 'system', content: PEDAGOGICAL_SYSTEM_PROMPT },
        { role: 'user', content: prompt }
      ],
    });
    return response.choices[0].message.content || '';
  }
}
