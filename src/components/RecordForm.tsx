import { zodResolver } from '@hookform/resolvers/zod'
import {
  Alert,
  Button,
  Checkbox,
  FormControl,
  FormControlLabel,
  InputLabel,
  ListItemText,
  MenuItem,
  Select,
  Stack,
  TextField,
} from '@mui/material'
import { useEffect, useMemo } from 'react'
import { Controller, useForm } from 'react-hook-form'
import type { Resolver } from 'react-hook-form'
import { z } from 'zod'
import type { ReferenceOptions } from '../hooks/useReferenceOptions'
import type { ColumnSchema, TableRow, TableSchema } from '../services/supabase/types'
import { humanize } from '../utils/format'

type FormValues = Record<string, string | number | boolean | string[] | null>

interface RecordFormProps {
  mode: 'create' | 'edit'
  table: TableSchema
  row?: TableRow
  referenceOptions: ReferenceOptions
  isPending: boolean
  errorMessage?: string
  submitLabel?: string
  onCancel: () => void
  onSubmit: (row: TableRow) => void
}

export function RecordForm({
  mode,
  table,
  row,
  referenceOptions,
  isPending,
  errorMessage,
  submitLabel = 'Guardar',
  onCancel,
  onSubmit,
}: RecordFormProps) {
  const editableColumns = useMemo(
    () => table.columns.filter((column) => isEditable(column, table.primaryKey, mode)),
    [mode, table],
  )
  const schema = useMemo(() => buildSchema(editableColumns), [editableColumns])
  const defaultValues = useMemo(() => buildDefaultValues(editableColumns, row), [editableColumns, row])
  const { control, handleSubmit, reset } = useForm<FormValues>({
    resolver: zodResolver(schema) as unknown as Resolver<FormValues>,
    defaultValues,
  })

  useEffect(() => {
    reset(defaultValues)
  }, [defaultValues, reset])

  return (
    <form onSubmit={handleSubmit((values) => onSubmit(values))}>
      <Stack spacing={2.5}>
        {errorMessage && <Alert severity="error">{errorMessage}</Alert>}
        <div className="record-dialog-grid">
          {editableColumns.map((column) => (
            <Controller
              key={column.name}
              control={control}
              name={column.name}
              render={({ field, fieldState }) =>
                column.type === 'boolean' ? (
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={field.value === true || field.value === 'true'}
                        onChange={(_, checked) => field.onChange(checked)}
                      />
                    }
                    label={humanize(column.name)}
                  />
                ) : column.multiple ? (
                  <FormControl error={Boolean(fieldState.error)} fullWidth>
                    <InputLabel id={`${column.name}-label`}>{humanize(column.name)}</InputLabel>
                    <Select
                      labelId={`${column.name}-label`}
                      label={humanize(column.name)}
                      multiple
                      value={Array.isArray(field.value) ? field.value : []}
                      renderValue={(selected) =>
                        referenceOptions[column.name]
                          ?.filter((option) => (selected as string[]).includes(option.value))
                          .map((option) => option.label)
                          .join(' / ') ?? ''
                      }
                      onChange={(event) =>
                        field.onChange(
                          typeof event.target.value === 'string'
                            ? event.target.value.split(',')
                            : event.target.value,
                        )
                      }
                    >
                      {referenceOptions[column.name]?.map((option) => (
                        <MenuItem key={option.value} value={option.value}>
                          <Checkbox checked={(Array.isArray(field.value) ? field.value : []).includes(option.value)} />
                          <ListItemText primary={option.label} />
                        </MenuItem>
                      ))}
                    </Select>
                    {fieldState.error?.message && (
                      <span className="field-error-text">{fieldState.error.message}</span>
                    )}
                  </FormControl>
                ) : (
                  <TextField
                    {...field}
                    error={Boolean(fieldState.error)}
                    fullWidth
                    helperText={fieldState.error?.message}
                    label={humanize(column.name)}
                    multiline={column.type === 'json' || column.format === 'textarea'}
                    minRows={column.format === 'textarea' ? 3 : undefined}
                    select={Boolean(column.options) || Boolean(referenceOptions[column.name])}
                    type={inputType(column)}
                  >
                    {column.options
                      ? column.options.map((option) => (
                          <MenuItem key={option.value} value={option.value}>
                            {option.label}
                          </MenuItem>
                        ))
                      : referenceOptions[column.name]?.map((option) => (
                          <MenuItem key={option.value} value={option.value}>
                            {option.label}
                          </MenuItem>
                        ))}
                  </TextField>
                )
              }
            />
          ))}
        </div>
        <Stack direction="row" spacing={1.5} sx={{ justifyContent: 'flex-end' }}>
          <Button onClick={onCancel}>Cancelar</Button>
          <Button disabled={isPending} type="submit" variant="contained">
            {submitLabel}
          </Button>
        </Stack>
      </Stack>
    </form>
  )
}

function isEditable(column: ColumnSchema, primaryKey: string | undefined, mode: 'create' | 'edit'): boolean {
  if (column.readOnly) return false
  if (mode === 'edit' && column.name === primaryKey) return false
  return true
}

function buildDefaultValues(columns: ColumnSchema[], row?: TableRow): FormValues {
  return Object.fromEntries(
    columns.map((column) => {
      const value = row?.[column.name]
      if (column.multiple) return [column.name, normalizeMultipleDefault(column, row, value)]
      if (value && typeof value === 'object') return [column.name, JSON.stringify(value)]
      if (value !== undefined && value !== null) return [column.name, value]
      if (column.type === 'boolean') return [column.name, false]
      return [column.name, '']
    }),
  )
}

function normalizeMultipleDefault(
  column: ColumnSchema,
  row: TableRow | undefined,
  value: TableRow[string] | undefined,
): string[] {
  const values = normalizeArrayValue(value)
  if (values.length > 0) return values

  if (column.name === 'titulares_ids' && row?.propietario_id) {
    return [String(row.propietario_id)]
  }

  return values
}

function buildSchema(columns: ColumnSchema[]) {
  const shape: Record<string, z.ZodType<unknown>> = {}
  for (const column of columns) {
    const base = schemaForColumn(column)
    shape[column.name] = column.required && !column.nullable ? base : base.optional().or(z.literal(''))
  }
  return z.object(shape)
}

function schemaForColumn(column: ColumnSchema): z.ZodType<unknown> {
  if (column.multiple) return z.array(z.string()).min(column.required ? 1 : 0, 'Selecciona al menos una opcion')
  if (column.type === 'integer') {
    return z.preprocess(
      (value) => (value === '' || value === null ? undefined : Number(value)),
      z.number({ error: 'Debe ser un numero' }).int('Debe ser un numero entero'),
    )
  }
  if (column.type === 'number') {
    return z.preprocess(
      (value) => (value === '' || value === null ? undefined : Number(value)),
      z.number({ error: 'Debe ser un numero' }),
    )
  }
  if (column.type === 'boolean') return z.union([z.boolean(), z.literal('true'), z.literal('false')])
  if (column.type === 'json') {
    return z.string().refine((value) => {
      if (!value) return true
      try {
        JSON.parse(value)
        return true
      } catch {
        return false
      }
    }, 'JSON invalido')
  }
  return z.string()
}

function normalizeArrayValue(value: TableRow[string] | undefined): string[] {
  if (Array.isArray(value)) return value.map(String)
  if (typeof value === 'string' && value) {
    try {
      const parsed = JSON.parse(value)
      if (Array.isArray(parsed)) return parsed.map(String)
    } catch {
      return [value]
    }
  }
  return []
}

function inputType(column: ColumnSchema): string {
  if (column.type === 'date') return 'date'
  if (column.type === 'datetime') return 'datetime-local'
  if (column.type === 'number' || column.type === 'integer') return 'number'
  return 'text'
}
