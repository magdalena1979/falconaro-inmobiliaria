create extension if not exists pgcrypto;

create table if not exists public.propiedad_propietarios (
  id uuid primary key default gen_random_uuid(),
  propiedad_id uuid not null references public.propiedades(id) on delete cascade,
  propietario_id uuid not null references public.propietarios(id) on delete restrict,
  porcentaje numeric(7,4),
  principal boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint propiedad_propietarios_unique unique (propiedad_id, propietario_id)
);

create table if not exists public.contrato_propietarios (
  id uuid primary key default gen_random_uuid(),
  contrato_id uuid not null references public.contratos_alquiler(id) on delete cascade,
  propietario_id uuid not null references public.propietarios(id) on delete restrict,
  porcentaje numeric(7,4),
  principal boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint contrato_propietarios_unique unique (contrato_id, propietario_id)
);

create table if not exists public.contrato_inquilinos (
  id uuid primary key default gen_random_uuid(),
  contrato_id uuid not null references public.contratos_alquiler(id) on delete cascade,
  inquilino_id uuid not null references public.inquilinos(id) on delete restrict,
  principal boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint contrato_inquilinos_unique unique (contrato_id, inquilino_id)
);

create table if not exists public.contrato_garantes (
  id uuid primary key default gen_random_uuid(),
  contrato_id uuid not null references public.contratos_alquiler(id) on delete cascade,
  garante_id uuid not null references public.garantes(id) on delete restrict,
  principal boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint contrato_garantes_unique unique (contrato_id, garante_id)
);

alter table if exists public.contrato_garantes
  add column if not exists garante_id uuid;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'contrato_garantes'
      and column_name = 'garante_cliente_id'
  ) then
    alter table public.contrato_garantes
      alter column garante_cliente_id drop not null;

    if exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'garantes'
        and column_name = 'cliente_id'
    ) then
      update public.contrato_garantes as relation
      set garante_id = garante.id
      from public.garantes as garante
      where relation.garante_id is null
        and garante.cliente_id = relation.garante_cliente_id;
    else
      update public.contrato_garantes as relation
      set garante_id = garante.id
      from public.garantes as garante
      where relation.garante_id is null
        and garante.id = relation.garante_cliente_id;
    end if;
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'contrato_garantes_garante_id_fkey'
  ) then
    alter table public.contrato_garantes
      add constraint contrato_garantes_garante_id_fkey
      foreign key (garante_id) references public.garantes(id) on delete restrict not valid;
  end if;
end;
$$;

create unique index if not exists contrato_garantes_contrato_garante_id_uidx
  on public.contrato_garantes (contrato_id, garante_id);

create table if not exists public.cuotas_alquiler (
  id uuid primary key default gen_random_uuid(),
  contrato_id uuid not null references public.contratos_alquiler(id) on delete cascade,
  numero_cuota integer not null,
  periodo_inicio date not null,
  periodo_fin date not null,
  fecha_vencimiento date not null,
  importe numeric(14,2) not null default 0,
  saldo numeric(14,2) not null default 0,
  estado text not null default 'pendiente'
    check (estado in ('pendiente', 'parcial', 'pagada', 'vencida', 'anulada')),
  observaciones text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint cuotas_alquiler_contrato_numero_unique unique (contrato_id, numero_cuota)
);

alter table public.pagos_alquiler
  add column if not exists cuota_id uuid;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'pagos_alquiler_cuota_id_fkey'
  ) then
    alter table public.pagos_alquiler
      add constraint pagos_alquiler_cuota_id_fkey
      foreign key (cuota_id) references public.cuotas_alquiler(id) on delete set null not valid;
  end if;
end;
$$;

create table if not exists public.movimientos_caja (
  id uuid primary key default gen_random_uuid(),
  fecha timestamptz not null default now(),
  tipo text not null check (tipo in ('ingreso', 'egreso')),
  concepto text not null,
  importe numeric(14,2) not null check (importe >= 0),
  origen text not null default 'manual',
  contrato_id uuid references public.contratos_alquiler(id) on delete set null,
  cuota_id uuid references public.cuotas_alquiler(id) on delete set null,
  pago_id uuid references public.pagos_alquiler(id) on delete set null,
  propietario_id uuid references public.propietarios(id) on delete set null,
  cliente_id uuid references public.clientes(id) on delete set null,
  porcentaje_comision numeric(5,2),
  importe_comision numeric(14,2) not null default 0,
  saldo_propietario numeric(14,2),
  pagador_nombre text not null default '',
  medio_pago text not null default '',
  numero_recibo text not null default '',
  recibo_datos jsonb not null default '{}'::jsonb,
  observaciones text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.movimientos_caja
  add column if not exists cuota_id uuid,
  add column if not exists porcentaje_comision numeric(5,2),
  add column if not exists importe_comision numeric(14,2) not null default 0,
  add column if not exists saldo_propietario numeric(14,2),
  add column if not exists pagador_nombre text not null default '',
  add column if not exists medio_pago text not null default '',
  add column if not exists numero_recibo text not null default '',
  add column if not exists recibo_datos jsonb not null default '{}'::jsonb;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'movimientos_caja_cuota_id_fkey'
  ) then
    alter table public.movimientos_caja
      add constraint movimientos_caja_cuota_id_fkey
      foreign key (cuota_id) references public.cuotas_alquiler(id) on delete set null not valid;
  end if;
end;
$$;

create table if not exists public.liquidaciones_propietario (
  id uuid primary key default gen_random_uuid(),
  propietario_id uuid not null references public.propietarios(id) on delete restrict,
  contrato_id uuid references public.contratos_alquiler(id) on delete set null,
  fecha date not null default current_date,
  periodo_desde date,
  periodo_hasta date,
  subtotal_alquiler numeric(14,2) not null default 0,
  total_comision numeric(14,2) not null default 0,
  total_gastos numeric(14,2) not null default 0,
  total_a_transferir numeric(14,2) not null default 0,
  estado text not null default 'borrador'
    check (estado in ('borrador', 'emitida', 'pagada', 'anulada')),
  observaciones text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.liquidaciones_detalle (
  id uuid primary key default gen_random_uuid(),
  liquidacion_id uuid not null references public.liquidaciones_propietario(id) on delete cascade,
  tipo text not null check (tipo in ('alquiler', 'comision', 'gasto', 'ajuste', 'otro')),
  concepto text not null,
  importe numeric(14,2) not null,
  pago_id uuid references public.pagos_alquiler(id) on delete set null,
  cuota_id uuid references public.cuotas_alquiler(id) on delete set null,
  movimiento_caja_id uuid references public.movimientos_caja(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.configuracion_financiera (
  id uuid primary key default gen_random_uuid(),
  es_principal boolean not null default true check (es_principal),
  dia_vencimiento integer not null default 10 check (dia_vencimiento between 1 and 28),
  tipo_interes text not null default 'mensual'
    check (tipo_interes in ('mensual', 'diario', 'fijo', 'sin_interes')),
  porcentaje_mensual numeric(8,4) not null default 0 check (porcentaje_mensual >= 0),
  dias_gracia integer not null default 0 check (dias_gracia >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists configuracion_financiera_principal_idx
  on public.configuracion_financiera (es_principal);

insert into public.configuracion_financiera (es_principal)
values (true)
on conflict (es_principal) do nothing;

create index if not exists propiedad_propietarios_propiedad_id_idx
  on public.propiedad_propietarios (propiedad_id);
create index if not exists propiedad_propietarios_propietario_id_idx
  on public.propiedad_propietarios (propietario_id);
create index if not exists contrato_propietarios_contrato_id_idx
  on public.contrato_propietarios (contrato_id);
create index if not exists contrato_inquilinos_contrato_id_idx
  on public.contrato_inquilinos (contrato_id);
create index if not exists contrato_garantes_contrato_id_idx
  on public.contrato_garantes (contrato_id);
create index if not exists cuotas_alquiler_contrato_id_idx
  on public.cuotas_alquiler (contrato_id);
create index if not exists cuotas_alquiler_estado_vencimiento_idx
  on public.cuotas_alquiler (estado, fecha_vencimiento);
create index if not exists movimientos_caja_fecha_idx
  on public.movimientos_caja (fecha desc);
create index if not exists movimientos_caja_tipo_idx
  on public.movimientos_caja (tipo);
create index if not exists liquidaciones_propietario_propietario_fecha_idx
  on public.liquidaciones_propietario (propietario_id, fecha desc);

insert into public.propiedad_propietarios (
  propiedad_id,
  propietario_id,
  principal
)
select
  propiedad.id,
  propiedad.propietario_id,
  true
from public.propiedades as propiedad
where propiedad.propietario_id is not null
on conflict (propiedad_id, propietario_id) do update
set principal = excluded.principal;

insert into public.propiedad_propietarios (
  propiedad_id,
  propietario_id,
  principal
)
select
  propiedad.id,
  titular.titular_id,
  titular.titular_id = propiedad.propietario_id
from public.propiedades as propiedad
cross join lateral unnest(coalesce(propiedad.titulares_ids, '{}'::uuid[])) as titular(titular_id)
where titular.titular_id is not null
on conflict (propiedad_id, propietario_id) do update
set principal = public.propiedad_propietarios.principal or excluded.principal;

insert into public.contrato_propietarios (
  contrato_id,
  propietario_id,
  principal
)
select
  contrato.id,
  contrato.propietario_id,
  true
from public.contratos_alquiler as contrato
where contrato.propietario_id is not null
on conflict (contrato_id, propietario_id) do update
set principal = excluded.principal;

insert into public.contrato_propietarios (
  contrato_id,
  propietario_id,
  principal
)
select
  contrato.id,
  propietario.propietario_id,
  propietario.propietario_id = contrato.propietario_id
from public.contratos_alquiler as contrato
cross join lateral unnest(coalesce(contrato.propietarios_ids, '{}'::uuid[])) as propietario(propietario_id)
where propietario.propietario_id is not null
on conflict (contrato_id, propietario_id) do update
set principal = public.contrato_propietarios.principal or excluded.principal;

insert into public.contrato_inquilinos (
  contrato_id,
  inquilino_id,
  principal
)
select
  contrato.id,
  contrato.inquilino_id,
  true
from public.contratos_alquiler as contrato
where contrato.inquilino_id is not null
on conflict (contrato_id, inquilino_id) do update
set principal = excluded.principal;

insert into public.contrato_inquilinos (
  contrato_id,
  inquilino_id,
  principal
)
select
  contrato.id,
  inquilino.inquilino_id,
  inquilino.inquilino_id = contrato.inquilino_id
from public.contratos_alquiler as contrato
cross join lateral unnest(coalesce(contrato.inquilinos_ids, '{}'::uuid[])) as inquilino(inquilino_id)
where inquilino.inquilino_id is not null
on conflict (contrato_id, inquilino_id) do update
set principal = public.contrato_inquilinos.principal or excluded.principal;

insert into public.contrato_garantes (
  contrato_id,
  garante_id,
  principal
)
select
  contrato.id,
  garante.garante_id,
  false
from public.contratos_alquiler as contrato
cross join lateral unnest(coalesce(contrato.garantes_ids, '{}'::uuid[])) as garante(garante_id)
where garante.garante_id is not null
on conflict (contrato_id, garante_id) do nothing;

insert into public.cuotas_alquiler (
  contrato_id,
  numero_cuota,
  periodo_inicio,
  periodo_fin,
  fecha_vencimiento,
  importe,
  saldo,
  estado
)
select
  contrato.id,
  cuota.numero,
  (contrato.fecha_inicio + ((cuota.numero - 1) || ' months')::interval)::date,
  (contrato.fecha_inicio + (cuota.numero || ' months')::interval - interval '1 day')::date,
  make_date(
    extract(year from (contrato.fecha_inicio + ((cuota.numero - 1) || ' months')::interval))::integer,
    extract(month from (contrato.fecha_inicio + ((cuota.numero - 1) || ' months')::interval))::integer,
    least(10, 28)
  ),
  coalesce(contrato.monto_actual, contrato.monto_inicial, contrato.canon_inicial, 0),
  coalesce(contrato.monto_actual, contrato.monto_inicial, contrato.canon_inicial, 0),
  case
    when make_date(
      extract(year from (contrato.fecha_inicio + ((cuota.numero - 1) || ' months')::interval))::integer,
      extract(month from (contrato.fecha_inicio + ((cuota.numero - 1) || ' months')::interval))::integer,
      least(10, 28)
    ) < current_date then 'vencida'
    else 'pendiente'
  end
from public.contratos_alquiler as contrato
cross join lateral generate_series(
  1,
  greatest(1, coalesce(contrato.plazo_meses, nullif(ceil(contrato.plazo_dias::numeric / 30), 0)::integer, 1))
) as cuota(numero)
where contrato.fecha_inicio is not null
  and not exists (
    select 1
    from public.cuotas_alquiler existente
    where existente.contrato_id = contrato.id
  )
on conflict (contrato_id, numero_cuota) do nothing;

alter table public.propiedad_propietarios enable row level security;
alter table public.contrato_propietarios enable row level security;
alter table public.contrato_inquilinos enable row level security;
alter table public.contrato_garantes enable row level security;
alter table public.cuotas_alquiler enable row level security;
alter table public.movimientos_caja enable row level security;
alter table public.liquidaciones_propietario enable row level security;
alter table public.liquidaciones_detalle enable row level security;
alter table public.configuracion_financiera enable row level security;

do $$
declare
  target_table text;
  policy_name text;
begin
  foreach target_table in array array[
    'propiedad_propietarios',
    'contrato_propietarios',
    'contrato_inquilinos',
    'contrato_garantes',
    'cuotas_alquiler',
    'movimientos_caja',
    'liquidaciones_propietario',
    'liquidaciones_detalle',
    'configuracion_financiera'
  ]
  loop
    policy_name := target_table || '_admin_crud';
    execute format('drop policy if exists %I on public.%I', policy_name, target_table);
    execute format(
      'create policy %I on public.%I for all to authenticated using (public.is_admin_or_superadmin()) with check (public.is_admin_or_superadmin())',
      policy_name,
      target_table
    );
  end loop;
end;
$$;
