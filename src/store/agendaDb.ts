export interface AgendaMessage {
  id: string;
  subject: string;
  content: string;
  category: 'comunicado' | 'pedagogico' | 'financeiro' | 'evento';
  senderName: string;
  senderRole: 'admin' | 'coordinator' | 'teacher' | 'responsible';
  targetType: 'all' | 'class' | 'student' | 'staff';
  targetIds: string[];
  pinned: boolean;
  createdAt: string;
  attachments: { name: string; type: string }[];
  readBy: string[];
  deliveredTo: string[];
  replies: { id: string; senderName: string; senderRole: string; content: string; createdAt: string }[];
}

export interface CalendarEvent {
  id: string;
  title: string;
  description: string;
  date: string;
  time?: string;
  type: 'prova' | 'reuniao' | 'feriado' | 'atividade' | 'tarefa' | 'evento';
  classIds: string[];
  notify: boolean;
}

export const CATEGORY_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  comunicado: { label: 'Comunicado', color: '#1d4ed8', bg: '#eff6ff' },
  pedagogico: { label: 'Pedagógico', color: '#7e22ce', bg: '#faf5ff' },
  financeiro: { label: 'Financeiro', color: '#b45309', bg: '#fffbeb' },
  evento: { label: 'Evento', color: '#0f766e', bg: '#f0fdfa' },
};

export const EVENT_TYPES: Record<string, { label: string; color: string; icon: string }> = {
  prova: { label: 'Prova', color: '#dc2626', icon: '📝' },
  reuniao: { label: 'Reunião', color: '#7c3aed', icon: '🤝' },
  feriado: { label: 'Feriado', color: '#059669', icon: '🎉' },
  atividade: { label: 'Atividade', color: '#2563eb', icon: '📚' },
  tarefa: { label: 'Tarefa', color: '#d97706', icon: '✏️' },
  evento: { label: 'Evento', color: '#0891b2', icon: '🎪' },
};

export const mockMessages: AgendaMessage[] = [
  {
    id: 'm1', subject: 'Reunião de Pais — 1º Bimestre', category: 'comunicado',
    content: 'Prezados responsáveis, informamos que a reunião de pais do 1º bimestre será realizada no dia 15/03/2026, às 18h30, no auditório da escola. Contamos com a presença de todos para discutirmos o desenvolvimento pedagógico dos alunos.',
    senderName: 'Direção Escolar', senderRole: 'admin', targetType: 'all', targetIds: [],
    pinned: true, createdAt: '2026-03-10T10:00:00', attachments: [], readBy: ['r1','r2','r3'], deliveredTo: ['r1','r2','r3','r4','r5'],
    replies: [
      { id: 'rep1', senderName: 'Pai do Lucas', senderRole: 'responsible', content: 'Estaremos presentes! Obrigado pelo aviso.', createdAt: '2026-03-11T09:00:00' }
    ],
  },
  {
    id: 'm2', subject: 'Projeto Meio Ambiente — Grupo 5', category: 'pedagogico',
    content: 'Informamos que as crianças do Grupo 5 iniciarão o projeto "Guardiões da Natureza" nesta semana. Pedimos que enviem uma garrafa PET e materiais recicláveis para as atividades práticas.',
    senderName: 'Profa. Ana Clara', senderRole: 'teacher', targetType: 'class', targetIds: ['c5'],
    pinned: false, createdAt: '2026-03-12T08:30:00', attachments: [{ name: 'cronograma_projeto.pdf', type: 'pdf' }], readBy: ['r1'], deliveredTo: ['r1','r2'],
    replies: [],
  },
  {
    id: 'm3', subject: 'Atualização de Mensalidades — Abril', category: 'financeiro',
    content: 'Senhores responsáveis, os boletos referentes ao mês de abril já estão disponíveis na plataforma. O vencimento é dia 10/04. Em caso de dúvidas, procurem a secretaria.',
    senderName: 'Secretaria', senderRole: 'admin', targetType: 'all', targetIds: [],
    pinned: false, createdAt: '2026-03-25T14:00:00', attachments: [], readBy: ['r1','r2','r3','r4'], deliveredTo: ['r1','r2','r3','r4','r5'],
    replies: [],
  },
  {
    id: 'm4', subject: 'Dia do Livro — Atividade Especial', category: 'evento',
    content: 'No dia 18/04, celebraremos o Dia Nacional do Livro com uma manhã de contação de histórias. Os alunos podem vir fantasiados de seu personagem favorito!',
    senderName: 'Coord. Pedagógica', senderRole: 'coordinator', targetType: 'all', targetIds: [],
    pinned: false, createdAt: '2026-04-05T09:15:00', attachments: [{ name: 'cartaz_livro.png', type: 'image' }], readBy: [], deliveredTo: ['r1','r2','r3'],
    replies: [],
  },
  {
    id: 'm5', subject: 'Relatório Individual — Lucas Silva', category: 'pedagogico',
    content: 'Segue em anexo o relatório descritivo do 1º bimestre do aluno Lucas. Destacamos sua excelente participação nas atividades de linguagem oral e sua evolução na socialização com os colegas.',
    senderName: 'Profa. Maria', senderRole: 'teacher', targetType: 'student', targetIds: ['s1'],
    pinned: false, createdAt: '2026-04-10T16:00:00', attachments: [{ name: 'relatorio_lucas_1bim.pdf', type: 'pdf' }], readBy: ['r1'], deliveredTo: ['r1'],
    replies: [],
  },
];

export const mockEvents: CalendarEvent[] = [
  { id: 'e1', title: 'Reunião de Pais', description: '1º Bimestre', date: '2026-03-15', time: '18:30', type: 'reuniao', classIds: [], notify: true },
  { id: 'e2', title: 'Feriado - Semana Santa', description: 'Sem aula', date: '2026-04-03', type: 'feriado', classIds: [], notify: false },
  { id: 'e3', title: 'Dia do Livro', description: 'Manhã de contação de histórias', date: '2026-04-18', time: '08:00', type: 'evento', classIds: [], notify: true },
  { id: 'e4', title: 'Prova de Português', description: '2º ao 5º Ano', date: '2026-04-22', time: '10:00', type: 'prova', classIds: ['c7','c8','c9','c10'], notify: true },
  { id: 'e5', title: 'Festa Junina', description: 'Evento para toda a escola', date: '2026-06-20', time: '17:00', type: 'evento', classIds: [], notify: true },
  { id: 'e6', title: 'Conselho de Classe', description: '2º Bimestre', date: '2026-07-10', time: '14:00', type: 'reuniao', classIds: [], notify: false },
  { id: 'e7', title: 'Entrega de Relatórios', description: 'Infantil e 1º Ano', date: '2026-04-28', time: '08:00', type: 'atividade', classIds: ['c1','c2','c3','c4','c5','c6'], notify: true },
  { id: 'e8', title: 'Dia das Mães', description: 'Apresentação especial', date: '2026-05-08', time: '09:00', type: 'evento', classIds: [], notify: true },
];
