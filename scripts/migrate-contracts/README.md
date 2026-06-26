# Migracion de contratos desde Access

Este proceso lee los CSV exportados desde Access y sincroniza:

- clientes
- propietarios
- inquilinos
- propiedades
- contratos_alquiler

No usa tablas puente para contratos. El contrato queda en `contratos_alquiler` con:

- `propiedad_id`
- `propietario_id`
- `inquilino_id`
- `propietarios_ids`
- `inquilinos_ids`
- `garantes_ids`

## Ejecutar

```powershell
$env:SUPERADMIN_PASSWORD="123456789"
npm.cmd run migrate:contracts
```

## Solo validar

```powershell
$env:SUPERADMIN_PASSWORD="123456789"
npm.cmd run migrate:contracts -- --dry-run
```

El reporte se genera en:

```text
scripts/migrate-contracts/reports/latest-report.md
```
