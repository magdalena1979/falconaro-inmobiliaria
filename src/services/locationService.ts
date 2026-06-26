import { supabase } from './supabase/client'
import type { TableRow } from './supabase/types'

interface CreateLocationInput {
  contract: TableRow
  ownerIds: string[]
  tenantIds: string[]
  guarantorIds: string[]
}

export async function createLocation({
  contract,
  ownerIds,
  tenantIds,
  guarantorIds,
}: CreateLocationInput): Promise<string> {
  const { data, error } = await supabase
    .from('contratos_alquiler')
    .insert({
      ...contract,
      propietarios_ids: ownerIds,
      inquilinos_ids: tenantIds,
      garantes_ids: guarantorIds,
    })
    .select('id')
    .single()
  if (error) throw error

  const contractId = String(data.id)
  try {
    if (contract.propiedad_id) {
      const { error: propertyError } = await supabase
        .from('propiedades')
        .update({ estado: 'alquilada', alquilada: true })
        .eq('id', String(contract.propiedad_id))
      if (propertyError) throw propertyError
    }
    return contractId
  } catch (relationError) {
    await supabase.from('contratos_alquiler').delete().eq('id', contractId)
    throw relationError
  }
}
