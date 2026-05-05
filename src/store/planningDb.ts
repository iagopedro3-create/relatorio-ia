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
  weeklyTheme: string;
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

// Persistent storage helper
const STORAGE_KEY = 'vda_lesson_plans';

export const getStoredPlans = (): LessonPlan[] => {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) return JSON.parse(stored);
  
  // Default mock data if empty
  const initialMock: LessonPlan[] = [
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
  localStorage.setItem(STORAGE_KEY, JSON.stringify(initialMock));
  return initialMock;
};

export const saveStoredPlans = (plans: LessonPlan[]) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(plans));
};

export const mockLessonPlans = getStoredPlans();
