import type { MigrationClient } from './supabase.js'
import { fetchAll } from './supabase.js'
import type {
  ContractIndexes,
  ExistingContract,
  ExistingProperty,
  MigrationStats,
  PreparedContract,
  PropertyOwnerLink,
} from './types.js'
import { chunk } from './utils.js'

export async function loadContractIndexes(supabase: MigrationClient): Promise<ContractIndexes> {
  const contracts = await fetchAll<ExistingContract>(supabase, 'contratos_alquiler', 'id,id_locacion')
  const contractsByLegacyId = new Map<number, ExistingContract>()

  for (const contract of contracts) {
    if (contract.id_locacion !== null && !contractsByLegacyId.has(contract.id_locacion)) {
      contractsByLegacyId.set(contract.id_locacion, contract)
    }
  }

  return { contractsByLegacyId }
}

export async function linkPropertiesToOwners(
  supabase: MigrationClient,
  links: PropertyOwnerLink[],
  stats: MigrationStats,
): Promise<void> {
  const uniqueLinks = consolidateLinks(links)
  if (uniqueLinks.length === 0) return

  const properties = await fetchAll<ExistingProperty>(
    supabase,
    'propiedades',
    'id,numero_registro_propiedad,direccion,propietario_id,titulares_ids',
  )
  const propertiesById = new Map(properties.map((property) => [property.id, property]))

  const updates = uniqueLinks.map((link) => {
    const property = propertiesById.get(link.propertyId)
    const currentOwners = property?.titulares_ids ?? []
    const titularesIds = [...new Set([...currentOwners, ...link.ownerIds])]

    return {
      id: link.propertyId,
      propietario_id: property?.propietario_id ?? link.ownerIds[0],
      titulares_ids: titularesIds,
      estado: 'alquilada',
      alquilada: true,
    }
  })

  console.log(`Vinculando ${updates.length} propiedades con propietarios...`)
  for (const update of updates) {
    const { id, ...changes } = update
    const { error } = await supabase
      .from('propiedades')
      .update(changes)
      .eq('id', id)
    if (error) throw error
    stats.linkedProperties += 1
  }
}

export async function insertContracts(
  supabase: MigrationClient,
  contracts: PreparedContract[],
  stats: MigrationStats,
): Promise<void> {
  if (contracts.length === 0) return

  console.log(`Insertando ${contracts.length} contratos en batches...`)
  for (const batch of chunk(contracts)) {
    const { error } = await supabase.from('contratos_alquiler').insert(batch)
    if (error) throw error
    stats.insertedContracts += batch.length
    console.log(`Contratos insertados hasta ahora: ${stats.insertedContracts}/${contracts.length}`)
  }
}

function consolidateLinks(links: PropertyOwnerLink[]): Array<{ propertyId: string; ownerIds: string[] }> {
  const byProperty = new Map<string, Set<string>>()

  for (const link of links) {
    const owners = byProperty.get(link.propertyId) ?? new Set<string>()
    owners.add(link.ownerId)
    byProperty.set(link.propertyId, owners)
  }

  return [...byProperty.entries()].map(([propertyId, ownerIds]) => ({
    propertyId,
    ownerIds: [...ownerIds],
  }))
}
