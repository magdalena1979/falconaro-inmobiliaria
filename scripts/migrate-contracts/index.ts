import { performance } from 'node:perf_hooks'

import { insertContracts, linkPropertiesToOwners, loadContractIndexes } from './insertContracts.js'
import { ensurePeople } from './loadClients.js'
import { ensureProperties } from './loadProperties.js'
import { parseCsv } from './parseCsv.js'
import { runPreflightValidation } from './preflight.js'
import { createSupabaseClient } from './supabase.js'
import type { MigrationIssue, MigrationStats } from './types.js'
import { loadEnv, resolveCsvFiles, writeReport } from './utils.js'
import { validateRentalRows } from './validate.js'

async function main(): Promise<void> {
  const startedAt = performance.now()
  const projectRoot = process.cwd()
  const dryRun = process.argv.includes('--dry-run')
  const stats: MigrationStats = {
    insertedClients: 0,
    insertedOwners: 0,
    insertedTenants: 0,
    insertedProperties: 0,
    linkedProperties: 0,
    insertedContracts: 0,
  }
  const importIssues: MigrationIssue[] = []

  await loadEnv(projectRoot)
  const csvFiles = resolveCsvFiles(projectRoot)
  const supabase = await createSupabaseClient()

  console.log('Leyendo CSV de Access...')
  const [ownerRows, clientRows, propertyRows, rentalRows] = await Promise.all([
    parseCsv(csvFiles.owners),
    parseCsv(csvFiles.clients),
    parseCsv(csvFiles.properties),
    parseCsv(csvFiles.rentals),
  ])

  console.log(`Propietarios CSV: ${ownerRows.length}`)
  console.log(`Clientes CSV: ${clientRows.length}`)
  console.log(`Propiedades CSV: ${propertyRows.length}`)
  console.log(`Locaciones CSV: ${rentalRows.length}`)

  const currentPeople = await ensurePeople(supabase, [], [], [], stats, false)
  const currentProperties = await ensureProperties(supabase, [], stats, false)
  const contracts = await loadContractIndexes(supabase)

  console.log('Ejecutando preflight antes de escribir datos...')
  const preflightIssues = runPreflightValidation(
    ownerRows,
    clientRows,
    propertyRows,
    rentalRows,
    currentPeople,
    currentProperties,
    contracts,
  )
  if (preflightIssues.length > 0) {
    console.log(`Preflight con errores: ${preflightIssues.length}. Se migraran solo los registros validos.`)
  }

  const people = await ensurePeople(supabase, ownerRows, clientRows, rentalRows, stats, !dryRun, importIssues)
  const properties = await ensureProperties(supabase, propertyRows, stats, !dryRun, importIssues)

  console.log('Validando locaciones antes de insertar contratos...')
  const validation = validateRentalRows(rentalRows, people, properties, contracts)
  const allIssues = mergeIssues([...preflightIssues, ...importIssues], validation.issues)
  const blockingErrors = allIssues.filter((issue) => issue.level === 'error')
  const errors = validation.issues.filter((issue) => issue.level === 'error')
  const warnings = validation.issues.filter((issue) => issue.level === 'warning')

  console.log(`Contratos preparados: ${validation.contracts.length}`)
  console.log(`Contratos existentes omitidos: ${validation.skippedExistingContracts}`)
  console.log(`Errores: ${errors.length}`)
  console.log(`Advertencias: ${warnings.length}`)

  if (dryRun) {
    console.log('Modo dry-run activo: no se insertan contratos ni se vinculan propiedades.')
  } else if (validation.contracts.length > 0) {
    await linkPropertiesToOwners(supabase, validation.propertyOwnerLinks, stats)
    await insertContracts(supabase, validation.contracts, stats)
  } else {
    console.log('No hay contratos validos para insertar.')
  }

  const elapsedMs = performance.now() - startedAt
  const reportPath = await writeReport(projectRoot, allIssues, stats, rentalRows.length, elapsedMs)

  console.log('Resumen final')
  console.log(`Clientes creados: ${stats.insertedClients}`)
  console.log(`Propietarios creados: ${stats.insertedOwners}`)
  console.log(`Inquilinos creados: ${stats.insertedTenants}`)
  console.log(`Propiedades creadas: ${stats.insertedProperties}`)
  console.log(`Propiedades vinculadas: ${stats.linkedProperties}`)
  console.log(`Contratos creados: ${stats.insertedContracts}`)
  console.log(`Errores: ${blockingErrors.length}`)
  console.log(`Tiempo total: ${(elapsedMs / 1000).toFixed(2)}s`)
  console.log(`Reporte: ${reportPath}`)

  if (blockingErrors.length > 0 && stats.insertedContracts === 0) process.exitCode = 1
}

function mergeIssues<T extends { code: string; rowNumber?: number; idLocacion?: number }>(first: T[], second: T[]): T[] {
  const issues = new Map<string, T>()

  for (const issue of [...first, ...second]) {
    const key = `${issue.code}:${issue.rowNumber ?? ''}:${issue.idLocacion ?? ''}`
    issues.set(key, issue)
  }

  return [...issues.values()]
}

main().catch((error: unknown) => {
  console.error('Fallo la migracion.')
  console.error(error)
  process.exitCode = 1
})
