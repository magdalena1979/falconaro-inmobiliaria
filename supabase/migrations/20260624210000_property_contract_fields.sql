alter table if exists public.propiedades
  add column if not exists regimen_propiedad_horizontal boolean not null default false,
  add column if not exists unidad_funcional text,
  add column if not exists piso_departamento text,
  add column if not exists superficie_cubierta numeric(12, 2),
  add column if not exists estado_conservacion text,
  add column if not exists colores_pintura text,
  add column if not exists incluye_muebles boolean not null default false,
  add column if not exists descripcion_muebles_accesorios text,
  add column if not exists tiene_expensas boolean not null default false,
  add column if not exists expensas_aproximadas numeric(14, 2),
  add column if not exists administracion_consorcio text,
  add column if not exists reglamento_copropiedad boolean not null default false,
  add column if not exists destino_habilitado text,
  add column if not exists rubro_comercial_permitido text,
  add column if not exists mascotas_permitidas boolean not null default false,
  add column if not exists restricciones_instalaciones text,
  add column if not exists linea_telefonica_incluida boolean not null default false,
  add column if not exists nro_suministro_luz text,
  add column if not exists nro_suministro_agua text,
  add column if not exists nro_suministro_gas text,
  add column if not exists servicio_luz_activo boolean not null default false,
  add column if not exists servicio_agua_activo boolean not null default false,
  add column if not exists servicio_gas_activo boolean not null default false,
  add column if not exists cantidad_llaves integer;

create index if not exists propiedades_destino_habilitado_idx
  on public.propiedades (destino_habilitado);

create index if not exists propiedades_tiene_expensas_idx
  on public.propiedades (tiene_expensas);
