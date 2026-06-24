import {
  Alert,
  Box,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Button,
  Paper,
  Stack,
  Typography,
} from '@mui/material'
import { DataGrid } from '@mui/x-data-grid'
import type { GridColDef } from '@mui/x-data-grid'
import { useQuery } from '@tanstack/react-query'
import { getContractIclSummary, type ContractAdjustment } from '../services/iclService'

interface ContractIclDialogProps {
  contractId?: string
  onClose: () => void
}

export function ContractIclDialog({ contractId, onClose }: ContractIclDialogProps) {
  const query = useQuery({
    queryKey: ['contract-icl-summary', contractId],
    queryFn: () => getContractIclSummary(contractId!),
    enabled: Boolean(contractId),
  })

  const columns: GridColDef<ContractAdjustment>[] = [
    { field: 'fecha_ajuste', headerName: 'Fecha de ajuste', width: 150, valueFormatter: formatDate },
    { field: 'icl_origen', headerName: 'ICL origen', width: 130, valueFormatter: formatIndex },
    { field: 'icl_destino', headerName: 'ICL aplicado', width: 140, valueFormatter: formatIndex },
    { field: 'monto_anterior', headerName: 'Monto anterior', width: 160, valueFormatter: formatCurrency },
    { field: 'monto_nuevo', headerName: 'Monto nuevo', width: 160, valueFormatter: formatCurrency },
  ]

  return (
    <Dialog fullWidth maxWidth="md" onClose={onClose} open={Boolean(contractId)}>
      <DialogTitle>Ajustes automáticos por ICL</DialogTitle>
      <DialogContent dividers>
        {query.isLoading ? (
          <Box className="centered">
            <CircularProgress size={28} />
          </Box>
        ) : query.isError ? (
          <Alert severity="error">{query.error.message}</Alert>
        ) : query.data ? (
          <Stack spacing={3}>
            {query.data.contract.tipo_indice?.toUpperCase() !== 'ICL' && (
              <Alert severity="info">Este contrato no está configurado para ajustes por ICL.</Alert>
            )}

            <Box className="icl-summary-grid">
              <IclValue label="Monto inicial" value={formatCurrency(query.data.contract.monto_inicial)} />
              <IclValue label="Fecha de inicio" value={formatDate(query.data.contract.fecha_inicio)} />
              <IclValue
                label="Frecuencia"
                value={query.data.contract.frecuencia_ajuste ? `Cada ${query.data.contract.frecuencia_ajuste} meses` : '-'}
              />
              <IclValue label="Próximo ajuste" value={formatDate(query.data.contract.proxima_fecha_ajuste)} />
              <IclValue label="ICL base" value={formatIndex(query.data.contract.icl_base)} />
              <IclValue label="Monto actual" value={formatCurrency(query.data.contract.monto_actual)} />
              <IclValue
                label="Último ICL almacenado"
                value={
                  query.data.latestStoredIndex
                    ? `${formatIndex(query.data.latestStoredIndex.valor)} · ${formatDate(query.data.latestStoredIndex.fecha)}`
                    : 'Sin datos sincronizados'
                }
              />
            </Box>

            <Box>
              <Typography variant="h6" gutterBottom>Historial de aumentos</Typography>
              <Paper className="data-panel" variant="outlined">
                <DataGrid
                  autoHeight
                  columns={columns}
                  disableRowSelectionOnClick
                  getRowId={(row) => row.id}
                  hideFooter={query.data.adjustments.length <= 10}
                  rows={query.data.adjustments}
                />
              </Paper>
            </Box>
          </Stack>
        ) : null}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cerrar</Button>
      </DialogActions>
    </Dialog>
  )
}

function IclValue({ label, value }: { label: string; value: string }) {
  return (
    <Paper className="icl-summary-item" variant="outlined">
      <Typography variant="caption" color="text.secondary">{label}</Typography>
      <Typography variant="subtitle2">{value}</Typography>
    </Paper>
  )
}

function formatCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined) return '-'
  return new Intl.NumberFormat('es-AR', {
    currency: 'ARS',
    maximumFractionDigits: 2,
    style: 'currency',
  }).format(value)
}

function formatDate(value: string | null | undefined): string {
  if (!value) return '-'
  return new Intl.DateTimeFormat('es-AR').format(new Date(`${value.slice(0, 10)}T12:00:00`))
}

function formatIndex(value: number | null | undefined): string {
  if (value === null || value === undefined) return '-'
  return new Intl.NumberFormat('es-AR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 6,
  }).format(value)
}
