import { useQuery } from '@tanstack/react-query'
import { listRows } from '../services/supabase/tableService'
import type { ModuleDefinition, TableRow, TableSchema } from '../services/supabase/types'
import { isStatusMatch } from '../utils/format'

export interface DashboardMetric {
  label: string
  value: number | null
  helper: string
}

export function useDashboardMetrics(modules: ModuleDefinition[]) {
  return useQuery({
    queryKey: ['dashboard-metrics', modules.map((module) => module.table?.name).join(',')],
    queryFn: async () => buildMetrics(modules),
  })
}

async function buildMetrics(modules: ModuleDefinition[]): Promise<DashboardMetric[]> {
  const propertyTable = findTable(modules, 'properties')
  const contractTable = findTable(modules, 'contracts')
  const paymentTable = findTable(modules, 'payments')
  const agendaTable = findTable(modules, 'agenda')

  const [activeRentals, expiringContracts, pendingPayments, availableProperties, alerts] = await Promise.all([
    metricStatus(contractTable, 'Alquileres activos', ['activo', 'vigente', 'active']),
    metricContractsExpiringSoon(contractTable),
    metricStatus(paymentTable, 'Cobros pendientes', ['pendiente', 'pending', 'adeudado', 'impago']),
    metricStatus(propertyTable, 'Propiedades disponibles', ['disponible', 'available']),
    metricOpenAlerts(agendaTable, contractTable, paymentTable),
  ])

  return [activeRentals, expiringContracts, pendingPayments, availableProperties, alerts]
}

function findTable(modules: ModuleDefinition[], key: ModuleDefinition['key']): TableSchema | undefined {
  return modules.find((module) => module.key === key)?.table
}

async function metricStatus(
  table: TableSchema | undefined,
  label: string,
  terms: string[],
): Promise<DashboardMetric> {
  if (!table) return emptyMetric(label)
  const rows = await listRows(table)
  const statusColumn = table.columns.find((column) => ['estado', 'status'].includes(column.name.toLowerCase()))
  if (!statusColumn) {
    return { label, value: null, helper: `Preparado: falta columna estado/status en ${table.name}` }
  }

  return {
    label,
    value: rows.filter((row) => isStatusMatch(row[statusColumn.name], terms)).length,
    helper: `Calculado desde ${table.name}.${statusColumn.name}`,
  }
}

async function metricContractsExpiringSoon(table: TableSchema | undefined): Promise<DashboardMetric> {
  if (!table) return emptyMetric('Contratos por vencer')
  const rows = await listRows(table)
  const endColumn = table.columns.find((column) =>
    ['fecha_fin', 'fecha_fin_contrato', 'fecha_hasta', 'fin', 'end_date', 'expires_at'].includes(column.name.toLowerCase()),
  )

  if (!endColumn) {
    return { label: 'Contratos por vencer', value: null, helper: `Preparado: falta fecha de fin en ${table.name}` }
  }

  const today = new Date()
  const limit = new Date()
  limit.setDate(today.getDate() + 60)

  const expiring = rows.filter((row: TableRow) => {
    const value = row[endColumn.name]
    if (!value) return false
    const date = new Date(String(value))
    return Number.isFinite(date.getTime()) && date >= today && date <= limit
  }).length

  return {
    label: 'Contratos por vencer',
    value: expiring,
    helper: `Proximos 60 dias desde ${table.name}.${endColumn.name}`,
  }
}

async function metricOpenAlerts(
  agendaTable: TableSchema | undefined,
  contractTable: TableSchema | undefined,
  paymentTable: TableSchema | undefined,
): Promise<DashboardMetric> {
  if (agendaTable) {
    const rows = await listRows(agendaTable)
    const statusColumn = agendaTable.columns.find((column) => column.name === 'estado')
    const pending = statusColumn
      ? rows.filter((row) => !isStatusMatch(row[statusColumn.name], ['resuelto', 'cerrado', 'finalizado'])).length
      : rows.length

    return {
      label: 'Alertas y vencimientos',
      value: pending,
      helper: `Alertas abiertas en ${agendaTable.name}`,
    }
  }

  const [contracts, payments] = await Promise.all([
    metricContractsExpiringSoon(contractTable),
    metricStatus(paymentTable, 'Cobros pendientes', ['pendiente', 'pending', 'adeudado', 'impago']),
  ])

  return {
    label: 'Alertas y vencimientos',
    value: (contracts.value ?? 0) + (payments.value ?? 0),
    helper: 'Contratos por vencer + cobros pendientes',
  }
}

function emptyMetric(label: string): DashboardMetric {
  return {
    label,
    value: null,
    helper: 'Preparado para vincular cuando la tabla este disponible',
  }
}
