-- Bucket e policies do storage para logos das escolas. Fica em migração
-- separada porque o serviço de storage sobe depois do Postgres num restore
-- e `storage.buckets` pode ainda não existir quando o schema principal roda.

-- -----------------------------------------------------------------------------
-- Storage: logos das escolas (bucket público de leitura, escrita pelo admin
-- da escola dentro da pasta <school_id>/).
-- -----------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('branding', 'branding', true, 2097152, array['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp'])
on conflict (id) do nothing;

create policy branding_public_read on storage.objects
  for select to public using (bucket_id = 'branding');

create policy branding_admin_write on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'branding'
    and app.is_admin()
    and (storage.foldername(name))[1] = app.current_school_id()::text
  );

create policy branding_admin_update on storage.objects
  for update to authenticated
  using (
    bucket_id = 'branding'
    and app.is_admin()
    and (storage.foldername(name))[1] = app.current_school_id()::text
  );

create policy branding_admin_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'branding'
    and app.is_admin()
    and (storage.foldername(name))[1] = app.current_school_id()::text
  );

