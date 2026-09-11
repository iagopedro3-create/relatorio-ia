import { describe, expect, it } from 'vitest';
import {
  attendanceRate, buildGradeBook, calcBimester, calcSemester, calcStudentOutcome, calcSubject, clampGrade, emptyGradeBook, roundGrade,
} from './gradeEngine';
import { GRADING_POLICY, SUBJECTS, getSubject, parseGradingConfig, validateGradingConfig, DEFAULT_GRADING_CONFIG } from '../store/gradingConfig';

const port = getSubject('port')!;
const arte = getSubject('arte')!;

describe('calcBimester', () => {
  it('N1 = soma dos componentes; média = (N1 + prova) / 2', () => {
    const r = calcBimester({ work: 40, research: 25, activities: 15, exam: 80 }, port.scheme!);
    expect(r.n1).toBe(80);
    expect(r.media).toBe(80);
    expect(r.complete).toBe(true);
  });

  it('sem prova, média = N1 (Arte)', () => {
    const r = calcBimester({ portfolio: 90 }, arte.scheme!);
    expect(r.media).toBe(90);
  });

  it('nada lançado -> não iniciado', () => {
    const r = calcBimester({}, port.scheme!);
    expect(r.started).toBe(false);
    expect(r.media).toBeNull();
  });

  it('lançamento parcial -> iniciado mas incompleto; nulo conta como 0 só na soma', () => {
    const r = calcBimester({ work: 50 }, port.scheme!);
    expect(r.started).toBe(true);
    expect(r.complete).toBe(false);
    expect(r.n1).toBe(50);
  });
});

describe('calcSemester', () => {
  const full = (media: number) => ({ n1: media, media, complete: true, started: true });

  it('recuperação substitui quando é maior', () => {
    const r = calcSemester(full(50), full(60), 75, GRADING_POLICY);
    expect(r.media).toBe(55);
    expect(r.needsRecovery).toBe(true);
    expect(r.final).toBe(75);
  });

  it('recuperação menor que a média não derruba', () => {
    const r = calcSemester(full(80), full(90), 40, GRADING_POLICY);
    expect(r.final).toBe(85);
  });

  it('semestre só fecha com os dois bimestres completos', () => {
    const r = calcSemester(full(80), { n1: null, media: null, complete: false, started: false }, null);
    expect(r.complete).toBe(false);
    expect(r.final).toBeNull();
  });
});

describe('buildGradeBook (ponte com grade_entries)', () => {
  it('distribui bimestres, recuperações e recuperação final', () => {
    const entries = [
      { subject_id: 'port', period: 1, component_id: 'work', value: 50 },
      { subject_id: 'port', period: 2, component_id: 'recovery', value: 70 },
      { subject_id: 'port', period: 4, component_id: 'recovery', value: 65 },
      { subject_id: 'port', period: 5, component_id: 'final', value: 72 },
      { subject_id: 'mat', period: 1, component_id: 'work', value: 10 }, // outra disciplina: ignorada
    ];
    const book = buildGradeBook(entries, 'port');
    expect(book.bimesters[0].work).toBe(50);
    expect(book.recoveryS1).toBe(70);
    expect(book.recoveryS2).toBe(65);
    expect(book.finalRecovery).toBe(72);
    expect(book.bimesters[0].mat).toBeUndefined();
  });
});

describe('calcSubject / calcStudentOutcome', () => {
  const bim = (media: number) => ({ work: media / 2, research: media * 0.3, activities: media * 0.2, exam: media });

  it('aprova aluno com médias acima de 70 e frequência ok', () => {
    const book = { ...emptyGradeBook('port'), bimesters: [bim(80), bim(80), bim(80), bim(80)] as never };
    const r = calcSubject(book, port);
    expect(r.annual).toBe(80);
    expect(r.passed).toBe(true);

    const outcome = calcStudentOutcome([book], [port], 90);
    expect(outcome.status).toBe('APROVADO');
  });

  it('reprova por falta antes de olhar nota', () => {
    const book = { ...emptyGradeBook('port'), bimesters: [bim(90), bim(90), bim(90), bim(90)] as never };
    expect(calcStudentOutcome([book], [port], 60).status).toBe('REPROVADO_POR_FALTA');
  });

  it('abaixo da média dentro do limite -> recuperação final pendente', () => {
    const book = { ...emptyGradeBook('port'), bimesters: [bim(50), bim(50), bim(50), bim(50)] as never };
    expect(calcStudentOutcome([book], [port], null).status).toBe('RECUPERACAO_FINAL');
  });

  it('recuperação final aprova quando alcança a média', () => {
    const book = { ...emptyGradeBook('port'), bimesters: [bim(50), bim(50), bim(50), bim(50)] as never, finalRecovery: 75 };
    expect(calcStudentOutcome([book], [port], null).status).toBe('APROVADO');
  });

  it('mais disciplinas abaixo que o limite -> reprovado direto', () => {
    const graded = SUBJECTS.filter(s => s.evaluation === 'grade');
    const books = graded.map(s => ({
      ...emptyGradeBook(s.id),
      bimesters: s.scheme!.exam ? [bim(40), bim(40), bim(40), bim(40)] as never : [{ portfolio: 40, single: 40 }, { portfolio: 40, single: 40 }, { portfolio: 40, single: 40 }, { portfolio: 40, single: 40 }] as never,
    }));
    expect(calcStudentOutcome(books, graded, null).status).toBe('REPROVADO');
  });

  it('ano em aberto enquanto faltar bimestre', () => {
    const book = { ...emptyGradeBook('port'), bimesters: [bim(80), bim(80), {}, {}] as never };
    expect(calcStudentOutcome([book], [port], null).status).toBe('CURSANDO');
  });

  it('disciplina de relatório (Ed. Física) não entra no cálculo', () => {
    const ef = getSubject('ef')!;
    const outcome = calcStudentOutcome([emptyGradeBook('ef')], [ef], null);
    expect(outcome.subjects).toHaveLength(0);
  });
});

describe('helpers', () => {
  it('clampGrade respeita o teto do campo e o piso da escala', () => {
    expect(clampGrade(120, 100)).toBe(100);
    expect(clampGrade(-5, 100)).toBe(0);
    expect(clampGrade(35, 30)).toBe(30);
  });

  it('roundGrade usa as casas da política', () => {
    expect(roundGrade(72.345)).toBe(72.3);
  });

  it('attendanceRate', () => {
    expect(attendanceRate([])).toBeNull();
    expect(attendanceRate([{ status: 'P' }, { status: 'P' }, { status: 'F' }, { status: 'P' }])).toBe(75);
  });
});

describe('gradingConfig por escola', () => {
  it('default valida', () => {
    expect(validateGradingConfig()).toEqual([]);
  });

  it('parse cai no default com JSON lixo', () => {
    expect(parseGradingConfig(null)).toBe(DEFAULT_GRADING_CONFIG);
    expect(parseGradingConfig('x')).toBe(DEFAULT_GRADING_CONFIG);
  });

  it('parse aceita sobrescrita parcial da política', () => {
    const cfg = parseGradingConfig({ policy: { passingGrade: 60 } });
    expect(cfg.policy.passingGrade).toBe(60);
    expect(cfg.policy.minAttendance).toBe(75);
    expect(cfg.subjects).toBe(SUBJECTS);
  });

  it('parse rejeita esquema que não fecha na escala', () => {
    const bad = {
      subjects: [{ id: 'x', name: 'X', officialName: 'X', evaluation: 'grade', taughtBy: 'regente', scheme: { components: [{ id: 'a', label: 'A', short: 'A', max: 40 }] } }],
    };
    expect(parseGradingConfig(bad)).toBe(DEFAULT_GRADING_CONFIG);
  });
});
