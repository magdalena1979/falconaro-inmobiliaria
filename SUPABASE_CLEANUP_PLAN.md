# Limpieza y normalizacion de Supabase

## Tablas que se conservan

Estas tablas son consumidas por la app o por servicios activos:

- `clientes`
- `propietarios`
- `inquilinos`
- `garantes`
- `propiedades`
- `contratos_alquiler`
- `pagos_alquiler`
- `cobros_propietario`
- `agenda_alertas`
- `empleados`
- `user_profiles`
- `tipos_propiedad`
- `plazos_contrato`
- `monedas_cobro`
- `tipos_actualizacion_valor`
- `configuracion_inmobiliaria`
- `icl_indices`
- `ajustes_contrato`
- `propiedad_propietarios`
- `contrato_propietarios`
- `contrato_inquilinos`
- `contrato_garantes`
- `cuotas_alquiler`
- `movimientos_caja`
- `liquidaciones_propietario`
- `liquidaciones_detalle`
- `configuracion_financiera`

## Criterio actualizado

No se eliminan tablas puente ni cuotas. El modelo normalizado V1 vuelve a usar:

- `propiedad_propietarios`
- `contrato_propietarios`
- `contrato_inquilinos`
- `contrato_garantes`
- `cuotas_alquiler`
- `movimientos_caja`
- `liquidaciones_propietario`
- `liquidaciones_detalle`
- `configuracion_financiera`

Las columnas duplicadas de `propietarios` e `inquilinos` quedan como legacy por ahora. No se borran hasta adaptar el front y confirmar que todos los reportes leen desde `clientes`.

Los arrays `titulares_ids`, `propietarios_ids`, `inquilinos_ids` y `garantes_ids` quedan como legacy temporal. La migracion copia sus datos a tablas relacionales.

## Migraciones

Migracion NO-OP de limpieza anterior:

```text
supabase/migrations/20260629120000_drop_unused_legacy_tables.sql
```

Migracion real de normalizacion:

```text
supabase/migrations/20260629130000_normalize_contracts_finance_model.sql
```

Para aplicarla:

```powershell
npm.cmd run supabase:push
```

Si Supabase CLI vuelve a pedir permisos de proyecto o DB password, usar el flujo seguro ya configurado:

```powershell
npm.cmd run supabase:push:secure
```
