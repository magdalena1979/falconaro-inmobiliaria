alter table if exists public.propiedades
  add column if not exists fotos text,
  add column if not exists documentacion text,
  add column if not exists historial text;

alter table if exists public.propietarios
  add column if not exists historial_cobros text;

alter table if exists public.inquilinos
  add column if not exists documentacion text,
  add column if not exists historial_contratos text;

alter table if exists public.contratos_alquiler
  add column if not exists renovacion_de_id uuid,
  add column if not exists fecha_renovacion date,
  add column if not exists ajuste_alquiler numeric(14, 2),
  add column if not exists tipo_ajuste text,
  add column if not exists porcentaje_ajuste numeric(8, 2),
  add column if not exists observaciones_multa text,
  add column if not exists archivo_contrato text;

alter table if exists public.pagos_alquiler
  add column if not exists fecha_vencimiento date,
  add column if not exists gastos_adicionales numeric(14, 2),
  add column if not exists liquidacion_propietario numeric(14, 2),
  add column if not exists observaciones text;

alter table if exists public.agenda_alertas
  add column if not exists automatico boolean default false,
  add column if not exists fecha_recordatorio timestamptz,
  add column if not exists documento_pendiente text;

alter table if exists public.empleados
  add column if not exists rol text default 'admin',
  add column if not exists activo boolean default true,
  add column if not exists user_id uuid;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'contratos_alquiler_renovacion_de_id_fkey') then
    alter table public.contratos_alquiler
      add constraint contratos_alquiler_renovacion_de_id_fkey
      foreign key (renovacion_de_id) references public.contratos_alquiler(id) not valid;
  end if;
end;
$$;
