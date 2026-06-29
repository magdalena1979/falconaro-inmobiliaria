import { Box, Button, Chip, CircularProgress, Divider, MenuItem, Paper, Stack, TextField, Typography } from '@mui/material'
import { DataGrid } from '@mui/x-data-grid'
import type { GridColDef, GridRowParams } from '@mui/x-data-grid'
import { useMemo, useState } from 'react'
import { useReferenceOptions } from '../hooks/useReferenceOptions'
import { useTableMutations, useTableRows } from '../hooks/useTableRows'
import type { ColumnSchema, ModuleDefinition, TableRow } from '../services/supabase/types'
import { formatValue, humanize, includesText } from '../utils/format'
import { EmptyState } from './EmptyState'
import { RecordForm } from './RecordForm'

interface PropertiesPageProps {
  module: ModuleDefinition
  ownersModule: ModuleDefinition
  propertyOwnersModule: ModuleDefinition
}

type PropertyView =
  | { mode: 'list' }
  | { mode: 'detail'; id: string }
  | { mode: 'create' }
  | { mode: 'edit'; id: string }

export function PropertiesPage({ module, ownersModule, propertyOwnersModule }: PropertiesPageProps) {
  const [view, setView] = useState<PropertyView>({ mode: 'list' })
  const [search, setSearch] = useState('')
  const [filterColumn, setFilterColumn] = useState('')
  const [filterValue, setFilterValue] = useState('')
  const table = module.table
  const rowsQuery = useTableRows(table)
  const ownersQuery = useTableRows(ownersModule.table)
  const propertyOwnersQuery = useTableRows(propertyOwnersModule.table)
  const mutations = useTableMutations(table)
  const referenceOptions = useReferenceOptions(table)

  const rows = useMemo(() => rowsQuery.data ?? [], [rowsQuery.data])
  const owners = useMemo(() => ownersQuery.data ?? [], [ownersQuery.data])
  const propertyOwnerLinks = useMemo(() => propertyOwnersQuery.data ?? [], [propertyOwnersQuery.data])
  const selectedProperty = useMemo(() => {
    if (view.mode !== 'detail' && view.mode !== 'edit') return undefined
    return rows.find((row) => String(row[table.primaryKey ?? 'id']) === view.id)
  }, [rows, table.primaryKey, view])

  const visibleRows = useMemo(
    () =>
      rows
        .filter((row) => includesText(row, search))
        .filter((row) => !filterColumn || !filterValue || String(row[filterColumn] ?? '') === filterValue),
    [filterColumn, filterValue, rows, search],
  )

  if (view.mode === 'create') {
    return (
      <PropertyFormPage
        errorMessage={mutations.create.error?.message}
        isPending={mutations.isPending}
        mode="create"
        module={module}
        onCancel={() => setView({ mode: 'list' })}
        onSubmit={(row) => submitCreate(row)}
        referenceOptions={referenceOptions}
      />
    )
  }

  if (view.mode === 'edit') {
    if (!selectedProperty) return <LoadingOrMissing isLoading={rowsQuery.isLoading} onBack={() => setView({ mode: 'list' })} />
    return (
      <PropertyFormPage
        errorMessage={mutations.update.error?.message}
        isPending={mutations.isPending}
        mode="edit"
        module={module}
        onCancel={() => setView({ mode: 'detail', id: view.id })}
        onSubmit={(row) => submitEdit(selectedProperty, row)}
        referenceOptions={referenceOptions}
        row={selectedProperty}
      />
    )
  }

  if (view.mode === 'detail') {
    if (!selectedProperty) return <LoadingOrMissing isLoading={rowsQuery.isLoading} onBack={() => setView({ mode: 'list' })} />
    return (
      <PropertyDetailPage
        module={module}
        ownerLabel={propertyOwnersLabel(selectedProperty, owners, propertyOwnerLinks, referenceOptions)}
        onBack={() => setView({ mode: 'list' })}
        onEdit={() => setView({ mode: 'edit', id: view.id })}
        referenceOptions={referenceOptions}
        row={selectedProperty}
      />
    )
  }

  const dataColumns = table.columns.slice(0, 8).map<GridColDef>((column) => ({
    field: column.name,
    headerName: humanize(column.name),
    flex: 1,
    minWidth: 150,
    valueFormatter: (value) =>
      formatReferenceValue(value, referenceOptions[column.name]) ?? formatValue(value, column),
  }))

  const columns: GridColDef[] = [
    ...dataColumns,
    {
      field: '__actions',
      headerName: '',
      sortable: false,
      filterable: false,
      width: 130,
      renderCell: (params) => (
        <Button
          size="small"
          onClick={(event) => {
            event.stopPropagation()
            setView({ mode: 'edit', id: String(params.row[table.primaryKey ?? 'id']) })
          }}
        >
          Editar
        </Button>
      ),
    },
  ]
  const filterOptions = filterColumn
    ? Array.from(new Set(rows.map((row) => String(row[filterColumn] ?? '')).filter(Boolean))).slice(0, 50)
    : []

  return (
    <Stack spacing={3}>
      <Box className="page-heading">
        <Box>
          <Typography variant="overline">{table.name}</Typography>
          <Typography variant="h4">{module.title}</Typography>
          <Typography variant="body2" color="text.secondary">
            {module.description}
          </Typography>
        </Box>
        <Button variant="contained" onClick={() => setView({ mode: 'create' })}>
          {module.createLabel ?? 'Nuevo inmueble'}
        </Button>
      </Box>

      <Paper variant="outlined" className="toolbar">
        <TextField label="Buscar" onChange={(event) => setSearch(event.target.value)} size="small" value={search} />
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
        <EmptyState title="No se pudieron cargar inmuebles" description={rowsQuery.error.message} severity="error" />
      ) : (
        <Paper variant="outlined" className="data-panel properties-data-panel">
          <DataGrid
            autoHeight
            columns={columns}
            disableRowSelectionOnClick
            getRowId={(row) => String(row[table.primaryKey ?? 'id'])}
            initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
            onRowClick={openDetail}
            pageSizeOptions={[10, 25, 50]}
            rows={visibleRows}
            sx={{ '& .MuiDataGrid-row': { cursor: 'pointer' } }}
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
    </Stack>
  )

  function openDetail(params: GridRowParams<TableRow>) {
    setView({ mode: 'detail', id: String(params.row[table.primaryKey ?? 'id']) })
  }

  function submitCreate(row: TableRow) {
    const payload = normalizePayload(row, table.columns.map((column) => column.name))
    mutations.create.mutate(payload, {
      onSuccess: () => setView({ mode: 'list' }),
    })
  }

  function submitEdit(currentRow: TableRow, row: TableRow) {
    const payload = normalizePayload(row, table.columns.map((column) => column.name))
    const id = String(currentRow[table.primaryKey ?? 'id'])
    mutations.update.mutate({ ...currentRow, ...payload }, {
      onSuccess: () => setView({ mode: 'detail', id }),
    })
  }
}

interface PropertyFormPageProps {
  module: ModuleDefinition
  mode: 'create' | 'edit'
  row?: TableRow
  referenceOptions: Record<string, Array<{ value: string; label: string }>>
  isPending: boolean
  errorMessage?: string
  onCancel: () => void
  onSubmit: (row: TableRow) => void
}

function PropertyFormPage({
  module,
  mode,
  row,
  referenceOptions,
  isPending,
  errorMessage,
  onCancel,
  onSubmit,
}: PropertyFormPageProps) {
  return (
    <Stack spacing={3}>
      <Box className="page-heading">
        <Box>
          <Typography variant="overline">{module.table.name}</Typography>
          <Typography variant="h4">{mode === 'create' ? 'Nuevo inmueble' : 'Editar inmueble'}</Typography>
          <Typography variant="body2" color="text.secondary">
            {mode === 'create' ? 'Carga completa del inmueble y sus propietarios.' : propertyTitle(row)}
          </Typography>
        </Box>
        <Button onClick={onCancel}>Volver</Button>
      </Box>
      <Paper variant="outlined" className="entity-form-page">
        <RecordForm
          errorMessage={errorMessage}
          isPending={isPending}
          mode={mode}
          onCancel={onCancel}
          onSubmit={onSubmit}
          referenceOptions={referenceOptions}
          row={row}
          submitLabel={mode === 'create' ? 'Crear inmueble' : 'Guardar cambios'}
          table={module.table}
        />
      </Paper>
    </Stack>
  )
}

interface PropertyDetailPageProps {
  module: ModuleDefinition
  row: TableRow
  referenceOptions: Record<string, Array<{ value: string; label: string }>>
  ownerLabel: string
  onBack: () => void
  onEdit: () => void
}

function PropertyDetailPage({ module, row, referenceOptions, ownerLabel, onBack, onEdit }: PropertyDetailPageProps) {
  const columns = module.table.columns.filter((column) => !['id', 'created_at', 'updated_at'].includes(column.name))
  const primary = columns.slice(0, 14)
  const details = columns.slice(14, 38)
  const documents = columns.slice(38)

  return (
    <Stack spacing={3}>
      <Box className="page-heading">
        <Box>
          <Typography variant="overline">{module.table.name}</Typography>
          <Typography variant="h4">{propertyTitle(row)}</Typography>
          <Typography variant="body2" color="text.secondary">
            {ownerLabel}
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Button onClick={onBack}>Volver</Button>
          <Button variant="contained" onClick={onEdit}>
            Editar
          </Button>
        </Stack>
      </Box>

      <Paper variant="outlined" className="property-detail-hero">
        <Stack spacing={1}>
          <Typography variant="overline">Estado</Typography>
          <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
            <Chip label={formatValue(row.estado, module.table.columns.find((column) => column.name === 'estado'))} />
            {row.numero_registro_propiedad && <Chip label={`Registro ${row.numero_registro_propiedad}`} variant="outlined" />}
            {row.codigo && <Chip label={`Codigo ${row.codigo}`} variant="outlined" />}
          </Stack>
        </Stack>
      </Paper>

      <DetailSection columns={primary} referenceOptions={referenceOptions} row={row} title="Datos principales" />
      <DetailSection columns={details} referenceOptions={referenceOptions} row={row} title="Caracteristicas" />
      <DetailSection columns={documents} referenceOptions={referenceOptions} row={row} title="Servicios y documentacion" />
    </Stack>
  )
}

function DetailSection({
  title,
  columns,
  row,
  referenceOptions,
}: {
  title: string
  columns: ColumnSchema[]
  row: TableRow
  referenceOptions: Record<string, Array<{ value: string; label: string }>>
}) {
  if (columns.length === 0) return null

  return (
    <Paper variant="outlined" className="property-detail-section">
      <Typography variant="h6">{title}</Typography>
      <Divider sx={{ my: 1.5 }} />
      <Box className="property-detail-grid">
        {columns.map((column) => (
          <Box key={column.name} className="property-detail-item">
            <Typography variant="caption" color="text.secondary">
              {humanize(column.name)}
            </Typography>
            <Typography variant="body2">
              {formatReferenceValue(row[column.name], referenceOptions[column.name]) ?? formatValue(row[column.name], column)}
            </Typography>
          </Box>
        ))}
      </Box>
    </Paper>
  )
}

function LoadingOrMissing({ isLoading, onBack }: { isLoading: boolean; onBack: () => void }) {
  if (isLoading) {
    return (
      <Box className="centered">
        <CircularProgress size={28} />
      </Box>
    )
  }

  return (
    <EmptyState
      actionLabel="Volver"
      description="No se encontro el inmueble seleccionado."
      onAction={onBack}
      severity="warning"
      title="Inmueble no disponible"
    />
  )
}

function propertyTitle(row: TableRow | undefined): string {
  if (!row) return 'Inmueble'
  return String(row.direccion ?? row.codigo ?? row.id ?? 'Inmueble')
}

function propertyOwnersLabel(
  row: TableRow,
  owners: TableRow[],
  links: TableRow[],
  referenceOptions: Record<string, Array<{ value: string; label: string }>>,
): string {
  const linkedOwnerIds = links
    .filter((link) => String(link.propiedad_id) === String(row.id))
    .sort((left, right) => Number(Boolean(right.principal)) - Number(Boolean(left.principal)))
    .map((link) => String(link.propietario_id))
    .filter(Boolean)

  if (linkedOwnerIds.length) {
    const labels = linkedOwnerIds.map((ownerId) => {
      const owner = owners.find((candidate) => String(candidate.id) === ownerId)
      return owner ? [owner.apellidos, owner.nombres].filter(Boolean).join(', ') : ownerId
    })
    return labels.join(' / ')
  }

  return (
    formatReferenceValue(row.titulares_ids, referenceOptions.titulares_ids) ??
    formatReferenceValue(row.propietario_id, referenceOptions.propietario_id) ??
    'Sin propietarios visibles'
  )
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

function formatReferenceValue(
  value: unknown,
  options: Array<{ value: string; label: string }> | undefined,
): string | undefined {
  if (!options) return undefined

  if (Array.isArray(value)) {
    const labels = value
      .map(String)
      .map((id) => options.find((option) => option.value === id)?.label ?? id)
    return labels.length > 0 ? labels.join(' / ') : undefined
  }

  if (typeof value === 'string' && value.startsWith('[')) {
    try {
      const parsed = JSON.parse(value)
      if (Array.isArray(parsed)) {
        const labels = parsed
          .map(String)
          .map((id) => options.find((option) => option.value === id)?.label ?? id)
        return labels.length > 0 ? labels.join(' / ') : undefined
      }
    } catch {
      return undefined
    }
  }

  if (value !== null && value !== undefined && value !== '') {
    return options.find((option) => option.value === String(value))?.label
  }

  return undefined
}
