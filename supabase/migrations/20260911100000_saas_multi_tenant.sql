-- =============================================================================
-- Althion Education — schema multi-tenant (SaaS whitelabel)
--
-- Substitui o schema single-tenant de 04/08/2026 (guardado em
-- supabase/legacy-single-tenant/). Diferenças de desenho:
--
--   * `schools` é o tenant. TODA tabela de negócio carrega `school_id`
--     (denormalizado de propósito: policy simples, índice simples, e a RLS
--     nunca precisa de join para saber de quem é a linha).
--   * Um usuário pertence a UMA escola (profiles.school_id). Quem opera a
--     plataforma fica em `platform_admins` e age via service_role pelas
--     funções em /api — não passa pela RLS.
--   * A política de avaliação (pesos, escala, média) é dado, não código:
--     `schools.grading_config` (jsonb). Null = usa o default do app.
--   * Marca (logo, cores, razão social, CNPJ, texto legal) vive em
--     `schools.branding` e nas colunas de cadastro — nada chumbado no front.
--   * Uso de IA é medido em `ai_usage` por escola: base do plano/cobrança.
--
-- Helpers de autorização ficam no schema `app`, que o PostgREST não publica.
-- =============================================================================

create schema if not exists app;
grant usage on schema app to authenticated;

-- -----------------------------------------------------------------------------
-- Tipos
-- -----------------------------------------------------------------------------

create type public.user_role         as enum ('admin', 'coordinator', 'teacher', 'guardian');
create type public.school_level      as enum ('infantil', 'fundamental');
create type public.evaluation_type   as enum ('numeric', 'report');
create type public.teacher_specialty as enum ('english', 'pe');
create type public.attendance_status as enum ('P', 'F');
create type public.school_status     as enum ('trial', 'active', 'past_due', 'suspended', 'canceled');
create type public.document_status   as enum ('draft', 'submitted', 'approved', 'returned');
create type public.document_kind     as enum ('report', 'pei');

-- -----------------------------------------------------------------------------
-- Planos e tenants
-- -----------------------------------------------------------------------------

create table public.plans (
  id                 text primary key,            -- 'starter', 'pro', 'enterprise'
  name               text not null,
  -- Limites. Null = ilimitado.
  max_students       integer,
  max_users          integer,
  ai_monthly_credits integer,                     -- gerações de IA por mês
  -- Flags de funcionalidade: {"pei": true, "bulletin": false, ...}
  features           jsonb not null default '{}'::jsonb,
  price_cents        integer not null default 0,
  active             boolean not null default true,
  sort_order         integer not null default 0
);

create table public.schools (
  id                  uuid primary key default gen_random_uuid(),
  slug                text not null unique,
  name                text not null,              -- nome fantasia (aparece na UI)
  legal_name          text,                       -- razão social (documentos)
  cnpj                text,
  city                text,
  uf                  text,
  -- Texto legal impresso no histórico escolar ("autorizada pela Portaria...").
  authorization_text  text,
  -- {"logo_url": "...", "colors": {"primary": "#0a73ff", "secondary": "...", "accent": "...", "bg": "..."}}
  branding            jsonb not null default '{}'::jsonb,
  -- Política de avaliação da escola. Null = default do app (src/store/gradingConfig.ts).
  grading_config      jsonb,
  -- Assinatura
  plan_id             text references public.plans (id),
  status              public.school_status not null default 'trial',
  trial_ends_at       timestamptz,
  billing_customer_id     text,
  billing_subscription_id text,
  -- Sobrescreve flags do plano para esta escola: {"pei": true}
  feature_overrides   jsonb not null default '{}'::jsonb,
  -- LGPD: contrato de operador assinado em
  dpa_signed_at       timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

comment on column public.schools.grading_config is
  'Política de avaliação (escala, média, disciplinas, componentes, períodos). Null = default do app.';
comment on column public.schools.branding is
  'Marca da escola: logo_url e cores. Injetado como CSS vars no front.';

create table public.platform_admins (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- Pessoas
-- -----------------------------------------------------------------------------

create table public.profiles (
  id            uuid primary key references auth.users (id) on delete cascade,
  school_id     uuid not null references public.schools (id) on delete cascade,
  name          text not null,
  email         text not null,
  role          public.user_role not null,
  -- Coordenação: null = coordena a escola inteira.
  managed_level public.school_level,
  -- Professor: null = regente.
  specialty     public.teacher_specialty,
  active        boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index profiles_school_idx on public.profiles (school_id);

-- -----------------------------------------------------------------------------
-- Estrutura acadêmica
-- -----------------------------------------------------------------------------

create table public.school_years (
  id         uuid primary key default gen_random_uuid(),
  school_id  uuid not null references public.schools (id) on delete cascade,
  label      text not null,                       -- '2026'
  active     boolean not null default false,
  closed     boolean not null default false,
  created_at timestamptz not null default now(),
  unique (school_id, label)
);

create table public.classes (
  id                  uuid primary key default gen_random_uuid(),
  school_id           uuid not null references public.schools (id) on delete cascade,
  year_id             uuid not null references public.school_years (id) on delete cascade,
  name                text not null,              -- '2º ANO A'
  series              text not null,              -- '2º Ano'
  letter              text not null default 'A',
  level               public.school_level not null,
  evaluation_type     public.evaluation_type not null,
  homeroom_teacher_id uuid references public.profiles (id) on delete set null,
  created_at          timestamptz not null default now(),
  unique (year_id, name)
);

create index classes_school_year_idx on public.classes (school_id, year_id);

create table public.students (
  id              uuid primary key default gen_random_uuid(),
  school_id       uuid not null references public.schools (id) on delete cascade,
  name            text not null,
  birth_date      date,
  cpf             text,
  guardian1       text,
  guardian2       text,
  notes           text,
  -- LGPD: dado sensível (diagnóstico) só pode ser processado com consentimento
  -- específico do responsável. O PEI fica bloqueado enquanto isto for null.
  pei_consent_at  timestamptz,
  pei_consent_by  text,                           -- nome de quem assinou
  active          boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index students_school_idx on public.students (school_id);

create table public.enrollments (
  id          uuid primary key default gen_random_uuid(),
  school_id   uuid not null references public.schools (id) on delete cascade,
  student_id  uuid not null references public.students (id) on delete cascade,
  class_id    uuid not null references public.classes (id) on delete cascade,
  active      boolean not null default true,
  evaluation_type_override public.evaluation_type,
  evaluation_note          text,
  created_at  timestamptz not null default now(),
  unique (student_id, class_id)
);

create index enrollments_class_idx on public.enrollments (class_id);
create index enrollments_student_idx on public.enrollments (student_id);

-- Responsável (usuário) -> aluno.
create table public.student_guardians (
  school_id  uuid not null references public.schools (id) on delete cascade,
  student_id uuid not null references public.students (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  primary key (student_id, profile_id)
);

-- Especialistas (Inglês, Ed. Física) atendem várias turmas.
create table public.teacher_assignments (
  id         uuid primary key default gen_random_uuid(),
  school_id  uuid not null references public.schools (id) on delete cascade,
  teacher_id uuid not null references public.profiles (id) on delete cascade,
  class_id   uuid not null references public.classes (id) on delete cascade,
  subject_id text not null,
  unique (teacher_id, class_id, subject_id)
);

-- -----------------------------------------------------------------------------
-- Lançamentos do dia a dia
-- -----------------------------------------------------------------------------

create table public.attendance_records (
  id            uuid primary key default gen_random_uuid(),
  school_id     uuid not null references public.schools (id) on delete cascade,
  enrollment_id uuid not null references public.enrollments (id) on delete cascade,
  date          date not null,
  status        public.attendance_status not null,
  recorded_by   uuid references public.profiles (id) on delete set null,
  updated_at    timestamptz not null default now(),
  unique (enrollment_id, date)
);

create index attendance_records_date_idx on public.attendance_records (school_id, date);

create table public.lesson_entries (
  id           uuid primary key default gen_random_uuid(),
  school_id    uuid not null references public.schools (id) on delete cascade,
  class_id     uuid not null references public.classes (id) on delete cascade,
  date         date not null,
  subject_id   text not null,
  content      text not null,
  observations text,
  created_by   uuid references public.profiles (id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index lesson_entries_class_date_idx on public.lesson_entries (class_id, date desc);

create table public.grade_entries (
  id            uuid primary key default gen_random_uuid(),
  school_id     uuid not null references public.schools (id) on delete cascade,
  enrollment_id uuid not null references public.enrollments (id) on delete cascade,
  subject_id    text not null,
  period        smallint not null check (period between 1 and 5),
  component_id  text not null,
  value         numeric(5,2) not null check (value >= 0),
  updated_by    uuid references public.profiles (id) on delete set null,
  updated_at    timestamptz not null default now(),
  unique (enrollment_id, subject_id, period, component_id)
);

comment on column public.grade_entries.period is '1 a 4 = bimestres. 5 = Recuperação Final.';

-- -----------------------------------------------------------------------------
-- Documentos gerados com IA (relatório descritivo e PEI)
-- -----------------------------------------------------------------------------

create table public.student_documents (
  id           uuid primary key default gen_random_uuid(),
  school_id    uuid not null references public.schools (id) on delete cascade,
  student_id   uuid not null references public.students (id) on delete cascade,
  class_id     uuid references public.classes (id) on delete set null,
  year_id      uuid references public.school_years (id) on delete set null,
  kind         public.document_kind not null,
  period       text,                              -- '1º Bimestre', 'Anual'...
  subject_id   text,                              -- especialista: 'ing', 'ef'
  author_id    uuid references public.profiles (id) on delete set null,
  form_data    jsonb not null default '{}'::jsonb,-- checklists preenchidos
  content      text not null default '',
  status       public.document_status not null default 'draft',
  reviewed_by  uuid references public.profiles (id) on delete set null,
  review_note  text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index student_documents_student_idx on public.student_documents (student_id, kind);
create index student_documents_school_year_idx on public.student_documents (school_id, year_id, kind);

-- -----------------------------------------------------------------------------
-- Planejamento de aula
-- -----------------------------------------------------------------------------

create table public.lesson_plans (
  id                   uuid primary key default gen_random_uuid(),
  school_id            uuid not null references public.schools (id) on delete cascade,
  teacher_id           uuid not null references public.profiles (id) on delete cascade,
  class_id             uuid not null references public.classes (id) on delete cascade,
  start_date           date not null,
  end_date             date not null,
  weekly_theme         text not null default '',
  daily_plans          jsonb not null default '[]'::jsonb,
  methodology          text not null default '',
  resources            text not null default '',
  evaluation           text not null default '',
  status               public.document_status not null default 'draft',
  coordinator_feedback text,
  ai_suggestions       jsonb not null default '[]'::jsonb,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

create index lesson_plans_class_idx on public.lesson_plans (class_id, start_date desc);

-- -----------------------------------------------------------------------------
-- Avaliações (inteligência pedagógica)
-- -----------------------------------------------------------------------------

create table public.assessments (
  id         uuid primary key default gen_random_uuid(),
  school_id  uuid not null references public.schools (id) on delete cascade,
  class_id   uuid references public.classes (id) on delete cascade,
  name       text not null,
  period     text,
  subject_id text,
  -- [{"id": "q1", "theme": "...", "skill": "EF35LP01"}]
  questions  jsonb not null default '[]'::jsonb,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.assessment_results (
  id            uuid primary key default gen_random_uuid(),
  school_id     uuid not null references public.schools (id) on delete cascade,
  assessment_id uuid not null references public.assessments (id) on delete cascade,
  student_id    uuid not null references public.students (id) on delete cascade,
  -- {"q1": true, "q2": false}
  answers       jsonb not null default '{}'::jsonb,
  updated_at    timestamptz not null default now(),
  unique (assessment_id, student_id)
);

-- -----------------------------------------------------------------------------
-- Agenda digital
-- -----------------------------------------------------------------------------

create table public.agenda_messages (
  id                 uuid primary key default gen_random_uuid(),
  school_id          uuid not null references public.schools (id) on delete cascade,
  author_id          uuid references public.profiles (id) on delete set null,
  subject            text not null,
  content            text not null,
  category           text not null default 'comunicado',  -- comunicado|pedagogico|financeiro|evento
  target_type        text not null default 'all',         -- all|class|student|staff
  target_class_ids   uuid[] not null default '{}',
  target_student_ids uuid[] not null default '{}',
  pinned             boolean not null default false,
  created_at         timestamptz not null default now()
);

create index agenda_messages_school_idx on public.agenda_messages (school_id, created_at desc);

create table public.agenda_message_reads (
  message_id uuid not null references public.agenda_messages (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  read_at    timestamptz not null default now(),
  primary key (message_id, profile_id)
);

create table public.agenda_replies (
  id         uuid primary key default gen_random_uuid(),
  school_id  uuid not null references public.schools (id) on delete cascade,
  message_id uuid not null references public.agenda_messages (id) on delete cascade,
  author_id  uuid references public.profiles (id) on delete set null,
  content    text not null,
  created_at timestamptz not null default now()
);

create table public.agenda_events (
  id          uuid primary key default gen_random_uuid(),
  school_id   uuid not null references public.schools (id) on delete cascade,
  title       text not null,
  description text,
  date        date not null,
  time        text,
  type        text not null default 'evento',   -- prova|reuniao|feriado|atividade|tarefa|evento
  class_ids   uuid[] not null default '{}',
  notify      boolean not null default false,
  created_by  uuid references public.profiles (id) on delete set null,
  created_at  timestamptz not null default now()
);

create index agenda_events_school_date_idx on public.agenda_events (school_id, date);

-- -----------------------------------------------------------------------------
-- Medição de IA (base da cobrança)
-- -----------------------------------------------------------------------------

create table public.ai_usage (
  id            uuid primary key default gen_random_uuid(),
  school_id     uuid not null references public.schools (id) on delete cascade,
  user_id       uuid references public.profiles (id) on delete set null,
  feature       text not null,                   -- report|pei|pedagogical|planning
  provider      text not null,
  model         text not null,
  input_tokens  integer,
  output_tokens integer,
  latency_ms    integer,
  ok            boolean not null default true,
  error         text,
  created_at    timestamptz not null default now()
);

create index ai_usage_school_month_idx on public.ai_usage (school_id, created_at desc);

-- -----------------------------------------------------------------------------
-- updated_at automático
-- -----------------------------------------------------------------------------

create or replace function public.touch_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
declare t text;
begin
  foreach t in array array[
    'schools', 'profiles', 'students', 'attendance_records', 'lesson_entries',
    'grade_entries', 'student_documents', 'lesson_plans', 'assessment_results'
  ] loop
    execute format(
      'create trigger %I_touch before update on public.%I for each row execute function public.touch_updated_at()',
      t, t
    );
  end loop;
end $$;

-- -----------------------------------------------------------------------------
-- Helpers de autorização (schema app, SECURITY DEFINER para não recursar em
-- profiles). Toda policy abaixo passa por aqui.
-- -----------------------------------------------------------------------------

create function app.current_school_id()
returns uuid language sql stable security definer set search_path = public as $$
  select school_id from public.profiles where id = auth.uid() and active
$$;

create function app.current_role()
returns public.user_role language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid() and active
$$;

create function app.is_manager()
returns boolean language sql stable set search_path = public as $$
  select app.current_role() in ('admin', 'coordinator')
$$;

create function app.is_admin()
returns boolean language sql stable set search_path = public as $$
  select app.current_role() = 'admin'
$$;

create function app.is_platform_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.platform_admins where user_id = auth.uid())
$$;

-- Turmas em que o usuário atual pode ler e lançar (sempre dentro da escola dele).
create function app.my_classes()
returns setof uuid language sql stable security definer set search_path = public as $$
  select c.id
    from public.classes c
    join public.profiles p on p.id = auth.uid() and p.active and p.school_id = c.school_id
   where p.role = 'admin'
      or (p.role = 'coordinator' and (p.managed_level is null or p.managed_level = c.level))
      or (p.role = 'teacher' and c.homeroom_teacher_id = p.id)
  union
  select ta.class_id from public.teacher_assignments ta where ta.teacher_id = auth.uid()
$$;

-- Alunos que um responsável pode ver.
create function app.my_students()
returns setof uuid language sql stable security definer set search_path = public as $$
  select student_id from public.student_guardians where profile_id = auth.uid()
$$;

do $$
declare f text;
begin
  foreach f in array array[
    'current_school_id', 'current_role', 'is_manager', 'is_admin',
    'is_platform_admin', 'my_classes', 'my_students'
  ] loop
    execute format('revoke all on function app.%I() from public, anon', f);
    execute format('grant execute on function app.%I() to authenticated', f);
  end loop;
end $$;

-- -----------------------------------------------------------------------------
-- RLS — toda tabela nega por padrão.
-- -----------------------------------------------------------------------------

do $$
declare t text;
begin
  foreach t in array array[
    'plans', 'schools', 'platform_admins', 'profiles', 'school_years', 'classes',
    'students', 'enrollments', 'student_guardians', 'teacher_assignments',
    'attendance_records', 'lesson_entries', 'grade_entries', 'student_documents',
    'lesson_plans', 'assessments', 'assessment_results', 'agenda_messages',
    'agenda_message_reads', 'agenda_replies', 'agenda_events', 'ai_usage'
  ] loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
end $$;

-- Planos: leitura pública para autenticados (a UI mostra limites do plano).
create policy plans_select on public.plans for select to authenticated using (true);

-- platform_admins: cada um vê só a própria linha (para o front saber que é admin).
create policy platform_admins_self on public.platform_admins
  for select to authenticated using (user_id = auth.uid());

-- Escola: todo mundo da escola lê; só admin da escola edita cadastro/marca.
create policy schools_select on public.schools
  for select to authenticated using (id = app.current_school_id());
create policy schools_update on public.schools
  for update to authenticated
  using (id = app.current_school_id() and app.is_admin())
  with check (id = app.current_school_id() and app.is_admin());

-- Perfis: todos da escola se enxergam (professor precisa ver coordenação, etc.).
-- Criação é via /api (service_role), porque exige criar o auth.user.
create policy profiles_select on public.profiles
  for select to authenticated using (school_id = app.current_school_id());
create policy profiles_update on public.profiles
  for update to authenticated
  using (school_id = app.current_school_id() and (id = auth.uid() or app.is_admin()))
  with check (school_id = app.current_school_id());

-- Anos letivos.
create policy school_years_select on public.school_years
  for select to authenticated using (school_id = app.current_school_id());
create policy school_years_write on public.school_years
  for all to authenticated
  using (school_id = app.current_school_id() and app.is_admin())
  with check (school_id = app.current_school_id() and app.is_admin());

-- Turmas: leitura restrita às suas; escrita pela gestão.
create policy classes_select on public.classes
  for select to authenticated
  using (school_id = app.current_school_id() and (app.is_manager() or id in (select app.my_classes())));
create policy classes_write on public.classes
  for all to authenticated
  using (school_id = app.current_school_id() and app.is_manager())
  with check (school_id = app.current_school_id() and app.is_manager());

-- Alunos: gestão vê todos; professor vê os das suas turmas; responsável vê os seus.
create policy students_select on public.students
  for select to authenticated
  using (
    school_id = app.current_school_id() and (
      app.is_manager()
      or id in (select app.my_students())
      or exists (
        select 1 from public.enrollments e
         where e.student_id = students.id and e.class_id in (select app.my_classes())
      )
    )
  );
create policy students_write on public.students
  for all to authenticated
  using (school_id = app.current_school_id() and app.is_manager())
  with check (school_id = app.current_school_id() and app.is_manager());

create policy enrollments_select on public.enrollments
  for select to authenticated
  using (
    school_id = app.current_school_id() and (
      app.is_manager()
      or class_id in (select app.my_classes())
      or student_id in (select app.my_students())
    )
  );
create policy enrollments_write on public.enrollments
  for all to authenticated
  using (school_id = app.current_school_id() and app.is_manager())
  with check (school_id = app.current_school_id() and app.is_manager());

create policy student_guardians_select on public.student_guardians
  for select to authenticated
  using (school_id = app.current_school_id() and (app.is_manager() or profile_id = auth.uid()));
create policy student_guardians_write on public.student_guardians
  for all to authenticated
  using (school_id = app.current_school_id() and app.is_manager())
  with check (school_id = app.current_school_id() and app.is_manager());

create policy teacher_assignments_select on public.teacher_assignments
  for select to authenticated
  using (school_id = app.current_school_id() and (app.is_manager() or teacher_id = auth.uid()));
create policy teacher_assignments_write on public.teacher_assignments
  for all to authenticated
  using (school_id = app.current_school_id() and app.is_manager())
  with check (school_id = app.current_school_id() and app.is_manager());

-- Frequência / conteúdos / notas: quem tem a turma lê e lança.
create policy attendance_select on public.attendance_records
  for select to authenticated
  using (
    school_id = app.current_school_id() and exists (
      select 1 from public.enrollments e
       where e.id = attendance_records.enrollment_id
         and (e.class_id in (select app.my_classes()) or e.student_id in (select app.my_students()))
    )
  );
create policy attendance_write on public.attendance_records
  for all to authenticated
  using (
    school_id = app.current_school_id() and exists (
      select 1 from public.enrollments e
       where e.id = attendance_records.enrollment_id and e.class_id in (select app.my_classes())
    )
  )
  with check (
    school_id = app.current_school_id() and exists (
      select 1 from public.enrollments e
       where e.id = attendance_records.enrollment_id and e.class_id in (select app.my_classes())
    )
  );

create policy lessons_select on public.lesson_entries
  for select to authenticated
  using (school_id = app.current_school_id() and class_id in (select app.my_classes()));
create policy lessons_insert on public.lesson_entries
  for insert to authenticated
  with check (school_id = app.current_school_id() and class_id in (select app.my_classes()));
create policy lessons_update on public.lesson_entries
  for update to authenticated
  using (school_id = app.current_school_id() and class_id in (select app.my_classes()))
  with check (school_id = app.current_school_id() and class_id in (select app.my_classes()));
create policy lessons_delete on public.lesson_entries
  for delete to authenticated
  using (school_id = app.current_school_id() and (created_by = auth.uid() or app.is_manager()));

create policy grades_select on public.grade_entries
  for select to authenticated
  using (
    school_id = app.current_school_id() and exists (
      select 1 from public.enrollments e
       where e.id = grade_entries.enrollment_id
         and (e.class_id in (select app.my_classes()) or e.student_id in (select app.my_students()))
    )
  );
create policy grades_write on public.grade_entries
  for all to authenticated
  using (
    school_id = app.current_school_id() and exists (
      select 1 from public.enrollments e
       where e.id = grade_entries.enrollment_id and e.class_id in (select app.my_classes())
    )
  )
  with check (
    school_id = app.current_school_id() and exists (
      select 1 from public.enrollments e
       where e.id = grade_entries.enrollment_id and e.class_id in (select app.my_classes())
    )
  );

-- Documentos: quem tem a turma escreve; responsável lê só os aprovados.
create policy student_documents_select on public.student_documents
  for select to authenticated
  using (
    school_id = app.current_school_id() and (
      app.is_manager()
      or class_id in (select app.my_classes())
      or author_id = auth.uid()
      or (student_id in (select app.my_students()) and status = 'approved')
    )
  );
create policy student_documents_insert on public.student_documents
  for insert to authenticated
  with check (
    school_id = app.current_school_id()
    and (app.is_manager() or class_id in (select app.my_classes()))
  );
create policy student_documents_update on public.student_documents
  for update to authenticated
  using (school_id = app.current_school_id() and (app.is_manager() or author_id = auth.uid()))
  with check (school_id = app.current_school_id());
create policy student_documents_delete on public.student_documents
  for delete to authenticated
  using (school_id = app.current_school_id() and (app.is_manager() or (author_id = auth.uid() and status = 'draft')));

-- Planos de aula: professor escreve os seus; coordenação do segmento revisa.
create policy lesson_plans_select on public.lesson_plans
  for select to authenticated
  using (school_id = app.current_school_id() and (teacher_id = auth.uid() or class_id in (select app.my_classes())));
create policy lesson_plans_insert on public.lesson_plans
  for insert to authenticated
  with check (school_id = app.current_school_id() and teacher_id = auth.uid());
create policy lesson_plans_update on public.lesson_plans
  for update to authenticated
  using (school_id = app.current_school_id() and (teacher_id = auth.uid() or app.is_manager()))
  with check (school_id = app.current_school_id());
create policy lesson_plans_delete on public.lesson_plans
  for delete to authenticated
  using (school_id = app.current_school_id() and (teacher_id = auth.uid() or app.is_manager()));

-- Avaliações.
create policy assessments_select on public.assessments
  for select to authenticated
  using (school_id = app.current_school_id() and (class_id is null or app.is_manager() or class_id in (select app.my_classes())));
create policy assessments_write on public.assessments
  for all to authenticated
  using (school_id = app.current_school_id() and (app.is_manager() or created_by = auth.uid()))
  with check (school_id = app.current_school_id());

create policy assessment_results_select on public.assessment_results
  for select to authenticated
  using (school_id = app.current_school_id());
create policy assessment_results_write on public.assessment_results
  for all to authenticated
  using (school_id = app.current_school_id())
  with check (school_id = app.current_school_id());

-- Agenda: equipe lê tudo da escola; responsável lê o que é para ele.
create policy agenda_messages_select on public.agenda_messages
  for select to authenticated
  using (
    school_id = app.current_school_id() and (
      app.current_role() <> 'guardian'
      or target_type = 'all'
      or (target_type = 'student' and target_student_ids && array(select app.my_students()))
      or (target_type = 'class' and target_class_ids && array(
            select e.class_id from public.enrollments e where e.student_id in (select app.my_students()) and e.active))
    )
  );
create policy agenda_messages_insert on public.agenda_messages
  for insert to authenticated
  with check (school_id = app.current_school_id() and app.current_role() <> 'guardian' and author_id = auth.uid());
create policy agenda_messages_update on public.agenda_messages
  for update to authenticated
  using (school_id = app.current_school_id() and (author_id = auth.uid() or app.is_manager()))
  with check (school_id = app.current_school_id());
create policy agenda_messages_delete on public.agenda_messages
  for delete to authenticated
  using (school_id = app.current_school_id() and (author_id = auth.uid() or app.is_manager()));

create policy agenda_message_reads_select on public.agenda_message_reads
  for select to authenticated
  using (profile_id = auth.uid() or app.is_manager());
create policy agenda_message_reads_insert on public.agenda_message_reads
  for insert to authenticated with check (profile_id = auth.uid());

create policy agenda_replies_select on public.agenda_replies
  for select to authenticated using (school_id = app.current_school_id());
create policy agenda_replies_insert on public.agenda_replies
  for insert to authenticated
  with check (school_id = app.current_school_id() and author_id = auth.uid());
create policy agenda_replies_delete on public.agenda_replies
  for delete to authenticated
  using (school_id = app.current_school_id() and (author_id = auth.uid() or app.is_manager()));

create policy agenda_events_select on public.agenda_events
  for select to authenticated using (school_id = app.current_school_id());
create policy agenda_events_write on public.agenda_events
  for all to authenticated
  using (school_id = app.current_school_id() and app.current_role() <> 'guardian')
  with check (school_id = app.current_school_id() and app.current_role() <> 'guardian');

-- Uso de IA: só a gestão da escola consulta; escrita é pelo servidor (service_role).
create policy ai_usage_select on public.ai_usage
  for select to authenticated
  using (school_id = app.current_school_id() and app.is_manager());

-- -----------------------------------------------------------------------------
-- Uso de IA no mês corrente (para a UI mostrar saldo e o servidor barrar).
-- -----------------------------------------------------------------------------

create function app.ai_usage_this_month(p_school_id uuid)
returns integer language sql stable security definer set search_path = public as $$
  select count(*)::integer
    from public.ai_usage
   where school_id = p_school_id
     and ok
     and created_at >= date_trunc('month', now())
$$;

revoke all on function app.ai_usage_this_month(uuid) from public, anon;
grant execute on function app.ai_usage_this_month(uuid) to authenticated;

-- Exposta em public para o front chamar via RPC (só devolve o da própria escola).
create function public.my_ai_usage_this_month()
returns integer language sql stable set search_path = public as $$
  select app.ai_usage_this_month(app.current_school_id())
$$;

-- -----------------------------------------------------------------------------
-- Planos iniciais
-- -----------------------------------------------------------------------------

insert into public.plans (id, name, max_students, max_users, ai_monthly_credits, features, price_cents, sort_order) values
  ('trial',      'Avaliação',  60,   10,  40,   '{"report": true, "pei": true, "planning": true, "pedagogical": true, "agenda": true, "grades": true, "bulletin": true, "transcript": true}', 0,      0),
  ('essencial',  'Essencial',  150,  20,  150,  '{"report": true, "pei": true, "planning": true, "pedagogical": false, "agenda": true, "grades": false, "bulletin": false, "transcript": false}', 39900,  1),
  ('completo',   'Completo',   400,  60,  500,  '{"report": true, "pei": true, "planning": true, "pedagogical": true, "agenda": true, "grades": true, "bulletin": true, "transcript": true}', 79900,  2),
  ('rede',       'Rede',       null, null, null, '{"report": true, "pei": true, "planning": true, "pedagogical": true, "agenda": true, "grades": true, "bulletin": true, "transcript": true}', 0,      3);
