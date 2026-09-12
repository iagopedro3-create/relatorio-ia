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
  finance_config: FinanceConfig;
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

/** Período letivo com datas (school_years.periods). */
export interface YearPeriod {
  label: string;
  start: string;
  end: string;
}

export interface SchoolYear {
  id: string;
  school_id: string;
  label: string;
  active: boolean;
  closed: boolean;
  periods: YearPeriod[];
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
  analysis: string | null;
  analyzed_at: string | null;
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

// ---------------------------------------------------------------------------
// Financeiro (supabase/migrations/20260912100000_finance.sql)
// ---------------------------------------------------------------------------

export type InvoiceStatus = 'draft' | 'pending' | 'paid' | 'overdue' | 'canceled' | 'refunded';
export type BillingType = 'UNDEFINED' | 'BOLETO' | 'PIX' | 'CREDIT_CARD';

/** `schools.finance_config` — configuração pública do financeiro (nada sensível). */
export interface FinanceConfig {
  due_day?: number;
  fine_pct?: number;
  interest_pct_month?: number;
  discount_days?: number;
  asaas_connected?: boolean;
  asaas_env?: 'sandbox' | 'production';
}

export interface TuitionPlan {
  id: string;
  school_id: string;
  year_id: string;
  name: string;
  amount_cents: number;
  due_day: number;
  discount_cents: number;
  discount_days: number;
  active: boolean;
  created_at: string;
}

export interface StudentBilling {
  student_id: string;
  school_id: string;
  tuition_plan_id: string | null;
  custom_amount_cents: number | null;
  discount_cents: number;
  scholarship_pct: number;
  payer_name: string | null;
  payer_cpf_cnpj: string | null;
  payer_email: string | null;
  payer_phone: string | null;
  asaas_customer_id: string | null;
  notes: string | null;
  active: boolean;
  updated_at: string;
}

export interface Invoice {
  id: string;
  school_id: string;
  student_id: string;
  year_id: string | null;
  reference_month: string;
  description: string;
  amount_cents: number;
  discount_cents: number;
  due_date: string;
  status: InvoiceStatus;
  billing_type: BillingType;
  paid_at: string | null;
  paid_amount_cents: number | null;
  payment_method: string | null;
  asaas_payment_id: string | null;
  invoice_url: string | null;
  bank_slip_url: string | null;
  pix_payload: string | null;
  pix_qr_code: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface FinanceMonthSummary {
  invoices_count: number;
  total_cents: number;
  paid_cents: number;
  pending_cents: number;
  overdue_cents: number;
  overdue_count: number;
}

/** Registro de observação (documentação pedagógica contínua). */
export interface Observation {
  id: string;
  school_id: string;
  student_id: string;
  class_id: string | null;
  author_id: string | null;
  date: string;
  field_id: string;
  text: string;
  photo_path: string | null;
  share_with_family: boolean;
  created_at: string;
  updated_at: string;
}
