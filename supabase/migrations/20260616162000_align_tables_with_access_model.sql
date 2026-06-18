create extension if not exists pgcrypto;

create table if not exists public.clientes (
  id uuid primary key default gen_random_uuid()
);

create table if not exists public.propietarios (
  id uuid primary key default gen_random_uuid()
);

create table if not exists public.inquilinos (
  id uuid primary key default gen_random_uuid()
);

create table if not exists public.propiedades (
  id uuid primary key default gen_random_uuid()
);

create table if not exists public.contratos_alquiler (
  id uuid primary key default gen_random_uuid()
);

create table if not exists public.pagos_alquiler (
  id uuid primary key default gen_random_uuid()
);

alter table public.clientes
  add column if not exists dni integer,
  add column if not exists nombres text,
  add column if not exists apellidos text,
  add column if not exists telefono text,
  add column if not exists celular_locatario text,
  add column if not exists fax text,
  add column if not exists email text,
  add column if not exists direccion text,
  add column if not exists ciudad text,
  add column if not exists cp text,
  add column if not exists pais text,
  add column if not exists compro_alquilo boolean default false,
  add column if not exists vivienda text,
  add column if not exists ambientes text,
  add column if not exists banos text,
  add column if not exists garage text,
  add column if not exists patio text,
  add column if not exists apta_credito_hipotecario text,
  add column if not exists valor_compra text,
  add column if not exists valor_alquiler text,
  add column if not exists empresa text,
  add column if not exists cuit_empresa text,
  add column if not exists caracter text,
  add column if not exists conyuge text,
  add column if not exists dni_conyuge text,
  add column if not exists comentarios text,
  add column if not exists nombre_garante text,
  add column if not exists dni_garante text,
  add column if not exists domicilio_garante text,
  add column if not exists vivienda_garantia text,
  add column if not exists matr_vivienda_garantia text,
  add column if not exists fecha_alta timestamptz,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

alter table public.propietarios
  add column if not exists dni integer,
  add column if not exists nombres text,
  add column if not exists apellidos text,
  add column if not exists telefono text,
  add column if not exists celular text,
  add column if not exists fax text,
  add column if not exists email text,
  add column if not exists direccion text,
  add column if not exists ciudad text,
  add column if not exists cp text,
  add column if not exists pais text,
  add column if not exists empresa text,
  add column if not exists cuit_empresa text,
  add column if not exists caracter text,
  add column if not exists conyuge text,
  add column if not exists dni_conyuge text,
  add column if not exists observaciones text,
  add column if not exists cliente_id uuid,
  add column if not exists cbu text,
  add column if not exists alias_cbu text,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

alter table public.inquilinos
  add column if not exists cliente_id uuid,
  add column if not exists dni integer,
  add column if not exists nombres text,
  add column if not exists apellidos text,
  add column if not exists telefono text,
  add column if not exists celular_locatario text,
  add column if not exists fax text,
  add column if not exists email text,
  add column if not exists direccion text,
  add column if not exists ciudad text,
  add column if not exists cp text,
  add column if not exists pais text,
  add column if not exists comentarios text,
  add column if not exists nombre_garante text,
  add column if not exists dni_garante text,
  add column if not exists domicilio_garante text,
  add column if not exists vivienda_garantia text,
  add column if not exists matr_vivienda_garantia text,
  add column if not exists fecha_alta timestamptz,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

alter table public.propiedades
  add column if not exists numero_registro_propiedad integer,
  add column if not exists tipo_propiedad text,
  add column if not exists tipo_propiedad_id uuid,
  add column if not exists direccion text,
  add column if not exists ciudad text,
  add column if not exists cp text,
  add column if not exists pais text,
  add column if not exists monto_contrato numeric(14,2),
  add column if not exists comision integer,
  add column if not exists superficie_parcela integer,
  add column if not exists superficie_construida integer,
  add column if not exists numeros_dormitorios integer,
  add column if not exists numeros_banos integer,
  add column if not exists jardin boolean default false,
  add column if not exists piscina boolean default false,
  add column if not exists garage boolean default false,
  add column if not exists nueva_segunda_mano text,
  add column if not exists observaciones text,
  add column if not exists adjuntos text,
  add column if not exists alquilada boolean default false,
  add column if not exists cartel boolean default false,
  add column if not exists estado text,
  add column if not exists propietario_id uuid,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

alter table public.contratos_alquiler
  add column if not exists id_locacion integer,
  add column if not exists numero_registro_propiedad integer,
  add column if not exists propiedad_id uuid,
  add column if not exists propietario_id uuid,
  add column if not exists inquilino_id uuid,
  add column if not exists plazo_dias integer,
  add column if not exists fecha_locacion timestamptz,
  add column if not exists fecha_fin_contrato timestamptz,
  add column if not exists fecha_inicio date,
  add column if not exists fecha_fin date,
  add column if not exists dni_locatario integer,
  add column if not exists dni_locador integer,
  add column if not exists dni_empleado integer,
  add column if not exists observaciones text,
  add column if not exists cuota_1 numeric(14,2),
  add column if not exists cuota_2 numeric(14,2),
  add column if not exists cuota_3 numeric(14,2),
  add column if not exists cuota_4 numeric(14,2),
  add column if not exists cuota_5 numeric(14,2),
  add column if not exists cuota_6 numeric(14,2),
  add column if not exists cuota_7 numeric(14,2),
  add column if not exists cuota_8 numeric(14,2),
  add column if not exists cuota_9 numeric(14,2),
  add column if not exists cuota_10 numeric(14,2),
  add column if not exists cuota_11 numeric(14,2),
  add column if not exists cuota_12 numeric(14,2),
  add column if not exists cuota_13 numeric(14,2),
  add column if not exists cuota_14 numeric(14,2),
  add column if not exists cuota_15 numeric(14,2),
  add column if not exists cuota_16 numeric(14,2),
  add column if not exists cuota_17 numeric(14,2),
  add column if not exists cuota_18 numeric(14,2),
  add column if not exists cuota_19 numeric(14,2),
  add column if not exists cuota_20 numeric(14,2),
  add column if not exists cuota_21 numeric(14,2),
  add column if not exists cuota_22 numeric(14,2),
  add column if not exists cuota_23 numeric(14,2),
  add column if not exists cuota_24 numeric(14,2),
  add column if not exists cuota_25 numeric(14,2),
  add column if not exists cuota_26 numeric(14,2),
  add column if not exists cuota_27 numeric(14,2),
  add column if not exists cuota_28 numeric(14,2),
  add column if not exists cuota_29 numeric(14,2),
  add column if not exists cuota_30 numeric(14,2),
  add column if not exists cuota_31 numeric(14,2),
  add column if not exists cuota_32 numeric(14,2),
  add column if not exists cuota_33 numeric(14,2),
  add column if not exists cuota_34 numeric(14,2),
  add column if not exists cuota_35 numeric(14,2),
  add column if not exists cuota_36 numeric(14,2),
  add column if not exists mes_1 timestamptz,
  add column if not exists mes_2 timestamptz,
  add column if not exists mes_3 timestamptz,
  add column if not exists mes_4 timestamptz,
  add column if not exists mes_5 timestamptz,
  add column if not exists mes_6 timestamptz,
  add column if not exists mes_7 timestamptz,
  add column if not exists mes_8 timestamptz,
  add column if not exists mes_9 timestamptz,
  add column if not exists mes_10 timestamptz,
  add column if not exists mes_11 timestamptz,
  add column if not exists mes_12 timestamptz,
  add column if not exists mes_13 timestamptz,
  add column if not exists mes_14 timestamptz,
  add column if not exists mes_15 timestamptz,
  add column if not exists mes_16 timestamptz,
  add column if not exists mes_17 timestamptz,
  add column if not exists mes_18 timestamptz,
  add column if not exists mes_19 timestamptz,
  add column if not exists mes_20 timestamptz,
  add column if not exists mes_21 timestamptz,
  add column if not exists mes_22 timestamptz,
  add column if not exists mes_23 timestamptz,
  add column if not exists mes_24 timestamptz,
  add column if not exists mes_25 timestamptz,
  add column if not exists mes_26 timestamptz,
  add column if not exists mes_27 timestamptz,
  add column if not exists mes_28 timestamptz,
  add column if not exists mes_29 timestamptz,
  add column if not exists mes_30 timestamptz,
  add column if not exists mes_31 timestamptz,
  add column if not exists mes_32 timestamptz,
  add column if not exists mes_33 timestamptz,
  add column if not exists mes_34 timestamptz,
  add column if not exists mes_35 timestamptz,
  add column if not exists mes_36 timestamptz,
  add column if not exists gastos_paga_locador text,
  add column if not exists gastos_paga_inmo text,
  add column if not exists nota_para_locador text,
  add column if not exists nota_para_locatario text,
  add column if not exists documentacion_para_entregar boolean default false,
  add column if not exists nro_sum_luz integer,
  add column if not exists nro_sum_agua integer,
  add column if not exists nro_sum_gas text,
  add column if not exists luz_paga text,
  add column if not exists agua_paga text,
  add column if not exists gas_paga text,
  add column if not exists multa double precision,
  add column if not exists estado text,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

alter table public.pagos_alquiler
  add column if not exists legacy_id integer,
  add column if not exists fecha_pago timestamptz,
  add column if not exists id_locacion integer,
  add column if not exists contrato_id uuid,
  add column if not exists cuota_id uuid,
  add column if not exists mes text,
  add column if not exists anio integer,
  add column if not exists concepto text,
  add column if not exists cuota_mensual numeric(14,2),
  add column if not exists comision integer,
  add column if not exists detalle_otros_importes text,
  add column if not exists otros_importes numeric(14,2),
  add column if not exists detalle_otros_importes_1 text,
  add column if not exists otros_importes_1 numeric(14,2),
  add column if not exists recibo text,
  add column if not exists recibo_locatario text,
  add column if not exists detalle_otros_importes_2 text,
  add column if not exists otros_importes_2 numeric(14,2),
  add column if not exists detalle_otros_importes_3 text,
  add column if not exists otros_importes_3 numeric(14,2),
  add column if not exists cuota_paga integer,
  add column if not exists total_cuotas integer,
  add column if not exists entrega numeric(14,2),
  add column if not exists total_recibo_locatario numeric(14,2),
  add column if not exists resto_alquiler numeric(14,2),
  add column if not exists alquiler_locador numeric(14,2),
  add column if not exists importe numeric(14,2),
  add column if not exists estado text,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

alter table public.plazos_contrato
  add column if not exists dias integer,
  add column if not exists caracter text,
  add column if not exists equivale text;

alter table public.plazos_contrato
  alter column nombre drop not null,
  alter column meses drop not null;

alter table public.tipos_propiedad
  add column if not exists tipo_propiedad text;

alter table public.tipos_propiedad
  alter column nombre drop not null;

alter table public.monedas_cobro
  add column if not exists dolar numeric(14,4),
  add column if not exists euro numeric(14,4);

alter table public.monedas_cobro
  alter column codigo drop not null,
  alter column nombre drop not null;

create index if not exists clientes_dni_idx on public.clientes (dni);
create index if not exists propietarios_dni_idx on public.propietarios (dni);
create index if not exists inquilinos_dni_idx on public.inquilinos (dni);
create index if not exists propiedades_numero_registro_idx on public.propiedades (numero_registro_propiedad);
create index if not exists contratos_alquiler_id_locacion_idx on public.contratos_alquiler (id_locacion);
create index if not exists pagos_alquiler_id_locacion_idx on public.pagos_alquiler (id_locacion);

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
    'plazos_contrato',
    'tipos_propiedad',
    'monedas_cobro'
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
