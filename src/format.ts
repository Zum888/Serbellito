const MONTHS = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
]

const MONTHS_SHORT = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

export function norm(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[¿?¡!.,;:()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function money(cents: number): string {
  const sign = cents < 0 ? '-' : ''
  const abs = Math.abs(Math.round(cents))
  const pesos = Math.floor(abs / 100)
  const frac = abs % 100
  const body = String(pesos).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  if (frac === 0) return `${sign}$${body}`
  return `${sign}$${body}.${String(frac).padStart(2, '0')}`
}

export function formatDate(iso: string): string {
  const [year, month, day] = iso.split('-').map(Number)
  if (!year || !month || !day) return iso
  return `${day} ${MONTHS_SHORT[month - 1]} ${year}`
}

export function formatDateLong(iso: string): string {
  const [year, month, day] = iso.split('-').map(Number)
  if (!year || !month || !day) return iso
  return `${day} de ${MONTHS[month - 1]} de ${year}`
}

export function formatPeriod(from: string, to: string): string {
  if (from === to) return formatDateLong(from)
  const [y1, m1, d1] = from.split('-').map(Number)
  const [y2, m2, d2] = to.split('-').map(Number)
  if (y1 === y2 && m1 === m2) return `${d1} al ${d2} de ${MONTHS[m1 - 1]} de ${y1}`
  return `${formatDateLong(from)} al ${formatDateLong(to)}`
}

export function formatConsultedAt(date: Date): string {
  const iso = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${formatDate(iso)}, ${hours}:${minutes} h`
}

export function todayIso(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export function parseMxDate(value: string): string | null {
  const text = value.trim()
  if (!text) return ''
  const iso = text.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`
  const mx = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (!mx) return null
  const day = Number(mx[1])
  const month = Number(mx[2])
  const year = Number(mx[3])
  if (month < 1 || month > 12 || day < 1 || day > 31) return null
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

export function addDays(iso: string, days: number): string {
  const [year, month, day] = iso.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day + days))
  return date.toISOString().slice(0, 10)
}

export function daysBetween(a: string, b: string): number {
  const da = Date.parse(`${a}T00:00:00Z`)
  const db = Date.parse(`${b}T00:00:00Z`)
  return Math.round((da - db) / 86_400_000)
}

let seq = 0

export function uid(prefix: string): string {
  seq += 1
  return `${prefix}-${Date.now().toString(36)}-${seq}`
}

export function makeUuid(n: number): string {
  const h = n.toString(16).padStart(12, '0')
  return `b${h.slice(0, 7)}-4c2a-4${h.slice(0, 3)}-8${h.slice(3, 6)}-${h}`
}
