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
  const { error } = await supabase.from(table.name).insert(cleanPayload(row, table.columns))
  if (error) throw error
}

export async function updateRow(table: TableSchema, row: TableRow): Promise<void> {
  if (!table.primaryKey) throw new Error(`La tabla ${table.name} no expone una clave primaria editable.`)
  const id = row[table.primaryKey]
  const { error } = await supabase
    .from(table.name)
    .update(cleanPayload(row, table.columns, table.primaryKey))
    .eq(table.primaryKey, id as string | number | boolean)
  if (error) throw error
}

export async function deleteRow(table: TableSchema, row: TableRow): Promise<void> {
  if (!table.primaryKey) throw new Error(`La tabla ${table.name} no expone una clave primaria editable.`)
  const id = row[table.primaryKey]
  const { error } = await supabase.from(table.name).delete().eq(table.primaryKey, id as string | number | boolean)
  if (error) throw error
}

function cleanPayload(row: TableRow, columns: ColumnSchema[], primaryKey?: string): TableRow {
  const editableColumns = new Set(
    columns
      .filter((column) => !column.readOnly && column.name !== primaryKey)
      .map((column) => column.name),
  )

  return Object.fromEntries(
    Object.entries(row)
      .filter(([key]) => editableColumns.has(key))
      .map(([key, value]) => [key, value === '' ? null : value]),
  )
}

function findOrderColumn(columns: ColumnSchema[]): string | undefined {
  return (
    columns.find((column) => column.name === 'created_at')?.name ??
    columns.find((column) => column.name === 'updated_at')?.name ??
    columns.find((column) => column.type === 'datetime')?.name
  )
}
