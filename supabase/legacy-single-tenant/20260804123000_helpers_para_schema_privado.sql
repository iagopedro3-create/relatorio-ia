-- =============================================================================
-- Move os helpers de autorização de `public` para o schema `app`.
--
-- Motivo: o PostgREST publica tudo que está em `public` como endpoint REST, e
-- o verificador de segurança do Supabase acusou `meu_papel` e `minhas_turmas`
-- como funções SECURITY DEFINER chamáveis por qualquer um em /rest/v1/rpc/.
-- Elas não vazavam dado de terceiros (cada uma responde em função do
-- auth.uid() de quem chama), mas função SECURITY DEFINER não tem por que ficar
-- exposta. O schema `app` não é publicado pela API.
--
-- As policies continuam podendo chamá-las: a RLS é avaliada no servidor.
-- =============================================================================

create schema if not exists app;
grant usage on schema app to authenticated;

create function app.meu_papel()
returns public.user_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid() and active
$$;

create function app.minhas_turmas()
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

create function app.e_gestao()
returns boolean
language sql
stable
set search_path = public
as $$
  select app.meu_papel() in ('admin', 'coordinator')
$$;

revoke all on function app.meu_papel()     from public, anon;
revoke all on function app.minhas_turmas() from public, anon;
revoke all on function app.e_gestao()      from public, anon;
grant execute on function app.meu_papel()     to authenticated;
grant execute on function app.minhas_turmas() to authenticated;
grant execute on function app.e_gestao()      to authenticated;

-- As policies dependem das funções antigas, então precisam cair antes delas.
drop policy profiles_self_select        on public.profiles;
drop policy classes_select              on public.classes;
drop policy students_select             on public.students;
drop policy enrollments_select          on public.enrollments;
drop policy teacher_assignments_select  on public.teacher_assignments;
drop policy attendance_select           on public.attendance_records;
drop policy attendance_write            on public.attendance_records;
drop policy attendance_update           on public.attendance_records;
drop policy lessons_select              on public.lesson_entries;
drop policy lessons_insert              on public.lesson_entries;
drop policy lessons_update              on public.lesson_entries;
drop policy lessons_delete              on public.lesson_entries;
drop policy grades_select               on public.grade_entries;
drop policy grades_insert               on public.grade_entries;
drop policy grades_update               on public.grade_entries;

drop function public.e_gestao();
drop function public.minhas_turmas();
drop function public.meu_papel();

create policy profiles_self_select on public.profiles
  for select to authenticated
  using (id = auth.uid() or app.e_gestao());

create policy classes_select on public.classes
  for select to authenticated
  using (id in (select app.minhas_turmas()));

create policy students_select on public.students
  for select to authenticated
  using (exists (
    select 1 from public.enrollments e
     where e.student_id = students.id
       and e.class_id in (select app.minhas_turmas())
  ));

create policy enrollments_select on public.enrollments
  for select to authenticated
  using (class_id in (select app.minhas_turmas()));

create policy teacher_assignments_select on public.teacher_assignments
  for select to authenticated
  using (teacher_id = auth.uid() or app.e_gestao());

create policy attendance_select on public.attendance_records
  for select to authenticated
  using (exists (
    select 1 from public.enrollments e
     where e.id = attendance_records.enrollment_id
       and e.class_id in (select app.minhas_turmas())
  ));

create policy attendance_write on public.attendance_records
  for insert to authenticated
  with check (exists (
    select 1 from public.enrollments e
     where e.id = attendance_records.enrollment_id
       and e.class_id in (select app.minhas_turmas())
  ));

create policy attendance_update on public.attendance_records
  for update to authenticated
  using (exists (
    select 1 from public.enrollments e
     where e.id = attendance_records.enrollment_id
       and e.class_id in (select app.minhas_turmas())
  ))
  with check (exists (
    select 1 from public.enrollments e
     where e.id = attendance_records.enrollment_id
       and e.class_id in (select app.minhas_turmas())
  ));

create policy lessons_select on public.lesson_entries
  for select to authenticated
  using (class_id in (select app.minhas_turmas()));

create policy lessons_insert on public.lesson_entries
  for insert to authenticated
  with check (class_id in (select app.minhas_turmas()));

create policy lessons_update on public.lesson_entries
  for update to authenticated
  using (class_id in (select app.minhas_turmas()) and created_by = auth.uid())
  with check (class_id in (select app.minhas_turmas()));

create policy lessons_delete on public.lesson_entries
  for delete to authenticated
  using (created_by = auth.uid() or app.e_gestao());

create policy grades_select on public.grade_entries
  for select to authenticated
  using (exists (
    select 1 from public.enrollments e
     where e.id = grade_entries.enrollment_id
       and e.class_id in (select app.minhas_turmas())
  ));

create policy grades_insert on public.grade_entries
  for insert to authenticated
  with check (exists (
    select 1 from public.enrollments e
     where e.id = grade_entries.enrollment_id
       and e.class_id in (select app.minhas_turmas())
  ));

create policy grades_update on public.grade_entries
  for update to authenticated
  using (exists (
    select 1 from public.enrollments e
     where e.id = grade_entries.enrollment_id
       and e.class_id in (select app.minhas_turmas())
  ))
  with check (exists (
    select 1 from public.enrollments e
     where e.id = grade_entries.enrollment_id
       and e.class_id in (select app.minhas_turmas())
  ));
