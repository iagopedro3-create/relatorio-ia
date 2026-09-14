-- Correção dos guards de 20260914100000: quem não é gestão pode SALVAR um
-- documento/plano devolvido sem mudar o status (ele continua 'returned' até
-- reenviar). A regra passa a valer só quando o status muda.

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
      if new.status is distinct from old.status and new.status not in ('draft', 'submitted') then
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

create or replace function app.guard_lesson_plan_update()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if app.is_end_user() and not app.is_manager() then
    if new.status is distinct from old.status and new.status not in ('draft', 'submitted') then
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
