export type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue }

export type TableRow = Record<string, JsonValue>

export type ColumnType =
  | 'string'
  | 'number'
  | 'integer'
  | 'boolean'
  | 'date'
  | 'datetime'
  | 'time'
  | 'json'
  | 'unknown'

export interface ColumnSchema {
  name: string
  type: ColumnType
  nullable: boolean
  required: boolean
  readOnly: boolean
  format?: string
  description?: string
  reference?: ReferenceConfig
  options?: ColumnOption[]
}

export interface TableSchema {
  name: string
  columns: ColumnSchema[]
  primaryKey?: string
  canCreate?: boolean
  canDelete?: boolean
}

export interface ReferenceConfig {
  table: string
  valueColumn: string
  labelColumns: string[]
}

export interface ColumnOption {
  value: string
  label: string
}

export interface ModuleDefinition {
  key: ModuleKey
  title: string
  singular: string
  description: string
  table: TableSchema
}

export type ModuleKey =
  | 'dashboard'
  | 'properties'
  | 'owners'
  | 'tenants'
  | 'contracts'
  | 'payments'
  | 'ownerCollections'
  | 'agenda'
  | 'reports'
  | 'employees'
  | 'contractOwners'
  | 'contractTenants'
  | 'userRoles'
  | 'propertyTypes'
  | 'contractTerms'
  | 'currencies'
  | 'updateTypes'
