do $$
declare
  job_id bigint;
begin
  select jobid into job_id
  from cron.job
  where jobname = 'sincronizar-icl-bcra-diario';

  if job_id is not null then
    perform cron.unschedule(job_id);
  end if;
end;
$$;

drop function if exists public.sincronizar_icl_bcra(date, date);
drop function if exists public.invocar_sincronizacion_icl();

create or replace function public.importar_indices_icl(
  p_indices jsonb,
  p_aplicar_ajustes boolean default true
)
returns table (
  registros_recibidos integer,
  registros_insertados integer,
  contratos_procesados integer,
  ajustes_generados integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  cantidad integer;
  insertados integer := 0;
  resultado_ajustes record;
  jwt_role text := coalesce(
    current_setting('request.jwt.claim.role', true),
    ''
  );
begin
  if jwt_role <> 'service_role' and not exists (
    select 1
    from public.user_profiles
    where id = auth.uid()
      and role in ('admin', 'superadmin')
  ) then
    raise exception 'No tenés permisos para sincronizar el ICL'
      using errcode = '42501';
  end if;

  if p_indices is null or jsonb_typeof(p_indices) <> 'array' then
    raise exception 'p_indices debe ser un array JSON';
  end if;

  cantidad := jsonb_array_length(p_indices);
  if cantidad > 1000 then
    raise exception 'Cada lote admite hasta 1000 índices';
  end if;

  insert into public.icl_indices (fecha, valor)
  select fecha, valor
  from jsonb_to_recordset(p_indices) as registro(
    fecha date,
    valor numeric(18, 6)
  )
  where fecha between date '2020-07-01' and current_date + 1
    and valor > 0
  on conflict (fecha) do nothing;

  get diagnostics insertados = row_count;

  if p_aplicar_ajustes then
    select * into resultado_ajustes
    from public.aplicar_ajustes_icl(current_date);
  end if;

  return query select
    cantidad,
    insertados,
    coalesce(resultado_ajustes.contratos_procesados, 0),
    coalesce(resultado_ajustes.ajustes_generados, 0);
end;
$$;

revoke all on function public.importar_indices_icl(jsonb, boolean)
  from public, anon;
grant execute on function public.importar_indices_icl(jsonb, boolean)
  to authenticated, service_role;
