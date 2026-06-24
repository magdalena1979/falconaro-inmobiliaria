alter table if exists public.propiedades
  add column if not exists titulares_ids uuid[] not null default '{}'::uuid[],
  add column if not exists partida_inmobiliaria text,
  add column if not exists composicion text,
  add column if not exists inventario text,
  add column if not exists canon_pretendido numeric(14, 2);

alter table if exists public.contratos_alquiler
  add column if not exists plazo_meses integer;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'property-photos',
  'property-photos',
  true,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists property_photos_admin_insert on storage.objects;
drop policy if exists property_photos_admin_update on storage.objects;
drop policy if exists property_photos_admin_delete on storage.objects;
drop policy if exists property_photos_public_read on storage.objects;

create policy property_photos_public_read
  on storage.objects
  for select
  using (bucket_id = 'property-photos');

create policy property_photos_admin_insert
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'property-photos'
    and public.is_admin_or_superadmin()
  );

create policy property_photos_admin_update
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'property-photos'
    and public.is_admin_or_superadmin()
  )
  with check (
    bucket_id = 'property-photos'
    and public.is_admin_or_superadmin()
  );

create policy property_photos_admin_delete
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'property-photos'
    and public.is_admin_or_superadmin()
  );
