create or replace function public.is_admin_or_superadmin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.user_profiles
    where id = auth.uid()
      and role in ('superadmin', 'admin')
  );
$$;

drop policy if exists user_profiles_select on public.user_profiles;
drop policy if exists user_profiles_update on public.user_profiles;
drop policy if exists user_profiles_insert on public.user_profiles;
drop policy if exists user_profiles_delete on public.user_profiles;

create policy user_profiles_select
  on public.user_profiles
  for select
  to authenticated
  using (id = auth.uid() or public.is_admin_or_superadmin());

create policy user_profiles_update
  on public.user_profiles
  for update
  to authenticated
  using (public.is_admin_or_superadmin())
  with check (public.is_admin_or_superadmin());

create policy user_profiles_insert
  on public.user_profiles
  for insert
  to authenticated
  with check (public.is_admin_or_superadmin());

create policy user_profiles_delete
  on public.user_profiles
  for delete
  to authenticated
  using (public.is_admin_or_superadmin());

do $$
declare
  table_name text;
  policy_name text;
begin
  foreach table_name in array array[
    'clientes',
    'propietarios',
    'inquilinos',
    'propiedades',
    'contratos_alquiler',
    'pagos_alquiler',
    'cobros_propietario',
    'contrato_propietarios',
    'contrato_inquilinos',
    'plazos_contrato',
    'tipos_propiedad',
    'monedas_cobro',
    'tipos_actualizacion_valor'
  ]
  loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('drop policy if exists %I on public.%I', table_name || '_anon_crud', table_name);
    policy_name := table_name || '_admin_crud';

    if not exists (
      select 1
      from pg_policies
      where schemaname = 'public'
        and tablename = table_name
        and policyname = policy_name
    ) then
      execute format(
        'create policy %I on public.%I for all to authenticated using (public.is_admin_or_superadmin()) with check (public.is_admin_or_superadmin())',
        policy_name,
        table_name
      );
    end if;
  end loop;
end;
$$;
