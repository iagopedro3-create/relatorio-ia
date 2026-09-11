/**
 * Motor de cálculo de notas — funções puras, sem React e sem storage.
 *
 * Regras da Escola Vida de Aprendiz (confirmadas com a coordenação):
 *
 *   N1            = soma dos componentes do esquema da disciplina
 *   Média Bim.    = (N1 + Prova) / 2   — ou apenas N1, se a disciplina não tem prova
 *   Média Sem.    = (Bim A + Bim B) / 2
 *   Final Sem.    = max(Média Sem., Recuperação)     — a recuperação substitui, prevalece a maior
 *   Média Anual   = (Final S1 + Final S2) / 2        — usa as médias já recuperadas
 *   Resultado     = max(Média Anual, Recuperação Final)
 *
 *   Aprovação ≥ 70 e frequência ≥ 75%.
 *   Recuperação existe apenas no fim de cada semestre (2º e 4º bimestre).
 *   Recuperação final: até 3 disciplinas abaixo da média.
 *
 * Convenção de nulos: `null` é "não lançado" e é diferente de `0`, que é uma
 * nota zero legítima. Média só é considerada fechada quando todos os campos do
 * esquema foram lançados (`complete`).
 */

import type { EvaluationScheme, GradingPolicy, Subject } from '../store/gradingConfig';
import {
  FINAL_RECOVERY_COMPONENT, FINAL_RECOVERY_PERIOD, GRADING_POLICY, RECOVERY_COMPONENT, schemeFields,
} from '../store/gradingConfig';

/** Notas cruas de um bimestre, indexadas pelo id do componente do esquema. */
export type RawGrades = Record<string, number | null>;

export interface BimesterResult {
  n1: number | null;
  media: number | null;
  /** Todos os campos do esquema foram lançados. */
  complete: boolean;
  /** Ao menos um campo foi lançado. */
  started: boolean;
}

export interface SemesterResult {
  /** Média dos dois bimestres, antes da recuperação. */
  media: number | null;
  recovery: number | null;
  /** max(media, recovery) — o que vale para a média anual. */
  final: number | null;
  needsRecovery: boolean;
  complete: boolean;
}

export interface SubjectResult {
  subjectId: string;
  bimesters: [BimesterResult, BimesterResult, BimesterResult, BimesterResult];
  s1: SemesterResult;
  s2: SemesterResult;
  annual: number | null;
  finalRecovery: number | null;
  /** max(annual, finalRecovery) — a nota que vai para o histórico. */
  final: number | null;
  passed: boolean | null;
}

export type StudentStatus =
  | 'CURSANDO'
  | 'APROVADO'
  | 'RECUPERACAO_FINAL'
  | 'REPROVADO'
  | 'REPROVADO_POR_FALTA';

export interface StudentOutcome {
  status: StudentStatus;
  subjects: SubjectResult[];
  /** Disciplinas com média anual abaixo da nota de aprovação. */
  below: SubjectResult[];
  /** Média geral do aluno, entre as disciplinas já fechadas. */
  overall: number | null;
  attendance: number | null;
}

/** Notas de um aluno numa disciplina, ao longo do ano. */
export interface SubjectGradeBook {
  subjectId: string;
  /** Índice 0..3 = 1º ao 4º bimestre. */
  bimesters: [RawGrades, RawGrades, RawGrades, RawGrades];
  recoveryS1: number | null;
  recoveryS2: number | null;
  finalRecovery: number | null;
}

// ---------------------------------------------------------------------------

export function roundGrade(value: number, policy: GradingPolicy = GRADING_POLICY): number {
  const factor = 10 ** policy.decimals;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

/** Limita um valor à escala e ao máximo do campo. Usado no input do diário. */
export function clampGrade(
  value: number,
  max: number,
  policy: GradingPolicy = GRADING_POLICY,
): number {
  return Math.min(max, Math.max(policy.scale.min, value));
}

// ---------------------------------------------------------------------------

export function calcBimester(raw: RawGrades, scheme: EvaluationScheme): BimesterResult {
  const fields = schemeFields(scheme);
  const launched = fields.map(f => raw[f.id]);

  const started = launched.some(v => v !== null && v !== undefined);
  const complete = launched.every(v => v !== null && v !== undefined);

  if (!started) return { n1: null, media: null, complete: false, started: false };

  const n1 = scheme.components.reduce((sum, c) => sum + (raw[c.id] ?? 0), 0);
  const media = scheme.exam ? (n1 + (raw[scheme.exam.id] ?? 0)) / 2 : n1;

  return { n1, media, complete, started: true };
}

export function calcSemester(
  bimA: BimesterResult,
  bimB: BimesterResult,
  recovery: number | null,
  policy: GradingPolicy = GRADING_POLICY,
): SemesterResult {
  // O semestre só fecha com os dois bimestres lançados por inteiro.
  if (!bimA.complete || !bimB.complete || bimA.media === null || bimB.media === null) {
    return { media: null, recovery, final: null, needsRecovery: false, complete: false };
  }

  const media = (bimA.media + bimB.media) / 2;
  const needsRecovery = media < policy.passingGrade;
  const final = recovery !== null ? Math.max(media, recovery) : media;

  return { media, recovery, final, needsRecovery, complete: true };
}

/**
 * Disciplina avaliada por relatório (Ed. Física) não tem esquema de nota.
 * Chamar o cálculo aqui é erro de quem chamou — o motor devolve vazio em vez de
 * inventar média, e `calcStudentOutcome` já filtra essas disciplinas antes.
 */
export function calcSubject(
  book: SubjectGradeBook,
  subject: Subject,
  policy: GradingPolicy = GRADING_POLICY,
): SubjectResult {
  if (!subject.scheme) {
    const vazio: BimesterResult = { n1: null, media: null, complete: false, started: false };
    const semestre: SemesterResult = {
      media: null, recovery: null, final: null, needsRecovery: false, complete: false,
    };
    return {
      subjectId: subject.id,
      bimesters: [vazio, vazio, vazio, vazio],
      s1: semestre,
      s2: semestre,
      annual: null,
      finalRecovery: null,
      final: null,
      passed: null,
    };
  }

  const scheme = subject.scheme;
  const bimesters = book.bimesters.map(raw => calcBimester(raw, scheme)) as
    SubjectResult['bimesters'];

  const s1 = calcSemester(bimesters[0], bimesters[1], book.recoveryS1, policy);
  const s2 = calcSemester(bimesters[2], bimesters[3], book.recoveryS2, policy);

  const annual = s1.final !== null && s2.final !== null ? (s1.final + s2.final) / 2 : null;

  const final =
    annual === null
      ? null
      : book.finalRecovery !== null
        ? Math.max(annual, book.finalRecovery)
        : annual;

  return {
    subjectId: subject.id,
    bimesters,
    s1,
    s2,
    annual,
    finalRecovery: book.finalRecovery,
    final,
    passed: final === null ? null : final >= policy.passingGrade,
  };
}

/**
 * Situação do aluno no ano.
 *
 * A reprovação por falta tem precedência: não adianta recuperar nota se a
 * frequência não fecha.
 */
export function calcStudentOutcome(
  books: SubjectGradeBook[],
  subjects: Subject[],
  attendance: number | null,
  policy: GradingPolicy = GRADING_POLICY,
): StudentOutcome {
  // Disciplinas de relatório (Ed. Física) ficam de fora: não têm média e não
  // podem reprovar o aluno por nota.
  const results = books
    .map(book => {
      const subject = subjects.find(s => s.id === book.subjectId);
      if (!subject || subject.evaluation !== 'grade') return null;
      return calcSubject(book, subject, policy);
    })
    .filter((r): r is SubjectResult => r !== null);

  const closed = results.filter(r => r.annual !== null);
  const overall =
    closed.length > 0 ? closed.reduce((acc, r) => acc + (r.final ?? 0), 0) / closed.length : null;

  const below = closed.filter(r => (r.annual ?? 0) < policy.passingGrade);

  const base: Omit<StudentOutcome, 'status'> = {
    subjects: results,
    below,
    overall,
    attendance,
  };

  if (attendance !== null && attendance < policy.minAttendance) {
    return { ...base, status: 'REPROVADO_POR_FALTA' };
  }

  // Ano ainda não fechou em todas as disciplinas.
  if (closed.length < results.length || results.length === 0) {
    return { ...base, status: 'CURSANDO' };
  }

  if (below.length === 0) {
    return { ...base, status: 'APROVADO' };
  }

  // Acima do limite, o aluno não tem direito à recuperação final.
  if (below.length > policy.maxSubjectsInFinalRecovery) {
    return { ...base, status: 'REPROVADO' };
  }

  // Dentro do limite: só resolve depois que a recuperação final for lançada.
  const pending = below.some(r => r.finalRecovery === null);
  if (pending) {
    return { ...base, status: 'RECUPERACAO_FINAL' };
  }

  const stillBelow = below.filter(r => !r.passed);
  return { ...base, status: stillBelow.length === 0 ? 'APROVADO' : 'REPROVADO' };
}

// ---------------------------------------------------------------------------

/** Livro de notas vazio — usado ao abrir o diário de uma disciplina nova. */
export function emptyGradeBook(subjectId: string): SubjectGradeBook {
  return {
    subjectId,
    bimesters: [{}, {}, {}, {}],
    recoveryS1: null,
    recoveryS2: null,
    finalRecovery: null,
  };
}

export const STATUS_LABEL: Record<StudentStatus, string> = {
  CURSANDO: 'Cursando',
  APROVADO: 'Aprovado',
  RECUPERACAO_FINAL: 'Recuperação Final',
  REPROVADO: 'Reprovado',
  REPROVADO_POR_FALTA: 'Reprovado por Falta',
};

// ---------------------------------------------------------------------------
// Ponte com o banco: grade_entries -> SubjectGradeBook
// ---------------------------------------------------------------------------

/** Subconjunto de public.grade_entries que o motor precisa. */
export interface GradeEntryLike {
  subject_id: string;
  period: number;
  component_id: string;
  value: number;
}

/**
 * Monta o livro de notas de uma disciplina a partir das linhas de
 * `grade_entries` de UMA matrícula. Linhas de outras disciplinas são ignoradas.
 *
 * Convenção de armazenamento:
 *   period 1..4 + component do esquema  -> nota do bimestre
 *   period 2|4  + 'recovery'            -> recuperação do semestre
 *   period 5    + 'final'               -> recuperação final
 */
export function buildGradeBook(entries: GradeEntryLike[], subjectId: string): SubjectGradeBook {
  const book = emptyGradeBook(subjectId);
  for (const e of entries) {
    if (e.subject_id !== subjectId) continue;
    const value = Number(e.value);
    if (e.period === FINAL_RECOVERY_PERIOD) {
      if (e.component_id === FINAL_RECOVERY_COMPONENT) book.finalRecovery = value;
      continue;
    }
    if (e.component_id === RECOVERY_COMPONENT) {
      if (e.period === 2) book.recoveryS1 = value;
      if (e.period === 4) book.recoveryS2 = value;
      continue;
    }
    if (e.period >= 1 && e.period <= 4) {
      book.bimesters[e.period - 1][e.component_id] = value;
    }
  }
  return book;
}

/** Percentual de presença (0..100) ou null se não há registro. */
export function attendanceRate(records: { status: 'P' | 'F' }[]): number | null {
  if (records.length === 0) return null;
  const present = records.filter(r => r.status === 'P').length;
  return (present / records.length) * 100;
}
