# Corrección de limpieza de Supabase

La limpieza automática por lista fue anulada porque clasificó incorrectamente
tablas de negocio, entre ellas `garantes`.

La migración correctiva:

```text
20260625080000_restore_guarantors_and_remove_legacy_installments.sql
```

realiza dos acciones:

1. Restaura a `public` todas las tablas movidas por la limpieza anterior.
2. Normaliza `contratos_alquiler`, retirando `cuota_1..cuota_36` y
   `mes_1..mes_36`.

Antes de retirar esas columnas, cualquier valor existente se conserva en:

```text
archive_unused_20260625.contratos_cuotas_meses_legacy
```

El contrato no mantiene cuotas. Los cobros se registran en `pagos_alquiler` y
los aumentos en `ajustes_contrato`.

## Modelo final del contrato

La migración `20260625090000_simplify_contract_relationships.sql` deja un único
registro en `contratos_alquiler` con:

- `propietarios_ids`
- `inquilinos_ids`
- `garantes_ids`

Los campos `propietario_id` e `inquilino_id` se conservan como participantes
principales para compatibilidad con consultas existentes.

Se respaldan fuera de `public` y se eliminan:

- `contrato_propietarios`
- `contrato_inquilinos`
- `contrato_garantes`
- `cuotas_alquiler`

Los cobros continúan relacionados directamente mediante:

```text
pagos_alquiler.contrato_id -> contratos_alquiler.id
```

No se archivará ni eliminará ninguna otra tabla hasta aprobar una lista exacta
por nombre.
