import { existsSync, readdirSync } from 'node:fs'
import { readFile, mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'

import type { CsvFiles, MigrationIssue, MigrationStats } from './types.js'

export const batchSize = 500

export function normalizeDni(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined) return null
  const digits = String(value).replace(/\D/g, '')
  if (!digits) return null
  const dni = Number(digits)
  return Number.isFinite(dni) ? dni : null
}

export function normalizeText(value: string | null | undefined): string | null {
  const normalized = value?.trim()
  return normalized ? normalized : null
}

export function parseNumber(value: string | null | undefined): number | null {
  const normalized = normalizeText(value)
  if (!normalized) return null
  const numeric = Number(normalized.replace(/\./g, '').replace(',', '.'))
  return Number.isFinite(numeric) ? numeric : null
}

export function parseInteger(value: string | null | undefined): number | null {
  const numeric = parseNumber(value)
  return numeric === null ? null : Math.trunc(numeric)
}

export function parseBoolean(value: string | null | undefined): boolean | null {
  const normalized = normalizeText(value)?.toLowerCase()
  if (!normalized) return null
  if (['true', '1', 'si', 'yes'].includes(normalized)) return true
  if (['false', '0', 'no'].includes(normalized)) return false
  return null
}

export function parseDate(value: string | null | undefined): string | null {
  const normalized = normalizeText(value)
  if (!normalized) return null

  const isoLike = normalized.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (isoLike) return `${isoLike[1]}-${isoLike[2]}-${isoLike[3]}`

  const slashDate = normalized.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/)
  if (slashDate) {
    const day = slashDate[1].padStart(2, '0')
    const month = slashDate[2].padStart(2, '0')
    return `${slashDate[3]}-${month}-${day}`
  }

  const parsed = new Date(normalized)
  if (Number.isNaN(parsed.getTime())) return null
  return parsed.toISOString().slice(0, 10)
}

export function toTimestamp(date: string | null): string | null {
  return date ? `${date}T00:00:00.000Z` : null
}

export function addDays(date: string, days: number): string {
  const parsed = new Date(`${date}T00:00:00.000Z`)
  parsed.setUTCDate(parsed.getUTCDate() + days)
  return parsed.toISOString().slice(0, 10)
}

export function getField(row: Record<string, string>, ...names: string[]): string {
  for (const name of names) {
    if (Object.prototype.hasOwnProperty.call(row, name)) return row[name] ?? ''
  }
  return ''
}

export function chunk<T>(items: T[], size = batchSize): T[][] {
  const chunks: T[][] = []
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size))
  }
  return chunks
}

export async function loadEnv(projectRoot: string): Promise<void> {
  const envPath = path.join(projectRoot, '.env')
  if (!existsSync(envPath)) return

  const content = await readFile(envPath, 'utf8')
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const separatorIndex = trimmed.indexOf('=')
    if (separatorIndex === -1) continue

    const key = trimmed.slice(0, separatorIndex).trim()
    const value = trimmed
      .slice(separatorIndex + 1)
      .trim()
      .replace(/^["']|["']$/g, '')

    if (!process.env[key]) process.env[key] = value
  }
}

export function getSupabaseConfig(): { url: string; anonKey: string } {
  const rawUrl = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL
  const anonKey = process.env.SUPABASE_ANON_KEY ?? process.env.VITE_SUPABASE_ANON_KEY
  const url = rawUrl?.trim().replace(/\/+$/, '').replace(/\/rest\/v1$/i, '')

  if (!url || !anonKey) {
    throw new Error('Faltan SUPABASE_URL/VITE_SUPABASE_URL o SUPABASE_ANON_KEY/VITE_SUPABASE_ANON_KEY.')
  }

  return { url, anonKey }
}

export function resolveCsvFiles(projectRoot: string): CsvFiles {
  const csvDir = path.join(projectRoot, 'csv')
  const files = readdirSync(csvDir)

  return {
    owners: findCsv(csvDir, files, 'Propietarios.csv'),
    clients: findCsv(csvDir, files, 'Clientes.csv'),
    properties: findCsv(csvDir, files, 'Propiedad Alquiler.csv'),
    rentals: findCsv(csvDir, files, 'Alquilar Propiedad.csv'),
  }
}

export async function writeReport(
  projectRoot: string,
  issues: MigrationIssue[],
  stats: MigrationStats,
  processedRows: number,
  elapsedMs: number,
): Promise<string> {
  const reportDir = path.join(projectRoot, 'scripts', 'migrate-contracts', 'reports')
  await mkdir(reportDir, { recursive: true })
  const reportPath = path.join(reportDir, 'latest-report.md')

  const errors = issues.filter((issue) => issue.level === 'error')
  const warnings = issues.filter((issue) => issue.level === 'warning')
  const lines = [
    '# Migracion Access a Supabase',
    '',
    `Fecha: ${new Date().toISOString()}`,
    `Registros de locacion procesados: ${processedRows}`,
    `Errores: ${errors.length}`,
    `Advertencias: ${warnings.length}`,
    `Clientes creados: ${stats.insertedClients}`,
    `Propietarios creados: ${stats.insertedOwners}`,
    `Inquilinos creados: ${stats.insertedTenants}`,
    `Propiedades creadas: ${stats.insertedProperties}`,
    `Propiedades vinculadas: ${stats.linkedProperties}`,
    `Contratos creados: ${stats.insertedContracts}`,
    `Tiempo total: ${(elapsedMs / 1000).toFixed(2)}s`,
    '',
    '## Errores',
    '',
    ...formatIssues(errors),
    '',
    '## Advertencias',
    '',
    ...formatIssues(warnings),
    '',
  ]

  await writeFile(reportPath, lines.join('\n'), 'utf8')
  return reportPath
}

function findCsv(csvDir: string, files: string[], expectedName: string): string {
  const directPath = path.join(csvDir, expectedName)
  if (existsSync(directPath)) return directPath

  const match = files.find((file) => file.toLowerCase().endsWith(expectedName.toLowerCase()))
  if (!match) throw new Error(`No se encontro ${expectedName} dentro de csv/.`)

  return path.join(csvDir, match)
}

function formatIssues(issues: MigrationIssue[]): string[] {
  if (issues.length === 0) return ['Sin registros.']

  return issues.map((issue) => {
    const row = issue.rowNumber ? `fila ${issue.rowNumber}` : 'sin fila'
    const id = issue.idLocacion ? `, IdLocacion ${issue.idLocacion}` : ''
    return `- [${issue.code}] ${row}${id}: ${issue.message}`
  })
}
