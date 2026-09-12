-- =============================================================================
-- Documentação pedagógica contínua + datas dos períodos + análise persistida.
-- =============================================================================

-- Períodos do ano letivo com datas: [{"label":"1º Bimestre","start":"2026-02-02","end":"2026-04-17"}, ...]
-- Vazio = o app aproxima por meses (fev–abr, mai–jul, ago–set, out–dez).
alter table public.school_years add column periods jsonb not null default '[]'::jsonb;

-- Análise da IA sobre uma avaliação diagnóstica (antes ficava só na memória da tela).
alter table public.assessments add column analysis text, add column analyzed_at timestamptz;

-- -----------------------------------------------------------------------------
-- Registros de observação: a professora anota o que viu, quando viu, por campo
-- de experiência. É a matéria-prima do relatório descritivo e do PEI.
-- -----------------------------------------------------------------------------
create table public.observations (
  id                uuid primary key default gen_random_uuid(),
  school_id         uuid not null references public.schools (id) on delete cascade,
  student_id        uuid not null references public.students (id) on delete cascade,
  class_id          uuid references public.classes (id) on delete set null,
  author_id         uuid references public.profiles (id) on delete set null,
  date              date not null default current_date,
  -- social | motor | arts | language | logic | english | pe | general (ver src/store/bnccFields.ts)
  field_id          text not null default 'general',
  text              text not null,
  photo_path        text,                          -- caminho no bucket privado `observations`
  share_with_family boolean not null default false,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index observations_student_date_idx on public.observations (student_id, date desc);
create index observations_school_class_idx on public.observations (school_id, class_id, date desc);
create trigger observations_touch before update on public.observations for each row execute function public.touch_updated_at();

alter table public.observations enable row level security;

-- Lê: gestão; professor das turmas dele; autor; família só o que foi compartilhado.
create policy observations_select on public.observations
  for select to authenticated
  using (
    school_id = app.current_school_id() and (
      app.is_manager()
      or class_id in (select app.my_classes())
      or author_id = auth.uid()
      or (share_with_family and student_id in (select app.my_students()))
    )
  );
create policy observations_insert on public.observations
  for insert to authenticated
  with check (
    school_id = app.current_school_id()
    and author_id = auth.uid()
    and (app.is_manager() or class_id in (select app.my_classes()))
  );
create policy observations_update on public.observations
  for update to authenticated
  using (school_id = app.current_school_id() and (app.is_manager() or author_id = auth.uid()))
  with check (school_id = app.current_school_id());
create policy observations_delete on public.observations
  for delete to authenticated
  using (school_id = app.current_school_id() and (app.is_manager() or author_id = auth.uid()));

-- -----------------------------------------------------------------------------
-- Fotos: bucket PRIVADO (foto de criança nunca é pública). Leitura por URL
-- assinada, restrita à pasta da escola; a RLS da tabela decide quem vê o registro.
-- -----------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('observations', 'observations', false, 5242880, array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do nothing;

create policy observations_read on storage.objects
  for select to authenticated
  using (bucket_id = 'observations' and (storage.foldername(name))[1] = app.current_school_id()::text);

create policy observations_write on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'observations'
    and app.current_role() in ('admin', 'coordinator', 'teacher')
    and (storage.foldername(name))[1] = app.current_school_id()::text
  );

create policy observations_remove on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'observations'
    and (storage.foldername(name))[1] = app.current_school_id()::text
    and (owner = auth.uid() or app.is_manager())
  );
