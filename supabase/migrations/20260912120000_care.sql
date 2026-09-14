-- =============================================================================
-- Prontuário e cuidado: saúde, ocorrências e autorizações digitais.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Saúde (dado sensível — LGPD art. 5º II): só gestão, professora da turma e a
-- própria família enxergam; só gestão edita.
-- -----------------------------------------------------------------------------
create table public.student_health (
  student_id         uuid primary key references public.students (id) on delete cascade,
  school_id          uuid not null references public.schools (id) on delete cascade,
  allergies          text,
  medications        text,
  dietary            text,                          -- restrições alimentares
  conditions         text,                          -- condições de saúde relevantes
  blood_type         text,
  health_plan        text,
  pediatrician       text,
  -- [{"name":"Maria","phone":"(12) 9...","relation":"mãe"}]
  emergency_contacts jsonb not null default '[]'::jsonb,
  notes              text,
  updated_by         uuid references public.profiles (id) on delete set null,
  updated_at         timestamptz not null default now()
);
create trigger student_health_touch before update on public.student_health for each row execute function public.touch_updated_at();
alter table public.student_health enable row level security;

create policy student_health_select on public.student_health
  for select to authenticated
  using (
    school_id = app.current_school_id() and (
      app.is_manager()
      or student_id in (select app.my_students())
      or exists (select 1 from public.enrollments e where e.student_id = student_health.student_id and e.active and e.class_id in (select app.my_classes()))
    )
  );
create policy student_health_write on public.student_health
  for all to authenticated
  using (school_id = app.current_school_id() and app.is_manager())
  with check (school_id = app.current_school_id() and app.is_manager());

-- -----------------------------------------------------------------------------
-- Ocorrências: incidente, elogio, saúde (febre, queda), atendimento à família.
-- -----------------------------------------------------------------------------
create type public.incident_kind as enum ('ocorrencia', 'elogio', 'saude', 'atendimento', 'acidente');

create table public.student_incidents (
  id                uuid primary key default gen_random_uuid(),
  school_id         uuid not null references public.schools (id) on delete cascade,
  student_id        uuid not null references public.students (id) on delete cascade,
  class_id          uuid references public.classes (id) on delete set null,
  author_id         uuid references public.profiles (id) on delete set null,
  date              date not null default current_date,
  kind              public.incident_kind not null default 'ocorrencia',
  title             text not null,
  description       text,
  share_with_family boolean not null default false,
  family_ack_at     timestamptz,                    -- "ciente" do responsável
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index student_incidents_student_idx on public.student_incidents (student_id, date desc);
create trigger student_incidents_touch before update on public.student_incidents for each row execute function public.touch_updated_at();
alter table public.student_incidents enable row level security;

create policy incidents_select on public.student_incidents
  for select to authenticated
  using (
    school_id = app.current_school_id() and (
      app.is_manager()
      or class_id in (select app.my_classes())
      or author_id = auth.uid()
      or (share_with_family and student_id in (select app.my_students()))
    )
  );
create policy incidents_insert on public.student_incidents
  for insert to authenticated
  with check (
    school_id = app.current_school_id()
    and author_id = auth.uid()
    and (app.is_manager() or class_id in (select app.my_classes()))
  );
create policy incidents_update_staff on public.student_incidents
  for update to authenticated
  using (school_id = app.current_school_id() and (app.is_manager() or author_id = auth.uid()))
  with check (school_id = app.current_school_id());
-- Família só marca "ciente" (o front só envia family_ack_at; a linha precisa continuar compartilhada).
create policy incidents_ack_family on public.student_incidents
  for update to authenticated
  using (school_id = app.current_school_id() and share_with_family and student_id in (select app.my_students()))
  with check (school_id = app.current_school_id() and share_with_family and student_id in (select app.my_students()));
create policy incidents_delete on public.student_incidents
  for delete to authenticated
  using (school_id = app.current_school_id() and (app.is_manager() or author_id = auth.uid()));

-- -----------------------------------------------------------------------------
-- Autorizações digitais: passeio, uso de imagem, medicação. A família aceita
-- ou recusa no portal; fica registrado quem, quando e por qual acesso.
-- -----------------------------------------------------------------------------
create type public.authorization_kind as enum ('passeio', 'imagem', 'medicacao', 'saida', 'outro');

create table public.authorizations (
  id          uuid primary key default gen_random_uuid(),
  school_id   uuid not null references public.schools (id) on delete cascade,
  kind        public.authorization_kind not null default 'outro',
  title       text not null,
  description text not null,
  class_ids   uuid[] not null default '{}',         -- vazio = toda a escola
  student_ids uuid[] not null default '{}',         -- se preenchido, só estes
  deadline    date,
  event_date  date,
  active      boolean not null default true,
  created_by  uuid references public.profiles (id) on delete set null,
  created_at  timestamptz not null default now()
);
alter table public.authorizations enable row level security;

create table public.authorization_responses (
  authorization_id uuid not null references public.authorizations (id) on delete cascade,
  student_id       uuid not null references public.students (id) on delete cascade,
  school_id        uuid not null references public.schools (id) on delete cascade,
  profile_id       uuid not null references public.profiles (id) on delete cascade,
  accepted         boolean not null,
  note             text,
  user_agent       text,
  responded_at     timestamptz not null default now(),
  primary key (authorization_id, student_id)
);
alter table public.authorization_responses enable row level security;

-- Equipe vê todas; família vê as que alcançam os filhos (turma ou aluno).
create policy authorizations_select on public.authorizations
  for select to authenticated
  using (
    school_id = app.current_school_id() and (
      app.current_role() in ('admin', 'coordinator', 'teacher')
      or exists (
        select 1 from public.enrollments e
         where e.student_id in (select app.my_students()) and e.active
           and (
             (cardinality(class_ids) = 0 and cardinality(student_ids) = 0)
             or e.class_id = any (class_ids)
             or e.student_id = any (student_ids)
           )
      )
    )
  );
create policy authorizations_write on public.authorizations
  for all to authenticated
  using (school_id = app.current_school_id() and app.is_manager())
  with check (school_id = app.current_school_id() and app.is_manager());

create policy authorization_responses_select on public.authorization_responses
  for select to authenticated
  using (
    school_id = app.current_school_id()
    and (app.current_role() in ('admin', 'coordinator', 'teacher') or student_id in (select app.my_students()))
  );
create policy authorization_responses_family on public.authorization_responses
  for all to authenticated
  using (school_id = app.current_school_id() and profile_id = auth.uid() and student_id in (select app.my_students()))
  with check (school_id = app.current_school_id() and profile_id = auth.uid() and student_id in (select app.my_students()));
