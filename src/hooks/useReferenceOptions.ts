import { useQueries } from '@tanstack/react-query'
import { supabase } from '../services/supabase/client'
import type { TableRow, TableSchema } from '../services/supabase/types'

export interface ReferenceOption {
  value: string
  label: string
}

export type ReferenceOptions = Record<string, ReferenceOption[]>

export function useReferenceOptions(table: TableSchema): ReferenceOptions {
  const referenceColumns = table.columns.filter((column) => column.reference)
  const queries = useQueries({
    queries: referenceColumns.map((column) => ({
      queryKey: ['reference-options', table.name, column.name, column.reference?.table],
      queryFn: async () => {
        const reference = column.reference!
        const { data, error } = await supabase.from(reference.table).select('*')
        if (error) throw error

        return {
          columnName: column.name,
          rows: (data ?? []) as TableRow[],
          valueColumn: reference.valueColumn,
          labelColumns: reference.labelColumns,
        }
      },
      staleTime: 1000 * 60 * 3,
    })),
  })

  return queries.reduce<ReferenceOptions>((options, query) => {
    const data = query.data
    if (!data) return options

    options[data.columnName] = data.rows.map((row) => ({
      value: String(row[data.valueColumn]),
      label: buildLabel(row, data.labelColumns),
    }))

    return options
  }, {})
}

function buildLabel(row: TableRow, columns: string[]): string {
  const label = columns
    .map((column) => row[column])
    .filter((value) => value !== null && value !== undefined && value !== '')
    .join(' ')

  return label || String(row.id ?? 'Registro')
}
