export interface DailyPlan {
  date: string;
  dayOfWeek: string;
  subject: string;
  theme: string;
  objectives: string;
  content: string;
  activities: string;
}

export interface LessonPlan {
  id: string;
  teacherId: string;
  teacherName: string;
  classId: string;
  className: string;
  startDate: string;
  endDate: string;
  weeklyTheme: string; // Overall theme for the week
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
    startDate: '2026-05-11',
    endDate: '2026-05-15',
    weeklyTheme: 'Semana da Exploração Tátil',
    dailyPlans: [
      { 
        date: '2026-05-11', 
        dayOfWeek: 'Segunda-feira', 
        subject: 'Experiências Sensoriais',
        theme: 'Texturas Secas',
        objectives: 'Identificar texturas ásperas e lisas.',
        content: 'Introdução às texturas secas.', 
        activities: 'Manuseio de folhas e gravetos.' 
      }
    ],
    methodology: 'Roda de conversa seguida de exploração livre.',
    resources: 'Cestas, elementos naturais.',
    evaluation: 'Observação do engajamento.',
    status: 'approved',
    aiSuggestions: [],
    createdAt: '2026-05-04T09:00:00Z'
  }
];
