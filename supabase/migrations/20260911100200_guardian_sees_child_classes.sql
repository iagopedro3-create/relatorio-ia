-- Responsável precisa enxergar a turma do filho (nome da turma na home, boletim).
-- Achado no teste de RLS de 11/09/2026: o guardian via 0 turmas.
drop policy classes_select on public.classes;
create policy classes_select on public.classes
  for select to authenticated
  using (
    school_id = app.current_school_id() and (
      app.is_manager()
      or id in (select app.my_classes())
      or id in (select e.class_id from public.enrollments e where e.student_id in (select app.my_students()) and e.active)
    )
  );
