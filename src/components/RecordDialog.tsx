import { Dialog, DialogContent, DialogTitle } from '@mui/material'
import type { ReferenceOptions } from '../hooks/useReferenceOptions'
import type { TableRow, TableSchema } from '../services/supabase/types'
import { humanize } from '../utils/format'
import { RecordForm } from './RecordForm'

interface RecordDialogProps {
  open: boolean
  mode: 'create' | 'edit'
  table: TableSchema
  row?: TableRow
  referenceOptions: ReferenceOptions
  isPending: boolean
  errorMessage?: string
  onClose: () => void
  onSubmit: (row: TableRow) => void
}

export function RecordDialog({
  open,
  mode,
  table,
  row,
  referenceOptions,
  isPending,
  errorMessage,
  onClose,
  onSubmit,
}: RecordDialogProps) {
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>{mode === 'create' ? `Crear ${humanize(table.name)}` : `Editar ${humanize(table.name)}`}</DialogTitle>
      <DialogContent>
        <RecordForm
          errorMessage={errorMessage}
          isPending={isPending}
          mode={mode}
          onCancel={onClose}
          onSubmit={onSubmit}
          referenceOptions={referenceOptions}
          row={row}
          table={table}
        />
      </DialogContent>
    </Dialog>
  )
}
