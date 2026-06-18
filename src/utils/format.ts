import type { ColumnSchema, JsonValue, TableRow } from '../services/supabase/types'

export function humanize(value: string): string {
  return value
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .trim()
    .replace(/\w\S*/g, (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
}

export function formatValue(value: JsonValue, column?: ColumnSchema): string {
  if (value === null || value === undefined) return '-'
  if (column?.type === 'boolean') return value ? 'Si' : 'No'
  if (column?.type === 'number' || column?.type === 'integer') return String(value)
  if (column?.type === 'date' || column?.type === 'datetime') {
    const date = new Date(String(value))
    return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleDateString('es-AR')
  }
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

export function getRowLabel(row: TableRow, columns: ColumnSchema[]): string {
  const preferredNames = ['nombre', 'name', 'titulo', 'title', 'direccion', 'address', 'email']
  const preferred = preferredNames.find((name) => row[name])
  if (preferred) return String(row[preferred])

  const firstTextColumn = columns.find((column) => column.type === 'string' && row[column.name])
  if (firstTextColumn) return String(row[firstTextColumn.name])

  const primaryValue = row.id ?? Object.values(row).find((value) => value !== null && value !== undefined)
  return primaryValue === undefined ? 'Registro' : String(primaryValue)
}

export function includesText(row: TableRow, search: string): boolean {
  const needle = search.trim().toLowerCase()
  if (!needle) return true
  return Object.values(row).some((value) => String(value ?? '').toLowerCase().includes(needle))
}

export function isStatusMatch(value: JsonValue, terms: string[]): boolean {
  const normalized = String(value ?? '').toLowerCase()
  return terms.some((term) => normalized.includes(term))
}
