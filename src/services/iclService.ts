import { supabase } from './supabase/client'

export interface IclIndex {
  fecha: string
  valor: number
  created_at: string
}

export interface ContractAdjustment {
  id: string
  contrato_id: string
  fecha_ajuste: string
  icl_origen: number
  icl_destino: number
  monto_anterior: number
  monto_nuevo: number
  created_at: string
}

export interface IclContract {
  id: string
  fecha_inicio: string | null
  fecha_fin: string | null
  monto_inicial: number | null
  monto_actual: number | null
  frecuencia_ajuste: number | null
  tipo_indice: string | null
  proxima_fecha_ajuste: string | null
  icl_base: number | null
}

export interface ContractIclSummary {
  contract: IclContract
  adjustments: ContractAdjustment[]
  latestStoredIndex: IclIndex | null
}

export async function getContractIclSummary(contractId: string): Promise<ContractIclSummary> {
  const [contractResult, adjustmentsResult, latestIndexResult] = await Promise.all([
    supabase
      .from('contratos_alquiler')
      .select(
        'id, fecha_inicio, fecha_fin, monto_inicial, monto_actual, frecuencia_ajuste, tipo_indice, proxima_fecha_ajuste, icl_base',
      )
      .eq('id', contractId)
      .single(),
    supabase
      .from('ajustes_contrato')
      .select('id, contrato_id, fecha_ajuste, icl_origen, icl_destino, monto_anterior, monto_nuevo, created_at')
      .eq('contrato_id', contractId)
      .order('fecha_ajuste', { ascending: false }),
    supabase
      .from('icl_indices')
      .select('fecha, valor, created_at')
      .order('fecha', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ])

  if (contractResult.error) throw contractResult.error
  if (adjustmentsResult.error) throw adjustmentsResult.error
  if (latestIndexResult.error) throw latestIndexResult.error

  return {
    contract: contractResult.data as IclContract,
    adjustments: (adjustmentsResult.data ?? []) as ContractAdjustment[],
    latestStoredIndex: latestIndexResult.data as IclIndex | null,
  }
}
