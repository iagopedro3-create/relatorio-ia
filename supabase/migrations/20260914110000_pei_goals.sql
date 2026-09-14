-- =============================================================================
-- PEI vivo: metas como objeto (não mais só texto dentro do markdown).
--
--   pei_goals      — uma linha por meta do PEI (eixo, meta observável, critério
--                    de sucesso, contexto, linha de base, prazo, status, progresso)
--   goal_evidence  — meta ↔ registro de observação (a evidência que sustenta
--                    o progresso; quem ligou e quando)
--
-- Regras:
--   * quem lê o PEI lê as metas (a RLS de student_documents é reaplicada);
--   * gestão edita tudo; professora da turma/autora edita a estrutura enquanto
--     o PEI não está aprovado e, depois, só status/progresso (o PEI aprovado é
--     imutável, mas o acompanhamento continua);
--   * a família nunca escreve;
--   * a IA nunca marca progresso: status/progresso só por pessoa, com nome e data.
-- =============================================================================

create type public.goal_status as enum ('active', 'achieved', 'paused', 'dropped');
create type public.goal_term   as enum ('curto', 'medio', 'longo');

create table public.pei_goals (
  id                  uuid primary key default gen_random_uuid(),
  school_id           uuid not null references public.schools (id) on delete cascade,
  document_id         uuid not null references public.student_documents (id) on delete cascade,
  student_id          uuid not null references public.students (id) on delete cascade,
  axis                text not null,                 -- ex.: Comunicação e Linguagem
  title               text not null,                 -- comportamento observável
  criterion           text,                          -- critério de sucesso mensurável
  context             text,                          -- contexto de observação
  baseline            text,                          -- linha de base (primeira semana)
  term                public.goal_term not null default 'medio',
  status              public.goal_status not null default 'active',
  progress_note       text,
  progress_updated_by uuid references public.profiles (id) on delete set null,
  progress_updated_at timestamptz,
  sort_order          int not null default 0,
  created_by          uuid references public.profiles (id) on delete set null,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create index pei_goals_document_idx on public.pei_goals (document_id, sort_order);
create index pei_goals_student_idx  on public.pei_goals (school_id, student_id, status);
create trigger pei_goals_touch before update on public.pei_goals for each row execute function public.touch_updated_at();

create table public.goal_evidence (
  goal_id        uuid not null references public.pei_goals (id) on delete cascade,
  observation_id uuid not null references public.observations (id) on delete cascade,
  school_id      uuid not null references public.schools (id) on delete cascade,
  created_by     uuid references public.profiles (id) on delete set null,
  created_at     timestamptz not null default now(),
  primary key (goal_id, observation_id)
);
create index goal_evidence_observation_idx on public.goal_evidence (observation_id);

alter table public.pei_goals     enable row level security;
alter table public.goal_evidence enable row level security;

-- Quem pode escrever na meta: gestão, ou (autor do PEI / professor da turma do
-- aluno) — sempre dentro da escola. A família fica de fora.
create function app.can_edit_goal(p_document_id uuid, p_student_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select app.current_role() in ('admin', 'coordinator')
      or exists (select 1 from public.student_documents d
                  where d.id = p_document_id and d.author_id = auth.uid())
      or exists (select 1 from public.enrollments e
                  where e.student_id = p_student_id and e.active
                    and e.class_id in (select app.my_classes()))
$$;

create policy pei_goals_select on public.pei_goals
  for select to authenticated
  using (
    school_id = app.current_school_id()
    and exists (select 1 from public.student_documents d where d.id = pei_goals.document_id)
  );
create policy pei_goals_insert on public.pei_goals
  for insert to authenticated
  with check (
    school_id = app.current_school_id()
    and app.current_role() <> 'guardian'
    and app.can_edit_goal(document_id, student_id)
  );
create policy pei_goals_update on public.pei_goals
  for update to authenticated
  using (school_id = app.current_school_id() and app.current_role() <> 'guardian' and app.can_edit_goal(document_id, student_id))
  with check (school_id = app.current_school_id());
create policy pei_goals_delete on public.pei_goals
  for delete to authenticated
  using (school_id = app.current_school_id() and app.current_role() <> 'guardian' and app.can_edit_goal(document_id, student_id));

-- Depois de aprovado o PEI, quem não é gestão só acompanha (status/progresso).
create or replace function app.guard_pei_goal_update()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_status public.document_status;
begin
  if new.document_id is distinct from old.document_id or new.student_id is distinct from old.student_id
     or new.school_id is distinct from old.school_id then
    raise exception 'A meta não pode mudar de PEI ou de aluno.' using errcode = '42501';
  end if;
  if new.status is distinct from old.status or new.progress_note is distinct from old.progress_note then
    new.progress_updated_by := coalesce(auth.uid(), new.progress_updated_by);
    new.progress_updated_at := now();
  end if;
  if app.is_end_user() and not app.is_manager() then
    select status into v_status from public.student_documents where id = old.document_id;
    if v_status = 'approved' and (
         new.axis is distinct from old.axis or new.title is distinct from old.title
      or new.criterion is distinct from old.criterion or new.context is distinct from old.context
      or new.term is distinct from old.term or new.sort_order is distinct from old.sort_order) then
      raise exception 'O PEI está aprovado: a meta só pode ter o acompanhamento atualizado.' using errcode = '42501';
    end if;
  end if;
  if new.status is distinct from old.status then
    insert into public.audit_log (school_id, actor_id, action, entity, entity_id, data)
    values (old.school_id, auth.uid(), 'goal.status_changed', 'pei_goal', old.id,
            jsonb_build_object('student_id', old.student_id, 'document_id', old.document_id, 'from', old.status, 'to', new.status));
  end if;
  return new;
end $$;
create trigger pei_goals_guard_update before update on public.pei_goals
  for each row execute function app.guard_pei_goal_update();

-- Evidência: lê quem lê a meta; liga/desliga quem edita a meta E enxerga o registro.
create policy goal_evidence_select on public.goal_evidence
  for select to authenticated
  using (
    school_id = app.current_school_id()
    and exists (select 1 from public.pei_goals g where g.id = goal_evidence.goal_id)
  );
create policy goal_evidence_insert on public.goal_evidence
  for insert to authenticated
  with check (
    school_id = app.current_school_id()
    and app.current_role() <> 'guardian'
    and exists (select 1 from public.pei_goals g where g.id = goal_evidence.goal_id and app.can_edit_goal(g.document_id, g.student_id))
    and exists (select 1 from public.observations o where o.id = goal_evidence.observation_id)
  );
create policy goal_evidence_delete on public.goal_evidence
  for delete to authenticated
  using (
    school_id = app.current_school_id()
    and app.current_role() <> 'guardian'
    and exists (select 1 from public.pei_goals g where g.id = goal_evidence.goal_id and app.can_edit_goal(g.document_id, g.student_id))
  );
