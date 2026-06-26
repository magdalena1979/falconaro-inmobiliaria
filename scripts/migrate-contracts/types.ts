export type CsvRow = Record<string, string>

export interface ExistingClient {
  id: string
  dni: number | null
  numero_documento: string | null
  nombres: string | null
  apellidos: string | null
  telefono: string | null
  email: string | null
  direccion: string | null
  ciudad: string | null
  cp: string | null
  pais: string | null
  cuit: string | null
  es_propietario: boolean | null
  es_inquilino: boolean | null
}

export interface ExistingOwner {
  id: string
  cliente_id: string | null
  dni: number | null
  nombres: string | null
  apellidos: string | null
  telefono: string | null
  email: string | null
  direccion: string | null
  ciudad: string | null
  cp: string | null
  pais: string | null
}

export interface ExistingTenant {
  id: string
  cliente_id: string | null
  dni: number | null
  nombres: string | null
  apellidos: string | null
  telefono: string | null
  email: string | null
  direccion: string | null
  ciudad: string | null
  cp: string | null
  pais: string | null
}

export interface ExistingProperty {
  id: string
  numero_registro_propiedad: number | null
  direccion: string | null
  propietario_id: string | null
  titulares_ids: string[] | null
}

export interface ExistingPropertyType {
  id: string
  nombre: string | null
  tipo_propiedad: string | null
}

export interface ExistingContract {
  id: string
  id_locacion: number | null
}

export interface PersonIndexes {
  clientsByDni: Map<number, ExistingClient>
  ownersByDni: Map<number, ExistingOwner>
  tenantsByDni: Map<number, ExistingTenant>
}

export interface PropertyIndexes {
  propertiesByRegistration: Map<number, ExistingProperty>
  propertyTypesByName: Map<string, ExistingPropertyType>
}

export interface ContractIndexes {
  contractsByLegacyId: Map<number, ExistingContract>
}

export interface PreparedContract {
  id_locacion: number
  numero_registro_propiedad: number
  propiedad_id: string
  propietario_id: string
  inquilino_id: string
  propietarios_ids: string[]
  inquilinos_ids: string[]
  garantes_ids: string[]
  plazo_dias: number | null
  plazo_meses: number
  fecha_locacion: string | null
  fecha_fin_contrato: string | null
  fecha_inicio: string
  fecha_fin: string
  dni_locador: number
  dni_locatario: number
  dni_empleado: number | null
  observaciones: string
  canon_inicial: number | null
  monto_inicial: number
  monto_actual: number
  multa: number | null
  estado: string
}

export interface PropertyOwnerLink {
  propertyId: string
  ownerId: string
}

export type ReportLevel = 'error' | 'warning'

export interface MigrationIssue {
  level: ReportLevel
  rowNumber?: number
  idLocacion?: number
  code: string
  message: string
}

export interface ValidationResult {
  contracts: PreparedContract[]
  propertyOwnerLinks: PropertyOwnerLink[]
  issues: MigrationIssue[]
  skippedExistingContracts: number
}

export interface MigrationStats {
  insertedClients: number
  insertedOwners: number
  insertedTenants: number
  insertedProperties: number
  linkedProperties: number
  insertedContracts: number
}

export interface CsvFiles {
  owners: string
  clients: string
  properties: string
  rentals: string
}
