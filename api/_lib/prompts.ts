/**
 * Prompts das quatro funcionalidades de IA. Versionados aqui, no servidor —
 * o cliente só manda dados, nunca instruções.
 *
 * LGPD por desenho: os payloads carregam APENAS o primeiro nome do aluno
 * (`firstName`), idade e turma. Sobrenome, data de nascimento, CPF e nome dos
 * responsáveis nunca chegam ao provedor de IA. O relatório é redigido com o
 * primeiro nome e o front completa o cabeçalho impresso com o resto.
 */

export const PROMPT_VERSION = '2026-09-14';

export type ItemStatus = 'none' | 'developing' | 'consolidated';
type ItemMap = Record<string, ItemStatus> | undefined;

function formatMap(map: ItemMap): string {
  if (!map) return 'Nenhum item avaliado';
  const entries = Object.entries(map).filter(([, status]) => status !== 'none');
  if (entries.length === 0) return 'Nenhum item marcado como observado/em desenvolvimento';
  return entries
    .map(([item, status]) => `- ${item} ${status === 'consolidated' ? '[CONSOLIDADO]' : '[EM DESENVOLVIMENTO]'}`)
    .join('\n');
}

// ---------------------------------------------------------------------------
// Relatório descritivo
// ---------------------------------------------------------------------------

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

export const REPORT_SYSTEM_PROMPT = `Você é um assistente especializado em redação pedagógica. Sua tarefa é transformar observações de professores em relatórios descritivos profissionais, acolhedores e focados no desenvolvimento do aluno.

Se uma DISCIPLINA específica for fornecida (como Inglês ou Educação Física), foque o relatório no desenvolvimento das competências específicas daquela área para a faixa etária do aluno.

Use uma linguagem clara, evite termos excessivamente técnicos sem explicação e siga rigorosamente a BNCC. Refira-se à criança apenas pelo primeiro nome informado.`;

const TONE_LABEL: Record<ReportInput['reportTone'], string> = {
  affectionate: 'Afetivo e próximo (para as famílias)',
  pedagogical: 'Pedagógico e técnico (equilibrado)',
  concise: 'Conciso e direto (para prontuários)',
};

function fieldBlock(title: string, map: ItemMap, notes?: string): string {
  const obs = notes?.trim() ? `\n   Observações da professora: ${notes.trim()}` : '';
  return `${title}: ${formatMap(map)}${obs}`;
}

export function buildReportPrompt(d: ReportInput): string {
  return `
Gere o relatório descritivo para:
- Nome: ${d.firstName}
- Idade: ${d.age}
- Turma: ${d.group}
- Professor(a): ${d.teacherName || 'não informado'}
- DISCIPLINA: ${d.subject || 'Avaliação Geral (Regência)'}
- FINALIDADE DO RELATÓRIO: ${d.reportContext || 'Bimestral'}
- Tom Solicitado: ${TONE_LABEL[d.reportTone] ?? d.reportTone}

INFORMAÇÕES ADICIONAIS:
${d.generalObservations || 'Nenhuma'}

DADOS DA AVALIAÇÃO (BNCC):
1. ${fieldBlock('O eu, o outro e o nós', d.socialMap, d.fieldSocial)}
2. ${fieldBlock('Corpo, gestos e movimentos', d.motorMap, d.fieldMotor)}
3. ${fieldBlock('Traços, sons, cores e formas', d.artsMap, d.fieldArts)}
4. ${fieldBlock('Escuta, fala, pensamento e imaginação', d.languageMap, d.fieldLanguage)}
5. ${fieldBlock('Espaços, tempos, quantidades, relações e transformações', d.logicMap, d.fieldLogic)}
6. ${fieldBlock('Inglês (se aplicável)', d.englishMap, d.fieldEnglish)}
7. ${fieldBlock('Educação Física (se aplicável)', d.peMap, d.fieldPe)}

Potencialidades: ${d.positivePoints || 'Não informadas'}
Pontos de Atenção: ${d.attentionPoints || 'Não informados'}

INSTRUÇÕES DE REDAÇÃO:
- Integre os itens de forma natural no texto.
- Não use listas. O relatório deve ser um texto corrido fluido.
- Não invente fatos que não estejam nos dados acima.
`;
}

// ---------------------------------------------------------------------------
// PEI
// ---------------------------------------------------------------------------

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

export const PEI_SYSTEM_PROMPT = `Você é um especialista em educação inclusiva e desenvolvimento infantil que apoia a equipe pedagógica de uma escola. Sua tarefa é rascunhar um Plano Educacional Individualizado (PEI) técnico, humanizado e estruturado, que a coordenação vai revisar, editar e assinar. O texto é um RASCUNHO; a decisão é sempre do profissional.

LIMITES (obrigatórios):
- Você não diagnostica, não infere transtornos, condições clínicas ou psicológicas, não emite avaliação clínica e não recomenda tratamento ou medicação.
- A "condição informada" é um dado declarado pela família/escola; cite-a apenas como contexto, sem elaborar sobre ela nem deduzir características a partir dela.
- Baseie-se APENAS nos indicadores e observações informados. Não invente observações, comportamentos, histórico ou progresso.
- Use linguagem respeitosa, sem rótulos; descreva comportamentos observáveis, não a criança.
- Refira-se ao estudante apenas pelo primeiro nome informado.

DIRETRIZES DE REDAÇÃO:
- Use os indicadores selecionados como base direta das metas. Se um indicador como "agressividade consigo mesmo" foi marcado, a meta deve endereçá-lo especificamente.
- Se um eixo não possui indicadores nem observações, não gere metas para ele.
- No máximo 5 metas no total; priorize as que mais afetam a participação na sala comum.
- Negrito apenas em títulos de seções e termos essenciais. Sem hierarquia visual excessiva.

METAS (obrigatório em cada uma):
1. Comportamento observável e específico.
2. Contexto de observação (ex.: "em momentos de transição", "durante a alimentação").
3. Critério de sucesso mensurável (ex.: "em 8 de 10 oportunidades", "por pelo menos 15 minutos").
4. Prazo: curto, médio ou longo.
5. Orientação para a professora registrar a linha de base na primeira semana.

ESTRUTURA OBRIGATÓRIA DO TEXTO (markdown):
1. PERFIL FUNCIONAL DO ESTUDANTE (síntese do que foi informado: potencialidades e necessidades de apoio; sem diagnóstico)
2. DIRETRIZES GERAIS (abordagem pedagógica)
3. ESTRATÉGIAS PARA A SALA DE AULA COMUM (acomodações e manejo que a professora regente consegue aplicar)
4. QUADRO DE METAS (tabela markdown com colunas: Eixo | Meta | Contexto | Como medir | Prazo)
5. AVALIAÇÃO E MONITORAMENTO (o que a professora observa e registra semanalmente para cada meta)
6. ORIENTAÇÕES À FAMÍLIA

SAÍDA ESTRUTURADA (obrigatório): DEPOIS do texto, em uma linha própria, escreva exatamente <<<METAS>>> e em seguida um JSON válido, sem comentários e sem cercas de código, no formato:
{"goals":[{"axis":"...","title":"...","criterion":"...","context":"...","term":"curto|medio|longo"}]}
As metas do JSON devem ser exatamente as do quadro, na mesma ordem.`;

function axis(n: number, title: string, selected?: string[], notes?: string): string {
  return `${n}. ${title}:
   - Indicadores: ${selected?.length ? selected.join(', ') : 'Nenhum'}
   - Observações: ${notes?.trim() || 'Nenhuma'}`;
}

export function buildPeiPrompt(d: PeiInput): string {
  return `
Gere um PEI detalhado para o aluno:
- Nome: ${d.firstName}
- Idade: ${d.age}
- Turma: ${d.group}
- Condição informada pela família/escola (contexto, não elabore): ${d.diagnosis || 'Não informada'}

DADOS COLETADOS POR EIXO (INDICADORES + OBSERVAÇÕES):

${axis(1, 'Comunicação e Linguagem', d.selectedComm, d.communication)}

${axis(2, 'Interação Social', d.selectedSocial, d.social)}

${axis(3, 'Comportamento e Flexibilidade', d.selectedBehavior, d.behavior)}

${axis(4, 'Aspectos Emocionais', d.selectedEmotional, d.emotional)}

${axis(5, 'Processos de Aprendizagem', d.selectedLearning, d.learning)}

${axis(6, 'Desenvolvimento Motor', d.selectedMotor, d.motor)}

${axis(7, 'Autonomia e Vida Diária', d.selectedAutonomy, d.autonomy)}

${axis(8, 'Perfil Sensorial', d.selectedSensory, d.sensory)}

INSTRUÇÃO ADICIONAL:
As metas devem ser correlacionadas aos indicadores marcados. Exemplo: se "Agressividade consigo mesmo" foi marcado em Comportamento, a meta deve focar na substituição desse comportamento por uma alternativa, com critério mensurável.
Lembre-se: termine com a linha <<<METAS>>> seguida do JSON das metas.
`;
}

// ---------------------------------------------------------------------------
// Inteligência pedagógica
// ---------------------------------------------------------------------------

export interface PedagogicalInput {
  assessmentName: string;
  subject: string;
  skills: string;
  /** Uma linha por aluno, já com primeiro nome: "Lucas: 3/4 acertos (Errou: q2)". */
  results: string;
}

export const PEDAGOGICAL_SYSTEM_PROMPT = `Você é um especialista em avaliação educacional, análise de dados pedagógicos e desenvolvimento infantil, com domínio da BNCC para o Ensino Fundamental I (1º ao 5º ano). Sua função é analisar dados de avaliações de uma turma e gerar um painel completo de inteligência pedagógica, com insights acionáveis para professores e coordenação.

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

export function buildPedagogicalPrompt(d: PedagogicalInput): string {
  return `
DADOS DA AVALIAÇÃO:
Avaliação: ${d.assessmentName}
Disciplina: ${d.subject}
Habilidades Avaliadas: ${d.skills}
Resultados (Acertos/Erros por Aluno):
${d.results}

Analise esses dados e gere o painel completo de Inteligência Pedagógica.
`;
}

// ---------------------------------------------------------------------------
// Copiloto de planejamento
// ---------------------------------------------------------------------------

export interface PlanningInput {
  prompt: string;
}

export const PLANNING_SYSTEM_PROMPT = `Você é um mentor pedagógico especializado em metodologias ativas e BNCC. Sua função é auxiliar professores na criação de planos de aula criativos, inclusivos e eficientes.

Ao sugerir atividades, foque em:
- Engajamento dos alunos.
- Objetivos de aprendizagem claros.
- Praticidade na execução em sala de aula.
- Alinhamento com a faixa etária.`;

export function buildPlanningPrompt(d: PlanningInput): string {
  return d.prompt;
}

// ---------------------------------------------------------------------------
// Metas estruturadas do PEI: o modelo devolve o texto, a linha <<<METAS>>> e um
// JSON. Separamos os dois; se o JSON vier quebrado, o texto segue e as metas
// ficam vazias (a coordenação cadastra à mão).
// ---------------------------------------------------------------------------

export interface DraftGoal {
  axis: string;
  title: string;
  criterion?: string;
  context?: string;
  term: 'curto' | 'medio' | 'longo';
}

const GOAL_MARKER = '<<<METAS>>>';

export function splitPeiOutput(raw: string): { content: string; goals: DraftGoal[] } {
  const at = raw.lastIndexOf(GOAL_MARKER);
  if (at < 0) return { content: raw.trim(), goals: [] };
  const content = raw.slice(0, at).trim();
  let tail = raw.slice(at + GOAL_MARKER.length).trim();
  tail = tail.replace(/^```(?:json)?/i, '').replace(/```\s*$/, '').trim();
  const start = tail.indexOf('{');
  const end = tail.lastIndexOf('}');
  if (start < 0 || end < start) return { content, goals: [] };
  try {
    const parsed = JSON.parse(tail.slice(start, end + 1)) as { goals?: unknown };
    const list = Array.isArray(parsed.goals) ? parsed.goals : [];
    const goals: DraftGoal[] = [];
    for (const g of list) {
      if (!g || typeof g !== 'object') continue;
      const o = g as Record<string, unknown>;
      const title = typeof o.title === 'string' ? o.title.trim() : '';
      if (!title) continue;
      const termRaw = typeof o.term === 'string' ? o.term.toLowerCase() : '';
      const term: DraftGoal['term'] = termRaw.startsWith('curt') ? 'curto' : termRaw.startsWith('long') ? 'longo' : 'medio';
      goals.push({
        axis: typeof o.axis === 'string' && o.axis.trim() ? o.axis.trim() : 'Geral',
        title,
        criterion: typeof o.criterion === 'string' ? o.criterion.trim() : undefined,
        context: typeof o.context === 'string' ? o.context.trim() : undefined,
        term,
      });
      if (goals.length >= 8) break;
    }
    return { content, goals };
  } catch {
    return { content, goals: [] };
  }
}
