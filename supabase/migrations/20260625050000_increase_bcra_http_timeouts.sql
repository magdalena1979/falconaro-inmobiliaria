create or replace function public.sincronizar_icl_bcra(
  p_desde date default date '2020-07-01',
  p_hasta date default current_date
)
returns table (
  registros_recibidos integer,
  registros_insertados integer,
  contratos_procesados integer,
  ajustes_generados integer
)
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  api_url text;
  respuesta extensions.http_response;
  contenido jsonb;
  detalle jsonb;
  total_registros integer := 0;
  limite integer := 1000;
  desplazamiento integer := 0;
  recibidos integer := 0;
  insertados integer := 0;
  insertados_pagina integer := 0;
  resultado_ajustes record;
begin
  if p_desde is null or p_hasta is null or p_desde > p_hasta then
    raise exception 'Rango de fechas inválido para sincronizar ICL';
  end if;

  perform extensions.http_set_curlopt('CURLOPT_CONNECTTIMEOUT_MS', '30000');
  perform extensions.http_set_curlopt('CURLOPT_TIMEOUT_MS', '120000');
  perform extensions.http_set_curlopt(
    'CURLOPT_USERAGENT',
    'Falconaro-Inmobiliaria-ICL/1.0'
  );

  loop
    api_url := format(
      'https://api.bcra.gob.ar/estadisticas/v4.0/Monetarias/40?desde=%s&hasta=%s&limit=%s&offset=%s',
      p_desde,
      p_hasta,
      limite,
      desplazamiento
    );

    select * into respuesta
    from extensions.http_get(api_url);

    if respuesta.status <> 200 then
      raise exception 'BCRA respondió HTTP % al sincronizar ICL: %',
        respuesta.status,
        left(coalesce(respuesta.content, ''), 500);
    end if;

    contenido := respuesta.content::jsonb;

    if coalesce((contenido ->> 'status')::integer, 0) <> 200 then
      raise exception 'Respuesta inválida del BCRA: %',
        coalesce(contenido -> 'errorMessages', contenido);
    end if;

    total_registros := coalesce(
      (contenido #>> '{metadata,resultset,count}')::integer,
      0
    );
    detalle := contenido #> '{results,0,detalle}';

    if detalle is null or jsonb_typeof(detalle) <> 'array' then
      raise exception 'La API del BCRA no devolvió results[0].detalle';
    end if;

    recibidos := recibidos + jsonb_array_length(detalle);

    insert into public.icl_indices (fecha, valor)
    select
      (registro ->> 'fecha')::date,
      (registro ->> 'valor')::numeric(18, 6)
    from jsonb_array_elements(detalle) as registro
    where registro ? 'fecha'
      and registro ? 'valor'
      and (registro ->> 'valor')::numeric > 0
    on conflict (fecha) do nothing;

    get diagnostics insertados_pagina = row_count;
    insertados := insertados + insertados_pagina;

    desplazamiento := desplazamiento + limite;
    exit when desplazamiento >= total_registros
      or jsonb_array_length(detalle) = 0;
  end loop;

  select * into resultado_ajustes
  from public.aplicar_ajustes_icl(p_hasta);

  return query select
    recibidos,
    insertados,
    coalesce(resultado_ajustes.contratos_procesados, 0),
    coalesce(resultado_ajustes.ajustes_generados, 0);
end;
$$;
