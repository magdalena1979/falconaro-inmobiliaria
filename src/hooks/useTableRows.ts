import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createRow, deleteRow, listRows, updateRow } from '../services/supabase/tableService'
import type { TableRow, TableSchema } from '../services/supabase/types'

export function useTableRows(table: TableSchema | undefined) {
  return useQuery({
    queryKey: ['table-rows', table?.name],
    queryFn: () => listRows(table!),
    enabled: Boolean(table),
  })
}

export function useTableMutations(table: TableSchema | undefined) {
  const queryClient = useQueryClient()
  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: ['table-rows', table?.name] })
    await queryClient.invalidateQueries({ queryKey: ['dashboard-metrics'] })
  }

  const create = useMutation({
    mutationFn: (row: TableRow) => createRow(table!, row),
    onSuccess: invalidate,
  })

  const update = useMutation({
    mutationFn: (row: TableRow) => updateRow(table!, row),
    onSuccess: invalidate,
  })

  const remove = useMutation({
    mutationFn: (row: TableRow) => deleteRow(table!, row),
    onSuccess: invalidate,
  })

  return { create, update, remove, isPending: create.isPending || update.isPending || remove.isPending }
}
