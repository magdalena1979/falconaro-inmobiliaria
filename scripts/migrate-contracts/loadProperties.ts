import type { MigrationClient } from './supabase.js'
import { fetchAll } from './supabase.js'
import type {
  CsvRow,
  ExistingProperty,
  ExistingPropertyType,
  MigrationIssue,
  MigrationStats,
  PropertyIndexes,
} from './types.js'
import { chunk, getField, normalizeText, parseBoolean, parseInteger, parseNumber } from './utils.js'

export async function loadPropertyIndexes(supabase: MigrationClient): Promise<PropertyIndexes> {
  const [properties, propertyTypes] = await Promise.all([
    fetchAll<ExistingProperty>(
      supabase,
      'propiedades',
      'id,numero_registro_propiedad,direccion,propietario_id,titulares_ids',
    ),
    fetchAll<ExistingPropertyType>(
      supabase,
      'tipos_propiedad',
      'id,nombre,tipo_propiedad',
    ),
  ])

  return {
    propertiesByRegistration: indexByRegistration(properties),
    propertyTypesByName: indexPropertyTypes(propertyTypes),
  }
}

export async function ensureProperties(
  supabase: MigrationClient,
  propertyRows: CsvRow[],
  stats: MigrationStats,
  applyChanges: boolean,
  issues: MigrationIssue[] = [],
): Promise<PropertyIndexes> {
  console.log('Cargando propiedades existentes...')
  let indexes = await loadPropertyIndexes(supabase)

  const missingProperties = propertyRows
    .filter((row) => {
      const registration = parseInteger(getField(row, 'NumeroRegistroPropiedad'))
      return registration !== null && !indexes.propertiesByRegistration.has(registration)
    })
    .map((row) => buildPropertyInsert(row, indexes.propertyTypesByName, issues))
    .filter((property): property is Record<string, unknown> & { numero_registro_propiedad: number } => (
      property !== null && typeof property.numero_registro_propiedad === 'number'
    ))

  if (missingProperties.length > 0 && applyChanges) {
    console.log(`Creando ${missingProperties.length} propiedades faltantes...`)
    for (const batch of chunk(missingProperties)) {
      const { error } = await supabase.from('propiedades').insert(batch)
      if (error) throw error
    }
    stats.insertedProperties += missingProperties.length
  } else if (missingProperties.length > 0) {
    console.log(`Propiedades que se crearian: ${missingProperties.length}`)
  }

  indexes = await loadPropertyIndexes(supabase)
  return indexes
}

function buildPropertyInsert(
  row: CsvRow,
  propertyTypesByName: Map<string, ExistingPropertyType>,
  issues: MigrationIssue[],
): Record<string, unknown> | null {
  const registration = parseInteger(getField(row, 'NumeroRegistroPropiedad'))
  const rawType = normalizeText(getField(row, 'TipoPropiedad'))
  const direction = normalizeText(getField(row, 'Direccion'))
  const propertyType = rawType ? propertyTypesByName.get(normalizeKey(rawType)) : undefined

  if (!registration) {
    issues.push({
      level: 'error',
      code: 'property_missing_registration',
      message: 'Propiedad sin NumeroRegistroPropiedad. Se omite para carga manual.',
    })
    return null
  }

  if (!direction) {
    issues.push({
      level: 'error',
      code: 'property_missing_address',
      message: `Propiedad ${registration}: falta direccion. Se omite para carga manual.`,
    })
    return null
  }

  if (!propertyType) {
    issues.push({
      level: 'error',
      code: 'property_type_not_found',
      message: `Propiedad ${registration}: el tipo "${rawType ?? ''}" no existe en tipos_propiedad. Se omite para carga manual.`,
    })
    return null
  }

  const rented = parseBoolean(getField(row, 'Alquilada')) ?? false
  const amount = parseNumber(getField(row, 'Monto_Contrato'))
  const bedrooms = parseInteger(getField(row, 'NumerosDormitorios')) ?? 0
  const bathrooms = parseInteger(getField(row, 'NumerosBanos', 'NumerosBaños', 'NumerosBaÃ±os')) ?? 0
  const city = normalizeText(getField(row, 'Ciudad')) ?? ''
  const country = normalizeText(getField(row, 'Pais')) ?? 'Argentina'
  const postalCode = normalizeText(getField(row, 'CP')) ?? ''
  const observations = normalizeText(getField(row, 'Observaciones')) ?? ''

  return {
    codigo: `ACCESS-${registration}`,
    tipo_propiedad_id: propertyType.id,
    numero_registro_propiedad: registration,
    tipo_propiedad: rawType,
    direccion: direction,
    ciudad: city,
    provincia: '',
    cp: postalCode,
    codigo_postal: postalCode,
    pais: country,
    dormitorios: bedrooms,
    banos: bathrooms,
    monto_contrato: amount,
    canon_pretendido: amount,
    valor_alquiler: amount,
    comision: parseInteger(getField(row, 'Comision')),
    superficie_parcela: parseInteger(getField(row, 'SuperficieParcela')),
    superficie_construida: parseInteger(getField(row, 'SuperficieConstruida')),
    superficie_total: parseNumber(getField(row, 'SuperficieParcela')),
    superficie_cubierta: parseNumber(getField(row, 'SuperficieConstruida')),
    numeros_dormitorios: bedrooms,
    numeros_banos: bathrooms,
    jardin: parseBoolean(getField(row, 'Jardin')) ?? false,
    piscina: parseBoolean(getField(row, 'Piscina')) ?? false,
    garage: parseBoolean(getField(row, 'Garage')) ?? false,
    nueva_segunda_mano: normalizeText(getField(row, 'Nueva/SegundaMano')),
    observaciones: observations,
    adjuntos: normalizeText(getField(row, 'Adjuntos')),
    alquilada: rented,
    cartel: parseBoolean(getField(row, 'Cartel')) ?? false,
    estado: rented ? 'alquilada' : 'disponible',
    titulares_ids: [],
  }
}

function indexByRegistration(items: ExistingProperty[]): Map<number, ExistingProperty> {
  const index = new Map<number, ExistingProperty>()
  for (const item of items) {
    if (item.numero_registro_propiedad !== null && !index.has(item.numero_registro_propiedad)) {
      index.set(item.numero_registro_propiedad, item)
    }
  }
  return index
}

function indexPropertyTypes(items: ExistingPropertyType[]): Map<string, ExistingPropertyType> {
  const index = new Map<string, ExistingPropertyType>()
  for (const item of items) {
    for (const value of [item.nombre, item.tipo_propiedad]) {
      if (value) index.set(normalizeKey(value), item)
    }
  }
  return index
}

function normalizeKey(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
}
