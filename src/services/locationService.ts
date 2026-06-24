import { supabase } from './supabase/client'
import type { TableRow } from './supabase/types'

interface CreateLocationInput {
  contract: TableRow
  ownerIds: string[]
  tenantIds: string[]
  guarantorIds: string[]
  ownerPercentages?: number[]
}

export async function createLocation({
  contract,
  ownerIds,
  tenantIds,
  guarantorIds,
  ownerPercentages,
}: CreateLocationInput): Promise<string> {
  const { data, error } = await supabase
    .from('contratos_alquiler')
    .insert(contract)
    .select('id')
    .single()
  if (error) throw error

  const contractId = String(data.id)
  const ownerRelations = ownerIds.map((ownerId, index) => ({
    contrato_id: contractId,
    propietario_id: ownerId,
    porcentaje: ownerPercentages?.[index] ?? (ownerIds.length === 1 ? 100 : null),
    principal: index === 0,
  }))
  const tenantRelations = tenantIds.map((tenantId, index) => ({
    contrato_id: contractId,
    inquilino_id: tenantId,
    principal: index === 0,
  }))
  const guarantorRelations = guarantorIds.map((guarantorId, index) => ({
    contrato_id: contractId,
    garante_cliente_id: guarantorId,
    principal: index === 0,
  }))

  try {
    if (ownerRelations.length) {
      const { error: ownerError } = await supabase.from('contrato_propietarios').insert(ownerRelations)
      if (ownerError) throw ownerError
    }
    if (tenantRelations.length) {
      const { error: tenantError } = await supabase.from('contrato_inquilinos').insert(tenantRelations)
      if (tenantError) throw tenantError
    }
    if (guarantorRelations.length) {
      const { error: guarantorError } = await supabase.from('contrato_garantes').insert(guarantorRelations)
      if (guarantorError) throw guarantorError
    }
    if (contract.propiedad_id) {
      const { error: propertyError } = await supabase
        .from('propiedades')
        .update({ estado: 'alquilada', alquilada: true })
        .eq('id', String(contract.propiedad_id))
      if (propertyError) throw propertyError
    }
    return contractId
  } catch (relationError) {
    await supabase.from('contrato_garantes').delete().eq('contrato_id', contractId)
    await supabase.from('contrato_inquilinos').delete().eq('contrato_id', contractId)
    await supabase.from('contrato_propietarios').delete().eq('contrato_id', contractId)
    await supabase.from('contratos_alquiler').delete().eq('id', contractId)
    throw relationError
  }
}
