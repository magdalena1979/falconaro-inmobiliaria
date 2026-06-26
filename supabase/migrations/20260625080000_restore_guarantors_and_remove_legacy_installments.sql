create schema if not exists archive_unused_20260625;

do $$
declare
  archived_table record;
begin
  for archived_table in
    select table_name
    from archive_unused_20260625.archive_manifest
    order by table_name
  loop
    if to_regclass(format('public.%I', archived_table.table_name)) is null
      and to_regclass(format(
        'archive_unused_20260625.%I',
        archived_table.table_name
      )) is not null
    then
      execute format(
        'alter table archive_unused_20260625.%I set schema public',
        archived_table.table_name
      );

      delete from archive_unused_20260625.archive_manifest
      where table_name = archived_table.table_name;

      raise notice 'Tabla restaurada: archive_unused_20260625.% -> public.%',
        archived_table.table_name,
        archived_table.table_name;
    else
      raise warning 'No se pudo restaurar automáticamente la tabla %',
        archived_table.table_name;
    end if;
  end loop;
end;
$$;

create table if not exists archive_unused_20260625.contratos_cuotas_meses_legacy (
  contrato_id uuid primary key,
  cuotas jsonb not null,
  meses jsonb not null,
  archived_at timestamptz not null default now()
);

do $$
declare
  index_number integer;
  cuotas_expression text := 'jsonb_build_object(';
  meses_expression text := 'jsonb_build_object(';
  has_value_expression text := '';
  insert_sql text;
begin
  for index_number in 1..36 loop
    if index_number > 1 then
      cuotas_expression := cuotas_expression || ', ';
      meses_expression := meses_expression || ', ';
      has_value_expression := has_value_expression || ' or ';
    end if;

    cuotas_expression := cuotas_expression
      || quote_literal(index_number::text)
      || format(', cuota_%s', index_number);
    meses_expression := meses_expression
      || quote_literal(index_number::text)
      || format(', mes_%s', index_number);
    has_value_expression := has_value_expression
      || format('cuota_%s is not null or mes_%s is not null', index_number, index_number);
  end loop;

  cuotas_expression := cuotas_expression || ')';
  meses_expression := meses_expression || ')';

  insert_sql := format(
    'insert into archive_unused_20260625.contratos_cuotas_meses_legacy
       (contrato_id, cuotas, meses)
     select id, %s, %s
     from public.contratos_alquiler
     where %s
     on conflict (contrato_id) do update
     set
       cuotas = excluded.cuotas,
       meses = excluded.meses,
       archived_at = now()',
    cuotas_expression,
    meses_expression,
    has_value_expression
  );

  execute insert_sql;
end;
$$;

do $$
declare
  index_number integer;
begin
  for index_number in 1..36 loop
    execute format(
      'alter table public.contratos_alquiler drop column if exists cuota_%s',
      index_number
    );
    execute format(
      'alter table public.contratos_alquiler drop column if exists mes_%s',
      index_number
    );
  end loop;
end;
$$;

comment on table archive_unused_20260625.contratos_cuotas_meses_legacy is
  'Respaldo de cuota_1..cuota_36 y mes_1..mes_36 antes de normalizar contratos_alquiler.';
