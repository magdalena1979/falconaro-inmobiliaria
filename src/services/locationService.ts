import { supabase } from './supabase/client'
import type { TableRow } from './supabase/types'

interface CreateLocationInput {
  contract: TableRow
  ownerIds: string[]
  tenantIds: string[]
  guarantorIds: string[]
}

export async function createLocation({
  contract,
  ownerIds,
  tenantIds,
  guarantorIds,
}: CreateLocationInput): Promise<string> {
  const normalizedContract = {
    ...contract,
    plazo_meses: toPositiveInteger(contract.plazo_meses) ?? monthsBetweenDates(contract.fecha_inicio, contract.fecha_fin) ?? 1,
  }
  const { data, error } = await supabase
    .from('contratos_alquiler')
    .insert({
      ...normalizedContract,
      propietarios_ids: ownerIds,
      inquilinos_ids: tenantIds,
      garantes_ids: guarantorIds,
    })
    .select('id')
    .single()
  if (error) throw error

  const contractId = String(data.id)
  try {
    await insertContractRelations(contractId, ownerIds, tenantIds, guarantorIds)
    await insertInstallments(contractId, normalizedContract)
    if (contract.propiedad_id) {
      const { error: propertyError } = await supabase
        .from('propiedades')
        .update({ estado: 'alquilada', alquilada: true })
        .eq('id', String(contract.propiedad_id))
      if (propertyError) throw propertyError
    }
    return contractId
  } catch (relationError) {
    await supabase.from('contratos_alquiler').delete().eq('id', contractId)
    throw relationError
  }
}

async function insertContractRelations(
  contractId: string,
  ownerIds: string[],
  tenantIds: string[],
  guarantorIds: string[],
) {
  if (ownerIds.length) {
    const { error } = await supabase.from('contrato_propietarios').insert(
      ownerIds.map((ownerId, index) => ({
        contrato_id: contractId,
        propietario_id: ownerId,
        principal: index === 0,
      })),
    )
    if (error) throw error
  }

  if (tenantIds.length) {
    const { error } = await supabase.from('contrato_inquilinos').insert(
      tenantIds.map((tenantId, index) => ({
        contrato_id: contractId,
        inquilino_id: tenantId,
        principal: index === 0,
      })),
    )
    if (error) throw error
  }

  if (guarantorIds.length) {
    const { error } = await supabase.from('contrato_garantes').insert(
      guarantorIds.map((guarantorId, index) => ({
        contrato_id: contractId,
        garante_id: guarantorId,
        principal: index === 0,
      })),
    )
    if (error) throw error
  }
}

async function insertInstallments(contractId: string, contract: TableRow) {
  const startDate = parseDate(contract.fecha_inicio)
  if (!startDate) return

  const months = toPositiveInteger(contract.plazo_meses) ?? monthsBetweenDates(contract.fecha_inicio, contract.fecha_fin) ?? 1
  const amount = toMoney(contract.monto_actual) ?? toMoney(contract.monto_inicial) ?? toMoney(contract.canon_inicial) ?? 0
  const rows = Array.from({ length: months }, (_, index) => {
    const periodStart = addMonths(startDate, index)
    const nextPeriod = addMonths(startDate, index + 1)
    const periodEnd = new Date(nextPeriod)
    periodEnd.setDate(periodEnd.getDate() - 1)
    const dueDate = new Date(periodStart)
    dueDate.setDate(Math.min(10, lastDayOfMonth(dueDate)))

    return {
      contrato_id: contractId,
      numero_cuota: index + 1,
      periodo_inicio: formatDate(periodStart),
      periodo_fin: formatDate(periodEnd),
      fecha_vencimiento: formatDate(dueDate),
      importe: amount,
      saldo: amount,
      estado: dueDate < startOfToday() ? 'vencida' : 'pendiente',
    }
  })

  const { error } = await supabase.from('cuotas_alquiler').insert(rows)
  if (error) throw error
}

function parseDate(value: TableRow[string] | undefined): Date | undefined {
  if (!value) return undefined
  const date = new Date(`${String(value).slice(0, 10)}T12:00:00`)
  return Number.isFinite(date.getTime()) ? date : undefined
}

function monthsBetweenDates(startValue: TableRow[string] | undefined, endValue: TableRow[string] | undefined): number | undefined {
  const start = parseDate(startValue)
  const end = parseDate(endValue)
  if (!start || !end || end <= start) return undefined
  const months = (end.getFullYear() - start.getFullYear()) * 12 + end.getMonth() - start.getMonth()
  return Math.max(1, months)
}

function toPositiveInteger(value: TableRow[string] | undefined): number | undefined {
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined
}

function toMoney(value: TableRow[string] | undefined): number | undefined {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : undefined
}

function addMonths(date: Date, months: number): Date {
  const next = new Date(date)
  const originalDay = next.getDate()
  next.setDate(1)
  next.setMonth(next.getMonth() + months)
  next.setDate(Math.min(originalDay, lastDayOfMonth(next)))
  return next
}

function lastDayOfMonth(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
}

function startOfToday(): Date {
  const today = new Date()
  return new Date(today.getFullYear(), today.getMonth(), today.getDate())
}

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10)
}
