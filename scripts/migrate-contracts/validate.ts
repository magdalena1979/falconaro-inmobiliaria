import type {
  ContractIndexes,
  CsvRow,
  MigrationIssue,
  PersonIndexes,
  PreparedContract,
  PropertyIndexes,
  PropertyOwnerLink,
  ValidationResult,
} from './types.js'
import {
  addDays,
  getField,
  normalizeDni,
  normalizeText,
  parseDate,
  parseInteger,
  parseNumber,
  toTimestamp,
} from './utils.js'

export function validateRentalRows(
  rentalRows: CsvRow[],
  people: PersonIndexes,
  properties: PropertyIndexes,
  contracts: ContractIndexes,
): ValidationResult {
  const issues: MigrationIssue[] = []
  const preparedContracts: PreparedContract[] = []
  const propertyOwnerLinks: PropertyOwnerLink[] = []
  const seenLegacyIds = new Set<number>()
  let skippedExistingContracts = 0

  rentalRows.forEach((row, index) => {
    const rowNumber = index + 2
    const idLocacion = parseInteger(getField(row, 'IdLocacion'))
    const registration = parseInteger(getField(row, 'NumeroRegistroPropiedad'))
    const ownerDni = normalizeDni(getField(row, 'DNI_Locador'))
    const tenantDni = normalizeDni(getField(row, 'DNI_Locatario'))

    if (!idLocacion) {
      addIssue(issues, 'error', rowNumber, undefined, 'missing_id_locacion', 'Falta IdLocacion.')
      return
    }

    if (seenLegacyIds.has(idLocacion)) {
      addIssue(issues, 'error', rowNumber, idLocacion, 'duplicated_id_locacion', 'IdLocacion duplicado en el CSV.')
      return
    }
    seenLegacyIds.add(idLocacion)

    if (contracts.contractsByLegacyId.has(idLocacion)) {
      skippedExistingContracts += 1
      addIssue(issues, 'warning', rowNumber, idLocacion, 'existing_contract', 'El contrato ya existe en Supabase y se omitira.')
      return
    }

    if (!registration) {
      addIssue(issues, 'error', rowNumber, idLocacion, 'missing_property_registration', 'Falta NumeroRegistroPropiedad.')
      return
    }
    if (!ownerDni) {
      addIssue(issues, 'error', rowNumber, idLocacion, 'missing_owner_dni', 'Falta DNI_Locador.')
      return
    }
    if (!tenantDni) {
      addIssue(issues, 'error', rowNumber, idLocacion, 'missing_tenant_dni', 'Falta DNI_Locatario.')
      return
    }

    const property = properties.propertiesByRegistration.get(registration)
    const owner = people.ownersByDni.get(ownerDni)
    const tenant = people.tenantsByDni.get(tenantDni)

    if (!property) {
      addIssue(issues, 'error', rowNumber, idLocacion, 'property_not_found', `No existe propiedad con NumeroRegistroPropiedad ${registration}.`)
    }
    if (!owner) {
      addIssue(issues, 'error', rowNumber, idLocacion, 'owner_not_found', `No existe propietario con DNI ${ownerDni}.`)
    }
    if (!tenant) {
      addIssue(issues, 'error', rowNumber, idLocacion, 'tenant_not_found', `No existe inquilino con DNI ${tenantDni}.`)
    }
    if (!property || !owner || !tenant) return

    const startDate = parseDate(getField(row, 'FechaLocacion'))
    const plazoDias = parseInteger(getField(row, 'Plazo_dias'))
    const explicitEndDate = parseDate(getField(row, 'FechaFinContrato'))
    const endDate = explicitEndDate ?? (startDate && plazoDias ? addDays(startDate, plazoDias) : null)
    const initialAmount = parseNumber(getField(row, 'Cuota 1'))

    if (!startDate) {
      addIssue(issues, 'error', rowNumber, idLocacion, 'missing_start_date', 'No se pudo leer FechaLocacion. Se omite para carga manual.')
      return
    }
    if (!endDate) {
      addIssue(issues, 'error', rowNumber, idLocacion, 'missing_end_date', 'No se pudo leer ni calcular FechaFinContrato. Se omite para carga manual.')
      return
    }
    if (endDate <= startDate) {
      addIssue(issues, 'error', rowNumber, idLocacion, 'invalid_contract_dates', 'FechaFinContrato debe ser mayor a FechaLocacion. Se omite para carga manual.')
      return
    }

    preparedContracts.push({
      id_locacion: idLocacion,
      numero_registro_propiedad: registration,
      propiedad_id: property.id,
      propietario_id: owner.id,
      inquilino_id: tenant.id,
      propietarios_ids: [owner.id],
      inquilinos_ids: [tenant.id],
      garantes_ids: [],
      plazo_dias: plazoDias,
      plazo_meses: plazoDias ? Math.max(1, Math.round(plazoDias / 30)) : monthsBetween(startDate, endDate),
      fecha_locacion: toTimestamp(startDate),
      fecha_fin_contrato: toTimestamp(endDate),
      fecha_inicio: startDate,
      fecha_fin: endDate,
      dni_locador: ownerDni,
      dni_locatario: tenantDni,
      dni_empleado: normalizeDni(getField(row, 'DNI_Empleado')),
      observaciones: normalizeText(getField(row, 'Observaciones')) ?? '',
      canon_inicial: initialAmount,
      monto_inicial: initialAmount ?? 0,
      monto_actual: initialAmount ?? 0,
      multa: parseNumber(getField(row, 'Multa')),
      estado: resolveContractStatus(endDate),
    })
    propertyOwnerLinks.push({ propertyId: property.id, ownerId: owner.id })
  })

  return {
    contracts: preparedContracts,
    propertyOwnerLinks,
    issues,
    skippedExistingContracts,
  }
}

function resolveContractStatus(endDate: string | null): string {
  if (!endDate) return 'vigente'
  return endDate < new Date().toISOString().slice(0, 10) ? 'finalizado' : 'vigente'
}

function monthsBetween(startDate: string, endDate: string): number {
  const start = new Date(`${startDate}T00:00:00.000Z`)
  const end = new Date(`${endDate}T00:00:00.000Z`)
  const months = (end.getUTCFullYear() - start.getUTCFullYear()) * 12
    + end.getUTCMonth()
    - start.getUTCMonth()
  return Math.max(1, months)
}

function addIssue(
  issues: MigrationIssue[],
  level: MigrationIssue['level'],
  rowNumber: number,
  idLocacion: number | undefined,
  code: string,
  message: string,
): void {
  issues.push({ level, rowNumber, idLocacion, code, message })
}
