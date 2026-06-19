import { useQuery } from '@tanstack/react-query'
import { listRows } from '../services/supabase/tableService'
import type { JsonValue, ModuleDefinition, TableRow, TableSchema } from '../services/supabase/types'
import { humanize, isStatusMatch } from '../utils/format'

export interface DashboardMetric {
  label: string
  value: number | null
  helper: string
}

export interface DashboardSeries {
  labels: string[]
  values: number[]
  helper: string
}

export interface DashboardData {
  metrics: DashboardMetric[]
  propertyAvailability: DashboardSeries
  contractStatus: DashboardSeries
  paymentTimeline: DashboardSeries
  annualPaymentTimeline: DashboardSeries
  alertUrgency: DashboardSeries
  rentalAdjustmentIndex: DashboardSeries
}

export function useDashboardMetrics(modules: ModuleDefinition[]) {
  return useQuery({
    queryKey: ['dashboard-metrics', modules.map((module) => module.table?.name).join(',')],
    queryFn: async () => buildDashboard(modules),
  })
}

async function buildDashboard(modules: ModuleDefinition[]): Promise<DashboardData> {
  const propertyTable = findTable(modules, 'properties')
  const contractTable = findTable(modules, 'contracts')
  const paymentTable = findTable(modules, 'payments')
  const agendaTable = findTable(modules, 'agenda')

  const [properties, contracts, payments, agenda] = await Promise.all([
    listTableRows(propertyTable),
    listTableRows(contractTable),
    listTableRows(paymentTable),
    listTableRows(agendaTable),
  ])

  const activeRentals = metricStatus(contractTable, contracts, 'Alquileres activos', ['activo', 'vigente', 'active'])
  const expiringContracts = metricContractsExpiringSoon(contractTable, contracts)
  const pendingPayments = metricStatus(paymentTable, payments, 'Cobros pendientes', [
    'pendiente',
    'pending',
    'adeudado',
    'impago',
  ])
  const availableProperties = metricAvailableProperties(propertyTable, properties)
  const alerts = metricOpenAlerts(agendaTable, agenda, expiringContracts, pendingPayments)

  return {
    metrics: [activeRentals, expiringContracts, pendingPayments, availableProperties, alerts],
    propertyAvailability: seriesPropertyAvailability(propertyTable, properties),
    contractStatus: seriesByStatus(contractTable, contracts, 'Estado de contratos'),
    paymentTimeline: seriesPaymentTimeline(paymentTable, payments),
    annualPaymentTimeline: seriesAnnualPaymentTimeline(paymentTable, payments),
    alertUrgency: seriesAlertUrgency(agendaTable, agenda),
    rentalAdjustmentIndex: seriesRentalAdjustmentIndexMock(),
  }
}

function findTable(modules: ModuleDefinition[], key: ModuleDefinition['key']): TableSchema | undefined {
  return modules.find((module) => module.key === key)?.table
}

async function listTableRows(table: TableSchema | undefined): Promise<TableRow[]> {
  return table ? listRows(table) : []
}

function metricStatus(
  table: TableSchema | undefined,
  rows: TableRow[],
  label: string,
  terms: string[],
): DashboardMetric {
  if (!table) return emptyMetric(label)
  const statusColumn = findColumn(table, ['estado', 'status'])
  if (!statusColumn) {
    return { label, value: null, helper: `Preparado: falta columna estado/status en ${table.name}` }
  }

  return {
    label,
    value: rows.filter((row) => isStatusMatch(row[statusColumn], terms)).length,
    helper: `Calculado desde ${table.name}.${statusColumn}`,
  }
}

function metricAvailableProperties(table: TableSchema | undefined, rows: TableRow[]): DashboardMetric {
  if (!table) return emptyMetric('Propiedades disponibles')
  const rentedColumn = findColumn(table, ['alquilada'])
  if (rentedColumn) {
    return {
      label: 'Propiedades disponibles',
      value: rows.filter((row) => !toBoolean(row[rentedColumn])).length,
      helper: `Calculado desde ${table.name}.${rentedColumn}`,
    }
  }

  return metricStatus(table, rows, 'Propiedades disponibles', ['disponible', 'available'])
}

function metricContractsExpiringSoon(table: TableSchema | undefined, rows: TableRow[]): DashboardMetric {
  if (!table) return emptyMetric('Contratos por vencer')
  const endColumn = findColumn(table, [
    'fecha_fin',
    'fecha_fin_contrato',
    'fecha_hasta',
    'fin',
    'end_date',
    'expires_at',
  ])

  if (!endColumn) {
    return { label: 'Contratos por vencer', value: null, helper: `Preparado: falta fecha de fin en ${table.name}` }
  }

  const today = startOfDay(new Date())
  const limit = new Date(today)
  limit.setDate(today.getDate() + 60)

  const expiring = rows.filter((row) => {
    const date = parseDate(row[endColumn])
    return date && date >= today && date <= limit
  }).length

  return {
    label: 'Contratos por vencer',
    value: expiring,
    helper: `Proximos 60 dias desde ${table.name}.${endColumn}`,
  }
}

function metricOpenAlerts(
  agendaTable: TableSchema | undefined,
  agendaRows: TableRow[],
  expiringContracts: DashboardMetric,
  pendingPayments: DashboardMetric,
): DashboardMetric {
  if (agendaTable) {
    const open = filterOpenRows(agendaTable, agendaRows).length
    return {
      label: 'Alertas y vencimientos',
      value: open,
      helper: `Alertas abiertas en ${agendaTable.name}`,
    }
  }

  return {
    label: 'Alertas y vencimientos',
    value: (expiringContracts.value ?? 0) + (pendingPayments.value ?? 0),
    helper: 'Contratos por vencer + cobros pendientes',
  }
}

function seriesPropertyAvailability(table: TableSchema | undefined, rows: TableRow[]): DashboardSeries {
  if (!table) return emptySeries('Preparado para vincular propiedades')
  const rentedColumn = findColumn(table, ['alquilada'])

  if (rentedColumn) {
    const rented = rows.filter((row) => toBoolean(row[rentedColumn])).length
    return {
      labels: ['Disponibles', 'Alquiladas'],
      values: [Math.max(rows.length - rented, 0), rented],
      helper: `Lectura de ocupacion desde ${table.name}.${rentedColumn}`,
    }
  }

  const statusSeries = seriesByStatus(table, rows, 'Disponibilidad')
  return {
    ...statusSeries,
    helper: `Distribucion por estado desde ${table.name}`,
  }
}

function seriesByStatus(table: TableSchema | undefined, rows: TableRow[], fallback: string): DashboardSeries {
  if (!table) return emptySeries(`Preparado para vincular ${fallback.toLowerCase()}`)
  const statusColumn = findColumn(table, ['estado', 'status'])
  if (!statusColumn) return emptySeries(`Falta columna estado/status en ${table.name}`)

  const grouped = groupCount(rows, (row) => normalizeLabel(row[statusColumn], 'Sin estado'))
  return {
    labels: grouped.map(([label]) => label),
    values: grouped.map(([, value]) => value),
    helper: `Distribucion desde ${table.name}.${statusColumn}`,
  }
}

function seriesPaymentTimeline(table: TableSchema | undefined, rows: TableRow[]): DashboardSeries {
  if (!table) return emptySeries('Preparado para vincular cobros')
  const amountColumn = findColumn(table, [
    'importe',
    'total_recibo_locatario',
    'cuota_mensual',
    'alquiler_locador',
    'resto_alquiler',
  ])
  const dateColumn = findColumn(table, ['fecha_pago', 'fecha_vencimiento', 'fecha_cobro'])
  const monthBuckets = lastMonthBuckets(6)
  const bucketValues = new Map(monthBuckets.map((bucket) => [bucket.key, 0]))

  for (const row of rows) {
    const key = getPaymentMonthKey(row, dateColumn)
    if (!key || !bucketValues.has(key)) continue
    bucketValues.set(key, (bucketValues.get(key) ?? 0) + toNumber(amountColumn ? row[amountColumn] : null))
  }

  return {
    labels: monthBuckets.map((bucket) => bucket.label),
    values: monthBuckets.map((bucket) => Math.round(bucketValues.get(bucket.key) ?? 0)),
    helper: amountColumn
      ? `Importes de los ultimos 6 meses desde ${table.name}.${amountColumn}`
      : `Cantidad preparada desde ${table.name}; falta columna de importe`,
  }
}

function seriesAnnualPaymentTimeline(table: TableSchema | undefined, rows: TableRow[]): DashboardSeries {
  if (!table) return emptySeries('Preparado para vincular cobros anuales')
  const amountColumn = findColumn(table, [
    'importe',
    'total_recibo_locatario',
    'cuota_mensual',
    'alquiler_locador',
    'resto_alquiler',
  ])
  const dateColumn = findColumn(table, ['fecha_pago', 'fecha_vencimiento', 'fecha_cobro'])
  const monthBuckets = currentYearBuckets()
  const bucketValues = new Map(monthBuckets.map((bucket) => [bucket.key, 0]))

  for (const row of rows) {
    const key = getPaymentMonthKey(row, dateColumn)
    if (!key || !bucketValues.has(key)) continue
    bucketValues.set(key, (bucketValues.get(key) ?? 0) + toNumber(amountColumn ? row[amountColumn] : null))
  }

  return {
    labels: monthBuckets.map((bucket) => bucket.label),
    values: monthBuckets.map((bucket) => Math.round(bucketValues.get(bucket.key) ?? 0)),
    helper: amountColumn
      ? `Cobros del ano corriente desde ${table.name}.${amountColumn}`
      : `Cantidad preparada desde ${table.name}; falta columna de importe`,
  }
}

function seriesRentalAdjustmentIndexMock(): DashboardSeries {
  return {
    labels: currentYearBuckets().map((bucket) => bucket.label),
    values: [100, 106, 112, 119, 126, 134, 143, 152, 162, 173, 185, 198],
    helper: 'ICL mock visual; pendiente conectar con la API del BCRA',
  }
}

function seriesAlertUrgency(table: TableSchema | undefined, rows: TableRow[]): DashboardSeries {
  if (!table) return emptySeries('Preparado para vincular agenda')
  const dateColumn = findColumn(table, ['fecha', 'fecha_recordatorio', 'fecha_vencimiento'])
  if (!dateColumn) return emptySeries(`Falta fecha en ${table.name}`)

  const today = startOfDay(new Date())
  const sevenDays = new Date(today)
  sevenDays.setDate(today.getDate() + 7)
  const thirtyDays = new Date(today)
  thirtyDays.setDate(today.getDate() + 30)

  const values = [0, 0, 0, 0]
  for (const row of filterOpenRows(table, rows)) {
    const date = parseDate(row[dateColumn])
    if (!date) {
      values[3] += 1
    } else if (date < today) {
      values[0] += 1
    } else if (date <= sevenDays) {
      values[1] += 1
    } else if (date <= thirtyDays) {
      values[2] += 1
    }
  }

  return {
    labels: ['Vencidas', '7 dias', '30 dias', 'Sin fecha'],
    values,
    helper: `Prioridad de alertas abiertas desde ${table.name}.${dateColumn}`,
  }
}

function filterOpenRows(table: TableSchema, rows: TableRow[]): TableRow[] {
  const statusColumn = findColumn(table, ['estado', 'status'])
  if (!statusColumn) return rows
  return rows.filter((row) => !isStatusMatch(row[statusColumn], ['resuelto', 'cerrado', 'finalizado', 'cancelado']))
}

function groupCount(rows: TableRow[], getLabel: (row: TableRow) => string): Array<[string, number]> {
  const grouped = new Map<string, number>()
  for (const row of rows) {
    const label = getLabel(row)
    grouped.set(label, (grouped.get(label) ?? 0) + 1)
  }

  return [...grouped.entries()]
    .sort((left, right) => right[1] - left[1])
    .slice(0, 6)
}

function findColumn(table: TableSchema, names: string[]): string | undefined {
  const lowered = new Set(names.map((name) => name.toLowerCase()))
  return table.columns.find((column) => lowered.has(column.name.toLowerCase()))?.name
}

function getPaymentMonthKey(row: TableRow, dateColumn: string | undefined): string | undefined {
  const date = dateColumn ? parseDate(row[dateColumn]) : undefined
  if (date) return monthKey(date)

  const year = toNumber(row.anio)
  const monthValue = row.mes
  const month = typeof monthValue === 'string' ? parseMonthName(monthValue) : toNumber(monthValue)
  if (!year || !month) return undefined
  return `${year}-${String(month).padStart(2, '0')}`
}

function lastMonthBuckets(count: number): Array<{ key: string; label: string }> {
  const formatter = new Intl.DateTimeFormat('es-AR', { month: 'short' })
  const current = new Date()
  current.setDate(1)

  return Array.from({ length: count }, (_, index) => {
    const date = new Date(current.getFullYear(), current.getMonth() - (count - 1 - index), 1)
    return {
      key: monthKey(date),
      label: formatter.format(date).replace('.', ''),
    }
  })
}

function currentYearBuckets(): Array<{ key: string; label: string }> {
  const formatter = new Intl.DateTimeFormat('es-AR', { month: 'short' })
  const current = new Date()

  return Array.from({ length: 12 }, (_, index) => {
    const date = new Date(current.getFullYear(), index, 1)
    return {
      key: monthKey(date),
      label: formatter.format(date).replace('.', ''),
    }
  })
}

function monthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

function parseMonthName(value: string): number {
  const normalized = value.trim().toLowerCase()
  const months = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
  const index = months.findIndex((month) => normalized.startsWith(month))
  return index >= 0 ? index + 1 : Number(normalized)
}

function parseDate(value: JsonValue): Date | undefined {
  if (!value) return undefined
  const date = new Date(String(value))
  if (!Number.isFinite(date.getTime())) return undefined
  return startOfDay(date)
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

function toBoolean(value: JsonValue): boolean {
  if (typeof value === 'boolean') return value
  if (typeof value === 'number') return value > 0
  const normalized = String(value ?? '').toLowerCase()
  return ['true', '1', 'si', 's', 'yes', 'alquilada', 'ocupada'].includes(normalized)
}

function toNumber(value: JsonValue): number {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0
  if (typeof value !== 'string') return 0
  const normalized = value.replace(/\./g, '').replace(',', '.')
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : 0
}

function normalizeLabel(value: JsonValue, fallback: string): string {
  const text = String(value ?? '').trim()
  return text ? humanize(text) : fallback
}

function emptyMetric(label: string): DashboardMetric {
  return {
    label,
    value: null,
    helper: 'Preparado para vincular cuando la tabla este disponible',
  }
}

function emptySeries(helper: string): DashboardSeries {
  return {
    labels: [],
    values: [],
    helper,
  }
}
