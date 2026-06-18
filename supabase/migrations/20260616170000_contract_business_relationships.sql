create extension if not exists pgcrypto;

create table if not exists public.tipos_actualizacion_valor (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  descripcion text,
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.contrato_propietarios (
  id uuid primary key default gen_random_uuid(),
  contrato_id uuid not null,
  propietario_id uuid not null,
  porcentaje numeric(7,4),
  principal boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint contrato_propietarios_unique unique (contrato_id, propietario_id)
);

create table if not exists public.contrato_inquilinos (
  id uuid primary key default gen_random_uuid(),
  contrato_id uuid not null,
  inquilino_id uuid not null,
  principal boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint contrato_inquilinos_unique unique (contrato_id, inquilino_id)
);

create table if not exists public.cobros_propietario (
  id uuid primary key default gen_random_uuid(),
  contrato_id uuid not null,
  propietario_id uuid not null,
  moneda_cobro_id uuid,
  fecha_cobro date,
  concepto text,
  importe numeric(14,2),
  estado text,
  observaciones text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.contratos_alquiler
  add column if not exists plazo_contrato_id uuid,
  add column if not exists moneda_cobro_id uuid,
  add column if not exists tipo_actualizacion_valor_id uuid,
  add column if not exists fecha_actualizacion_valor date,
  add column if not exists comision_inmobiliaria numeric(14,2);

alter table public.pagos_alquiler
  add column if not exists moneda_cobro_id uuid;

alter table public.propiedades
  add column if not exists propietario_id uuid;

create index if not exists propiedades_propietario_id_idx on public.propiedades (propietario_id);
create index if not exists contratos_alquiler_propiedad_id_idx on public.contratos_alquiler (propiedad_id);
create index if not exists contratos_alquiler_propietario_id_idx on public.contratos_alquiler (propietario_id);
create index if not exists contratos_alquiler_inquilino_id_idx on public.contratos_alquiler (inquilino_id);
create index if not exists contratos_alquiler_plazo_contrato_id_idx on public.contratos_alquiler (plazo_contrato_id);
create index if not exists contratos_alquiler_moneda_cobro_id_idx on public.contratos_alquiler (moneda_cobro_id);
create index if not exists contratos_alquiler_tipo_actualizacion_valor_id_idx on public.contratos_alquiler (tipo_actualizacion_valor_id);
create index if not exists pagos_alquiler_contrato_id_idx on public.pagos_alquiler (contrato_id);
create index if not exists pagos_alquiler_moneda_cobro_id_idx on public.pagos_alquiler (moneda_cobro_id);
create index if not exists cobros_propietario_contrato_id_idx on public.cobros_propietario (contrato_id);
create index if not exists cobros_propietario_propietario_id_idx on public.cobros_propietario (propietario_id);

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'propiedades_propietario_id_fkey') then
    alter table public.propiedades
      add constraint propiedades_propietario_id_fkey
      foreign key (propietario_id) references public.propietarios(id) not valid;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'contratos_alquiler_propiedad_id_fkey') then
    alter table public.contratos_alquiler
      add constraint contratos_alquiler_propiedad_id_fkey
      foreign key (propiedad_id) references public.propiedades(id) not valid;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'contratos_alquiler_propietario_id_fkey') then
    alter table public.contratos_alquiler
      add constraint contratos_alquiler_propietario_id_fkey
      foreign key (propietario_id) references public.propietarios(id) not valid;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'contratos_alquiler_inquilino_id_fkey') then
    alter table public.contratos_alquiler
      add constraint contratos_alquiler_inquilino_id_fkey
      foreign key (inquilino_id) references public.inquilinos(id) not valid;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'contratos_alquiler_plazo_contrato_id_fkey') then
    alter table public.contratos_alquiler
      add constraint contratos_alquiler_plazo_contrato_id_fkey
      foreign key (plazo_contrato_id) references public.plazos_contrato(id) not valid;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'contratos_alquiler_moneda_cobro_id_fkey') then
    alter table public.contratos_alquiler
      add constraint contratos_alquiler_moneda_cobro_id_fkey
      foreign key (moneda_cobro_id) references public.monedas_cobro(id) not valid;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'contratos_alquiler_tipo_actualizacion_valor_id_fkey') then
    alter table public.contratos_alquiler
      add constraint contratos_alquiler_tipo_actualizacion_valor_id_fkey
      foreign key (tipo_actualizacion_valor_id) references public.tipos_actualizacion_valor(id) not valid;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'pagos_alquiler_contrato_id_fkey') then
    alter table public.pagos_alquiler
      add constraint pagos_alquiler_contrato_id_fkey
      foreign key (contrato_id) references public.contratos_alquiler(id) not valid;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'pagos_alquiler_moneda_cobro_id_fkey') then
    alter table public.pagos_alquiler
      add constraint pagos_alquiler_moneda_cobro_id_fkey
      foreign key (moneda_cobro_id) references public.monedas_cobro(id) not valid;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'contrato_propietarios_contrato_id_fkey') then
    alter table public.contrato_propietarios
      add constraint contrato_propietarios_contrato_id_fkey
      foreign key (contrato_id) references public.contratos_alquiler(id) on delete cascade not valid;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'contrato_propietarios_propietario_id_fkey') then
    alter table public.contrato_propietarios
      add constraint contrato_propietarios_propietario_id_fkey
      foreign key (propietario_id) references public.propietarios(id) not valid;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'contrato_inquilinos_contrato_id_fkey') then
    alter table public.contrato_inquilinos
      add constraint contrato_inquilinos_contrato_id_fkey
      foreign key (contrato_id) references public.contratos_alquiler(id) on delete cascade not valid;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'contrato_inquilinos_inquilino_id_fkey') then
    alter table public.contrato_inquilinos
      add constraint contrato_inquilinos_inquilino_id_fkey
      foreign key (inquilino_id) references public.inquilinos(id) not valid;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'cobros_propietario_contrato_id_fkey') then
    alter table public.cobros_propietario
      add constraint cobros_propietario_contrato_id_fkey
      foreign key (contrato_id) references public.contratos_alquiler(id) not valid;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'cobros_propietario_propietario_id_fkey') then
    alter table public.cobros_propietario
      add constraint cobros_propietario_propietario_id_fkey
      foreign key (propietario_id) references public.propietarios(id) not valid;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'cobros_propietario_moneda_cobro_id_fkey') then
    alter table public.cobros_propietario
      add constraint cobros_propietario_moneda_cobro_id_fkey
      foreign key (moneda_cobro_id) references public.monedas_cobro(id) not valid;
  end if;
end;
$$;

do $$
declare
  table_name text;
  policy_name text;
begin
  foreach table_name in array array[
    'tipos_actualizacion_valor',
    'contrato_propietarios',
    'contrato_inquilinos',
    'cobros_propietario'
  ]
  loop
    execute format('alter table public.%I enable row level security', table_name);
    policy_name := table_name || '_anon_crud';

    if not exists (
      select 1
      from pg_policies
      where schemaname = 'public'
        and tablename = table_name
        and policyname = policy_name
    ) then
      execute format(
        'create policy %I on public.%I for all to anon, authenticated using (true) with check (true)',
        policy_name,
        table_name
      );
    end if;
  end loop;
end;
$$;
