import { Box, Card, CardContent, CircularProgress, Stack, Typography } from '@mui/material'
import { useQuery } from '@tanstack/react-query'
import { modules } from '../config/modules'
import { listRows } from '../services/supabase/tableService'
import type { ModuleDefinition, TableRow } from '../services/supabase/types'
import { isStatusMatch } from '../utils/format'
import { EmptyState } from './EmptyState'

interface ReportCard {
  title: string
  value: number | string
  helper: string
}

export function Reports() {
  const reports = useQuery({
    queryKey: ['reports-summary'],
    queryFn: buildReports,
  })

  return (
    <Stack spacing={3}>
      <Box className="page-heading">
        <Box>
          <Typography variant="overline">Gestion</Typography>
          <Typography variant="h4">Reportes</Typography>
          <Typography variant="body2" color="text.secondary">
            Contratos, disponibilidad, cobros, comisiones y vencimientos.
          </Typography>
        </Box>
      </Box>

      {reports.isLoading ? (
        <Box className="centered">
          <CircularProgress size={28} />
        </Box>
      ) : reports.isError ? (
        <EmptyState title="No se pudieron cargar reportes" description={reports.error.message} severity="error" />
      ) : (
        <Box className="metric-grid">
          {(reports.data ?? []).map((report) => (
            <Card key={report.title} className="metric-card" variant="outlined">
              <CardContent>
                <Typography component="h2" variant="subtitle2" gutterBottom>
                  {report.title}
                </Typography>
                <Typography variant="h3" component="p">
                  {report.value}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {report.helper}
                </Typography>
              </CardContent>
            </Card>
          ))}
        </Box>
      )}
    </Stack>
  )
}

async function buildReports(): Promise<ReportCard[]> {
  const properties = await rowsFor('properties')
  const contracts = await rowsFor('contracts')
  const payments = await rowsFor('payments')
  const ownerCollections = await rowsFor('ownerCollections')

  return [
    {
      title: 'Contratos vigentes',
      value: countByStatus(contracts, ['activo', 'vigente', 'active']),
      helper: 'Desde contratos_alquiler.estado',
    },
    {
      title: 'Propiedades disponibles',
      value: countByStatus(properties, ['disponible', 'available']),
      helper: 'Desde propiedades.estado',
    },
    {
      title: 'Cobros por periodo',
      value: sumMoney(payments, ['importe', 'cuota_mensual']),
      helper: 'Suma de pagos registrados',
    },
    {
      title: 'Comisiones generadas',
      value: sumMoney(contracts, ['comision_inmobiliaria', 'comision']),
      helper: 'Suma de comisiones pactadas',
    },
    {
      title: 'Vencimientos',
      value: countExpiring(contracts),
      helper: 'Contratos que vencen en los proximos 60 dias',
    },
    {
      title: 'Liquidacion propietario',
      value: sumMoney(ownerCollections, ['importe']),
      helper: 'Suma de cobros_propietario',
    },
  ]
}

async function rowsFor(key: ModuleDefinition['key']): Promise<TableRow[]> {
  const module = modules.find((item) => item.key === key)
  if (!module) return []
  return listRows(module.table)
}

function countByStatus(rows: TableRow[], terms: string[]): number {
  return rows.filter((row) => isStatusMatch(row.estado, terms)).length
}

function sumMoney(rows: TableRow[], columns: string[]): string {
  const total = rows.reduce((sum, row) => {
    const value = columns.map((column) => row[column]).find((candidate) => Number(candidate) > 0)
    return sum + Number(value ?? 0)
  }, 0)

  return total.toLocaleString('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  })
}

function countExpiring(rows: TableRow[]): number {
  const today = new Date()
  const limit = new Date()
  limit.setDate(today.getDate() + 60)

  return rows.filter((row) => {
    const value = row.fecha_fin ?? row.fecha_fin_contrato
    if (!value) return false
    const date = new Date(String(value))
    return Number.isFinite(date.getTime()) && date >= today && date <= limit
  }).length
}
