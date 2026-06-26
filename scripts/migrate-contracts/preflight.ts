import type { ContractIndexes, CsvRow, MigrationIssue, PersonIndexes, PropertyIndexes } from './types.js'
import { getField, normalizeDni, parseInteger } from './utils.js'

export function runPreflightValidation(
  ownerRows: CsvRow[],
  clientRows: CsvRow[],
  propertyRows: CsvRow[],
  rentalRows: CsvRow[],
  people: PersonIndexes,
  properties: PropertyIndexes,
  contracts: ContractIndexes,
): MigrationIssue[] {
  const issues: MigrationIssue[] = []
  const seenLegacyIds = new Set<number>()
  const sourceOwnerDnis = collectDnis(ownerRows, 'DNI')
  const sourceTenantDnis = collectDnis(clientRows, 'DNI')
  const sourcePropertyRegistrations = collectRegistrations(propertyRows)

  rentalRows.forEach((row, index) => {
    const rowNumber = index + 2
    const idLocacion = parseInteger(getField(row, 'IdLocacion'))
    const registration = parseInteger(getField(row, 'NumeroRegistroPropiedad'))
    const ownerDni = normalizeDni(getField(row, 'DNI_Locador'))
    const tenantDni = normalizeDni(getField(row, 'DNI_Locatario'))

    if (!idLocacion) {
      addIssue(issues, rowNumber, undefined, 'missing_id_locacion', 'Falta IdLocacion.')
    } else if (seenLegacyIds.has(idLocacion)) {
      addIssue(issues, rowNumber, idLocacion, 'duplicated_id_locacion', 'IdLocacion duplicado en Alquilar Propiedad.csv.')
    } else {
      seenLegacyIds.add(idLocacion)
    }

    if (idLocacion && contracts.contractsByLegacyId.has(idLocacion)) return

    if (!registration) {
      addIssue(issues, rowNumber, idLocacion ?? undefined, 'missing_property_registration', 'Falta NumeroRegistroPropiedad.')
    } else if (
      !properties.propertiesByRegistration.has(registration)
      && !sourcePropertyRegistrations.has(registration)
    ) {
      addIssue(
        issues,
        rowNumber,
        idLocacion ?? undefined,
        'property_not_available',
        `La propiedad ${registration} no existe en Supabase ni en Propiedad Alquiler.csv.`,
      )
    }

    if (!ownerDni) {
      addIssue(issues, rowNumber, idLocacion ?? undefined, 'missing_owner_dni', 'Falta DNI_Locador.')
    } else if (
      !people.ownersByDni.has(ownerDni)
      && !people.clientsByDni.has(ownerDni)
      && !sourceOwnerDnis.has(ownerDni)
    ) {
      addIssue(
        issues,
        rowNumber,
        idLocacion ?? undefined,
        'owner_source_not_available',
        `El DNI locador ${ownerDni} no existe en Supabase ni en Propietarios.csv.`,
      )
    }

    if (!tenantDni) {
      addIssue(issues, rowNumber, idLocacion ?? undefined, 'missing_tenant_dni', 'Falta DNI_Locatario.')
    } else if (
      !people.tenantsByDni.has(tenantDni)
      && !people.clientsByDni.has(tenantDni)
      && !sourceTenantDnis.has(tenantDni)
    ) {
      addIssue(
        issues,
        rowNumber,
        idLocacion ?? undefined,
        'tenant_source_not_available',
        `El DNI locatario ${tenantDni} no existe en Supabase ni en Clientes.csv.`,
      )
    }
  })

  return issues
}

function collectDnis(rows: CsvRow[], field: string): Set<number> {
  const values = new Set<number>()
  for (const row of rows) {
    const dni = normalizeDni(getField(row, field))
    if (dni) values.add(dni)
  }
  return values
}

function collectRegistrations(rows: CsvRow[]): Set<number> {
  const values = new Set<number>()
  for (const row of rows) {
    const registration = parseInteger(getField(row, 'NumeroRegistroPropiedad'))
    if (registration) values.add(registration)
  }
  return values
}

function addIssue(
  issues: MigrationIssue[],
  rowNumber: number,
  idLocacion: number | undefined,
  code: string,
  message: string,
): void {
  issues.push({ level: 'error', rowNumber, idLocacion, code, message })
}
