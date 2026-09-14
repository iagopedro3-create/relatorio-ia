-- =============================================================================
-- Endurecimento de segurança (auditoria de 13/09/2026, docs/product-strategy).
--
-- Fecha os furos encontrados nas policies da migração multi-tenant:
--   1. profiles_update deixava o próprio usuário mudar `role` (professor → admin).
--   2. schools_update deixava o admin da escola mudar plano/status/trial/overrides.
--   3. student_documents_update / lesson_plans_update deixavam o autor
--      marcar `approved` e editar documento já aprovado.
--   4. assessment_results, agenda_replies e agenda_events eram legíveis pela
--      escola inteira (inclusive responsáveis).
--   5. profiles_select expunha e-mail de todos os responsáveis a qualquer usuário.
--   6. storage `observations_read` deixava qualquer autenticado da escola
--      assinar a foto de qualquer criança.
-- Adiciona `audit_log` (quem / o quê / quando) para eventos sensíveis.
-- Desliga a feature `finance` em todos os planos (decisão de produto: o
-- financeiro não faz parte do wedge; liga-se por escola via feature_overrides).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 0. Helper: a requisição vem de um usuário final (JWT `authenticated`)?
--    service_role e postgres passam direto pelos guards.
-- -----------------------------------------------------------------------------
create or replace function app.is_end_user()
returns boolean language sql stable as $$
  select coalesce(auth.role(), '') = 'authenticated'
$$;

-- -----------------------------------------------------------------------------
-- 1. profiles: só o servidor (service_role) ou um admin da escola mexem em
--    papel/ativo/segmento/e-mail; ninguém troca de escola pelo cliente.
-- -----------------------------------------------------------------------------
create or replace function app.guard_profile_update()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not app.is_end_user() then return new; end if;
  if new.school_id is distinct from old.school_id or new.id is distinct from old.id then
    raise exception 'Não é permitido mover um perfil de escola.' using errcode = '42501';
  end if;
  if not app.is_admin() then
    if new.role is distinct from old.role
       or new.active is distinct from old.active
       or new.managed_level is distinct from old.managed_level
       or new.specialty is distinct from old.specialty
       or new.email is distinct from old.email then
      raise exception 'Só a direção altera papel, acesso ou e-mail de um perfil.' using errcode = '42501';
    end if;
  end if;
  if new.role is distinct from old.role then
    insert into public.audit_log (school_id, actor_id, action, entity, entity_id, data)
    values (old.school_id, auth.uid(), 'profile.role_changed', 'profile', old.id,
            jsonb_build_object('from', old.role, 'to', new.role));
  end if;
  return new;
end $$;

drop trigger if exists profiles_guard_update on public.profiles;
create trigger profiles_guard_update before update on public.profiles
  for each row execute function app.guard_profile_update();

-- Leitura: gestão vê todos; equipe e responsáveis veem a equipe e a si mesmos
-- (e-mail de responsável não circula entre responsáveis nem professores).
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select to authenticated
  using (
    school_id = app.current_school_id()
    and (app.is_manager() or id = auth.uid() or role <> 'guardian')
  );

-- -----------------------------------------------------------------------------
-- 2. schools: plano, status, trial, overrides, billing e DPA só pelo servidor.
-- -----------------------------------------------------------------------------
create or replace function app.guard_school_update()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not app.is_end_user() then return new; end if;
  if new.plan_id is distinct from old.plan_id
     or new.status is distinct from old.status
     or new.trial_ends_at is distinct from old.trial_ends_at
     or new.feature_overrides is distinct from old.feature_overrides
     or new.billing_customer_id is distinct from old.billing_customer_id
     or new.billing_subscription_id is distinct from old.billing_subscription_id
     or new.dpa_signed_at is distinct from old.dpa_signed_at
     or new.slug is distinct from old.slug then
    raise exception 'Plano, status e assinatura da escola são geridos pela plataforma.' using errcode = '42501';
  end if;
  return new;
end $$;

drop trigger if exists schools_guard_update on public.schools;
create trigger schools_guard_update before update on public.schools
  for each row execute function app.guard_school_update();

-- -----------------------------------------------------------------------------
-- 3. Documentos e planos de aula: quem não é gestão só transita
--    draft/returned → draft/submitted; aprovado é imutável para o autor;
--    campos de revisão são da gestão. Toda mudança de status vai ao audit_log.
-- -----------------------------------------------------------------------------
create or replace function app.guard_student_document_update()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if app.is_end_user() then
    if new.author_id is distinct from old.author_id
       or new.student_id is distinct from old.student_id
       or new.school_id is distinct from old.school_id then
      raise exception 'Autor e aluno do documento não podem ser alterados.' using errcode = '42501';
    end if;
    if not app.is_manager() then
      if old.status = 'approved' then
        raise exception 'Documento aprovado não pode ser editado; peça à coordenação uma nova versão.' using errcode = '42501';
      end if;
      if new.status not in ('draft', 'submitted') then
        raise exception 'Só a coordenação aprova ou devolve documentos.' using errcode = '42501';
      end if;
      if new.reviewed_by is distinct from old.reviewed_by or new.review_note is distinct from old.review_note then
        raise exception 'Campos de revisão são da coordenação.' using errcode = '42501';
      end if;
    elsif new.status in ('approved', 'returned') and new.status is distinct from old.status then
      new.reviewed_by := coalesce(new.reviewed_by, auth.uid());
    end if;
  end if;
  if new.status is distinct from old.status then
    insert into public.audit_log (school_id, actor_id, action, entity, entity_id, data)
    values (old.school_id, auth.uid(), 'document.status_changed', 'student_document', old.id,
            jsonb_build_object('kind', old.kind, 'student_id', old.student_id, 'from', old.status, 'to', new.status));
  end if;
  return new;
end $$;

drop trigger if exists student_documents_guard_update on public.student_documents;
create trigger student_documents_guard_update before update on public.student_documents
  for each row execute function app.guard_student_document_update();

create or replace function app.guard_lesson_plan_update()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if app.is_end_user() and not app.is_manager() then
    if new.status not in ('draft', 'submitted') then
      raise exception 'Só a coordenação aprova ou devolve planos.' using errcode = '42501';
    end if;
    if new.coordinator_feedback is distinct from old.coordinator_feedback then
      raise exception 'O parecer é da coordenação.' using errcode = '42501';
    end if;
    if new.teacher_id is distinct from old.teacher_id then
      raise exception 'Autor do plano não pode ser alterado.' using errcode = '42501';
    end if;
  end if;
  if new.status is distinct from old.status then
    insert into public.audit_log (school_id, actor_id, action, entity, entity_id, data)
    values (old.school_id, auth.uid(), 'lesson_plan.status_changed', 'lesson_plan', old.id,
            jsonb_build_object('from', old.status, 'to', new.status));
  end if;
  return new;
end $$;

drop trigger if exists lesson_plans_guard_update on public.lesson_plans;
create trigger lesson_plans_guard_update before update on public.lesson_plans
  for each row execute function app.guard_lesson_plan_update();

-- Inserção já aprovada pelo autor também não vale.
drop policy if exists student_documents_insert on public.student_documents;
create policy student_documents_insert on public.student_documents
  for insert to authenticated
  with check (
    school_id = app.current_school_id()
    and author_id = auth.uid()
    and (app.is_manager() or (class_id in (select app.my_classes()) and status in ('draft', 'submitted')))
  );

drop policy if exists lesson_plans_insert on public.lesson_plans;
create policy lesson_plans_insert on public.lesson_plans
  for insert to authenticated
  with check (
    school_id = app.current_school_id() and teacher_id = auth.uid()
    and (app.is_manager() or status in ('draft', 'submitted'))
  );

-- -----------------------------------------------------------------------------
-- 4. Resultados de avaliação: equipe da turma (ou autor da avaliação); nunca família.
-- -----------------------------------------------------------------------------
drop policy if exists assessment_results_select on public.assessment_results;
drop policy if exists assessment_results_write on public.assessment_results;
create policy assessment_results_select on public.assessment_results
  for select to authenticated
  using (
    school_id = app.current_school_id()
    and app.current_role() <> 'guardian'
    and (
      app.is_manager()
      or exists (
        select 1 from public.assessments a
         where a.id = assessment_results.assessment_id
           and (a.created_by = auth.uid() or a.class_id in (select app.my_classes()))
      )
    )
  );
create policy assessment_results_write on public.assessment_results
  for all to authenticated
  using (
    school_id = app.current_school_id()
    and app.current_role() <> 'guardian'
    and (
      app.is_manager()
      or exists (
        select 1 from public.assessments a
         where a.id = assessment_results.assessment_id
           and (a.created_by = auth.uid() or a.class_id in (select app.my_classes()))
      )
    )
  )
  with check (
    school_id = app.current_school_id()
    and app.current_role() <> 'guardian'
    and (
      app.is_manager()
      or exists (
        select 1 from public.assessments a
         where a.id = assessment_results.assessment_id
           and (a.created_by = auth.uid() or a.class_id in (select app.my_classes()))
      )
    )
  );

-- Réplicas: só de mensagens que o usuário consegue ler (a RLS de
-- agenda_messages é reaplicada na subconsulta).
drop policy if exists agenda_replies_select on public.agenda_replies;
create policy agenda_replies_select on public.agenda_replies
  for select to authenticated
  using (
    school_id = app.current_school_id()
    and exists (select 1 from public.agenda_messages m where m.id = agenda_replies.message_id)
  );

-- Eventos: equipe vê tudo; responsável vê os da escola inteira e os das turmas dos filhos.
drop policy if exists agenda_events_select on public.agenda_events;
create policy agenda_events_select on public.agenda_events
  for select to authenticated
  using (
    school_id = app.current_school_id()
    and (
      app.current_role() <> 'guardian'
      or class_ids = '{}'::uuid[]
      or class_ids && array(
        select e.class_id from public.enrollments e
         where e.student_id in (select app.my_students()) and e.active)
    )
  );

-- -----------------------------------------------------------------------------
-- 5. Fotos de observação: legíveis só por quem lê algum registro que as referencia
--    (a RLS de `observations` decide: gestão, professor da turma, autor, família
--    quando compartilhado).
-- -----------------------------------------------------------------------------
drop policy if exists observations_read on storage.objects;
create policy observations_read on storage.objects
  for select to authenticated
  using (
    bucket_id = 'observations'
    and (storage.foldername(name))[1] = app.current_school_id()::text
    and exists (select 1 from public.observations o where o.photo_path = storage.objects.name)
  );

-- -----------------------------------------------------------------------------
-- 6. audit_log: quem fez o quê, quando. Escrita só por triggers/servidor;
--    leitura pela gestão da escola.
-- -----------------------------------------------------------------------------
create table if not exists public.audit_log (
  id         bigint generated always as identity primary key,
  school_id  uuid not null references public.schools (id) on delete cascade,
  actor_id   uuid,                        -- auth.uid(); null quando é o servidor
  action     text not null,               -- ex.: document.status_changed
  entity     text not null,               -- ex.: student_document
  entity_id  uuid,
  data       jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists audit_log_school_created_idx on public.audit_log (school_id, created_at desc);
create index if not exists audit_log_entity_idx on public.audit_log (entity, entity_id);
alter table public.audit_log enable row level security;
drop policy if exists audit_log_select on public.audit_log;
create policy audit_log_select on public.audit_log
  for select to authenticated
  using (school_id = app.current_school_id() and app.is_manager());
-- sem policy de insert/update/delete: só service_role e triggers (security definer).

-- Consentimento do PEI e cadastro de aluno também deixam rastro.
create or replace function app.audit_student_update()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.pei_consent_at is distinct from old.pei_consent_at then
    insert into public.audit_log (school_id, actor_id, action, entity, entity_id, data)
    values (old.school_id, auth.uid(),
            case when new.pei_consent_at is null then 'student.pei_consent_revoked' else 'student.pei_consent_recorded' end,
            'student', old.id, jsonb_build_object('consent_by', new.pei_consent_by));
  end if;
  return new;
end $$;
drop trigger if exists students_audit_update on public.students;
create trigger students_audit_update after update on public.students
  for each row execute function app.audit_student_update();

-- -----------------------------------------------------------------------------
-- 7. Feature `finance` desligada por padrão (liga-se por escola no backoffice).
-- -----------------------------------------------------------------------------
update public.plans set features = features || '{"finance": false}'::jsonb;
