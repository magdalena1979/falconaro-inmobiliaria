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
    end if;
  end loop;

  truncate table archive_unused_20260625.archive_manifest;
end;
$$;

alter table public.contratos_alquiler
  add column if not exists propietarios_ids uuid[] not null default '{}'::uuid[],
  add column if not exists inquilinos_ids uuid[] not null default '{}'::uuid[],
  add column if not exists garantes_ids uuid[] not null default '{}'::uuid[];

do $$
begin
  if to_regclass('public.contrato_propietarios') is not null then
    update public.contratos_alquiler as contrato
    set propietarios_ids = relations.ids
    from (
      select
        contrato_id,
        array_agg(propietario_id order by principal desc, created_at, id) as ids
      from public.contrato_propietarios
      group by contrato_id
    ) as relations
    where contrato.id = relations.contrato_id;
  end if;

  update public.contratos_alquiler
  set propietarios_ids = array[propietario_id]
  where cardinality(propietarios_ids) = 0
    and propietario_id is not null;

  if to_regclass('public.contrato_inquilinos') is not null then
    update public.contratos_alquiler as contrato
    set inquilinos_ids = relations.ids
    from (
      select
        contrato_id,
        array_agg(inquilino_id order by principal desc, created_at, id) as ids
      from public.contrato_inquilinos
      group by contrato_id
    ) as relations
    where contrato.id = relations.contrato_id;
  end if;

  update public.contratos_alquiler
  set inquilinos_ids = array[inquilino_id]
  where cardinality(inquilinos_ids) = 0
    and inquilino_id is not null;

  if to_regclass('public.contrato_garantes') is not null then
    if exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'garantes'
        and column_name = 'cliente_id'
    ) then
      execute $migration$
        update public.contratos_alquiler as contrato
        set garantes_ids = relations.ids
        from (
          select
            relation.contrato_id,
            array_agg(garante.id order by relation.principal desc, relation.created_at, relation.id) as ids
          from public.contrato_garantes as relation
          join public.garantes as garante
            on garante.cliente_id = relation.garante_cliente_id
          group by relation.contrato_id
        ) as relations
        where contrato.id = relations.contrato_id
      $migration$;
    else
      execute $migration$
        update public.contratos_alquiler as contrato
        set garantes_ids = relations.ids
        from (
          select
            relation.contrato_id,
            array_agg(garante.id order by relation.principal desc, relation.created_at, relation.id) as ids
          from public.contrato_garantes as relation
          join public.garantes as garante
            on garante.id = relation.garante_cliente_id
          group by relation.contrato_id
        ) as relations
        where contrato.id = relations.contrato_id
      $migration$;
    end if;
  end if;
end;
$$;

do $$
begin
  if to_regclass('public.contrato_propietarios') is not null
    and to_regclass('archive_unused_20260625.contrato_propietarios_backup') is null
  then
    create table archive_unused_20260625.contrato_propietarios_backup
    as table public.contrato_propietarios;
  end if;

  if to_regclass('public.contrato_inquilinos') is not null
    and to_regclass('archive_unused_20260625.contrato_inquilinos_backup') is null
  then
    create table archive_unused_20260625.contrato_inquilinos_backup
    as table public.contrato_inquilinos;
  end if;

  if to_regclass('public.contrato_garantes') is not null
    and to_regclass('archive_unused_20260625.contrato_garantes_backup') is null
  then
    create table archive_unused_20260625.contrato_garantes_backup
    as table public.contrato_garantes;
  end if;

  if to_regclass('public.cuotas_alquiler') is not null
    and to_regclass('archive_unused_20260625.cuotas_alquiler_backup') is null
  then
    create table archive_unused_20260625.cuotas_alquiler_backup
    as table public.cuotas_alquiler;
  end if;
end;
$$;

alter table public.pagos_alquiler
  drop column if exists cuota_id;

drop table if exists public.contrato_garantes;
drop table if exists public.contrato_inquilinos;
drop table if exists public.contrato_propietarios;
drop table if exists public.cuotas_alquiler;

create index if not exists contratos_alquiler_propietarios_ids_gin
  on public.contratos_alquiler using gin (propietarios_ids);
create index if not exists contratos_alquiler_inquilinos_ids_gin
  on public.contratos_alquiler using gin (inquilinos_ids);
create index if not exists contratos_alquiler_garantes_ids_gin
  on public.contratos_alquiler using gin (garantes_ids);
