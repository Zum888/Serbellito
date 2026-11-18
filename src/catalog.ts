import type { Category, CategoryRule, KnownCategory } from './types'
import { norm } from './format'

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

export const CATEGORIES: KnownCategory[] = [
  'mercancía',
  'empaques',
  'fletes',
  'combustible',
  'cobros de clientes',
  'comisiones',
  'traspasos entre cuentas propias',
]

export const EXPENSE_CATEGORIES: KnownCategory[] = ['mercancía', 'empaques', 'fletes', 'combustible', 'comisiones']

export const INCOME_CATEGORIES: KnownCategory[] = ['cobros de clientes']

export const EXAMPLE_RULES: CategoryRule[] = [
  { rfc: 'LOC110708B33', side: 'gasto', category: 'pago por construcción' },
]

export const CATEGORY_SHORT: Record<KnownCategory, string> = {
  mercancía: 'Mercancía',
  empaques: 'Empaques',
  fletes: 'Fletes',
  combustible: 'Combustible',
  'cobros de clientes': 'Cobros de clientes',
  comisiones: 'Comisiones',
  'traspasos entre cuentas propias': 'Traspasos',
}

export const USO_CFDI: Record<string, string> = {
  G01: 'Adquisición de mercancías',
  G03: 'Gastos en general',
  S01: 'Sin efectos fiscales',
}

export const FORMA_PAGO: Record<string, string> = {
  '01': 'Efectivo',
  '02': 'Cheque nominativo',
  '03': 'Transferencia electrónica',
  '04': 'Tarjeta de crédito',
  '28': 'Tarjeta de débito',
  '99': 'Por definir',
}

export const PUE_FORMAS = ['03', '01', '02', '04', '28'] as const

export type Party = {
  name: string
  rfc: string
  razonSocial: string
  nombreComercial: string
  subnombre: string
  category: Category
  concept: string
}

export const SUPPLIERS: Party[] = [
  {
    name: 'Empaques de Occidente',
    rfc: 'EOC920614H72',
    razonSocial: 'Empaques de Occidente SA de CV',
    nombreComercial: 'Empaques de Occidente',
    subnombre: 'Empaques Occidente',
    category: 'empaques',
    concept: 'Cajas y empaque',
  },
  {
    name: 'Papelera del Bajío',
    rfc: 'PBA880201K31',
    razonSocial: 'Papelera del Bajío SA de CV',
    nombreComercial: 'Papelera del Bajío',
    subnombre: 'Papelera Bajío',
    category: 'mercancía',
    concept: 'Papel y bolsas',
  },
  {
    name: 'Transportes Sierra Madre',
    rfc: 'TSM010815Q44',
    razonSocial: 'Transportes Sierra Madre SA de CV',
    nombreComercial: 'Transportes Sierra Madre',
    subnombre: 'Sierra Madre',
    category: 'fletes',
    concept: 'Flete foráneo',
  },
  {
    name: 'Refacciones Industriales GDL',
    rfc: 'RIG950330M18',
    razonSocial: 'Refacciones Industriales de Guadalajara SA de CV',
    nombreComercial: 'Refacciones Industriales GDL',
    subnombre: 'Refacciones GDL',
    category: 'mercancía',
    concept: 'Refacciones de montacargas',
  },
  {
    name: 'Combustibles del Valle',
    rfc: 'CDV140622P90',
    razonSocial: 'Combustibles del Valle SA de CV',
    nombreComercial: 'Combustibles del Valle',
    subnombre: 'Combustibles Valle',
    category: 'combustible',
    concept: 'Diésel para reparto',
  },
  {
    name: 'Fletes del Pacífico',
    rfc: '2437328834',
    razonSocial: 'Transportes Marítimos SA de CV',
    nombreComercial: 'Transportes Pacífico',
    subnombre: 'Transportes Vallarta',
    category: 'fletes',
    concept: 'Flete a la costa',
  },
  {
    name: 'Harinera de Atemajac',
    rfc: 'HAT870505L22',
    razonSocial: 'Harinera de Atemajac SA de CV',
    nombreComercial: 'Harinera de Atemajac',
    subnombre: 'Harinera Atemajac',
    category: 'mercancía',
    concept: 'Harina de trigo',
  },
  {
    name: 'Comercializadora Altos',
    rfc: 'CAL990101A11',
    razonSocial: 'Comercializadora Altos SA de CV',
    nombreComercial: 'Comercializadora Altos',
    subnombre: 'Altos',
    category: 'mercancía',
    concept: 'Abarrotes de mayoreo',
  },
  {
    name: 'Lubricantes Occidente',
    rfc: 'LOC110708B33',
    razonSocial: 'Lubricantes de Occidente SA de CV',
    nombreComercial: 'Lubricantes Occidente',
    subnombre: 'Lubricantes',
    category: 'combustible',
    concept: 'Aceites y lubricantes',
  },
  {
    name: 'Empaques y Cajas del Sur',
    rfc: 'ECS060412C77',
    razonSocial: 'Empaques y Cajas del Sur SA de CV',
    nombreComercial: 'Empaques y Cajas del Sur',
    subnombre: 'Cajas del Sur',
    category: 'empaques',
    concept: 'Cajas de cartón',
  },
]

export const CUSTOMERS: Party[] = [
  {
    name: 'Abarrotes El Portal',
    rfc: 'AEP150310D44',
    razonSocial: 'Abarrotes El Portal SA de CV',
    nombreComercial: 'Abarrotes El Portal',
    subnombre: 'El Portal',
    category: 'cobros de clientes',
    concept: 'Venta de abarrotes',
  },
  {
    name: 'Mini Super La Paz',
    rfc: 'MSL180725E21',
    razonSocial: 'Mini Super La Paz SA de CV',
    nombreComercial: 'Mini Super La Paz',
    subnombre: 'La Paz',
    category: 'cobros de clientes',
    concept: 'Venta de abarrotes',
  },
  {
    name: 'Tiendas del Centro',
    rfc: 'TDC090214F88',
    razonSocial: 'Tiendas del Centro SA de CV',
    nombreComercial: 'Tiendas del Centro',
    subnombre: 'Tiendas Centro',
    category: 'cobros de clientes',
    concept: 'Venta de despensa',
  },
  {
    name: 'Abarrotes San Juan',
    rfc: 'ASJ120903G15',
    razonSocial: 'Abarrotes San Juan SA de CV',
    nombreComercial: 'Abarrotes San Juan',
    subnombre: 'San Juan',
    category: 'cobros de clientes',
    concept: 'Venta de abarrotes',
  },
  {
    name: 'Distribuciones Norte',
    rfc: 'DNO070616H40',
    razonSocial: 'Distribuciones del Norte SA de CV',
    nombreComercial: 'Distribuciones Norte',
    subnombre: 'Norte',
    category: 'cobros de clientes',
    concept: 'Venta de mayoreo',
  },
  {
    name: 'Cremería La Rosa',
    rfc: 'CLR160228I09',
    razonSocial: 'Cremería La Rosa SA de CV',
    nombreComercial: 'Cremería La Rosa',
    subnombre: 'La Rosa',
    category: 'cobros de clientes',
    concept: 'Venta de abarrotes',
  },
]

export const SAMPLE_CSV_PATH = '/ejemplos/estado-de-cuenta-ejemplo.csv'
export const SAMPLE_CSV_NAME = 'estado-de-cuenta-ejemplo.csv'

export function accountById(id: string) {
  return ACCOUNTS.find((account) => account.id === id)
}

export function selectedAccountId(id: string): string {
  return ACCOUNTS.some((account) => account.id === id) ? id : ACCOUNTS[0].id
}

export function accountLabel(id: string): string {
  const account = accountById(id)
  if (!account) return id
  return `${account.bank} · ${account.mask}`
}

export function categoryLabel(category: string): string {
  return CATEGORY_SHORT[category as KnownCategory] ?? category
}

export function categoryChoices(extra: string[], hidden: string[] = []): string[] {
  const known = CATEGORIES.filter((item) => !hidden.includes(item))
  const knownSet = new Set<string>(known)
  const more = extra.filter((item) => item && !knownSet.has(item) && !hidden.includes(item))
  return [...known, ...new Set(more)]
}

export function partyByRfc(rfc: string): Party | undefined {
  return [...SUPPLIERS, ...CUSTOMERS].find((party) => party.rfc === rfc)
}

export function partyByName(name: string): Party | undefined {
  const key = norm(name)
  return [...SUPPLIERS, ...CUSTOMERS].find((party) => norm(party.name) === key)
}

export function partyAliases(party: Party): string[] {
  return [party.subnombre, party.nombreComercial, party.razonSocial, party.name]
}

export function partySearchText(name: string): string {
  const party = partyByName(name)
  if (!party) return name
  return `${party.subnombre} ${party.nombreComercial} ${party.razonSocial} ${party.name} ${party.rfc}`
}

export function partyMatches(party: Party, query: string): boolean {
  const q = norm(query)
  if (!q) return true
  return norm(`${party.subnombre} ${party.nombreComercial} ${party.razonSocial} ${party.name} ${party.rfc} ${party.concept}`).includes(q)
}

export function partiesInCategory(category: Category): Party[] {
  return [...SUPPLIERS, ...CUSTOMERS].filter((party) => party.category === category)
}

export function usoLabel(code: string): string {
  return USO_CFDI[code] ? `${code} ${USO_CFDI[code]}` : code
}

export function formaLabel(code: string): string {
  return FORMA_PAGO[code] ? `${code} ${FORMA_PAGO[code]}` : code
}
