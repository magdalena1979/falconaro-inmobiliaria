create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;
create extension if not exists supabase_vault with schema vault;

create table if not exists public.icl_indices (
  fecha date primary key,
  valor numeric(18, 6) not null check (valor > 0),
  created_at timestamptz not null default now()
);

create table if not exists public.ajustes_contrato (
  id uuid primary key default gen_random_uuid(),
  contrato_id uuid not null references public.contratos_alquiler(id) on delete cascade,
  fecha_ajuste date not null,
  icl_origen numeric(18, 6) not null,
  icl_destino numeric(18, 6) not null,
  monto_anterior numeric(14, 2) not null,
  monto_nuevo numeric(14, 2) not null,
  created_at timestamptz not null default now(),
  unique (contrato_id, fecha_ajuste)
);

alter table public.contratos_alquiler
  add column if not exists monto_inicial numeric(14, 2),
  add column if not exists monto_actual numeric(14, 2),
  add column if not exists frecuencia_ajuste integer,
  add column if not exists tipo_indice varchar(20),
  add column if not exists proxima_fecha_ajuste date,
  add column if not exists icl_base numeric(18, 6);

update public.contratos_alquiler
set
  monto_inicial = coalesce(monto_inicial, canon_inicial),
  monto_actual = coalesce(monto_actual, monto_inicial, canon_inicial),
  frecuencia_ajuste = coalesce(
    frecuencia_ajuste,
    case
      when coalesce(datos_documento ->> 'ajusteCadaMeses', '') ~ '^[0-9]+$'
      then (datos_documento ->> 'ajusteCadaMeses')::integer
      else null
    end
  ),
  tipo_indice = coalesce(
    tipo_indice,
    case
      when upper(coalesce(datos_documento ->> 'indiceAjuste', '')) like '%ICL%'
      then 'ICL'
      else nullif(datos_documento ->> 'indiceAjuste', '')
    end
  )
where
  monto_inicial is null
  or monto_actual is null
  or frecuencia_ajuste is null
  or tipo_indice is null;

update public.contratos_alquiler
set proxima_fecha_ajuste = (
  fecha_inicio + make_interval(months => frecuencia_ajuste)
)::date
where upper(coalesce(tipo_indice, '')) = 'ICL'
  and fecha_inicio is not null
  and frecuencia_ajuste > 0
  and proxima_fecha_ajuste is null;

create index if not exists ajustes_contrato_contrato_fecha_idx
  on public.ajustes_contrato (contrato_id, fecha_ajuste desc);

create index if not exists contratos_alquiler_icl_pendientes_idx
  on public.contratos_alquiler (proxima_fecha_ajuste)
  where upper(coalesce(tipo_indice, '')) = 'ICL';

alter table public.icl_indices enable row level security;
alter table public.ajustes_contrato enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'icl_indices'
      and policyname = 'icl_indices_authenticated_read'
  ) then
    create policy icl_indices_authenticated_read
      on public.icl_indices for select to authenticated using (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'ajustes_contrato'
      and policyname = 'ajustes_contrato_authenticated_read'
  ) then
    create policy ajustes_contrato_authenticated_read
      on public.ajustes_contrato for select to authenticated using (true);
  end if;
end;
$$;

create or replace function public.aplicar_ajustes_icl(
  p_fecha_corte date default current_date
)
returns table (
  contratos_procesados integer,
  ajustes_generados integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  contrato record;
  fecha_objetivo date;
  fecha_limite date;
  fecha_siguiente date;
  paso integer;
  indice_origen numeric(18, 6);
  indice_destino numeric(18, 6);
  monto_previo numeric(14, 2);
  monto_calculado numeric(14, 2);
  total_contratos integer := 0;
  total_ajustes integer := 0;
begin
  for contrato in
    select
      id,
      fecha_inicio,
      fecha_fin,
      monto_inicial,
      monto_actual,
      frecuencia_ajuste,
      icl_base
    from public.contratos_alquiler
    where upper(coalesce(tipo_indice, '')) = 'ICL'
      and fecha_inicio is not null
      and monto_inicial is not null
      and monto_inicial > 0
      and frecuencia_ajuste is not null
      and frecuencia_ajuste > 0
  loop
    total_contratos := total_contratos + 1;
    fecha_limite := least(p_fecha_corte, coalesce(contrato.fecha_fin, p_fecha_corte));

    select valor into indice_origen
    from public.icl_indices
    where fecha <= contrato.fecha_inicio
    order by fecha desc
    limit 1;

    if indice_origen is null then
      continue;
    end if;

    monto_previo := coalesce(contrato.monto_actual, contrato.monto_inicial);
    paso := 1;

    loop
      fecha_objetivo := (
        contrato.fecha_inicio
        + make_interval(months => contrato.frecuencia_ajuste * paso)
      )::date;

      exit when fecha_objetivo > fecha_limite;

      select valor into indice_destino
      from public.icl_indices
      where fecha <= fecha_objetivo
      order by fecha desc
      limit 1;

      if indice_destino is null then
        exit;
      end if;

      monto_calculado := round(
        contrato.monto_inicial * (indice_destino / indice_origen),
        2
      );

      insert into public.ajustes_contrato (
        contrato_id,
        fecha_ajuste,
        icl_origen,
        icl_destino,
        monto_anterior,
        monto_nuevo
      )
      values (
        contrato.id,
        fecha_objetivo,
        indice_origen,
        indice_destino,
        monto_previo,
        monto_calculado
      )
      on conflict (contrato_id, fecha_ajuste) do nothing;

      if found then
        total_ajustes := total_ajustes + 1;
      end if;

      monto_previo := monto_calculado;
      paso := paso + 1;
    end loop;

    fecha_siguiente := (
      contrato.fecha_inicio
      + make_interval(months => contrato.frecuencia_ajuste * paso)
    )::date;

    select monto_nuevo into monto_previo
    from public.ajustes_contrato
    where contrato_id = contrato.id
    order by fecha_ajuste desc
    limit 1;

    update public.contratos_alquiler
    set
      icl_base = indice_origen,
      monto_actual = coalesce(monto_previo, monto_inicial),
      proxima_fecha_ajuste = case
        when fecha_fin is not null and fecha_siguiente > fecha_fin then null
        else fecha_siguiente
      end,
      fecha_actualizacion_valor = (
        select max(fecha_ajuste)
        from public.ajustes_contrato
        where contrato_id = contrato.id
      ),
      ajuste_alquiler = coalesce(monto_previo, monto_inicial)
    where id = contrato.id;
  end loop;

  return query select total_contratos, total_ajustes;
end;
$$;

revoke all on function public.aplicar_ajustes_icl(date) from public, anon, authenticated;
grant execute on function public.aplicar_ajustes_icl(date) to service_role;

create or replace function public.invocar_sincronizacion_icl()
returns bigint
language plpgsql
security definer
set search_path = public, vault, extensions
as $$
declare
  function_url text;
  sync_secret text;
  request_id bigint;
begin
  select decrypted_secret into function_url
  from vault.decrypted_secrets
  where name = 'icl_sync_function_url'
  limit 1;

  select decrypted_secret into sync_secret
  from vault.decrypted_secrets
  where name = 'icl_sync_secret'
  limit 1;

  if function_url is null or sync_secret is null then
    raise warning 'Faltan los secretos icl_sync_function_url o icl_sync_secret en Vault';
    return null;
  end if;

  select net.http_post(
    url := function_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-sync-secret', sync_secret
    ),
    body := '{}'::jsonb
  ) into request_id;

  return request_id;
end;
$$;

do $$
declare
  existing_job_id bigint;
begin
  select jobid into existing_job_id
  from cron.job
  where jobname = 'sincronizar-icl-bcra-diario';

  if existing_job_id is not null then
    perform cron.unschedule(existing_job_id);
  end if;

  perform cron.schedule(
    'sincronizar-icl-bcra-diario',
    '15 6 * * *',
    'select public.invocar_sincronizacion_icl();'
  );
end;
$$;
