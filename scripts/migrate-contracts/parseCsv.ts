import { readFile } from 'node:fs/promises'

import type { CsvRow } from './types.js'

export async function parseCsv(filePath: string): Promise<CsvRow[]> {
  const content = await readFile(filePath, 'utf8')
  const rows = parseCsvContent(content)
  const [headers, ...dataRows] = rows

  if (!headers || headers.length === 0) return []

  return dataRows
    .filter((row) => row.some((value) => value.trim()))
    .map((row) => {
      const record: CsvRow = {}
      headers.forEach((header, index) => {
        record[header.trim()] = row[index]?.trim() ?? ''
      })
      return record
    })
}

function parseCsvContent(content: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let value = ''
  let inQuotes = false

  for (let index = 0; index < content.length; index += 1) {
    const char = content[index]
    const next = content[index + 1]

    if (char === '"') {
      if (inQuotes && next === '"') {
        value += '"'
        index += 1
      } else {
        inQuotes = !inQuotes
      }
      continue
    }

    if (char === ',' && !inQuotes) {
      row.push(value)
      value = ''
      continue
    }

    if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && next === '\n') index += 1
      row.push(value)
      rows.push(row)
      row = []
      value = ''
      continue
    }

    value += char
  }

  if (value || row.length > 0) {
    row.push(value)
    rows.push(row)
  }

  return rows
}
