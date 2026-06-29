import { supabase } from './client'
import type { ColumnSchema, TableRow, TableSchema } from './types'

export async function listRows(table: TableSchema): Promise<TableRow[]> {
  let query = supabase.from(table.name).select('*')
  const orderColumn = findOrderColumn(table.columns)
  if (orderColumn) {
    query = query.order(orderColumn, { ascending: false, nullsFirst: false })
  }

  const { data, error } = await query.limit(1000)
  if (error) throw error
  return (data ?? []) as TableRow[]
}

export async function countRows(table: TableSchema): Promise<number> {
  const { count, error } = await supabase.from(table.name).select('*', { count: 'exact', head: true })
  if (error) throw error
  return count ?? 0
}

export async function createRow(table: TableSchema, row: TableRow): Promise<void> {
  const payload = cleanPayload(row, table.columns)
  const query = supabase.from(table.name).insert(payload)
  const { data, error } = table.primaryKey
    ? await query.select(table.primaryKey).single()
    : await query
  if (error) throw formatSupabaseError(error, table.name, 'crear')
  if (table.name === 'propiedades' && table.primaryKey && data) {
    await syncPropertyOwners(String((data as unknown as TableRow)[table.primaryKey]), row)
  }
}

export async function updateRow(table: TableSchema, row: TableRow): Promise<void> {
  if (!table.primaryKey) throw new Error(`La tabla ${table.name} no expone una clave primaria editable.`)
  const id = row[table.primaryKey]
  const { error } = await supabase
    .from(table.name)
    .update(cleanPayload(row, table.columns, table.primaryKey))
    .eq(table.primaryKey, id as string | number | boolean)
  if (error) throw formatSupabaseError(error, table.name, 'actualizar')
  if (table.name === 'propiedades') {
    await syncPropertyOwners(String(id), row)
  }
}

export async function deleteRow(table: TableSchema, row: TableRow): Promise<void> {
  if (!table.primaryKey) throw new Error(`La tabla ${table.name} no expone una clave primaria editable.`)
  const id = row[table.primaryKey]
  const { error } = await supabase.from(table.name).delete().eq(table.primaryKey, id as string | number | boolean)
  if (error) throw formatSupabaseError(error, table.name, 'eliminar')
}

function cleanPayload(row: TableRow, columns: ColumnSchema[], primaryKey?: string): TableRow {
  const editableColumns = new Set(
    columns
      .filter((column) => !column.readOnly && column.name !== primaryKey)
      .map((column) => column.name),
  )

  const payload = Object.fromEntries(
    Object.entries(row)
      .filter(([key]) => editableColumns.has(key))
      .filter(([, value]) => value !== '' && value !== undefined)
      .map(([key, value]) => [key, value]),
  )

  if (row.titulares_ids && Array.isArray(row.titulares_ids)) {
    payload.propietario_id = row.titulares_ids[0] ?? null
  }

  return payload
}

async function syncPropertyOwners(propertyId: string, row: TableRow): Promise<void> {
  if (!('titulares_ids' in row)) return
  const ownerIds = arrayValue(row.titulares_ids)

  const { error: deleteError } = await supabase
    .from('propiedad_propietarios')
    .delete()
    .eq('propiedad_id', propertyId)
  if (deleteError) throw formatSupabaseError(deleteError, 'propiedad_propietarios', 'actualizar')
  if (!ownerIds.length) return

  const { error: insertError } = await supabase.from('propiedad_propietarios').insert(
    ownerIds.map((ownerId, index) => ({
      propiedad_id: propertyId,
      propietario_id: ownerId,
      principal: index === 0,
    })),
  )
  if (insertError) throw formatSupabaseError(insertError, 'propiedad_propietarios', 'actualizar')
}

function arrayValue(value: TableRow[string] | undefined): string[] {
  if (Array.isArray(value)) return value.map(String).filter(Boolean)
  if (typeof value === 'string' && value.startsWith('[')) {
    try {
      const parsed = JSON.parse(value)
      return Array.isArray(parsed) ? parsed.map(String).filter(Boolean) : []
    } catch {
      return []
    }
  }
  return value ? [String(value)] : []
}

function formatSupabaseError(
  error: { message: string; code?: string; details?: string; hint?: string },
  tableName: string,
  action: string,
): Error {
  const parts = [
    `No se pudo ${action} en ${tableName}.`,
    error.message,
    error.details,
    error.hint,
    error.code ? `Código: ${error.code}` : undefined,
  ].filter(Boolean)
  return new Error(parts.join(' '))
}

function findOrderColumn(columns: ColumnSchema[]): string | undefined {
  return (
    columns.find((column) => column.name === 'created_at')?.name ??
    columns.find((column) => column.name === 'updated_at')?.name ??
    columns.find((column) => column.type === 'datetime')?.name ??
    columns.find((column) => column.type === 'date')?.name
  )
}
