import { Box, Button, Chip, CircularProgress, MenuItem, Paper, Stack, TextField, Typography } from '@mui/material'
import { DataGrid } from '@mui/x-data-grid'
import type { GridColDef } from '@mui/x-data-grid'
import { useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { useReferenceOptions } from '../hooks/useReferenceOptions'
import { useTableMutations, useTableRows } from '../hooks/useTableRows'
import type { ModuleDefinition, TableRow } from '../services/supabase/types'
import { formatValue, humanize, includesText } from '../utils/format'
import { EmptyState } from './EmptyState'
import { RecordDialog } from './RecordDialog'

interface EntityPageProps {
  module: ModuleDefinition
  renderRowActions?: (row: TableRow) => ReactNode
}

export function EntityPage({ module, renderRowActions }: EntityPageProps) {
  const [search, setSearch] = useState('')
  const [filterColumn, setFilterColumn] = useState('')
  const [filterValue, setFilterValue] = useState('')
  const [editingRow, setEditingRow] = useState<TableRow | undefined>()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const table = module.table
  const rowsQuery = useTableRows(table)
  const mutations = useTableMutations(table)
  const referenceOptions = useReferenceOptions(table)

  const rows = useMemo(() => rowsQuery.data ?? [], [rowsQuery.data])
  const visibleRows = useMemo(
    () =>
      rows
        .filter((row) => includesText(row, search))
        .filter((row) => !filterColumn || !filterValue || String(row[filterColumn] ?? '') === filterValue),
    [filterColumn, filterValue, rows, search],
  )

  const activeTable = table
  const dataColumns = activeTable.columns.slice(0, 8).map<GridColDef>((column) => ({
    field: column.name,
    headerName: humanize(column.name),
    flex: 1,
    minWidth: 140,
    valueFormatter: (value) =>
      referenceOptions[column.name]?.find((option) => option.value === String(value))?.label ??
      formatValue(value, column),
  }))
  const columns: GridColDef[] = [
    ...dataColumns,
    {
      field: '__actions',
      headerName: '',
      sortable: false,
      filterable: false,
      width: renderRowActions ? 360 : 170,
      renderCell: (params) => (
        <Stack direction="row" spacing={1}>
          {renderRowActions?.(params.row)}
          <Button size="small" onClick={() => openEdit(params.row)}>
            Editar
          </Button>
          {activeTable.canDelete !== false && (
            <Button color="error" size="small" onClick={() => removeRow(params.row)}>
              Borrar
            </Button>
          )}
        </Stack>
      ),
    },
  ]
  const filterOptions = filterColumn
    ? Array.from(new Set(rows.map((row) => String(row[filterColumn] ?? '')).filter(Boolean))).slice(0, 50)
    : []

  return (
    <Stack spacing={3}>
      <PageHeader
        module={module}
        tableName={table.name}
        onCreate={table.canCreate === false ? undefined : openCreate}
      />

      <Paper variant="outlined" className="toolbar">
        <TextField
          label="Buscar"
          onChange={(event) => setSearch(event.target.value)}
          size="small"
          value={search}
        />
        <TextField
          label="Filtrar por"
          onChange={(event) => {
            setFilterColumn(event.target.value)
            setFilterValue('')
          }}
          select
          size="small"
          value={filterColumn}
          sx={{ minWidth: 180 }}
        >
          <MenuItem value="">Sin filtro</MenuItem>
          {table.columns.map((column) => (
            <MenuItem key={column.name} value={column.name}>
              {humanize(column.name)}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          disabled={!filterColumn}
          label="Valor"
          onChange={(event) => setFilterValue(event.target.value)}
          select
          size="small"
          value={filterValue}
          sx={{ minWidth: 180 }}
        >
          <MenuItem value="">Todos</MenuItem>
          {filterOptions.map((option) => (
            <MenuItem key={option} value={option}>
              {option}
            </MenuItem>
          ))}
        </TextField>
        <Chip label={`${visibleRows.length} registros`} />
      </Paper>

      {rowsQuery.isLoading ? (
        <Box className="centered">
          <CircularProgress size={28} />
        </Box>
      ) : rowsQuery.isError ? (
        <EmptyState
          title="No se pudieron cargar datos reales"
          description={rowsQuery.error.message}
          severity="error"
        />
      ) : (
        <Paper variant="outlined" className="data-panel">
          <DataGrid
            autoHeight
            columns={columns}
            disableRowSelectionOnClick
            getRowId={(row) => getGridRowId(row, table.primaryKey)}
            initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
            pageSizeOptions={[10, 25, 50]}
            rows={visibleRows}
          />
        </Paper>
      )}

      {(mutations.create.error || mutations.update.error || mutations.remove.error) && (
        <EmptyState
          title="No se pudo guardar el cambio"
          description={
            mutations.create.error?.message ??
            mutations.update.error?.message ??
            mutations.remove.error?.message ??
            'Supabase rechazo la operacion.'
          }
          severity="error"
        />
      )}

      <RecordDialog
        errorMessage={
          mutations.create.error?.message ??
          mutations.update.error?.message
        }
        isPending={mutations.isPending}
        mode={editingRow ? 'edit' : 'create'}
        onClose={() => setIsDialogOpen(false)}
        onSubmit={submitRow}
        open={isDialogOpen}
        referenceOptions={referenceOptions}
        row={editingRow}
        table={activeTable}
      />
    </Stack>
  )

  function openCreate() {
    setEditingRow(undefined)
    setIsDialogOpen(true)
  }

  function openEdit(row: TableRow) {
    setEditingRow(row)
    setIsDialogOpen(true)
  }

  function submitRow(row: TableRow) {
    const payload = normalizePayload(row, activeTable.columns.map((column) => column.name))
    const mutation = editingRow ? mutations.update : mutations.create
    mutation.mutate(editingRow ? { ...editingRow, ...payload } : payload, {
      onSuccess: () => setIsDialogOpen(false),
    })
  }

  function removeRow(row: TableRow) {
    if (!activeTable.primaryKey) return
    const confirmed = window.confirm(`Eliminar registro de ${module.title}?`)
    if (confirmed) mutations.remove.mutate(row)
  }
}

interface PageHeaderProps {
  module: ModuleDefinition
  tableName: string
  onCreate: (() => void) | undefined
}

function PageHeader({ module, tableName, onCreate }: PageHeaderProps) {
  return (
    <Box className="page-heading">
      <Box>
        <Typography variant="overline">{tableName}</Typography>
        <Typography variant="h4">{module.title}</Typography>
        <Typography variant="body2" color="text.secondary">
          {module.description}
        </Typography>
      </Box>
      {onCreate && (
        <Button variant="contained" onClick={onCreate}>
          {module.createLabel ?? 'Crear'}
        </Button>
      )}
    </Box>
  )
}

function getGridRowId(row: TableRow, primaryKey: string | undefined): string {
  if (primaryKey && row[primaryKey] !== undefined) return String(row[primaryKey])
  return JSON.stringify(row)
}

function normalizePayload(row: TableRow, columnNames: string[]): TableRow {
  return Object.fromEntries(
    Object.entries(row)
      .filter(([key]) => columnNames.includes(key))
      .map(([key, value]) => {
        if (value === 'true') return [key, true]
        if (value === 'false') return [key, false]
        return [key, value]
      }),
  )
}
