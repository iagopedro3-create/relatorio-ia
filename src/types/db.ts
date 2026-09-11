/**
 * Tipos das tabelas do Supabase (supabase/migrations/20260911100000_saas_multi_tenant.sql).
 *
 * Mantidos à mão, em snake_case igual ao banco, para as telas lerem a linha
 * direto sem camada de mapeamento. Quando o schema mudar, mude aqui junto.
 */

export type UserRole = 'admin' | 'coordinator' | 'teacher' | 'guardian';
export type SchoolLevel = 'infantil' | 'fundamental';
export type EvaluationType = 'numeric' | 'report';
export type TeacherSpecialty = 'english' | 'pe';
export type AttendanceStatus = 'P' | 'F';
export type SchoolStatus = 'trial' | 'active' | 'past_due' | 'suspended' | 'canceled';
export type DocumentStatus = 'draft' | 'submitted' | 'approved' | 'returned';
export type DocumentKind = 'report' | 'pei';

export interface BrandingColors {
  primary?: string;
  secondary?: string;
  accent?: string;
  bg?: string;
}

export interface Branding {
  logo_url?: string;
  colors?: BrandingColors;
  /** Slogan curto exibido na tela de login. */
  tagline?: string;
}

export interface Plan {
  id: string;
  name: string;
  max_students: number | null;
  max_users: number | null;
  ai_monthly_credits: number | null;
  features: Record<string, boolean>;
  price_cents: number;
  active: boolean;
  sort_order: number;
}

export interface School {
  id: string;
  slug: string;
  name: string;
  legal_name: string | null;
  cnpj: string | null;
  city: string | null;
  uf: string | null;
  authorization_text: string | null;
  branding: Branding;
  grading_config: unknown | null;
  plan_id: string | null;
  status: SchoolStatus;
  trial_ends_at: string | null;
  billing_customer_id: string | null;
  billing_subscription_id: string | null;
  feature_overrides: Record<string, boolean>;
  dpa_signed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  school_id: string;
  name: string;
  email: string;
  role: UserRole;
  managed_level: SchoolLevel | null;
  specialty: TeacherSpecialty | null;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SchoolYear {
  id: string;
  school_id: string;
  label: string;
  active: boolean;
  closed: boolean;
  created_at: string;
}

export interface ClassGroup {
  id: string;
  school_id: string;
  year_id: string;
  name: string;
  series: string;
  letter: string;
  level: SchoolLevel;
  evaluation_type: EvaluationType;
  homeroom_teacher_id: string | null;
  created_at: string;
}

export interface Student {
  id: string;
  school_id: string;
  name: string;
  birth_date: string | null;
  cpf: string | null;
  guardian1: string | null;
  guardian2: string | null;
  notes: string | null;
  pei_consent_at: string | null;
  pei_consent_by: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Enrollment {
  id: string;
  school_id: string;
  student_id: string;
  class_id: string;
  active: boolean;
  evaluation_type_override: EvaluationType | null;
  evaluation_note: string | null;
  created_at: string;
}

export interface StudentGuardian {
  school_id: string;
  student_id: string;
  profile_id: string;
}

export interface TeacherAssignment {
  id: string;
  school_id: string;
  teacher_id: string;
  class_id: string;
  subject_id: string;
}

export interface AttendanceRecord {
  id: string;
  school_id: string;
  enrollment_id: string;
  date: string;
  status: AttendanceStatus;
  recorded_by: string | null;
  updated_at: string;
}

export interface LessonEntry {
  id: string;
  school_id: string;
  class_id: string;
  date: string;
  subject_id: string;
  content: string;
  observations: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface GradeEntry {
  id: string;
  school_id: string;
  enrollment_id: string;
  subject_id: string;
  period: number;
  component_id: string;
  value: number;
  updated_by: string | null;
  updated_at: string;
}

export interface StudentDocument {
  id: string;
  school_id: string;
  student_id: string;
  class_id: string | null;
  year_id: string | null;
  kind: DocumentKind;
  period: string | null;
  subject_id: string | null;
  author_id: string | null;
  form_data: Record<string, unknown>;
  content: string;
  status: DocumentStatus;
  reviewed_by: string | null;
  review_note: string | null;
  created_at: string;
  updated_at: string;
}

export interface DailyPlan {
  date: string;
  dayOfWeek: string;
  subject: string;
  theme: string;
  objectives: string;
  content: string;
  activities: string;
}

export interface AISuggestion {
  id: string;
  type: 'ideas' | 'improvement' | 'adaptation';
  content: string;
  isFavorite: boolean;
  createdAt: string;
}

export interface LessonPlan {
  id: string;
  school_id: string;
  teacher_id: string;
  class_id: string;
  start_date: string;
  end_date: string;
  weekly_theme: string;
  daily_plans: DailyPlan[];
  methodology: string;
  resources: string;
  evaluation: string;
  status: DocumentStatus;
  coordinator_feedback: string | null;
  ai_suggestions: AISuggestion[];
  created_at: string;
  updated_at: string;
}

export interface AssessmentQuestion {
  id: string;
  theme: string;
  skill: string;
}

export interface Assessment {
  id: string;
  school_id: string;
  class_id: string | null;
  name: string;
  period: string | null;
  subject_id: string | null;
  questions: AssessmentQuestion[];
  created_by: string | null;
  created_at: string;
}

export interface AssessmentResult {
  id: string;
  school_id: string;
  assessment_id: string;
  student_id: string;
  answers: Record<string, boolean>;
  updated_at: string;
}

export type AgendaCategory = 'comunicado' | 'pedagogico' | 'financeiro' | 'evento';
export type AgendaTarget = 'all' | 'class' | 'student' | 'staff';

export interface AgendaMessage {
  id: string;
  school_id: string;
  author_id: string | null;
  subject: string;
  content: string;
  category: AgendaCategory;
  target_type: AgendaTarget;
  target_class_ids: string[];
  target_student_ids: string[];
  pinned: boolean;
  created_at: string;
}

export interface AgendaReply {
  id: string;
  school_id: string;
  message_id: string;
  author_id: string | null;
  content: string;
  created_at: string;
}

export type AgendaEventType = 'prova' | 'reuniao' | 'feriado' | 'atividade' | 'tarefa' | 'evento';

export interface AgendaEvent {
  id: string;
  school_id: string;
  title: string;
  description: string | null;
  date: string;
  time: string | null;
  type: AgendaEventType;
  class_ids: string[];
  notify: boolean;
  created_by: string | null;
  created_at: string;
}

export interface AiUsage {
  id: string;
  school_id: string;
  user_id: string | null;
  feature: string;
  provider: string;
  model: string;
  input_tokens: number | null;
  output_tokens: number | null;
  latency_ms: number | null;
  ok: boolean;
  error: string | null;
  created_at: string;
}
