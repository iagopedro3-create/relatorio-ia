// Roles and permissions structure
export type Role = 'admin' | 'coordinator' | 'teacher' | 'responsible';

export interface User {
  id: string;
  name: string;
  username: string;
  password: string;
  role: Role;
  classId?: string;
  studentId?: string; // For responsibles
  specialty?: 'english' | 'pe' | 'none';
  managedLevel?: 'infantil' | 'fundamental' | 'all';
}

export interface SchoolYear {
  id: string;
  label: string;
  active: boolean;
  status: 'open' | 'closed';
}

export const mockYears: SchoolYear[] = [
  { id: '2024', label: 'Ano Letivo 2024', active: false, status: 'closed' },
  { id: '2025', label: 'Ano Letivo 2025', active: false, status: 'closed' },
  { id: '2026', label: 'Ano Letivo 2026', active: true, status: 'open' },
];

export interface ClassGroup {
  id: string;
  yearId: string;
  name: string; // Combined: "1º Ano A"
  series: string; // "1º Ano"
  letter: string; // "A"
  teacherId?: string;
  evaluationType: 'report' | 'numeric';
  level: 'infantil' | 'fundamental';
}

export interface Student {
  id: string;
  name: string;
  birthDate: string; // ISO date YYYY-MM-DD
  parent1: string;
  parent2?: string;
  classId?: string; // Added to simplify mock DB usage
}

// Map students to classes per year
export interface Enrollment {
  studentId: string;
  classId: string;
  yearId: string;
}

export interface ReportRecord {
  id: string;
  studentId: string;
  classId: string;
  teacherId: string;
  yearId: string;
  context: string; // 1b, 2b, etc
  createdAt: string;
}

export const mockUsers: User[] = [
  { id: 'u1',  name: 'Diretora Ana',           username: 'diretora',  password: 'direcao123', role: 'admin',       managedLevel: 'all' },
  { id: 'u2',  name: 'Coord. Carla (Infantil)', username: 'coordinfantil',     password: 'coord123',   role: 'coordinator', managedLevel: 'infantil' },
  { id: 'u2b', name: 'Coord. Pedro (Fund. I)',  username: 'coordfundamental',     password: 'coord123',   role: 'coordinator', managedLevel: 'fundamental' },
  { id: 'u3',  name: 'Profa. Maria (Infantil)',  username: 'profinfantil',     password: 'prof123',    role: 'teacher' },
  { id: 'u4',  name: 'Prof. João (Fundamental)', username: 'proffundamental',      password: 'prof123',    role: 'teacher' },
  { id: 'u5',  name: 'Prof. Marcos (Inglês)',   username: 'ingles',    password: 'prof123',    role: 'teacher',     specialty: 'english' },
  { id: 'u6',  name: 'Profa. Sandra (Ed. Física)', username: 'edfisica', password: 'prof123', role: 'teacher', specialty: 'pe' },
  { id: 'u7',  name: 'Sr. Marcos (Pai do Lucas)', username: 'pai',       password: 'pai123',     role: 'responsible', studentId: 's1' },
];

export const mockClasses: ClassGroup[] = [
  // 2026 Classes
  { id: 'c1', yearId: '2026', name: 'NINHO A', series: 'Ninho', letter: 'A', evaluationType: 'report', level: 'infantil', teacherId: 'u3' },
  { id: 'c2', yearId: '2026', name: 'GRUPO 2 A', series: 'Grupo 2', letter: 'A', evaluationType: 'report', level: 'infantil', teacherId: 'u4' },
  { id: 'c3', yearId: '2026', name: 'GRUPO 3 A', series: 'Grupo 3', letter: 'A', evaluationType: 'report', level: 'infantil' },
  { id: 'c4', yearId: '2026', name: 'GRUPO 4 A', series: 'Grupo 4', letter: 'A', evaluationType: 'report', level: 'infantil' },
  { id: 'c5', yearId: '2026', name: 'GRUPO 5 A', series: 'Grupo 5', letter: 'A', evaluationType: 'report', level: 'infantil' },
  { id: 'c6', yearId: '2026', name: '1º ANO A', series: '1º Ano', letter: 'A', evaluationType: 'report', level: 'fundamental' },
  { id: 'c7', yearId: '2026', name: '2º ANO A', series: '2º Ano', letter: 'A', evaluationType: 'numeric', level: 'fundamental' },
  { id: 'c8', yearId: '2026', name: '3º ANO A', series: '3º Ano', letter: 'A', evaluationType: 'numeric', level: 'fundamental' },
  { id: 'c9', yearId: '2026', name: '4º ANO A', series: '4º Ano', letter: 'A', evaluationType: 'numeric', level: 'fundamental' },
  { id: 'c10', yearId: '2026', name: '5º ANO A', series: '5º Ano', letter: 'A', evaluationType: 'numeric', level: 'fundamental' },
  
  // 2025 Classes (Archive Demo)
  { id: 'c2025_1', yearId: '2025', name: 'NINHO A', series: 'Ninho', letter: 'A', evaluationType: 'report', level: 'infantil', teacherId: 'u3' },
];

export const mockStudents: Student[] = [
  { id: 's1',  name: 'Lucas Silva',       birthDate: '2025-02-10', parent1: 'Sr. Marcos', classId: 'c1' },
  { id: 's2',  name: 'Marina Souza',      birthDate: '2024-08-22', parent1: 'Sra. Alice', classId: 'c1' },
  { id: 's3',  name: 'Pedro Alves',       birthDate: '2023-05-14', parent1: 'Sra. Julia', classId: 'c2' },
  { id: 's4',  name: 'Beatriz Lima',      birthDate: '2022-11-03', parent1: 'Sr. Roberto', classId: 'c3' },
  { id: 's5',  name: 'Sofia Ramos',       birthDate: '2018-07-08', parent1: 'Sra. Fernanda', classId: 'c7' },
  { id: 's6',  name: 'Ana Carvalho',      birthDate: '2019-01-15', parent1: 'Sra. Renata', classId: 'c6' },
  { id: 's7',  name: 'Gabriel Nunes',     birthDate: '2019-03-20', parent1: 'Sr. Paulo', classId: 'c6' },
  { id: 's8',  name: 'Mateus Costa',      birthDate: '2018-02-17', parent1: 'Sr. André', classId: 'c7' },
  { id: 's9',  name: 'Isabela Ferreira',  birthDate: '2018-10-30', parent1: 'Sra. Camila', classId: 'c7' },
  { id: 's10', name: 'Rafael Oliveira',   birthDate: '2017-04-12', parent1: 'Sr. Bruno', classId: 'c8' },
  { id: 's11', name: 'Laura Santos',      birthDate: '2017-09-05', parent1: 'Sra. Marcia', classId: 'c8' },
  { id: 's12', name: 'Thiago Pereira',    birthDate: '2017-01-28', parent1: 'Sr. Carlos', classId: 'c8' },
  { id: 's13', name: 'Valentina Gomes',   birthDate: '2016-06-19', parent1: 'Sra. Lucia', classId: 'c9' },
  { id: 's14', name: 'Leonardo Rocha',    birthDate: '2016-11-25', parent1: 'Sr. Eduardo', classId: 'c9' },
  { id: 's15', name: 'Júlia Mendes',      birthDate: '2015-03-07', parent1: 'Sra. Patricia', classId: 'c10' },
  { id: 's16', name: 'Arthur Lima',       birthDate: '2015-08-14', parent1: 'Sr. Fábio', classId: 'c10' },
  { id: 's17', name: 'Manuela Dias',      birthDate: '2015-12-01', parent1: 'Sr. Gustavo', classId: 'c10' },
];

export const mockEnrollments: Enrollment[] = [
  // 2026 Enrollments
  { studentId: 's1', classId: 'c1', yearId: '2026' },
  { studentId: 's2', classId: 'c1', yearId: '2026' },
  { studentId: 's3', classId: 'c2', yearId: '2026' },
  { studentId: 's4', classId: 'c3', yearId: '2026' },
  { studentId: 's6', classId: 'c6', yearId: '2026' },
  { studentId: 's7', classId: 'c6', yearId: '2026' },
  { studentId: 's5', classId: 'c7', yearId: '2026' },
  { studentId: 's8', classId: 'c7', yearId: '2026' },
  { studentId: 's9', classId: 'c7', yearId: '2026' },
  { studentId: 's10', classId: 'c8', yearId: '2026' },
  { studentId: 's11', classId: 'c8', yearId: '2026' },
  { studentId: 's12', classId: 'c8', yearId: '2026' },
  { studentId: 's13', classId: 'c9', yearId: '2026' },
  { studentId: 's14', classId: 'c9', yearId: '2026' },
  { studentId: 's15', classId: 'c10', yearId: '2026' },
  { studentId: 's16', classId: 'c10', yearId: '2026' },
  { studentId: 's17', classId: 'c10', yearId: '2026' },
];

export const mockReports: ReportRecord[] = [
  { id: 'r1', studentId: 's1', classId: 'c1', teacherId: 'u3', yearId: '2026', context: '1º Bimestre', createdAt: '2026-04-15' },
  { id: 'r2', studentId: 's2', classId: 'c1', teacherId: 'u3', yearId: '2026', context: '1º Bimestre', createdAt: '2026-04-16' },
  { id: 'r3', studentId: 's3', classId: 'c2', teacherId: 'u4', yearId: '2026', context: '1º Bimestre', createdAt: '2026-04-18' },
];

export interface AttendanceRecord {
  id: string;
  studentId: string;
  classId: string;
  date: string;
  status: 'P' | 'F';
}

export interface LessonRecord {
  id: string;
  classId: string;
  date: string;
  subject: string;
  content: string;
  observations?: string;
}

export interface GradeRecord {
  id: string;
  studentId: string;
  classId: string;
  bimestre: string;
  work: number;
  research: number;
  activities: number;
  exam: number;
}

export interface RecoveryRecord {
  id: string;
  studentId: string;
  semester: 1 | 2 | 'final';
  grade: number;
}

export const mockAttendance: AttendanceRecord[] = [
  { id: 'att1', studentId: 's6', classId: 'c6', date: '2026-02-05', status: 'P' },
  { id: 'att2', studentId: 's7', classId: 'c6', date: '2026-02-05', status: 'F' },
  { id: 'att3', studentId: 's6', classId: 'c6', date: '2026-02-06', status: 'P' },
  { id: 'att4', studentId: 's7', classId: 'c6', date: '2026-02-06', status: 'P' },
];
export const mockLessons: LessonRecord[] = [
  { id: 'l1', classId: 'c6', date: '2026-02-05', subject: 'Português', content: 'Leitura e interpretação de texto: "O Menino e o Mar". Atividades de compreensão.' },
  { id: 'l2', classId: 'c6', date: '2026-02-06', subject: 'Matemática', content: 'Operações de adição com reserva. Resolução de problemas do cotidiano.' },
  { id: 'l3', classId: 'c6', date: '2026-02-09', subject: 'Geografia', content: 'Meios de transporte: evolução e importância para a sociedade.' },
];
export const mockGrades: GradeRecord[] = [];
export const mockRecoveries: RecoveryRecord[] = [];

export interface Assessment {
  id: string;
  name: string;
  bimestre: string;
  subject: string;
  questions: { id: string; theme: string; skill: string }[];
}

export interface AssessmentResult {
  id: string;
  studentId: string;
  assessmentId: string;
  answers: { questionId: string; correct: boolean }[];
}

export const mockAssessments: Assessment[] = [
  {
    id: 'a1',
    name: 'Avaliação de Português - 1º Bimestre',
    bimestre: '1º Bimestre',
    subject: 'Português',
    questions: [
      { id: 'q1', theme: 'Interpretação de Texto', skill: 'EF35LP01' },
      { id: 'q2', theme: 'Ortografia', skill: 'EF35LP03' },
      { id: 'q3', theme: 'Pontuação', skill: 'EF35LP04' },
      { id: 'q4', theme: 'Gramática', skill: 'EF35LP05' },
    ]
  }
];

export const mockAssessmentResults: AssessmentResult[] = [];

export const mockStore = {
  settings: {
    apiKey: '',
    aiProvider: 'gemini' as 'gemini' | 'openai',
    aiModel: 'gemini-1.5-flash',
  },
  attendance: mockAttendance,
  lessons: mockLessons,
  grades: mockGrades,
  recoveries: mockRecoveries,
  assessments: mockAssessments,
  assessmentResults: mockAssessmentResults
};

