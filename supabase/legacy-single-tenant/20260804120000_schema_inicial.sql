-- =============================================================================
-- Escola Vida de Aprendiz — schema inicial
--
-- Cobre o primeiro recorte a ser liberado: lançar frequência, notas e
-- conteúdos. Alunos, turmas e matrículas entram junto porque as três telas
-- dependem deles.
--
-- Fora do escopo por enquanto (entram em migração própria quando forem
-- liberados): responsáveis/portal da família, agenda, relatórios de IA, PEI.
--
-- A política de avaliação (pesos, escala, média de aprovação, quais
-- disciplinas existem) NÃO vive aqui — vive em src/store/gradingConfig.ts.
-- Por isso `grade_entries` guarda um lançamento por componente, em vez de uma
-- coluna por campo: mudar a regra da escola não deve exigir migração.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Tipos
-- -----------------------------------------------------------------------------

create type public.user_role as enum ('admin', 'coordinator', 'teacher');
create type public.school_level as enum ('infantil', 'fundamental');
create type public.evaluation_type as enum ('numeric', 'report');
create type public.teacher_specialty as enum ('english', 'pe');
create type public.attendance_status as enum ('P', 'F');

-- -----------------------------------------------------------------------------
-- Perfis (espelho de auth.users com o papel de cada pessoa na escola)
-- -----------------------------------------------------------------------------

create table public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  name         text not null,
  role         public.user_role not null,
  -- Só para coordenação: null = coordena a escola inteira.
  managed_level public.school_level,
  -- Só para professor: null = regente (leciona as disciplinas da própria turma).
  specialty    public.teacher_specialty,
  active       boolean not null default true,
  created_at   timestamptz not null default now()
);

comment on column public.profiles.managed_level is
  'Coordenação: segmento que a pessoa coordena. Null para a escola toda.';
comment on column public.profiles.specialty is
  'Professor: null = regente. Especialistas lançam apenas a própria disciplina.';

-- -----------------------------------------------------------------------------
-- Estrutura acadêmica
-- -----------------------------------------------------------------------------

create table public.school_years (
  id       text primary key,          -- '2026'
  active   boolean not null default false
);

create table public.classes (
  id                  uuid primary key default gen_random_uuid(),
  year_id             text not null references public.school_years (id),
  name                text not null,  -- '2º ANO A'
  series              text not null,  -- '2º Ano'
  letter              text not null,  -- 'A'
  level               public.school_level not null,
  evaluation_type     public.evaluation_type not null,
  homeroom_teacher_id uuid references public.profiles (id) on delete set null,
  created_at          timestamptz not null default now(),
  unique (year_id, name)
);

comment on column public.classes.evaluation_type is
  'numeric = boletim com notas; report = relatório descritivo (Infantil e 1º ano).';

create table public.students (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  birth_date  date,
  guardian1   text,
  guardian2   text,
  notes       text,
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);

create table public.enrollments (
  id          uuid primary key default gen_random_uuid(),
  student_id  uuid not null references public.students (id) on delete cascade,
  class_id    uuid not null references public.classes (id) on delete cascade,
  active      boolean not null default true,
  -- Exceção individual: aluno do Fundamental avaliado por relatório descritivo
  -- em vez de nota. Null = segue o tipo da turma.
  evaluation_type_override public.evaluation_type,
  evaluation_note          text,
  created_at  timestamptz not null default now(),
  unique (student_id, class_id)
);

comment on column public.enrollments.evaluation_type_override is
  'Sobrepõe classes.evaluation_type para este aluno nesta turma. Null = herda da turma. Fica na matrícula, e não no aluno, porque a exceção vale por ano letivo.';
comment on column public.enrollments.evaluation_note is
  'Por que o aluno é avaliado de forma diferente (laudo, PEI, decisão da coordenação).';

-- Tipo de avaliação que de fato vale para cada aluno, já resolvida a exceção.
-- security_invoker: a view respeita a RLS de quem consulta, não a do dono.
create view public.enrollment_evaluation
with (security_invoker = true) as
  select e.id            as enrollment_id,
         e.student_id,
         e.class_id,
         c.year_id,
         coalesce(e.evaluation_type_override, c.evaluation_type) as evaluation_type,
         e.evaluation_type_override is not null                  as is_exception,
         e.evaluation_note
    from public.enrollments e
    join public.classes c on c.id = e.class_id;

-- Quem pode lançar o quê. Um regente não precisa de linha aqui: a turma dele
-- vem por classes.homeroom_teacher_id. Esta tabela é para os especialistas
-- (Inglês, Ed. Física), que atendem várias turmas.
create table public.teacher_assignments (
  id         uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.profiles (id) on delete cascade,
  class_id   uuid not null references public.classes (id) on delete cascade,
  subject_id text not null,           -- id de src/store/gradingConfig.ts
  unique (teacher_id, class_id, subject_id)
);

-- -----------------------------------------------------------------------------
-- Lançamentos do dia a dia
-- -----------------------------------------------------------------------------

create table public.attendance_records (
  id            uuid primary key default gen_random_uuid(),
  enrollment_id uuid not null references public.enrollments (id) on delete cascade,
  date          date not null,
  status        public.attendance_status not null,
  recorded_by   uuid references public.profiles (id) on delete set null,
  updated_at    timestamptz not null default now(),
  unique (enrollment_id, date)
);

create index attendance_records_date_idx on public.attendance_records (date);

create table public.lesson_entries (
  id           uuid primary key default gen_random_uuid(),
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
  enrollment_id uuid not null references public.enrollments (id) on delete cascade,
  subject_id    text not null,        -- 'port', 'mat', ... (gradingConfig.ts)
  period        smallint not null check (period between 1 and 5),
  component_id  text not null,        -- 'work', 'research', 'exam', 'recovery', ...
  value         numeric(5,2) not null check (value >= 0),
  updated_by    uuid references public.profiles (id) on delete set null,
  updated_at    timestamptz not null default now(),
  unique (enrollment_id, subject_id, period, component_id)
);

comment on column public.grade_entries.period is
  '1 a 4 = bimestres. 5 = Recuperação Final (anual).';
comment on column public.grade_entries.component_id is
  'Id do componente em gradingConfig.ts. O teto de cada um é validado na aplicação, que é onde a política da escola vive.';

-- -----------------------------------------------------------------------------
-- updated_at automático
-- -----------------------------------------------------------------------------

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger attendance_records_touch before update on public.attendance_records
  for each row execute function public.touch_updated_at();
create trigger lesson_entries_touch before update on public.lesson_entries
  for each row execute function public.touch_updated_at();
create trigger grade_entries_touch before update on public.grade_entries
  for each row execute function public.touch_updated_at();

-- -----------------------------------------------------------------------------
-- Helpers de autorização
--
-- SECURITY DEFINER de propósito: as policies precisam ler `profiles` sem
-- disparar a própria RLS de `profiles`, o que causaria recursão infinita.
-- search_path fixo para não haver captura de nome por schema do usuário.
-- -----------------------------------------------------------------------------

create or replace function public.meu_papel()
returns public.user_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid() and active
$$;

-- Turmas em que o usuário atual pode ler e lançar.
--   admin        -> todas
--   coordenação  -> as do segmento que coordena (todas, se managed_level null)
--   professor    -> a turma de regência + as turmas atribuídas como especialista
create or replace function public.minhas_turmas()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select c.id
    from public.classes c
    join public.profiles p on p.id = auth.uid() and p.active
   where p.role = 'admin'
      or (p.role = 'coordinator' and (p.managed_level is null or p.managed_level = c.level))
      or (p.role = 'teacher' and c.homeroom_teacher_id = p.id)
  union
  select ta.class_id
    from public.teacher_assignments ta
   where ta.teacher_id = auth.uid()
$$;

-- Só quem coordena ou dirige pode mexer no cadastro.
create or replace function public.e_gestao()
returns boolean
language sql
stable
set search_path = public
as $$
  select public.meu_papel() in ('admin', 'coordinator')
$$;

-- -----------------------------------------------------------------------------
-- RLS
--
-- Toda tabela nega por padrão. Não existe policy de INSERT/UPDATE/DELETE para
-- cadastro: isso é feito pela gestão via `service_role` ou por policies
-- adicionadas quando a tela de cadastro entrar no ar.
-- -----------------------------------------------------------------------------

alter table public.profiles            enable row level security;
alter table public.school_years        enable row level security;
alter table public.classes             enable row level security;
alter table public.students            enable row level security;
alter table public.enrollments         enable row level security;
alter table public.teacher_assignments enable row level security;
alter table public.attendance_records  enable row level security;
alter table public.lesson_entries      enable row level security;
alter table public.grade_entries       enable row level security;

-- Perfis: cada um lê o próprio; gestão lê todos.
create policy profiles_self_select on public.profiles
  for select to authenticated
  using (id = auth.uid() or public.e_gestao());

-- Ano letivo: leitura para qualquer pessoa autenticada.
create policy school_years_select on public.school_years
  for select to authenticated using (true);

-- Turmas: só as suas.
create policy classes_select on public.classes
  for select to authenticated
  using (id in (select public.minhas_turmas()));

-- Alunos: só os matriculados nas suas turmas.
create policy students_select on public.students
  for select to authenticated
  using (exists (
    select 1 from public.enrollments e
     where e.student_id = students.id
       and e.class_id in (select public.minhas_turmas())
  ));

create policy enrollments_select on public.enrollments
  for select to authenticated
  using (class_id in (select public.minhas_turmas()));

create policy teacher_assignments_select on public.teacher_assignments
  for select to authenticated
  using (teacher_id = auth.uid() or public.e_gestao());

-- Frequência: ler e lançar apenas nas suas turmas.
create policy attendance_select on public.attendance_records
  for select to authenticated
  using (exists (
    select 1 from public.enrollments e
     where e.id = attendance_records.enrollment_id
       and e.class_id in (select public.minhas_turmas())
  ));

create policy attendance_write on public.attendance_records
  for insert to authenticated
  with check (exists (
    select 1 from public.enrollments e
     where e.id = attendance_records.enrollment_id
       and e.class_id in (select public.minhas_turmas())
  ));

create policy attendance_update on public.attendance_records
  for update to authenticated
  using (exists (
    select 1 from public.enrollments e
     where e.id = attendance_records.enrollment_id
       and e.class_id in (select public.minhas_turmas())
  ))
  with check (exists (
    select 1 from public.enrollments e
     where e.id = attendance_records.enrollment_id
       and e.class_id in (select public.minhas_turmas())
  ));

-- Conteúdos.
create policy lessons_select on public.lesson_entries
  for select to authenticated
  using (class_id in (select public.minhas_turmas()));

create policy lessons_insert on public.lesson_entries
  for insert to authenticated
  with check (class_id in (select public.minhas_turmas()));

create policy lessons_update on public.lesson_entries
  for update to authenticated
  using (class_id in (select public.minhas_turmas()) and created_by = auth.uid())
  with check (class_id in (select public.minhas_turmas()));

create policy lessons_delete on public.lesson_entries
  for delete to authenticated
  using (created_by = auth.uid() or public.e_gestao());

-- Notas.
create policy grades_select on public.grade_entries
  for select to authenticated
  using (exists (
    select 1 from public.enrollments e
     where e.id = grade_entries.enrollment_id
       and e.class_id in (select public.minhas_turmas())
  ));

create policy grades_insert on public.grade_entries
  for insert to authenticated
  with check (exists (
    select 1 from public.enrollments e
     where e.id = grade_entries.enrollment_id
       and e.class_id in (select public.minhas_turmas())
  ));

create policy grades_update on public.grade_entries
  for update to authenticated
  using (exists (
    select 1 from public.enrollments e
     where e.id = grade_entries.enrollment_id
       and e.class_id in (select public.minhas_turmas())
  ))
  with check (exists (
    select 1 from public.enrollments e
     where e.id = grade_entries.enrollment_id
       and e.class_id in (select public.minhas_turmas())
  ));

-- -----------------------------------------------------------------------------
-- Ano letivo corrente
-- -----------------------------------------------------------------------------

insert into public.school_years (id, active) values ('2026', true);
