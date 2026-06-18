create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.tipos_propiedad (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  descripcion text,
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.tipos_propiedad
  add column if not exists nombre text,
  add column if not exists descripcion text,
  add column if not exists activo boolean not null default true,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

alter table public.tipos_propiedad
  alter column nombre set not null;

create table if not exists public.plazos_contrato (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  meses integer not null,
  descripcion text,
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint plazos_contrato_meses_positive check (meses > 0)
);

alter table public.plazos_contrato
  add column if not exists nombre text,
  add column if not exists meses integer,
  add column if not exists descripcion text,
  add column if not exists activo boolean not null default true,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

alter table public.plazos_contrato
  alter column nombre set not null,
  alter column meses set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'plazos_contrato_meses_positive'
      and conrelid = 'public.plazos_contrato'::regclass
  ) then
    alter table public.plazos_contrato
      add constraint plazos_contrato_meses_positive check (meses > 0);
  end if;
end;
$$;

create table if not exists public.monedas_cobro (
  id uuid primary key default gen_random_uuid(),
  codigo text not null,
  nombre text not null,
  simbolo text,
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint monedas_cobro_codigo_unique unique (codigo)
);

alter table public.monedas_cobro
  add column if not exists codigo text,
  add column if not exists nombre text,
  add column if not exists simbolo text,
  add column if not exists activo boolean not null default true,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

alter table public.monedas_cobro
  alter column codigo set not null,
  alter column nombre set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'monedas_cobro_codigo_unique'
      and conrelid = 'public.monedas_cobro'::regclass
  ) then
    alter table public.monedas_cobro
      add constraint monedas_cobro_codigo_unique unique (codigo);
  end if;
end;
$$;

create index if not exists tipos_propiedad_nombre_idx on public.tipos_propiedad (nombre);
create index if not exists plazos_contrato_meses_idx on public.plazos_contrato (meses);
create index if not exists monedas_cobro_codigo_idx on public.monedas_cobro (codigo);

drop trigger if exists set_tipos_propiedad_updated_at on public.tipos_propiedad;
create trigger set_tipos_propiedad_updated_at
before update on public.tipos_propiedad
for each row execute function public.set_updated_at();

drop trigger if exists set_plazos_contrato_updated_at on public.plazos_contrato;
create trigger set_plazos_contrato_updated_at
before update on public.plazos_contrato
for each row execute function public.set_updated_at();

drop trigger if exists set_monedas_cobro_updated_at on public.monedas_cobro;
create trigger set_monedas_cobro_updated_at
before update on public.monedas_cobro
for each row execute function public.set_updated_at();

alter table public.tipos_propiedad enable row level security;
alter table public.plazos_contrato enable row level security;
alter table public.monedas_cobro enable row level security;

do $$
declare
  table_name text;
  policy_name text;
begin
  foreach table_name in array array['tipos_propiedad', 'plazos_contrato', 'monedas_cobro']
  loop
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
