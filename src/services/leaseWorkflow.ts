import { supabase } from './supabase/client'
import type { ContractDocumentData } from '../config/contractTemplates'

export interface OwnerInput {
  nombres: string
  apellidos: string
  dni: string
  email: string
  telefono: string
  direccion: string
  ciudad: string
  cp: string
  pais: string
  cuit: string
  porcentaje: number
}

export interface PropertyInput {
  tipoPropiedadId: string
  tipoPropiedad: string
  direccion: string
  ciudad: string
  cp: string
  pais: string
  partidaInmobiliaria: string
  superficieConstruida: string
  dormitorios: string
  banos: string
  composicion: string
  inventario: string
  observaciones: string
  canonPretendido: string
}

export interface TenantInput {
  nombres: string
  apellidos: string
  dni: string
  cuit: string
  email: string
  telefono: string
  direccion: string
  ciudad: string
  cp: string
  pais: string
  garanteNombre: string
  garanteApellidos: string
  garanteDni: string
  garanteCuit: string
  garanteTelefono: string
  garanteEmail: string
  garanteDomicilio: string
  garanteCiudad: string
  garanteCp: string
  garantePais: string
}

export interface ContractInput {
  plantillaContrato: string
  plazoContratoId: string
  monedaCobroId: string
  tipoActualizacionValorId: string
  fechaInicio: string
  fechaFin: string
  plazoMeses: string
  canonMensual: string
  depositoGarantia: string
  ajusteCadaMeses: string
  indiceAjuste: string
  comisionInmobiliaria: string
  destinoDetalle: string
  penalidadDiaria: string
  interesDiario: string
  pagoDiaDesde: string
  pagoDiaHasta: string
  formaPago: string
  lugarPago: string
  serviciosLocatario: string
  gastosLocador: string
  preavisoDias: string
  rescisionPorcentaje: string
  clausulasEspeciales: string
  ciudadFirma: string
  fechaFirma: string
  administradorNombre: string
  administradorMatricula: string
  incluyeExpensas: boolean
}

export interface LeaseWorkflowInput {
  owners: OwnerInput[]
  property: PropertyInput
  tenant: TenantInput
  contract: ContractInput
  documentData: ContractDocumentData
  contractContent: string
  contractFileName: string
  photos: File[]
}

export interface LeaseWorkflowResult {
  contractId: string
  propertyId: string
  tenantId: string
  ownerIds: string[]
  photoUrls: string[]
}

export async function createLeaseWorkflow(input: LeaseWorkflowInput): Promise<LeaseWorkflowResult> {
  let ownerIds: string[] = []
  const clientIds: string[] = []
  let propertyId = ''
  let tenantId = ''
  let contractId = ''
  let photoPaths: string[] = []

  try {
    const owners = await insertOwners(input.owners)
    ownerIds = owners.map((owner) => owner.id)
    clientIds.push(...owners.map((owner) => owner.clienteId))
    const property = await insertProperty(input.property, ownerIds)
    propertyId = property.id
    const uploadedPhotos = await uploadPropertyPhotos(property.id, input.photos)
    photoPaths = uploadedPhotos.paths

    if (uploadedPhotos.urls.length) {
      const { error } = await supabase
        .from('propiedades')
        .update({ fotos: JSON.stringify(uploadedPhotos.urls) })
        .eq('id', property.id)
      if (error) throw error
    }

    const tenant = await insertTenant(input.tenant)
    tenantId = tenant.id
    clientIds.push(tenant.clienteId, tenant.garanteClienteId)
    const contract = await insertContract(
      input,
      property.id,
      owners.map((owner) => owner.id),
      tenant.id,
    )
    contractId = contract.id

    return {
      contractId: contract.id,
      propertyId: property.id,
      tenantId: tenant.id,
      ownerIds,
      photoUrls: uploadedPhotos.urls,
    }
  } catch (error) {
    await rollbackWorkflow({ contractId, tenantId, propertyId, ownerIds, clientIds, photoPaths })
    throw error
  }
}

async function insertOwners(
  owners: OwnerInput[],
): Promise<Array<{ id: string; clienteId: string }>> {
  const { data: clients, error } = await supabase
    .from('clientes')
    .insert(
      owners.map((owner) => ({
        nombres: owner.nombres,
        apellidos: owner.apellidos,
        dni: numberOrNull(owner.dni),
        email: owner.email || null,
        telefono: owner.telefono || null,
        direccion: owner.direccion,
        ciudad: owner.ciudad,
        cp: owner.cp || null,
        pais: owner.pais || null,
        cuit: owner.cuit,
        es_propietario: true,
        es_inquilino: false,
        es_garante: false,
        fecha_alta: new Date().toISOString(),
      })),
    )
    .select('id')
  if (error) throw error

  const clientIds = (clients ?? []).map((client) => String(client.id))
  try {
    const { data: ownerRows, error: ownerError } = await supabase
      .from('propietarios')
      .select('id, cliente_id')
      .in('cliente_id', clientIds)
    if (ownerError) throw ownerError

    const ownerByClient = new Map(
      (ownerRows ?? []).map((owner) => [String(owner.cliente_id), String(owner.id)]),
    )
    return clientIds.map((clienteId) => {
      const id = ownerByClient.get(clienteId)
      if (!id) throw new Error('No se pudo crear el perfil de propietario para el cliente.')
      return { id, clienteId }
    })
  } catch (ownerError) {
    if (clientIds.length) {
      await supabase.from('propietarios').delete().in('cliente_id', clientIds)
      await supabase.from('clientes').delete().in('id', clientIds)
    }
    throw ownerError
  }
}

async function insertProperty(property: PropertyInput, ownerIds: string[]): Promise<{ id: string }> {
  const { data, error } = await supabase
    .from('propiedades')
    .insert({
      tipo_propiedad_id: property.tipoPropiedadId || null,
      tipo_propiedad: property.tipoPropiedad || null,
      direccion: property.direccion,
      ciudad: property.ciudad,
      cp: property.cp || null,
      pais: property.pais || null,
      partida_inmobiliaria: property.partidaInmobiliaria || null,
      superficie_construida: numberOrNull(property.superficieConstruida),
      numeros_dormitorios: numberOrNull(property.dormitorios),
      numeros_banos: numberOrNull(property.banos),
      composicion: property.composicion || null,
      inventario: property.inventario || null,
      observaciones: property.observaciones || null,
      monto_contrato: numberOrNull(property.canonPretendido),
      canon_pretendido: numberOrNull(property.canonPretendido),
      propietario_id: ownerIds[0],
      titulares_ids: ownerIds,
      estado: 'disponible',
      alquilada: false,
    })
    .select('id')
    .single()
  if (error) throw error
  return data as { id: string }
}

async function insertTenant(
  tenant: TenantInput,
): Promise<{ id: string; clienteId: string; garanteClienteId: string }> {
  const { data: clients, error } = await supabase
    .from('clientes')
    .insert([
      {
        nombres: tenant.nombres,
        apellidos: tenant.apellidos,
        dni: numberOrNull(tenant.dni),
        cuit: tenant.cuit,
        email: tenant.email || null,
        telefono: tenant.telefono || null,
        direccion: tenant.direccion,
        ciudad: tenant.ciudad,
        cp: tenant.cp || null,
        pais: tenant.pais || null,
        es_propietario: false,
        es_inquilino: true,
        es_garante: false,
        fecha_alta: new Date().toISOString(),
      },
      {
        nombres: tenant.garanteNombre,
        apellidos: tenant.garanteApellidos,
        dni: numberOrNull(tenant.garanteDni),
        cuit: tenant.garanteCuit,
        email: tenant.garanteEmail || null,
        telefono: tenant.garanteTelefono || null,
        direccion: tenant.garanteDomicilio,
        ciudad: tenant.garanteCiudad,
        cp: tenant.garanteCp || null,
        pais: tenant.garantePais || null,
        es_propietario: false,
        es_inquilino: false,
        es_garante: true,
        fecha_alta: new Date().toISOString(),
      },
    ])
    .select('id, es_inquilino, es_garante')
  if (error) throw error

  const insertedClientIds = (clients ?? []).map((client) => String(client.id))
  try {
    const tenantClient = (clients ?? []).find((client) => client.es_inquilino)
    const guarantorClient = (clients ?? []).find((client) => client.es_garante)
    if (!tenantClient || !guarantorClient) {
      throw new Error('No se pudieron crear los perfiles de locatario y garante.')
    }

    const { data: tenantRow, error: tenantError } = await supabase
      .from('inquilinos')
      .update({
        nombre_garante: `${tenant.garanteApellidos}, ${tenant.garanteNombre}`,
        dni_garante: tenant.garanteDni,
        domicilio_garante: `${tenant.garanteDomicilio}, ${tenant.garanteCiudad}`,
        garante_cliente_id: guarantorClient.id,
      })
      .eq('cliente_id', tenantClient.id)
      .select('id')
      .single()
    if (tenantError) throw tenantError

    return {
      id: String(tenantRow.id),
      clienteId: String(tenantClient.id),
      garanteClienteId: String(guarantorClient.id),
    }
  } catch (tenantError) {
    if (insertedClientIds.length) {
      await supabase.from('inquilinos').delete().in('cliente_id', insertedClientIds)
      await supabase.from('clientes').delete().in('id', insertedClientIds)
    }
    throw tenantError
  }
}

async function insertContract(
  input: LeaseWorkflowInput,
  propertyId: string,
  ownerIds: string[],
  tenantId: string,
): Promise<{ id: string }> {
  const start = new Date(`${input.contract.fechaInicio}T12:00:00`)
  const end = new Date(`${input.contract.fechaFin}T12:00:00`)
  const plazoDias = Math.max(0, Math.round((end.getTime() - start.getTime()) / 86400000))

  const { data, error } = await supabase
    .from('contratos_alquiler')
    .insert({
      propiedad_id: propertyId,
      propietario_id: ownerIds[0],
      inquilino_id: tenantId,
      propietarios_ids: ownerIds,
      inquilinos_ids: [tenantId],
      garantes_ids: [],
      plazo_contrato_id: input.contract.plazoContratoId,
      moneda_cobro_id: input.contract.monedaCobroId,
      tipo_actualizacion_valor_id: input.contract.tipoActualizacionValorId,
      fecha_inicio: input.contract.fechaInicio,
      fecha_fin: input.contract.fechaFin,
      fecha_locacion: input.contract.fechaInicio,
      fecha_fin_contrato: input.contract.fechaFin,
      plazo_dias: plazoDias,
      plazo_meses: numberOrNull(input.contract.plazoMeses),
      canon_inicial: numberOrNull(input.contract.canonMensual),
      deposito_garantia: numberOrNull(input.contract.depositoGarantia),
      comision_inmobiliaria: numberOrNull(input.contract.comisionInmobiliaria),
      destino_locacion: input.contract.destinoDetalle || null,
      plantilla_contrato: input.contract.plantillaContrato,
      incluye_expensas: input.contract.incluyeExpensas,
      datos_documento: input.documentData,
      contenido_contrato: input.contractContent,
      archivo_contrato: input.contractFileName,
      fecha_generacion: new Date().toISOString(),
      estado: 'borrador',
    })
    .select('id')
    .single()
  if (error) throw error
  return data as { id: string }
}

async function uploadPropertyPhotos(
  propertyId: string,
  photos: File[],
): Promise<{ paths: string[]; urls: string[] }> {
  const paths: string[] = []
  const urls: string[] = []

  try {
    for (const [index, file] of photos.entries()) {
      const extension = file.name.split('.').pop()?.toLowerCase() || 'jpg'
      const filePath = `${propertyId}/${index + 1}-${crypto.randomUUID()}.${extension}`
      const { error } = await supabase.storage.from('property-photos').upload(filePath, file, {
        cacheControl: '3600',
        contentType: file.type,
        upsert: false,
      })
      if (error) throw error

      paths.push(filePath)
      const { data } = supabase.storage.from('property-photos').getPublicUrl(filePath)
      urls.push(data.publicUrl)
    }
  } catch (error) {
    if (paths.length) await supabase.storage.from('property-photos').remove(paths)
    throw error
  }

  return { paths, urls }
}

async function rollbackWorkflow({
  contractId,
  tenantId,
  propertyId,
  ownerIds,
  clientIds,
  photoPaths,
}: {
  contractId: string
  tenantId: string
  propertyId: string
  ownerIds: string[]
  clientIds: string[]
  photoPaths: string[]
}) {
  if (contractId) await supabase.from('contratos_alquiler').delete().eq('id', contractId)
  if (tenantId) await supabase.from('inquilinos').delete().eq('id', tenantId)
  if (photoPaths.length) await supabase.storage.from('property-photos').remove(photoPaths)
  if (propertyId) await supabase.from('propiedades').delete().eq('id', propertyId)
  if (ownerIds.length) await supabase.from('propietarios').delete().in('id', ownerIds)
  if (clientIds.length) await supabase.from('clientes').delete().in('id', clientIds)
}

function numberOrNull(value: string): number | null {
  if (!value.trim()) return null
  const parsed = Number(value.replace(/\./g, '').replace(',', '.').replace(/[^\d.-]/g, ''))
  return Number.isFinite(parsed) ? parsed : null
}
