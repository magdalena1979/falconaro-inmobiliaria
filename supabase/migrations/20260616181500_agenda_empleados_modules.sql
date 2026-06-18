create extension if not exists pgcrypto;

create table if not exists public.agenda_alertas (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  tipo text,
  fecha timestamptz,
  estado text default 'pendiente',
  contrato_id uuid,
  propiedad_id uuid,
  inquilino_id uuid,
  propietario_id uuid,
  descripcion text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.empleados (
  id uuid primary key default gen_random_uuid(),
  dni integer,
  nombres text not null,
  apellido text,
  telefono text,
  celular text,
  fax text,
  email text,
  direccion text,
  ciudad text,
  codigo_postal text,
  pais text,
  foto text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists agenda_alertas_fecha_idx on public.agenda_alertas (fecha);
create index if not exists agenda_alertas_estado_idx on public.agenda_alertas (estado);
create index if not exists empleados_dni_idx on public.empleados (dni);

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'agenda_alertas_contrato_id_fkey') then
    alter table public.agenda_alertas
      add constraint agenda_alertas_contrato_id_fkey
      foreign key (contrato_id) references public.contratos_alquiler(id) not valid;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'agenda_alertas_propiedad_id_fkey') then
    alter table public.agenda_alertas
      add constraint agenda_alertas_propiedad_id_fkey
      foreign key (propiedad_id) references public.propiedades(id) not valid;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'agenda_alertas_inquilino_id_fkey') then
    alter table public.agenda_alertas
      add constraint agenda_alertas_inquilino_id_fkey
      foreign key (inquilino_id) references public.inquilinos(id) not valid;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'agenda_alertas_propietario_id_fkey') then
    alter table public.agenda_alertas
      add constraint agenda_alertas_propietario_id_fkey
      foreign key (propietario_id) references public.propietarios(id) not valid;
  end if;
end;
$$;

do $$
declare
  target_table text;
  policy_name text;
begin
  foreach target_table in array array['agenda_alertas', 'empleados']
  loop
    execute format('alter table public.%I enable row level security', target_table);
    policy_name := target_table || '_admin_crud';

    if not exists (
      select 1
      from pg_policies
      where schemaname = 'public'
        and tablename = target_table
        and policyname = policy_name
    ) then
      execute format(
        'create policy %I on public.%I for all to authenticated using (public.is_admin_or_superadmin()) with check (public.is_admin_or_superadmin())',
        policy_name,
        target_table
      );
    end if;
  end loop;
end;
$$;
