export interface DailyPlan {
  date: string;
  dayOfWeek: string;
  content: string;
  activities: string;
}

export interface LessonPlan {
  id: string;
  teacherId: string;
  teacherName: string;
  classId: string;
  className: string;
  subject: string;
  startDate: string;
  endDate: string;
  theme: string;
  objectives: string;
  dailyPlans: DailyPlan[];
  methodology: string;
  resources: string;
  evaluation: string;
  status: 'draft' | 'pending' | 'approved' | 'returned';
  coordinatorFeedback?: string;
  aiSuggestions: AISuggestion[];
  createdAt: string;
}

export interface AISuggestion {
  id: string;
  type: 'ideas' | 'improvement' | 'adaptation';
  content: string;
  isFavorite: boolean;
  createdAt: string;
}

export const mockLessonPlans: LessonPlan[] = [
  {
    id: 'lp1',
    teacherId: 'u3',
    teacherName: 'Profa. Maria (Infantil)',
    classId: 'c1',
    className: 'NINHO',
    subject: 'Experiências Sensoriais',
    startDate: '2026-05-11',
    endDate: '2026-05-15',
    theme: 'Semana da Exploração Tátil',
    objectives: 'Explorar diferentes texturas (folhas, gravetos, areia) ao longo da semana.',
    dailyPlans: [
      { date: '2026-05-11', dayOfWeek: 'Segunda-feira', content: 'Introdução às texturas secas.', activities: 'Manuseio de folhas e gravetos.' },
      { date: '2026-05-12', dayOfWeek: 'Terça-feira', content: 'Texturas úmidas.', activities: 'Brincadeiras com argila e água.' }
    ],
    methodology: 'Roda de conversa seguida de exploração livre.',
    resources: 'Cestas, elementos naturais.',
    evaluation: 'Observação do engajamento.',
    status: 'approved',
    aiSuggestions: [],
    createdAt: '2026-05-04T09:00:00Z'
  }
];
