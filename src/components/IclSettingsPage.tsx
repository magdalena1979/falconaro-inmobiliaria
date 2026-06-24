import { Alert, Box, Button, CircularProgress, Paper, Stack, Typography } from '@mui/material'
import { DataGrid } from '@mui/x-data-grid'
import type { GridColDef } from '@mui/x-data-grid'
import { useQueryClient } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { useTableRows } from '../hooks/useTableRows'
import { supabase } from '../services/supabase/client'
import type { ModuleDefinition, TableRow } from '../services/supabase/types'

interface IclSettingsPageProps {
  module: ModuleDefinition
}

interface SyncResult {
  received: number
  inserted: number
  latestDate: string | null
  contractsProcessed: number
  adjustmentsGenerated: number
}

export function IclSettingsPage({ module }: IclSettingsPageProps) {
  const rowsQuery = useTableRows(module.table)
  const queryClient = useQueryClient()
  const [isSyncing, setIsSyncing] = useState(false)
  const [result, setResult] = useState<SyncResult>()
  const [error, setError] = useState('')
  const rows = useMemo(() => rowsQuery.data ?? [], [rowsQuery.data])
  const latest = rows[0]
  const columns: GridColDef<TableRow>[] = [
    { field: 'fecha', headerName: 'Fecha', width: 160, valueFormatter: formatDate },
    { field: 'valor', headerName: 'Valor ICL', width: 180, valueFormatter: formatIndex },
    { field: 'created_at', headerName: 'Importado', flex: 1, minWidth: 190, valueFormatter: formatDateTime },
  ]

  return (
    <Stack spacing={3}>
      <Box className="page-heading">
        <Box>
          <Typography variant="overline">Configuración</Typography>
          <Typography variant="h4">Índice ICL</Typography>
          <Typography variant="body2" color="text.secondary">
            Valores almacenados del Banco Central y ajustes automáticos de contratos.
          </Typography>
        </Box>
        <Button disabled={isSyncing} onClick={syncIcl} variant="contained">
          {isSyncing ? 'Actualizando…' : 'Actualizar ICL desde BCRA'}
        </Button>
      </Box>

      <Paper className="icl-sync-status" variant="outlined">
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3}>
          <StatusValue label="Última fecha almacenada" value={formatDate(latest?.fecha)} />
          <StatusValue label="Último valor" value={formatIndex(latest?.valor)} />
          <StatusValue label="Registros almacenados" value={String(rows.length)} />
        </Stack>
      </Paper>

      {result && (
        <Alert severity="success" onClose={() => setResult(undefined)}>
          Sincronización finalizada: {result.inserted} índices nuevos, {result.adjustmentsGenerated} ajustes generados
          y {result.contractsProcessed} contratos procesados. Última fecha: {formatDate(result.latestDate)}.
        </Alert>
      )}
      {error && <Alert severity="error" onClose={() => setError('')}>{error}</Alert>}

      {rowsQuery.isLoading ? (
        <Box className="centered"><CircularProgress size={28} /></Box>
      ) : rowsQuery.isError ? (
        <Alert severity="error">{rowsQuery.error.message}</Alert>
      ) : (
        <Paper className="data-panel" variant="outlined">
          <DataGrid
            autoHeight
            columns={columns}
            disableRowSelectionOnClick
            getRowId={(row) => String(row.fecha)}
            initialState={{ pagination: { paginationModel: { pageSize: 25 } } }}
            pageSizeOptions={[25, 50, 100]}
            rows={rows}
          />
        </Paper>
      )}
    </Stack>
  )

  async function syncIcl() {
    setIsSyncing(true)
    setError('')
    setResult(undefined)

    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
      if (sessionError) throw sessionError
      const accessToken = sessionData.session?.access_token
      if (!accessToken) throw new Error('Tu sesión venció. Volvé a iniciar sesión.')

      const endpoint = import.meta.env.VITE_ICL_SYNC_URL || '/api/sync-icl'
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      })
      const payload = await response.json() as SyncResult & { error?: string }
      if (!response.ok) throw new Error(payload.error || 'No se pudo sincronizar el ICL.')

      setResult(payload)
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['table-rows', module.table.name] }),
        queryClient.invalidateQueries({ queryKey: ['table-rows', 'contratos_alquiler'] }),
        queryClient.invalidateQueries({ queryKey: ['dashboard-metrics'] }),
        queryClient.invalidateQueries({ queryKey: ['contract-icl-summary'] }),
      ])
    } catch (syncError) {
      setError(syncError instanceof Error ? syncError.message : 'No se pudo sincronizar el ICL.')
    } finally {
      setIsSyncing(false)
    }
  }
}

function StatusValue({ label, value }: { label: string; value: string }) {
  return (
    <Box>
      <Typography variant="caption" color="text.secondary">{label}</Typography>
      <Typography variant="subtitle2">{value}</Typography>
    </Box>
  )
}

function formatDate(value: unknown): string {
  if (!value) return '-'
  return new Intl.DateTimeFormat('es-AR').format(new Date(`${String(value).slice(0, 10)}T12:00:00`))
}

function formatDateTime(value: unknown): string {
  if (!value) return '-'
  return new Intl.DateTimeFormat('es-AR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(String(value)))
}

function formatIndex(value: unknown): string {
  const number = Number(value)
  if (!Number.isFinite(number)) return '-'
  return new Intl.NumberFormat('es-AR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 6,
  }).format(number)
}
