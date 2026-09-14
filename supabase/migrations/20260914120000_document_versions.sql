-- =============================================================================
-- Versões de documentos (relatório e PEI): toda mudança de texto ou de status
-- vira uma linha imutável em document_versions. É a trilha que a coordenação,
-- a família e um eventual auditor podem pedir: o que foi aprovado, quando,
-- por quem, e o que mudou depois.
--
-- Escrita só por trigger (security definer); leitura para a equipe que lê o
-- documento. A família vê apenas o documento atual (não o histórico).
-- =============================================================================

create table public.document_versions (
  id          bigint generated always as identity primary key,
  school_id   uuid not null references public.schools (id) on delete cascade,
  document_id uuid not null references public.student_documents (id) on delete cascade,
  version_no  int  not null,
  content     text not null,
  form_data   jsonb not null default '{}'::jsonb,
  status      public.document_status not null,   -- status do documento nesta versão
  review_note text,
  created_by  uuid references public.profiles (id) on delete set null,
  created_at  timestamptz not null default now(),
  unique (document_id, version_no)
);
create index document_versions_document_idx on public.document_versions (document_id, version_no desc);

alter table public.document_versions enable row level security;

create policy document_versions_select on public.document_versions
  for select to authenticated
  using (
    school_id = app.current_school_id()
    and app.current_role() <> 'guardian'
    and exists (select 1 from public.student_documents d where d.id = document_versions.document_id)
  );
-- sem policy de insert/update/delete: só o trigger abaixo escreve.

create or replace function app.snapshot_document_version()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_next int;
begin
  if tg_op = 'UPDATE'
     and new.content is not distinct from old.content
     and new.status  is not distinct from old.status
     and new.review_note is not distinct from old.review_note then
    return new;
  end if;
  select coalesce(max(version_no), 0) + 1 into v_next from public.document_versions where document_id = new.id;
  insert into public.document_versions (school_id, document_id, version_no, content, form_data, status, review_note, created_by)
  values (new.school_id, new.id, v_next, new.content, new.form_data, new.status, new.review_note, auth.uid());
  return new;
end $$;

drop trigger if exists student_documents_snapshot on public.student_documents;
create trigger student_documents_snapshot after insert or update on public.student_documents
  for each row execute function app.snapshot_document_version();

-- Documentos que já existem ganham a versão 1 com o estado atual.
insert into public.document_versions (school_id, document_id, version_no, content, form_data, status, review_note, created_by)
select d.school_id, d.id, 1, d.content, d.form_data, d.status, d.review_note, d.reviewed_by
  from public.student_documents d
 where not exists (select 1 from public.document_versions v where v.document_id = d.id);
