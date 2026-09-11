/**
 * Configuração de avaliação da escola.
 *
 * Toda regra de nota vive aqui — peso, escala, média de aprovação, quais
 * disciplinas existem e como cada uma é avaliada. Nenhum componente de tela
 * deve ter fórmula ou peso chumbado.
 *
 * No SaaS, este arquivo é o DEFAULT. Cada escola pode sobrescrever tudo em
 * `schools.grading_config` (jsonb) — `parseGradingConfig()` valida o JSON e
 * cai no default campo a campo. O motor (lib/gradeEngine.ts) não muda.
 */

export interface GradeComponent {
  id: string;
  label: string;
  /** Cabeçalho curto, para a tabela de lançamento. */
  short: string;
  max: number;
}

export interface EvaluationScheme {
  /**
   * Componentes que somam a N1. A soma dos `max` deve fechar em `scale.max`.
   * Validado por `validateGradingConfig()`.
   */
  components: GradeComponent[];
  /** Se existir: Média Bim. = (N1 + Prova) / 2. Se não: Média Bim. = N1. */
  exam?: GradeComponent;
}

/** Quem lança a nota — controla o que cada professor enxerga no diário. */
export type TaughtBy = 'regente' | 'english' | 'pe';

/**
 * Como a disciplina é avaliada.
 *   'grade'  -> nota numérica, entra no boletim e no cálculo de aprovação.
 *   'report' -> relatório descritivo, sem nota. Não reprova por média.
 */
export type SubjectEvaluation = 'grade' | 'report';

export interface Subject {
  id: string;
  /** Nome de exibição, no diário e no boletim. */
  name: string;
  /** Nome oficial (LDB), usado no histórico escolar. */
  officialName: string;
  evaluation: SubjectEvaluation;
  /** Só existe quando `evaluation` é 'grade'. */
  scheme?: EvaluationScheme;
  taughtBy: TaughtBy;
}

export interface GradingPolicy {
  scale: { min: number; max: number };
  passingGrade: number;
  /** Frequência mínima anual, em %. */
  minAttendance: number;
  /** Casas decimais exibidas. */
  decimals: number;
  /**
   * Máximo de disciplinas abaixo da média com direito a recuperação final.
   * Acima disso o aluno não vai para a recuperação final.
   */
  maxSubjectsInFinalRecovery: number;
  /** Bimestres que encerram semestre e abrem recuperação. */
  recoveryPeriods: number[];
}

// ---------------------------------------------------------------------------
// Esquemas de avaliação
// ---------------------------------------------------------------------------

/** Trabalho + Pesquisa + Atividades = N1; média com a prova. */
const COMPOSTO: EvaluationScheme = {
  components: [
    { id: 'work', label: 'Trabalho', short: 'Trab.', max: 50 },
    { id: 'research', label: 'Pesquisa', short: 'Pesq.', max: 30 },
    { id: 'activities', label: 'Atividades', short: 'Ativ.', max: 20 },
  ],
  exam: { id: 'exam', label: 'Prova', short: 'Prova', max: 100 },
};

/** Arte: só o portfólio, sem prova. */
const PORTFOLIO: EvaluationScheme = {
  components: [{ id: 'portfolio', label: 'Portfólio', short: 'Portf.', max: 100 }],
};

/** Inglês: nota única, sem prova separada. */
const NOTA_UNICA: EvaluationScheme = {
  components: [{ id: 'single', label: 'Nota', short: 'Nota', max: 100 }],
};

// Educação Física não tem esquema: é avaliada por relatório descritivo
// (confirmado com a direção em 04/08/2026), como nos diários do 2º ao 5º ano,
// onde ela não aparece entre as disciplinas com nota.

// ---------------------------------------------------------------------------
// Disciplinas
// ---------------------------------------------------------------------------

/**
 * Fonte única da verdade. Substitui as listas divergentes que existiam em
 * Bulletin.tsx, Agenda.tsx, TranscriptGenerator.tsx e Management.tsx.
 */
export const SUBJECTS: Subject[] = [
  { id: 'port', name: 'Português', officialName: 'Língua Portuguesa', evaluation: 'grade', scheme: COMPOSTO, taughtBy: 'regente' },
  { id: 'mat', name: 'Matemática', officialName: 'Matemática', evaluation: 'grade', scheme: COMPOSTO, taughtBy: 'regente' },
  { id: 'hist', name: 'História', officialName: 'História', evaluation: 'grade', scheme: COMPOSTO, taughtBy: 'regente' },
  { id: 'geo', name: 'Geografia', officialName: 'Geografia', evaluation: 'grade', scheme: COMPOSTO, taughtBy: 'regente' },
  { id: 'cie', name: 'Ciências', officialName: 'Ciências Físicas e Biológicas', evaluation: 'grade', scheme: COMPOSTO, taughtBy: 'regente' },
  { id: 'arte', name: 'Arte', officialName: 'Arte', evaluation: 'grade', scheme: PORTFOLIO, taughtBy: 'regente' },
  { id: 'ing', name: 'Inglês', officialName: 'Língua Estrangeira - Inglês', evaluation: 'grade', scheme: NOTA_UNICA, taughtBy: 'english' },
  { id: 'ef', name: 'Ed. Física', officialName: 'Educação Física', evaluation: 'report', taughtBy: 'pe' },
];

export const GRADING_POLICY: GradingPolicy = {
  scale: { min: 0, max: 100 },
  passingGrade: 70,
  minAttendance: 75,
  decimals: 1,
  maxSubjectsInFinalRecovery: 3,
  recoveryPeriods: [2, 4],
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function getSubject(id: string): Subject | undefined {
  return SUBJECTS.find(s => s.id === id);
}

/** Disciplinas que um professor pode lançar, conforme sua especialidade. */
export function subjectsFor(specialty?: 'english' | 'pe' | 'none'): Subject[] {
  if (specialty === 'english') return SUBJECTS.filter(s => s.taughtBy === 'english');
  if (specialty === 'pe') return SUBJECTS.filter(s => s.taughtBy === 'pe');
  return SUBJECTS.filter(s => s.taughtBy === 'regente');
}

/** Só as disciplinas com nota — as que entram no boletim e na aprovação. */
export function gradedSubjects(subjects: Subject[] = SUBJECTS): Subject[] {
  return subjects.filter(s => s.evaluation === 'grade' && s.scheme);
}

/** Todos os campos lançáveis de um esquema, na ordem de exibição. */
export function schemeFields(scheme: EvaluationScheme): GradeComponent[] {
  return scheme.exam ? [...scheme.components, scheme.exam] : [...scheme.components];
}

/**
 * Confere se cada esquema fecha na escala. Roda em dev para pegar erro de
 * configuração cedo — um peso errado aqui contamina todo boletim da escola.
 */
export function validateGradingConfig(
  subjects: Subject[] = SUBJECTS,
  policy: GradingPolicy = GRADING_POLICY,
): string[] {
  const errors: string[] = [];

  for (const subject of subjects) {
    if (subject.evaluation === 'report') {
      // Avaliada por relatório: não deve carregar esquema de nota.
      if (subject.scheme) {
        errors.push(`${subject.name}: é avaliada por relatório, não deveria ter esquema de nota.`);
      }
      continue;
    }

    if (!subject.scheme) {
      errors.push(`${subject.name}: avaliada por nota, mas sem esquema definido.`);
      continue;
    }

    const sum = subject.scheme.components.reduce((acc, c) => acc + c.max, 0);
    if (sum !== policy.scale.max) {
      errors.push(
        `${subject.name}: componentes somam ${sum}, esperado ${policy.scale.max}.`,
      );
    }
    if (subject.scheme.exam && subject.scheme.exam.max !== policy.scale.max) {
      errors.push(
        `${subject.name}: prova vale ${subject.scheme.exam.max}, esperado ${policy.scale.max}.`,
      );
    }
  }

  const ids = subjects.map(s => s.id);
  const duplicated = ids.filter((id, i) => ids.indexOf(id) !== i);
  if (duplicated.length > 0) {
    errors.push(`ids de disciplina duplicados: ${[...new Set(duplicated)].join(', ')}.`);
  }

  return errors;
}

// ---------------------------------------------------------------------------
// Configuração completa (o que fica em schools.grading_config)
// ---------------------------------------------------------------------------

export interface GradingConfig {
  subjects: Subject[];
  policy: GradingPolicy;
  /** Rótulos dos períodos 1..4. O 5º é sempre a recuperação final. */
  periods: string[];
  /** Séries oferecidas, por segmento — alimenta o cadastro de turmas. */
  series: Record<'infantil' | 'fundamental', string[]>;
}

/** Ids fixos dos lançamentos que não são componente de esquema. */
export const RECOVERY_COMPONENT = 'recovery';
export const FINAL_RECOVERY_PERIOD = 5;
export const FINAL_RECOVERY_COMPONENT = 'final';

export const DEFAULT_PERIODS = ['1º Bimestre', '2º Bimestre', '3º Bimestre', '4º Bimestre'];

export const DEFAULT_SERIES: GradingConfig['series'] = {
  infantil: ['Berçário', 'Maternal I', 'Maternal II', 'Jardim I', 'Jardim II'],
  fundamental: ['1º Ano', '2º Ano', '3º Ano', '4º Ano', '5º Ano'],
};

export const DEFAULT_GRADING_CONFIG: GradingConfig = {
  subjects: SUBJECTS,
  policy: GRADING_POLICY,
  periods: DEFAULT_PERIODS,
  series: DEFAULT_SERIES,
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/**
 * Lê o JSON salvo na escola. Tolerante: qualquer campo ausente ou inválido
 * cai no default, e o resultado passa por `validateGradingConfig` — se a
 * política da escola não fecha, devolvemos o default inteiro e avisamos no
 * console, porque um peso errado contamina todo boletim.
 */
export function parseGradingConfig(json: unknown): GradingConfig {
  if (!isRecord(json)) return DEFAULT_GRADING_CONFIG;

  const subjects = Array.isArray(json.subjects) && json.subjects.length > 0
    ? (json.subjects as Subject[])
    : SUBJECTS;

  const policy: GradingPolicy = isRecord(json.policy)
    ? { ...GRADING_POLICY, ...(json.policy as Partial<GradingPolicy>) }
    : GRADING_POLICY;

  const periods = Array.isArray(json.periods) && json.periods.length === 4
    ? (json.periods as string[])
    : DEFAULT_PERIODS;

  const series = isRecord(json.series)
    ? { ...DEFAULT_SERIES, ...(json.series as Partial<GradingConfig['series']>) }
    : DEFAULT_SERIES;

  const errors = validateGradingConfig(subjects, policy);
  if (errors.length > 0) {
    console.error('grading_config inválido, usando o default:', errors);
    return DEFAULT_GRADING_CONFIG;
  }

  return { subjects, policy, periods, series };
}
