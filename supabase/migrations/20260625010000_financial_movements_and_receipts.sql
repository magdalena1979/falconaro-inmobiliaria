create table if not exists public.configuracion_inmobiliaria (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  cuit text,
  direccion text,
  telefono text,
  email text,
  logo_url text,
  es_principal boolean not null default true check (es_principal),
  porcentaje_comision_default numeric(5, 2) not null default 0
    check (porcentaje_comision_default >= 0 and porcentaje_comision_default <= 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists configuracion_inmobiliaria_principal_idx
  on public.configuracion_inmobiliaria (es_principal);

alter table public.contratos_alquiler
  add column if not exists porcentaje_comision_inmobiliaria numeric(5, 2)
    check (
      porcentaje_comision_inmobiliaria is null
      or porcentaje_comision_inmobiliaria between 0 and 100
    );

alter table public.pagos_alquiler
  add column if not exists tipo_movimiento text not null default 'ingreso'
    check (tipo_movimiento in ('ingreso', 'egreso')),
  add column if not exists porcentaje_comision numeric(5, 2),
  add column if not exists importe_comision numeric(14, 2),
  add column if not exists saldo_propietario numeric(14, 2),
  add column if not exists pagador_nombre text,
  add column if not exists medio_pago text,
  add column if not exists numero_recibo text,
  add column if not exists recibo_datos jsonb;

create unique index if not exists pagos_alquiler_numero_recibo_idx
  on public.pagos_alquiler (numero_recibo)
  where numero_recibo is not null;

alter table public.configuracion_inmobiliaria enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'configuracion_inmobiliaria'
      and policyname = 'configuracion_inmobiliaria_admin_crud'
  ) then
    create policy configuracion_inmobiliaria_admin_crud
      on public.configuracion_inmobiliaria
      for all
      to authenticated
      using (true)
      with check (true);
  end if;
end;
$$;
