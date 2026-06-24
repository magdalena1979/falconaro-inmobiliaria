alter table if exists public.contratos_alquiler
  add column if not exists plantilla_contrato text,
  add column if not exists destino_locacion text,
  add column if not exists canon_inicial numeric(14, 2),
  add column if not exists deposito_garantia numeric(14, 2),
  add column if not exists incluye_expensas boolean,
  add column if not exists datos_documento jsonb not null default '{}'::jsonb,
  add column if not exists contenido_contrato text,
  add column if not exists fecha_generacion timestamptz;

create index if not exists contratos_alquiler_plantilla_contrato_idx
  on public.contratos_alquiler (plantilla_contrato);

comment on column public.contratos_alquiler.plantilla_contrato is
  'Identificador de la plantilla versionada utilizada para generar el documento.';

comment on column public.contratos_alquiler.datos_documento is
  'Instantánea de los datos legales utilizados para generar el contrato.';

comment on column public.contratos_alquiler.contenido_contrato is
  'Texto resultante de la plantilla al momento de la generación.';
