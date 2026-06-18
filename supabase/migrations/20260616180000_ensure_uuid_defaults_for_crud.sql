create extension if not exists pgcrypto;

do $$
declare
  target_table text;
begin
  foreach target_table in array array[
    'clientes',
    'propietarios',
    'inquilinos',
    'propiedades',
    'contratos_alquiler',
    'pagos_alquiler',
    'cobros_propietario',
    'contrato_propietarios',
    'contrato_inquilinos',
    'plazos_contrato',
    'tipos_propiedad',
    'monedas_cobro',
    'tipos_actualizacion_valor'
  ]
  loop
    if exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = target_table
        and column_name = 'id'
        and data_type = 'uuid'
    ) then
      execute format('alter table public.%I alter column id set default gen_random_uuid()', target_table);
    end if;
  end loop;
end;
$$;
