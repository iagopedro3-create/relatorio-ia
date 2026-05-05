export interface LessonPlan {
  id: string;
  teacherId: string;
  teacherName: string;
  classId: string;
  className: string;
  subject: string;
  date: string;
  theme: string;
  objectives: string;
  content: string;
  methodology: string;
  resources: string;
  activities: string;
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
    date: '2026-05-10',
    theme: 'Exploração de Texturas Naturais',
    objectives: 'Explorar diferentes texturas (folhas, gravetos, areia) e desenvolver a percepção tátil.',
    content: 'Elementos da natureza coletados no pátio.',
    methodology: 'Roda de conversa seguida de exploração livre em cestos de tesouros.',
    resources: 'Cestas, elementos naturais, lupas de plástico.',
    activities: 'Coleta no pátio, exploração tátil, colagem coletiva.',
    evaluation: 'Observação do engajamento e curiosidade das crianças.',
    status: 'approved',
    aiSuggestions: [
      {
        id: 's1',
        type: 'ideas',
        content: 'Sugestão de Atividade: Criar um "caminho sensorial" no chão com diferentes folhas e galhos para as crianças caminharem descalças.',
        isFavorite: true,
        createdAt: '2026-05-04T10:00:00Z'
      }
    ],
    createdAt: '2026-05-04T09:00:00Z'
  }
];
