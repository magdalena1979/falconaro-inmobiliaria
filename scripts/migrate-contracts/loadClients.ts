import type { MigrationClient } from './supabase.js'
import { fetchAll } from './supabase.js'
import type {
  CsvRow,
  ExistingClient,
  ExistingOwner,
  ExistingTenant,
  MigrationIssue,
  MigrationStats,
  PersonIndexes,
} from './types.js'
import { chunk, getField, normalizeDni, normalizeText } from './utils.js'

interface DesiredPerson {
  dni: number
  nombres: string | null
  apellidos: string | null
  telefono: string | null
  email: string | null
  direccion: string | null
  ciudad: string | null
  cp: string | null
  pais: string | null
  cuit: string | null
  owner: boolean
  tenant: boolean
}

export async function loadPersonIndexes(supabase: MigrationClient): Promise<PersonIndexes> {
  const [clients, owners, tenants] = await Promise.all([
    fetchAll<ExistingClient>(
      supabase,
      'clientes',
      'id,dni,numero_documento,nombres,apellidos,telefono,email,direccion,ciudad,cp,pais,cuit,es_propietario,es_inquilino',
    ),
    fetchAll<ExistingOwner>(
      supabase,
      'propietarios',
      'id,cliente_id,dni,nombres,apellidos,telefono,email,direccion,ciudad,cp,pais',
    ),
    fetchAll<ExistingTenant>(
      supabase,
      'inquilinos',
      'id,cliente_id,dni,nombres,apellidos,telefono,email,direccion,ciudad,cp,pais',
    ),
  ])

  return {
    clientsByDni: indexClientsByDni(clients),
    ownersByDni: indexByDni(owners),
    tenantsByDni: indexByDni(tenants),
  }
}

export async function ensurePeople(
  supabase: MigrationClient,
  ownerRows: CsvRow[],
  clientRows: CsvRow[],
  rentalRows: CsvRow[],
  stats: MigrationStats,
  applyChanges: boolean,
  issues: MigrationIssue[] = [],
): Promise<PersonIndexes> {
  console.log('Cargando clientes, propietarios e inquilinos existentes...')
  let indexes = await loadPersonIndexes(supabase)
  const initialOwnerCount = indexes.ownersByDni.size
  const initialTenantCount = indexes.tenantsByDni.size
  const desiredPeople = buildDesiredPeople(ownerRows, clientRows, rentalRows, indexes.clientsByDni)

  const missingClients = [...desiredPeople.values()]
    .filter((person) => !indexes.clientsByDni.has(person.dni))
  const createableClients = missingClients.filter((person) => canCreateClient(person, issues))
  const manualClients = missingClients.length - createableClients.length
  const clientInserts = createableClients.map((person) => ({
    tipo_documento: 'DNI',
    numero_documento: String(person.dni),
    dni: person.dni,
    nombres: person.nombres ?? '',
    apellidos: person.apellidos ?? '',
    razon_social: '',
    cuit: person.cuit ?? '',
    telefono: person.telefono ?? '',
    celular: '',
    email: person.email ?? '',
    direccion: person.direccion ?? '',
    ciudad: person.ciudad ?? '',
    provincia: '',
    pais: person.pais ?? 'Argentina',
    codigo_postal: person.cp ?? '',
    observaciones: '',
    cp: person.cp,
    cuit_empresa: person.cuit,
    es_propietario: person.owner,
    es_inquilino: person.tenant,
    es_garante: false,
  }))

  if (manualClients > 0) {
    console.log(`Clientes omitidos para carga manual por campos obligatorios faltantes: ${manualClients}`)
  }

  if (clientInserts.length > 0 && applyChanges) {
    console.log(`Creando ${clientInserts.length} clientes faltantes...`)
    for (const batch of chunk(clientInserts)) {
      const { error } = await supabase.from('clientes').insert(batch)
      if (error) throw error
    }
    stats.insertedClients += clientInserts.length
  } else if (clientInserts.length > 0) {
    console.log(`Clientes que se crearian: ${clientInserts.length}`)
  }

  indexes = await loadPersonIndexes(supabase)

  const ownerClientIds = [...desiredPeople.values()]
    .filter((person) => person.owner)
    .map((person) => indexes.clientsByDni.get(person.dni)?.id)
    .filter((id): id is string => Boolean(id))
  const tenantClientIds = [...desiredPeople.values()]
    .filter((person) => person.tenant)
    .map((person) => indexes.clientsByDni.get(person.dni)?.id)
    .filter((id): id is string => Boolean(id))

  if (applyChanges) {
    await updateRoleFlags(supabase, ownerClientIds, { es_propietario: true })
    await updateRoleFlags(supabase, tenantClientIds, { es_inquilino: true })
  }

  indexes = await loadPersonIndexes(supabase)

  const missingOwners = [...desiredPeople.values()]
    .filter((person) => person.owner && !indexes.ownersByDni.has(person.dni))
    .map((person) => buildOwnerInsert(person, indexes.clientsByDni.get(person.dni)?.id ?? null, issues))
    .filter((owner): owner is Record<string, unknown> => owner !== null)

  if (missingOwners.length > 0 && applyChanges) {
    console.log(`Creando ${missingOwners.length} propietarios faltantes...`)
    for (const batch of chunk(missingOwners)) {
      const { error } = await supabase.from('propietarios').insert(batch)
      if (error) throw error
    }
    stats.insertedOwners += missingOwners.length
  } else if (missingOwners.length > 0) {
    console.log(`Propietarios que se crearian: ${missingOwners.length}`)
  }

  const missingTenants = [...desiredPeople.values()]
    .filter((person) => person.tenant && !indexes.tenantsByDni.has(person.dni))
    .map((person) => buildTenantInsert(person, indexes.clientsByDni.get(person.dni)?.id ?? null, issues))
    .filter((tenant): tenant is Record<string, unknown> => tenant !== null)

  if (missingTenants.length > 0 && applyChanges) {
    console.log(`Creando ${missingTenants.length} inquilinos faltantes...`)
    for (const batch of chunk(missingTenants)) {
      const { error } = await supabase.from('inquilinos').insert(batch)
      if (error) throw error
    }
    stats.insertedTenants += missingTenants.length
  } else if (missingTenants.length > 0) {
    console.log(`Inquilinos que se crearian: ${missingTenants.length}`)
  }

  const finalIndexes = await loadPersonIndexes(supabase)
  stats.insertedOwners = Math.max(stats.insertedOwners, finalIndexes.ownersByDni.size - initialOwnerCount)
  stats.insertedTenants = Math.max(stats.insertedTenants, finalIndexes.tenantsByDni.size - initialTenantCount)

  return finalIndexes
}

function buildDesiredPeople(
  ownerRows: CsvRow[],
  clientRows: CsvRow[],
  rentalRows: CsvRow[],
  existingClientsByDni: Map<number, ExistingClient>,
): Map<number, DesiredPerson> {
  const people = new Map<number, DesiredPerson>()

  for (const row of ownerRows) {
    const dni = normalizeDni(getField(row, 'DNI'))
    if (!dni) continue
    mergePerson(people, {
      dni,
      nombres: normalizeText(getField(row, 'NOMBRES')),
      apellidos: normalizeText(getField(row, 'APELLIDOS')),
      telefono: normalizeText(getField(row, 'TELEFONO', 'CELULAR')),
      email: normalizeText(getField(row, 'EMAIL')),
      direccion: normalizeText(getField(row, 'DIRECCION')),
      ciudad: normalizeText(getField(row, 'CIUDAD')),
      cp: normalizeText(getField(row, 'CP')),
      pais: normalizeText(getField(row, 'PAIS')),
      cuit: normalizeText(getField(row, 'CUIT EMPRESA')),
      owner: true,
      tenant: false,
    })
  }

  for (const row of clientRows) {
    const dni = normalizeDni(getField(row, 'DNI'))
    if (!dni) continue
    mergePerson(people, {
      dni,
      nombres: normalizeText(getField(row, 'NOMBRES')),
      apellidos: normalizeText(getField(row, 'APELLIDOS')),
      telefono: normalizeText(getField(row, 'TELEFONO', 'CELULARLOCATARIO')),
      email: normalizeText(getField(row, 'EMAIL')),
      direccion: normalizeText(getField(row, 'DIRECCION')),
      ciudad: normalizeText(getField(row, 'CIUDAD')),
      cp: normalizeText(getField(row, 'CP')),
      pais: normalizeText(getField(row, 'PAIS')),
      cuit: normalizeText(getField(row, 'CUIT EMPRESA')),
      owner: false,
      tenant: true,
    })
  }

  for (const row of rentalRows) {
    const ownerDni = normalizeDni(getField(row, 'DNI_Locador'))
    const tenantDni = normalizeDni(getField(row, 'DNI_Locatario'))

    if (ownerDni && existingClientsByDni.has(ownerDni)) {
      mergeFromExistingClient(people, existingClientsByDni.get(ownerDni), true, false)
    }
    if (tenantDni && existingClientsByDni.has(tenantDni)) {
      mergeFromExistingClient(people, existingClientsByDni.get(tenantDni), false, true)
    }
  }

  return people
}

function mergePerson(people: Map<number, DesiredPerson>, incoming: DesiredPerson): void {
  const current = people.get(incoming.dni)
  if (!current) {
    people.set(incoming.dni, incoming)
    return
  }

  people.set(incoming.dni, {
    ...current,
    nombres: current.nombres ?? incoming.nombres,
    apellidos: current.apellidos ?? incoming.apellidos,
    telefono: current.telefono ?? incoming.telefono,
    email: current.email ?? incoming.email,
    direccion: current.direccion ?? incoming.direccion,
    ciudad: current.ciudad ?? incoming.ciudad,
    cp: current.cp ?? incoming.cp,
    pais: current.pais ?? incoming.pais,
    cuit: current.cuit ?? incoming.cuit,
    owner: current.owner || incoming.owner,
    tenant: current.tenant || incoming.tenant,
  })
}

function mergeFromExistingClient(
  people: Map<number, DesiredPerson>,
  client: ExistingClient | undefined,
  owner: boolean,
  tenant: boolean,
): void {
  const dni = client?.dni
  if (!client || !dni) return
  mergePerson(people, {
    dni,
    nombres: client.nombres,
    apellidos: client.apellidos,
    telefono: client.telefono,
    email: client.email,
    direccion: client.direccion,
    ciudad: client.ciudad,
    cp: client.cp,
    pais: client.pais,
    cuit: client.cuit,
    owner,
    tenant,
  })
}

function canCreateClient(person: DesiredPerson, issues: MigrationIssue[]): boolean {
  const missingFields: string[] = []
  if (!person.dni) missingFields.push('dni')
  if (!person.nombres) missingFields.push('nombres')

  if (missingFields.length === 0) return true

  issues.push({
    level: 'error',
    code: 'client_required_fields_missing',
    message: `Cliente DNI ${person.dni}: faltan campos obligatorios (${missingFields.join(', ')}). Se omite para carga manual.`,
  })

  return false
}

async function updateRoleFlags(
  supabase: MigrationClient,
  clientIds: string[],
  flags: Partial<Pick<ExistingClient, 'es_propietario' | 'es_inquilino'>>,
): Promise<void> {
  const uniqueIds = [...new Set(clientIds)]
  for (const batch of chunk(uniqueIds)) {
    if (batch.length === 0) continue
    const { error } = await supabase.from('clientes').update(flags).in('id', batch)
    if (error) throw error
  }
}

function buildOwnerInsert(
  person: DesiredPerson,
  clientId: string | null,
  issues: MigrationIssue[],
): Record<string, unknown> | null {
  if (!clientId) {
    issues.push({
      level: 'error',
      code: 'owner_without_client',
      message: `Propietario DNI ${person.dni}: no se puede crear porque no existe cliente valido. Se omite para carga manual.`,
    })
    return null
  }

  return {
    cliente_id: clientId,
    dni: person.dni,
    nombres: person.nombres,
    apellidos: person.apellidos,
    telefono: person.telefono,
    email: person.email,
    direccion: person.direccion,
    ciudad: person.ciudad,
    cp: person.cp,
    pais: person.pais,
    cuit_empresa: person.cuit,
  }
}

function buildTenantInsert(
  person: DesiredPerson,
  clientId: string | null,
  issues: MigrationIssue[],
): Record<string, unknown> | null {
  if (!clientId) {
    issues.push({
      level: 'error',
      code: 'tenant_without_client',
      message: `Inquilino DNI ${person.dni}: no se puede crear porque no existe cliente valido. Se omite para carga manual.`,
    })
    return null
  }

  return {
    cliente_id: clientId,
    dni: person.dni,
    nombres: person.nombres,
    apellidos: person.apellidos,
    telefono: person.telefono,
    email: person.email,
    direccion: person.direccion,
    ciudad: person.ciudad,
    cp: person.cp,
    pais: person.pais,
    fecha_alta: new Date().toISOString(),
  }
}

function indexByDni<T extends { dni: number | null }>(items: T[]): Map<number, T> {
  const index = new Map<number, T>()
  for (const item of items) {
    if (item.dni !== null && !index.has(item.dni)) index.set(item.dni, item)
  }
  return index
}

function indexClientsByDni(items: ExistingClient[]): Map<number, ExistingClient> {
  const index = new Map<number, ExistingClient>()
  for (const item of items) {
    const dni = item.dni ?? normalizeDni(item.numero_documento)
    if (dni !== null && !index.has(dni)) index.set(dni, item)
  }
  return index
}
