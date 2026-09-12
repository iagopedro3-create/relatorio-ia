/**
 * Camada de dados: uma função por operação, sempre por cima do supabase-js.
 * A RLS já limita o que cada usuário vê; aqui só montamos as queries e
 * carimbamos `school_id` nas escritas.
 */
import { supabase, callApi } from '../lib/supabase';
import { unwrap } from '../lib/useAsync';
import type {
  AgendaEvent, AgendaMessage, AgendaReply, Assessment, AssessmentResult, AttendanceRecord,
  ClassGroup, Enrollment, GradeEntry, LessonEntry, LessonPlan, Profile, School, SchoolYear,
  Student, StudentDocument, StudentGuardian, TeacherAssignment, UserRole,
  TuitionPlan, StudentBilling, Invoice, InvoiceStatus, FinanceMonthSummary, Observation, YearPeriod,
} from '../types/db';

// ---------------------------------------------------------------------------
// Escola
// ---------------------------------------------------------------------------

export async function updateSchool(id: string, patch: Partial<School>) {
  return unwrap(await supabase.from('schools').update(patch).eq('id', id).select('*').single()) as School;
}

export async function uploadLogo(schoolId: string, file: File): Promise<string> {
  const ext = file.name.split('.').pop()?.toLowerCase() || 'png';
  const path = `${schoolId}/logo-${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from('branding').upload(path, file, { upsert: true, contentType: file.type });
  if (error) throw new Error(error.message);
  return supabase.storage.from('branding').getPublicUrl(path).data.publicUrl;
}

// ---------------------------------------------------------------------------
// Anos letivos e turmas
// ---------------------------------------------------------------------------

export async function createYear(schoolId: string, label: string) {
  return unwrap(await supabase.from('school_years').insert({ school_id: schoolId, label }).select('*').single()) as SchoolYear;
}

export async function updateYearPeriods(yearId: string, periods: YearPeriod[]) {
  return unwrap(await supabase.from('school_years').update({ periods }).eq('id', yearId).select('*').single()) as SchoolYear;
}

export async function setActiveYear(schoolId: string, yearId: string) {
  unwrap(await supabase.from('school_years').update({ active: false }).eq('school_id', schoolId));
  unwrap(await supabase.from('school_years').update({ active: true }).eq('id', yearId));
}

export async function listClasses(yearId: string) {
  return unwrap(await supabase.from('classes').select('*').eq('year_id', yearId).order('name')) as ClassGroup[];
}

export async function getClassesByIds(ids: string[]) {
  if (ids.length === 0) return [] as ClassGroup[];
  return unwrap(await supabase.from('classes').select('*').in('id', ids)) as ClassGroup[];
}

export async function createClass(input: Omit<ClassGroup, 'id' | 'created_at'>) {
  return unwrap(await supabase.from('classes').insert(input).select('*').single()) as ClassGroup;
}

export async function updateClass(id: string, patch: Partial<ClassGroup>) {
  return unwrap(await supabase.from('classes').update(patch).eq('id', id).select('*').single()) as ClassGroup;
}

export async function deleteClass(id: string) {
  unwrap(await supabase.from('classes').delete().eq('id', id));
}

export async function listAssignments(schoolId: string) {
  return unwrap(await supabase.from('teacher_assignments').select('*').eq('school_id', schoolId)) as TeacherAssignment[];
}

export async function setAssignments(schoolId: string, teacherId: string, classIds: string[], subjectId: string) {
  unwrap(await supabase.from('teacher_assignments').delete().eq('teacher_id', teacherId).eq('subject_id', subjectId));
  if (classIds.length > 0) {
    unwrap(await supabase.from('teacher_assignments').insert(
      classIds.map(class_id => ({ school_id: schoolId, teacher_id: teacherId, class_id, subject_id: subjectId })),
    ));
  }
}

// ---------------------------------------------------------------------------
// Alunos e matrículas
// ---------------------------------------------------------------------------

export async function listStudents(schoolId: string, opts?: { includeInactive?: boolean }) {
  let q = supabase.from('students').select('*').eq('school_id', schoolId).order('name');
  if (!opts?.includeInactive) q = q.eq('active', true);
  return unwrap(await q) as Student[];
}

export async function getStudent(id: string) {
  return unwrap(await supabase.from('students').select('*').eq('id', id).maybeSingle()) as Student | null;
}

export async function createStudent(input: Partial<Student> & { school_id: string; name: string }) {
  return unwrap(await supabase.from('students').insert(input).select('*').single()) as Student;
}

export async function updateStudent(id: string, patch: Partial<Student>) {
  return unwrap(await supabase.from('students').update(patch).eq('id', id).select('*').single()) as Student;
}

export async function deleteStudent(id: string) {
  unwrap(await supabase.from('students').delete().eq('id', id));
}

/** Matrículas ativas das turmas informadas. */
export async function listEnrollments(classIds: string[]) {
  if (classIds.length === 0) return [] as Enrollment[];
  return unwrap(await supabase.from('enrollments').select('*').in('class_id', classIds).eq('active', true)) as Enrollment[];
}

export interface RosterEntry { enrollment: Enrollment; student: Student }

/** Alunos matriculados (ativos) numa turma, em ordem alfabética. */
export async function listClassRoster(classId: string): Promise<RosterEntry[]> {
  const enrollments = unwrap(await supabase.from('enrollments').select('*').eq('class_id', classId).eq('active', true)) as Enrollment[];
  if (enrollments.length === 0) return [];
  const students = unwrap(await supabase.from('students').select('*').in('id', enrollments.map(e => e.student_id))) as Student[];
  return enrollments
    .map(enrollment => ({ enrollment, student: students.find(s => s.id === enrollment.student_id)! }))
    .filter(r => r.student && r.student.active)
    .sort((a, b) => a.student.name.localeCompare(b.student.name, 'pt-BR'));
}

export async function listEnrollmentsOfStudent(studentId: string) {
  return unwrap(await supabase.from('enrollments').select('*').eq('student_id', studentId).order('created_at')) as Enrollment[];
}

/** Move o aluno para a turma (uma matrícula ativa por ano letivo). */
export async function enrollStudent(schoolId: string, studentId: string, classId: string, yearClassIds: string[]) {
  if (yearClassIds.length > 0) {
    unwrap(await supabase.from('enrollments').update({ active: false })
      .eq('student_id', studentId).in('class_id', yearClassIds).neq('class_id', classId));
  }
  return unwrap(await supabase.from('enrollments')
    .upsert({ school_id: schoolId, student_id: studentId, class_id: classId, active: true }, { onConflict: 'student_id,class_id' })
    .select('*').single()) as Enrollment;
}

export async function unenrollStudent(studentId: string, classId: string) {
  unwrap(await supabase.from('enrollments').update({ active: false }).eq('student_id', studentId).eq('class_id', classId));
}

/** Importação em lote: cria alunos e matricula na turma. */
export async function importStudents(
  schoolId: string,
  rows: { name: string; birth_date: string | null; guardian1: string | null; guardian2: string | null }[],
  classId: string | null,
) {
  const created = unwrap(await supabase.from('students')
    .insert(rows.map(r => ({ ...r, school_id: schoolId }))).select('id')) as { id: string }[];
  if (classId) {
    unwrap(await supabase.from('enrollments').insert(
      created.map(s => ({ school_id: schoolId, student_id: s.id, class_id: classId })),
    ));
  }
  return created.length;
}

export async function listGuardians(schoolId: string) {
  return unwrap(await supabase.from('student_guardians').select('*').eq('school_id', schoolId)) as StudentGuardian[];
}

export async function setGuardianStudents(schoolId: string, profileId: string, studentIds: string[]) {
  unwrap(await supabase.from('student_guardians').delete().eq('profile_id', profileId));
  if (studentIds.length > 0) {
    unwrap(await supabase.from('student_guardians').insert(
      studentIds.map(student_id => ({ school_id: schoolId, student_id, profile_id: profileId })),
    ));
  }
}

// ---------------------------------------------------------------------------
// Usuários (via /api/admin/users — precisa de service_role)
// ---------------------------------------------------------------------------

export interface CreateUserInput {
  name: string;
  email: string;
  role: UserRole;
  managed_level?: 'infantil' | 'fundamental' | null;
  specialty?: 'english' | 'pe' | null;
  password?: string;
  student_ids?: string[];
}

export async function createUser(input: CreateUserInput) {
  return callApi<{ user_id: string; initial_password?: string }>('/api/admin/users', { action: 'create', ...input });
}

export async function userAction(action: 'reset_password' | 'deactivate' | 'activate' | 'delete', userId: string) {
  return callApi<{ ok: true }>('/api/admin/users', { action, user_id: userId });
}

export async function setUserPassword(userId: string, password: string) {
  return callApi<{ ok: true }>('/api/admin/users', { action: 'set_password', user_id: userId, password });
}

export async function updateProfile(id: string, patch: Partial<Profile>) {
  return unwrap(await supabase.from('profiles').update(patch).eq('id', id).select('*').single()) as Profile;
}

// ---------------------------------------------------------------------------
// Frequência
// ---------------------------------------------------------------------------

export async function listAttendance(enrollmentIds: string[], from: string, to: string) {
  if (enrollmentIds.length === 0) return [] as AttendanceRecord[];
  return unwrap(await supabase.from('attendance_records').select('*')
    .in('enrollment_id', enrollmentIds).gte('date', from).lte('date', to)) as AttendanceRecord[];
}

export async function listAttendanceOfEnrollments(enrollmentIds: string[]) {
  if (enrollmentIds.length === 0) return [] as AttendanceRecord[];
  return unwrap(await supabase.from('attendance_records').select('*').in('enrollment_id', enrollmentIds)) as AttendanceRecord[];
}

export async function saveAttendance(
  schoolId: string,
  userId: string,
  upserts: { enrollment_id: string; date: string; status: 'P' | 'F' }[],
  deletes: { enrollment_id: string; date: string }[],
) {
  if (upserts.length > 0) {
    unwrap(await supabase.from('attendance_records').upsert(
      upserts.map(u => ({ ...u, school_id: schoolId, recorded_by: userId })),
      { onConflict: 'enrollment_id,date' },
    ));
  }
  for (const d of deletes) {
    unwrap(await supabase.from('attendance_records').delete().eq('enrollment_id', d.enrollment_id).eq('date', d.date));
  }
}

// ---------------------------------------------------------------------------
// Conteúdos (diário)
// ---------------------------------------------------------------------------

export async function listLessons(classId: string) {
  return unwrap(await supabase.from('lesson_entries').select('*').eq('class_id', classId).order('date', { ascending: false })) as LessonEntry[];
}

export async function createLesson(input: Omit<LessonEntry, 'id' | 'created_at' | 'updated_at'>) {
  return unwrap(await supabase.from('lesson_entries').insert(input).select('*').single()) as LessonEntry;
}

export async function updateLesson(id: string, patch: Partial<LessonEntry>) {
  return unwrap(await supabase.from('lesson_entries').update(patch).eq('id', id).select('*').single()) as LessonEntry;
}

export async function deleteLesson(id: string) {
  unwrap(await supabase.from('lesson_entries').delete().eq('id', id));
}

// ---------------------------------------------------------------------------
// Notas
// ---------------------------------------------------------------------------

export async function listGrades(enrollmentIds: string[]) {
  if (enrollmentIds.length === 0) return [] as GradeEntry[];
  return unwrap(await supabase.from('grade_entries').select('*').in('enrollment_id', enrollmentIds)) as GradeEntry[];
}

export async function saveGrades(
  schoolId: string,
  userId: string,
  upserts: { enrollment_id: string; subject_id: string; period: number; component_id: string; value: number }[],
  deletes: { enrollment_id: string; subject_id: string; period: number; component_id: string }[],
) {
  if (upserts.length > 0) {
    unwrap(await supabase.from('grade_entries').upsert(
      upserts.map(u => ({ ...u, school_id: schoolId, updated_by: userId })),
      { onConflict: 'enrollment_id,subject_id,period,component_id' },
    ));
  }
  for (const d of deletes) {
    unwrap(await supabase.from('grade_entries').delete()
      .eq('enrollment_id', d.enrollment_id).eq('subject_id', d.subject_id).eq('period', d.period).eq('component_id', d.component_id));
  }
}

// ---------------------------------------------------------------------------
// Documentos (relatório descritivo / PEI)
// ---------------------------------------------------------------------------

export async function listDocuments(filter: { schoolId: string; yearId?: string | null; kind?: 'report' | 'pei'; studentId?: string }) {
  let q = supabase.from('student_documents').select('*').eq('school_id', filter.schoolId).order('updated_at', { ascending: false });
  if (filter.yearId) q = q.eq('year_id', filter.yearId);
  if (filter.kind) q = q.eq('kind', filter.kind);
  if (filter.studentId) q = q.eq('student_id', filter.studentId);
  return unwrap(await q) as StudentDocument[];
}

export async function createDocument(input: Partial<StudentDocument> & { school_id: string; student_id: string; kind: 'report' | 'pei' }) {
  return unwrap(await supabase.from('student_documents').insert(input).select('*').single()) as StudentDocument;
}

export async function updateDocument(id: string, patch: Partial<StudentDocument>) {
  return unwrap(await supabase.from('student_documents').update(patch).eq('id', id).select('*').single()) as StudentDocument;
}

export async function deleteDocument(id: string) {
  unwrap(await supabase.from('student_documents').delete().eq('id', id));
}

// ---------------------------------------------------------------------------
// Planos de aula
// ---------------------------------------------------------------------------

export async function listLessonPlans(schoolId: string) {
  return unwrap(await supabase.from('lesson_plans').select('*').eq('school_id', schoolId).order('start_date', { ascending: false })) as LessonPlan[];
}

export async function createLessonPlan(input: Partial<LessonPlan> & { school_id: string; teacher_id: string; class_id: string; start_date: string; end_date: string }) {
  return unwrap(await supabase.from('lesson_plans').insert(input).select('*').single()) as LessonPlan;
}

export async function updateLessonPlan(id: string, patch: Partial<LessonPlan>) {
  return unwrap(await supabase.from('lesson_plans').update(patch).eq('id', id).select('*').single()) as LessonPlan;
}

export async function deleteLessonPlan(id: string) {
  unwrap(await supabase.from('lesson_plans').delete().eq('id', id));
}

// ---------------------------------------------------------------------------
// Avaliações
// ---------------------------------------------------------------------------

export async function listAssessments(schoolId: string) {
  return unwrap(await supabase.from('assessments').select('*').eq('school_id', schoolId).order('created_at', { ascending: false })) as Assessment[];
}

export async function createAssessment(input: Partial<Assessment> & { school_id: string; name: string }) {
  return unwrap(await supabase.from('assessments').insert(input).select('*').single()) as Assessment;
}

export async function updateAssessment(id: string, patch: Partial<Assessment>) {
  return unwrap(await supabase.from('assessments').update(patch).eq('id', id).select('*').single()) as Assessment;
}

export async function deleteAssessment(id: string) {
  unwrap(await supabase.from('assessments').delete().eq('id', id));
}

export async function listAssessmentResults(assessmentId: string) {
  return unwrap(await supabase.from('assessment_results').select('*').eq('assessment_id', assessmentId)) as AssessmentResult[];
}

export async function saveAssessmentResults(schoolId: string, assessmentId: string, rows: { student_id: string; answers: Record<string, boolean> }[]) {
  if (rows.length === 0) return;
  unwrap(await supabase.from('assessment_results').upsert(
    rows.map(r => ({ ...r, school_id: schoolId, assessment_id: assessmentId })),
    { onConflict: 'assessment_id,student_id' },
  ));
}

// ---------------------------------------------------------------------------
// Agenda
// ---------------------------------------------------------------------------

export async function listMessages(schoolId: string) {
  return unwrap(await supabase.from('agenda_messages').select('*').eq('school_id', schoolId)
    .order('pinned', { ascending: false }).order('created_at', { ascending: false })) as AgendaMessage[];
}

export async function createMessage(input: Partial<AgendaMessage> & { school_id: string; author_id: string; subject: string; content: string }) {
  return unwrap(await supabase.from('agenda_messages').insert(input).select('*').single()) as AgendaMessage;
}

export async function updateMessage(id: string, patch: Partial<AgendaMessage>) {
  return unwrap(await supabase.from('agenda_messages').update(patch).eq('id', id).select('*').single()) as AgendaMessage;
}

export async function deleteMessage(id: string) {
  unwrap(await supabase.from('agenda_messages').delete().eq('id', id));
}

export async function listReplies(messageIds: string[]) {
  if (messageIds.length === 0) return [] as AgendaReply[];
  return unwrap(await supabase.from('agenda_replies').select('*').in('message_id', messageIds).order('created_at')) as AgendaReply[];
}

export async function createReply(input: { school_id: string; message_id: string; author_id: string; content: string }) {
  return unwrap(await supabase.from('agenda_replies').insert(input).select('*').single()) as AgendaReply;
}

export async function listMyReads(profileId: string) {
  return unwrap(await supabase.from('agenda_message_reads').select('message_id').eq('profile_id', profileId)) as { message_id: string }[];
}

export async function listAllReads(messageIds: string[]) {
  if (messageIds.length === 0) return [] as { message_id: string; profile_id: string }[];
  return unwrap(await supabase.from('agenda_message_reads').select('message_id, profile_id').in('message_id', messageIds)) as { message_id: string; profile_id: string }[];
}

export async function markRead(messageId: string, profileId: string) {
  await supabase.from('agenda_message_reads').upsert({ message_id: messageId, profile_id: profileId }, { onConflict: 'message_id,profile_id', ignoreDuplicates: true });
}

export async function listEvents(schoolId: string) {
  return unwrap(await supabase.from('agenda_events').select('*').eq('school_id', schoolId).order('date')) as AgendaEvent[];
}

export async function createEvent(input: Partial<AgendaEvent> & { school_id: string; title: string; date: string }) {
  return unwrap(await supabase.from('agenda_events').insert(input).select('*').single()) as AgendaEvent;
}

export async function deleteEvent(id: string) {
  unwrap(await supabase.from('agenda_events').delete().eq('id', id));
}

// ---------------------------------------------------------------------------
// Financeiro
// ---------------------------------------------------------------------------

export async function listTuitionPlans(yearId: string) {
  return unwrap(await supabase.from('tuition_plans').select('*').eq('year_id', yearId).order('name')) as TuitionPlan[];
}

export async function upsertTuitionPlan(input: Partial<TuitionPlan> & { school_id: string; year_id: string; name: string; amount_cents: number }) {
  return unwrap(await supabase.from('tuition_plans').upsert(input).select('*').single()) as TuitionPlan;
}

export async function deleteTuitionPlan(id: string) {
  unwrap(await supabase.from('tuition_plans').delete().eq('id', id));
}

export async function listStudentBilling(schoolId: string) {
  return unwrap(await supabase.from('student_billing').select('*').eq('school_id', schoolId)) as StudentBilling[];
}

export async function upsertStudentBilling(input: Partial<StudentBilling> & { school_id: string; student_id: string }) {
  return unwrap(await supabase.from('student_billing').upsert(input).select('*').single()) as StudentBilling;
}

export async function listInvoices(filter: { schoolId: string; yearId?: string | null; month?: string; status?: InvoiceStatus[]; studentId?: string }) {
  let q = supabase.from('invoices').select('*').eq('school_id', filter.schoolId).order('due_date', { ascending: false });
  if (filter.yearId) q = q.eq('year_id', filter.yearId);
  if (filter.month) q = q.eq('reference_month', `${filter.month}-01`);
  if (filter.status?.length) q = q.in('status', filter.status);
  if (filter.studentId) q = q.eq('student_id', filter.studentId);
  return unwrap(await q) as Invoice[];
}

/** Cobranças dos filhos do responsável (a RLS filtra). */
export async function listMyInvoices() {
  return unwrap(await supabase.from('invoices').select('*').order('due_date', { ascending: false })) as Invoice[];
}

export async function createInvoice(input: Partial<Invoice> & { school_id: string; student_id: string; reference_month: string; description: string; amount_cents: number; due_date: string }) {
  return unwrap(await supabase.from('invoices').insert(input).select('*').single()) as Invoice;
}

export async function updateInvoice(id: string, patch: Partial<Invoice>) {
  return unwrap(await supabase.from('invoices').update(patch).eq('id', id).select('*').single()) as Invoice;
}

export async function financeMonthSummary(yearId: string, month: string): Promise<FinanceMonthSummary> {
  const rows = unwrap(await supabase.rpc('finance_month_summary', { p_year_id: yearId, p_month: `${month}-01` })) as FinanceMonthSummary[] | FinanceMonthSummary;
  const r = Array.isArray(rows) ? rows[0] : rows;
  return { invoices_count: Number(r?.invoices_count ?? 0), total_cents: Number(r?.total_cents ?? 0), paid_cents: Number(r?.paid_cents ?? 0), pending_cents: Number(r?.pending_cents ?? 0), overdue_cents: Number(r?.overdue_cents ?? 0), overdue_count: Number(r?.overdue_count ?? 0) };
}

/** Operações que tocam o Asaas (servidor). */
export async function financeCharges<T = unknown>(body: Record<string, unknown>) {
  return callApi<T>('/api/finance/charges', body);
}

export async function financeAsaas<T = unknown>(body: Record<string, unknown>) {
  return callApi<T>('/api/finance/asaas', body);
}

// ---------------------------------------------------------------------------
// Registros de observação (documentação pedagógica contínua)
// ---------------------------------------------------------------------------

export async function listObservations(filter: { schoolId: string; studentId?: string; classId?: string; from?: string; to?: string; sharedOnly?: boolean; limit?: number }) {
  let q = supabase.from('observations').select('*').eq('school_id', filter.schoolId).order('date', { ascending: false }).order('created_at', { ascending: false });
  if (filter.studentId) q = q.eq('student_id', filter.studentId);
  if (filter.classId) q = q.eq('class_id', filter.classId);
  if (filter.from) q = q.gte('date', filter.from);
  if (filter.to) q = q.lte('date', filter.to);
  if (filter.sharedOnly) q = q.eq('share_with_family', true);
  if (filter.limit) q = q.limit(filter.limit);
  return unwrap(await q) as Observation[];
}

export async function createObservation(input: Partial<Observation> & { school_id: string; student_id: string; author_id: string; text: string }) {
  return unwrap(await supabase.from('observations').insert(input).select('*').single()) as Observation;
}

export async function updateObservation(id: string, patch: Partial<Observation>) {
  return unwrap(await supabase.from('observations').update(patch).eq('id', id).select('*').single()) as Observation;
}

export async function deleteObservation(id: string) {
  unwrap(await supabase.from('observations').delete().eq('id', id));
}

/** Foto no bucket privado. Devolve o caminho (não a URL): a URL é assinada na leitura. */
export async function uploadObservationPhoto(schoolId: string, studentId: string, file: File): Promise<string> {
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
  const path = `${schoolId}/${studentId}/${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from('observations').upload(path, file, { contentType: file.type });
  if (error) throw new Error(error.message);
  return path;
}

/** URLs assinadas (1 h) para um lote de fotos. Caminhos sem permissão voltam sem URL. */
export async function signObservationPhotos(paths: string[]): Promise<Record<string, string>> {
  const unique = [...new Set(paths.filter(Boolean))];
  if (unique.length === 0) return {};
  const { data } = await supabase.storage.from('observations').createSignedUrls(unique, 3600);
  const out: Record<string, string> = {};
  for (const r of data ?? []) if (r.path && r.signedUrl) out[r.path] = r.signedUrl;
  return out;
}
