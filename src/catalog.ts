import type { Category } from './types'

export const COMPANY = {
  name: 'Distribuidora La Central',
  shortPlace: 'Bodega en Guadalajara',
  rfc: 'DLC980214AB3',
  user: 'Óscar',
  address: 'Calle de la Bodega 120, Col. Industrial, Guadalajara, Jalisco, C.P. 44940',
  regimen: 'General de Ley Personas Morales',
  status: 'Activo',
  start: '14 de febrero de 1998',
}

export const ACCOUNTS = [
  { id: 'acc-bbva', bank: 'BBVA', mask: '****4521', name: 'Cuenta operativa' },
  { id: 'acc-banorte', bank: 'Banorte', mask: '****8834', name: 'Cuenta de pagos' },
] as const

export type AccountId = (typeof ACCOUNTS)[number]['id']

export const CATEGORIES: Category[] = [
  'mercancía',
  'empaques',
  'fletes',
  'combustible',
  'cobros de clientes',
  'comisiones',
  'traspasos entre cuentas propias',
]

export type Party = {
  name: string
  rfc: string
  category: Category
  concept: string
}

export const SUPPLIERS: Party[] = [
  { name: 'Empaques de Occidente', rfc: 'EOC920614H72', category: 'empaques', concept: 'Cajas y empaque' },
  { name: 'Papelera del Bajío', rfc: 'PBA880201K31', category: 'mercancía', concept: 'Papel y bolsas' },
  { name: 'Transportes Sierra Madre', rfc: 'TSM010815Q44', category: 'fletes', concept: 'Flete foráneo' },
  { name: 'Refacciones Industriales GDL', rfc: 'RIG950330M18', category: 'mercancía', concept: 'Refacciones de montacargas' },
  { name: 'Combustibles del Valle', rfc: 'CDV140622P90', category: 'combustible', concept: 'Diésel para reparto' },
  { name: 'Fletes del Pacífico', rfc: 'FDP030911R55', category: 'fletes', concept: 'Flete a la costa' },
  { name: 'Harinera de Atemajac', rfc: 'HAT870505L22', category: 'mercancía', concept: 'Harina de trigo' },
  { name: 'Comercializadora Altos', rfc: 'CAL990101A11', category: 'mercancía', concept: 'Abarrotes de mayoreo' },
  { name: 'Lubricantes Occidente', rfc: 'LOC110708B33', category: 'combustible', concept: 'Aceites y lubricantes' },
  { name: 'Empaques y Cajas del Sur', rfc: 'ECS060412C77', category: 'empaques', concept: 'Cajas de cartón' },
]

export const CUSTOMERS: Party[] = [
  { name: 'Abarrotes El Portal', rfc: 'AEP150310D44', category: 'cobros de clientes', concept: 'Venta de abarrotes' },
  { name: 'Mini Super La Paz', rfc: 'MSL180725E21', category: 'cobros de clientes', concept: 'Venta de abarrotes' },
  { name: 'Tiendas del Centro', rfc: 'TDC090214F88', category: 'cobros de clientes', concept: 'Venta de despensa' },
  { name: 'Abarrotes San Juan', rfc: 'ASJ120903G15', category: 'cobros de clientes', concept: 'Venta de abarrotes' },
  { name: 'Distribuciones Norte', rfc: 'DNO070616H40', category: 'cobros de clientes', concept: 'Venta de mayoreo' },
  { name: 'Cremería La Rosa', rfc: 'CLR160228I09', category: 'cobros de clientes', concept: 'Venta de abarrotes' },
]

export const SAMPLE_CSV_PATH = '/ejemplos/estado-de-cuenta-ejemplo.csv'
export const SAMPLE_CSV_NAME = 'estado-de-cuenta-ejemplo.csv'

export function accountById(id: string) {
  return ACCOUNTS.find((account) => account.id === id)
}

export function accountLabel(id: string): string {
  const account = accountById(id)
  if (!account) return id
  return `${account.bank} · ${account.mask}`
}
