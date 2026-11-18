import { ACCOUNTS } from './catalog'
import { duplicateStatus, suggestMovement } from './domain'
import { norm, uid } from './format'
import type { Application, Invoice, Movement } from './types'

export type ParsedDraft = {
  date: string
  concept: string
  cargo: number
  abono: number
  accountId: string
  reference?: string
}

export type PreviewRow = ParsedDraft & {
  status: 'nuevo' | 'duplicado' | 'posible'
  include: boolean
}

function detectDelimiter(header: string): ',' | ';' {
  const commas = (header.match(/,/g) ?? []).length
  const semis = (header.match(/;/g) ?? []).length
  return semis > commas ? ';' : ','
}

function splitCsvLine(line: string, delimiter: string): string[] {
  const cells: string[] = []
  let current = ''
  let quoted = false
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i]
    if (char === '"') {
      if (quoted && line[i + 1] === '"') {
        current += '"'
        i += 1
      } else quoted = !quoted
    } else if (char === delimiter && !quoted) {
      cells.push(current.trim())
      current = ''
    } else current += char
  }
  cells.push(current.trim())
  return cells
}

function parseAmount(raw: string): number | null {
  let text = raw.trim().replace(/\$/g, '').replace(/\s/g, '')
  if (!text || text === '-') return 0
  if (text.includes(',') && text.includes('.')) {
    if (text.lastIndexOf(',') > text.lastIndexOf('.')) text = text.replace(/\./g, '').replace(',', '.')
    else text = text.replace(/,/g, '')
  } else if (text.includes(',')) {
    const parts = text.split(',')
    if (parts[1]?.length === 2) text = `${parts[0].replace(/\./g, '')}.${parts[1]}`
    else text = text.replace(/,/g, '')
  }
  const value = Number(text)
  if (!Number.isFinite(value)) return null
  return Math.round(value * 100)
}

function parseDate(raw: string): string | null {
  const text = raw.trim()
  const iso = text.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`
  const mx = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/)
  if (!mx) return null
  return `${mx[3]}-${mx[2].padStart(2, '0')}-${mx[1].padStart(2, '0')}`
}

export function mapAccount(raw: string | undefined): string {
  const text = norm(raw ?? '')
  if (!text) return 'acc-bbva'
  if (text.includes('8834') || text.includes('banorte')) return 'acc-banorte'
  if (text.includes('4521') || text.includes('bbva')) return 'acc-bbva'
  const known = ACCOUNTS.find((account) => text.includes(norm(account.bank)))
  return known?.id ?? 'acc-bbva'
}

export function parseCsv(text: string): { rows: ParsedDraft[] } | { error: string } {
  const source = text.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim()
  if (!source) return { error: 'El archivo está vacío.' }
  const lines = source.split('\n').filter((line) => line.trim())
  const delimiter = detectDelimiter(lines[0])
  const header = splitCsvLine(lines[0], delimiter).map((cell) => norm(cell))
  const index = (name: string) => header.indexOf(name)
  if (index('fecha') < 0 || index('concepto') < 0 || (index('cargo') < 0 && index('abono') < 0)) {
    return {
      error: 'No pude leer este archivo. Prueba con un CSV con columnas fecha, concepto, cargo y abono, o con un Excel o PDF para ver la vista previa de demostración.',
    }
  }
  const rows: ParsedDraft[] = []
  for (let i = 1; i < lines.length; i += 1) {
    const cells = splitCsvLine(lines[i], delimiter)
    if (cells.every((cell) => !cell)) continue
    const date = parseDate(cells[index('fecha')] ?? '')
    const concept = (cells[index('concepto')] ?? '').trim()
    const cargo = parseAmount(index('cargo') >= 0 ? cells[index('cargo')] ?? '' : '')
    const abono = parseAmount(index('abono') >= 0 ? cells[index('abono')] ?? '' : '')
    if (!date || !concept || cargo === null || abono === null) {
      return {
        error: `No pude leer la fila ${i + 1}. Usa fechas AAAA-MM-DD o DD/MM/AAAA y montos numéricos en cargo y abono.`,
      }
    }
    if (cargo === 0 && abono === 0) continue
    const referenceIndex = index('referencia')
    rows.push({
      date,
      concept,
      cargo,
      abono,
      accountId: mapAccount(index('cuenta') >= 0 ? cells[index('cuenta')] : undefined),
      reference: referenceIndex >= 0 ? cells[referenceIndex] || undefined : undefined,
    })
  }
  if (!rows.length) {
    return { error: 'El CSV no trae movimientos. Revisa las columnas fecha, concepto, cargo y abono.' }
  }
  return { rows }
}

export function toPreviewRows(rows: ParsedDraft[], movements: Movement[]): PreviewRow[] {
  return rows.map((row) => {
    const status = duplicateStatus(row, movements)
    return { ...row, status, include: status !== 'duplicado' }
  })
}

export function draftsToMovements(
  rows: PreviewRow[],
  invoices: Invoice[],
  applications: Application[],
  origin: 'ejemplo' | 'csv',
  sourceName: string,
): Movement[] {
  return rows
    .filter((row) => row.include && row.status !== 'duplicado')
    .map((row) =>
      suggestMovement(
        {
          id: uid('mov-imp'),
          date: row.date,
          concept: row.concept,
          accountId: row.accountId,
          cargo: row.cargo,
          abono: row.abono,
          reference: row.reference,
          origin,
          sourceName,
        },
        invoices,
        applications,
      ),
    )
}
