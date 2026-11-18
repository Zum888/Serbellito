import { CUSTOMERS, SUPPLIERS } from './catalog'
import {
  attentionItems,
  invoiceReconciliation,
  isChoiceCase,
  paymentStatus,
  paymentsWithoutInvoice,
  pendingBalance,
  reconcileQuestion,
  suggestMovement,
  supplierDebt,
} from './domain'
import { addDays, makeUuid } from './format'
import type { Application, Complemento, Invoice, Movement } from './types'

function cents(pesos: number): number {
  return Math.round(pesos * 100)
}

let uuidN = 20

function nextUuid(): string {
  uuidN += 1
  return makeUuid(uuidN)
}

function invoice(partial: Invoice): Invoice {
  return partial
}

export type SeedData = {
  invoices: Invoice[]
  movements: Movement[]
  applications: Application[]
  complementos: Complemento[]
}

function build(): SeedData {
  const invoices: Invoice[] = []
  const movements: Movement[] = []
  const applications: Application[] = []
  const complementos: Complemento[] = []

  const add = (entry: Invoice) => {
    invoices.push(entry)
    return entry
  }

  add(invoice({
    id: 'inv-a102',
    direction: 'recibida',
    folio: 'A-102',
    uuid: nextUuid(),
    rfc: 'EOC920614H72',
    name: 'Empaques de Occidente',
    issueDate: '2026-06-15',
    total: cents(12000),
    metodo: 'PPD',
    vigencia: 'cancelado',
    complemento: 'no_aplica',
    concept: 'Cajas corrugadas canceladas',
  }))

  add(invoice({
    id: 'inv-a184',
    direction: 'recibida',
    folio: 'A-184',
    uuid: nextUuid(),
    rfc: 'EOC920614H72',
    name: 'Empaques de Occidente',
    issueDate: '2026-10-20',
    total: cents(12000),
    metodo: 'PPD',
    vigencia: 'vigente',
    complemento: 'recibido',
    concept: 'Cajas de cartón corrugado',
  }))
  complementos.push({
    id: 'comp-a184',
    invoiceId: 'inv-a184',
    folio: 'CP-184',
    uuid: nextUuid(),
    fecha: '2026-11-01',
    amount: cents(12000),
  })

  add(invoice({
    id: 'inv-a191',
    direction: 'recibida',
    folio: 'A-191',
    uuid: nextUuid(),
    rfc: 'EOC920614H72',
    name: 'Empaques de Occidente',
    issueDate: '2026-10-28',
    total: cents(6560),
    metodo: 'PPD',
    vigencia: 'vigente',
    complemento: 'pendiente',
    concept: 'Cajas y separadores',
  }))

  add(invoice({
    id: 'inv-p220',
    direction: 'recibida',
    folio: 'P-220',
    uuid: nextUuid(),
    rfc: 'PBA880201K31',
    name: 'Papelera del Bajío',
    issueDate: '2026-09-18',
    total: cents(20000),
    metodo: 'PPD',
    vigencia: 'vigente',
    complemento: 'pendiente',
    concept: 'Papel kraft y bolsas',
  }))

  add(invoice({
    id: 'inv-t088',
    direction: 'recibida',
    folio: 'T-088',
    uuid: nextUuid(),
    rfc: 'TSM010815Q44',
    name: 'Transportes Sierra Madre',
    issueDate: '2026-10-06',
    total: cents(7250),
    metodo: 'PUE',
    vigencia: 'vigente',
    complemento: 'no_aplica',
    concept: 'Flete Guadalajara–Tepic',
  }))

  add(invoice({
    id: 'inv-t091',
    direction: 'recibida',
    folio: 'T-091',
    uuid: nextUuid(),
    rfc: 'TSM010815Q44',
    name: 'Transportes Sierra Madre',
    issueDate: '2026-10-22',
    total: cents(7250),
    metodo: 'PUE',
    vigencia: 'vigente',
    complemento: 'no_aplica',
    concept: 'Flete Guadalajara–Mazatlán',
  }))

  add(invoice({
    id: 'inv-r055',
    direction: 'recibida',
    folio: 'R-055',
    uuid: nextUuid(),
    rfc: 'RIG950330M18',
    name: 'Refacciones Industriales GDL',
    issueDate: '2026-08-12',
    total: cents(4800),
    metodo: 'PPD',
    vigencia: 'vigente',
    complemento: 'pendiente',
    concept: 'Refacciones para montacargas',
  }))

  add(invoice({
    id: 'inv-f310',
    direction: 'recibida',
    folio: 'F-310',
    uuid: nextUuid(),
    rfc: 'FDP030911R55',
    name: 'Fletes del Pacífico',
    issueDate: '2026-10-30',
    total: cents(6480),
    metodo: 'PUE',
    vigencia: 'vigente',
    complemento: 'no_aplica',
    concept: 'Flete Guadalajara–Colima',
  }))

  add(invoice({
    id: 'inv-h118',
    direction: 'recibida',
    folio: 'H-118',
    uuid: nextUuid(),
    rfc: 'HAT870505L22',
    name: 'Harinera de Atemajac',
    issueDate: '2026-11-01',
    total: cents(15430),
    metodo: 'PUE',
    vigencia: 'vigente',
    complemento: 'no_aplica',
    concept: 'Harina de trigo a granel',
  }))

  add(invoice({
    id: 'inv-e014',
    direction: 'emitida',
    folio: 'E-014',
    uuid: nextUuid(),
    rfc: 'AEP150310D44',
    name: 'Abarrotes El Portal',
    issueDate: '2026-10-10',
    total: cents(15400),
    metodo: 'PUE',
    vigencia: 'vigente',
    complemento: 'no_aplica',
    concept: 'Venta de abarrotes',
  }))

  add(invoice({
    id: 'inv-e221',
    direction: 'emitida',
    folio: 'E-221',
    uuid: nextUuid(),
    rfc: 'MSL180725E21',
    name: 'Mini Super La Paz',
    issueDate: '2026-11-02',
    total: cents(9800),
    metodo: 'PUE',
    vigencia: 'vigente',
    complemento: 'no_aplica',
    concept: 'Venta de abarrotes',
  }))

  add(invoice({
    id: 'inv-e090',
    direction: 'emitida',
    folio: 'E-090',
    uuid: nextUuid(),
    rfc: 'TDC090214F88',
    name: 'Tiendas del Centro',
    issueDate: '2026-05-04',
    total: cents(5600),
    metodo: 'PUE',
    vigencia: 'cancelado',
    complemento: 'no_aplica',
    concept: 'Venta cancelada',
  }))

  const linkPaid = (entry: Invoice, movement: Movement, amount = entry.total) => {
    movements.push(movement)
    applications.push({ id: `app-${movement.id}`, movementId: movement.id, invoiceId: entry.id, amount })
    if (entry.metodo === 'PPD' && entry.complemento === 'recibido') {
      complementos.push({
        id: `comp-${entry.id}`,
        invoiceId: entry.id,
        folio: `CP-${entry.folio}`,
        uuid: nextUuid(),
        fecha: movement.date,
        amount,
      })
    }
  }

  for (let i = 0; i < 61; i += 1) {
    const supplier = SUPPLIERS[i % SUPPLIERS.length]
    const canceled = i < 4
    const metodo = !canceled && i % 4 === 0 ? 'PPD' : 'PUE'
    let pesos = 2800 + ((i * 1300) % 15000)
    pesos = Math.round(pesos / 100) * 100
    if (pesos === 12000 || pesos === 7250 || pesos === 20000) pesos += 300
    const entry = add(invoice({
      id: `inv-rgen-${i}`,
      direction: 'recibida',
      folio: `RG-${1000 + i}`,
      uuid: nextUuid(),
      rfc: supplier.rfc,
      name: supplier.name,
      issueDate: `2026-${String((i % 9) + 1).padStart(2, '0')}-${String((i % 27) + 1).padStart(2, '0')}`,
      total: cents(pesos),
      metodo,
      vigencia: canceled ? 'cancelado' : 'vigente',
      complemento: canceled || metodo === 'PUE' ? 'no_aplica' : 'recibido',
      concept: supplier.concept,
    }))
    if (canceled) continue
    linkPaid(entry, {
      id: `mov-rgen-${i}`,
      date: addDays(entry.issueDate, 6),
      concept: `SPEI ${supplier.name.toUpperCase()}`,
      accountId: i % 3 === 0 ? 'acc-banorte' : 'acc-bbva',
      cargo: entry.total,
      abono: 0,
      category: supplier.category,
      reconciliation: 'confirmada',
      suggestionIds: [entry.id],
      reference: `REF-R-${1000 + i}`,
      origin: 'seed',
    })
  }

  for (let i = 0; i < 27; i += 1) {
    const customer = CUSTOMERS[i % CUSTOMERS.length]
    const canceled = i < 2
    let pesos = 3600 + ((i * 900) % 12000)
    pesos = Math.round(pesos / 100) * 100
    const entry = add(invoice({
      id: `inv-egen-${i}`,
      direction: 'emitida',
      folio: `EG-${1000 + i}`,
      uuid: nextUuid(),
      rfc: customer.rfc,
      name: customer.name,
      issueDate: `2026-${String((i % 9) + 1).padStart(2, '0')}-${String((i % 26) + 1).padStart(2, '0')}`,
      total: cents(pesos),
      metodo: 'PUE',
      vigencia: canceled ? 'cancelado' : 'vigente',
      complemento: 'no_aplica',
      concept: customer.concept,
    }))
    if (canceled) continue
    linkPaid(entry, {
      id: `mov-egen-${i}`,
      date: addDays(entry.issueDate, 5),
      concept: `DEPOSITO SPEI ${customer.name.toUpperCase()}`,
      accountId: i % 2 === 0 ? 'acc-bbva' : 'acc-banorte',
      cargo: 0,
      abono: entry.total,
      category: 'cobros de clientes',
      reconciliation: 'confirmada',
      suggestionIds: [entry.id],
      reference: `REF-E-${1000 + i}`,
      origin: 'seed',
    })
  }

  linkPaid(
    invoices.find((entry) => entry.id === 'inv-p220')!,
    {
      id: 'mov-papelera',
      date: '2026-10-02',
      concept: 'SPEI PAPELERA DEL BAJIO',
      accountId: 'acc-banorte',
      cargo: cents(8000),
      abono: 0,
      category: 'mercancía',
      reconciliation: 'confirmada',
      suggestionIds: ['inv-p220'],
      reference: 'REF-P220',
      origin: 'seed',
    },
    cents(8000),
  )

  linkPaid(invoices.find((entry) => entry.id === 'inv-r055')!, {
    id: 'mov-refacciones',
    date: '2026-08-20',
    concept: 'SPEI REFACCIONES INDUSTRIALES GDL',
    accountId: 'acc-bbva',
    cargo: cents(4800),
    abono: 0,
    category: 'mercancía',
    reconciliation: 'confirmada',
    suggestionIds: ['inv-r055'],
    reference: 'REF-R055',
    origin: 'seed',
  })

  linkPaid(invoices.find((entry) => entry.id === 'inv-e014')!, {
    id: 'mov-portal',
    date: '2026-10-16',
    concept: 'DEPOSITO SPEI ABARROTES EL PORTAL',
    accountId: 'acc-bbva',
    cargo: 0,
    abono: cents(15400),
    category: 'cobros de clientes',
    reconciliation: 'confirmada',
    suggestionIds: ['inv-e014'],
    reference: 'REF-E014',
    origin: 'seed',
  })

  movements.push(
    {
      id: 'mov-empaques',
      date: '2026-11-12',
      concept: 'TRANSFERENCIA SPEI EMPAQUES DE OCCIDENTE',
      accountId: 'acc-bbva',
      cargo: cents(18560),
      abono: 0,
      category: 'empaques',
      reconciliation: 'por_revisar',
      suggestionIds: ['inv-a184', 'inv-a191'],
      reference: 'REF-A184191',
      origin: 'seed',
    },
    {
      id: 'mov-sierra',
      date: '2026-11-08',
      concept: 'TRANSFERENCIA SPEI TRANSPORTES SIERRA MADRE',
      accountId: 'acc-bbva',
      cargo: cents(7250),
      abono: 0,
      category: 'fletes',
      reconciliation: 'por_revisar',
      suggestionIds: ['inv-t088', 'inv-t091'],
      reference: 'REF-T088091',
      origin: 'seed',
    },
    {
      id: 'mov-traspaso-out',
      date: '2026-11-05',
      concept: 'TRASPASO A CUENTA PROPIA BANORTE',
      accountId: 'acc-bbva',
      cargo: cents(45000),
      abono: 0,
      category: 'traspasos entre cuentas propias',
      reconciliation: 'no_requiere',
      suggestionIds: [],
      relatedMovementId: 'mov-traspaso-in',
      reference: 'REF-TR-45',
      origin: 'seed',
    },
    {
      id: 'mov-traspaso-in',
      date: '2026-11-05',
      concept: 'TRASPASO DE CUENTA PROPIA BBVA',
      accountId: 'acc-banorte',
      cargo: 0,
      abono: cents(45000),
      category: 'traspasos entre cuentas propias',
      reconciliation: 'no_requiere',
      suggestionIds: [],
      relatedMovementId: 'mov-traspaso-out',
      reference: 'REF-TR-45',
      origin: 'seed',
    },
    {
      id: 'mov-comision-bbva',
      date: '2026-11-03',
      concept: 'COMISION MANEJO DE CUENTA',
      accountId: 'acc-bbva',
      cargo: cents(145),
      abono: 0,
      category: 'comisiones',
      reconciliation: 'no_requiere',
      suggestionIds: [],
      reference: 'REF-COM-145',
      origin: 'seed',
    },
    {
      id: 'mov-comision-banorte',
      date: '2026-10-15',
      concept: 'COMISION MANEJO DE CUENTA',
      accountId: 'acc-banorte',
      cargo: cents(87),
      abono: 0,
      category: 'comisiones',
      reconciliation: 'no_requiere',
      suggestionIds: [],
      reference: 'REF-COM-87',
      origin: 'seed',
    },
    {
      id: 'mov-sin-factura',
      date: '2026-11-01',
      concept: 'CARGO TARJETA PROVEEDOR VARIOS',
      accountId: 'acc-bbva',
      cargo: cents(2340),
      abono: 0,
      category: 'mercancía',
      reconciliation: 'sin_coincidencia',
      suggestionIds: [],
      reference: 'REF-VAR-2340',
      origin: 'seed',
    },
  )

  return { invoices, movements, applications, complementos }
}

function assertSeed(data: SeedData) {
  const received = data.invoices.filter((item) => item.direction === 'recibida')
  const issued = data.invoices.filter((item) => item.direction === 'emitida')
  if (received.length !== 70 || issued.length !== 30) {
    throw new Error(`CFDI counts ${received.length}/${issued.length}`)
  }
  const folios = new Set(data.invoices.map((item) => item.folio))
  const uuids = new Set(data.invoices.map((item) => item.uuid))
  if (folios.size !== 100 || uuids.size !== 100) throw new Error('Duplicated folio or UUID')
  if (data.complementos.some((item) => data.invoices.some((invoice) => invoice.id === item.id))) {
    throw new Error('A complemento was counted as a CFDI')
  }
  if (supplierDebt('Empaques de Occidente', data.invoices, data.applications) !== cents(18560)) {
    throw new Error('Empaques debt is not $18,560')
  }
  const empaquesOpen = data.invoices.filter(
    (item) => item.name === 'Empaques de Occidente' && item.vigencia === 'vigente' && pendingBalance(item, data.applications) > 0,
  )
  if (empaquesOpen.map((item) => item.folio).sort().join() !== 'A-184,A-191') throw new Error('Unexpected Empaques balances')
  const sierraOpen = data.invoices.filter(
    (item) => item.name === 'Transportes Sierra Madre' && item.vigencia === 'vigente' && pendingBalance(item, data.applications) > 0,
  )
  if (sierraOpen.length !== 2 || sierraOpen.some((item) => item.total !== cents(7250))) throw new Error('Sierra choice is not ready')
  const papelera = data.invoices.find((item) => item.id === 'inv-p220')!
  if (pendingBalance(papelera, data.applications) !== cents(12000) || paymentStatus(papelera, data.applications) !== 'parcial') {
    throw new Error('Partial payment case is wrong')
  }
  const r055 = data.invoices.find((item) => item.id === 'inv-r055')!
  if (paymentStatus(r055, data.applications) !== 'pagada' || r055.complemento !== 'pendiente') throw new Error('R-055 complemento case is wrong')
  const a184 = data.invoices.find((item) => item.id === 'inv-a184')!
  const a191 = data.invoices.find((item) => item.id === 'inv-a191')!
  if (a184.complemento !== 'recibido' || !data.complementos.some((item) => item.invoiceId === 'inv-a184')) throw new Error('A-184 complemento missing')
  if (a191.complemento !== 'pendiente' || data.complementos.some((item) => item.invoiceId === 'inv-a191')) throw new Error('A-191 should not have a complemento')
  if (paymentStatus(a184, data.applications) !== 'sin_pago' || paymentStatus(a191, data.applications) !== 'sin_pago') {
    throw new Error('Empaques invoices should be unapplied')
  }
  const items = attentionItems(data)
  if (items.length !== 3) throw new Error(`Attention ${items.length}: ${items.map((item) => item.title).join(' | ')}`)
  if (items[0]?.title !== 'Empaques de Occidente · $18,560') throw new Error(items[0]?.title ?? 'missing')
  if (items[1]?.title !== 'Transportes Sierra Madre · $7,250') throw new Error(items[1]?.title ?? 'missing')
  if (items[2]?.title !== 'Falta el complemento de R-055') throw new Error(items[2]?.title ?? 'missing')
  const unbilled = paymentsWithoutInvoice(data.movements, data.applications)
  const unbilledTotal = unbilled.reduce((sum, movement) => sum + movement.cargo, 0)
  if (unbilled.length !== 3 || unbilledTotal !== cents(28150)) throw new Error(`Unbilled ${unbilled.length} ${unbilledTotal}`)
  const empaques = data.movements.find((item) => item.id === 'mov-empaques')!
  const sierra = data.movements.find((item) => item.id === 'mov-sierra')!
  if (isChoiceCase(empaques, data.invoices, data.applications) || !isChoiceCase(sierra, data.invoices, data.applications)) {
    throw new Error('Choice detection is wrong')
  }
  if (reconcileQuestion(empaques, data.invoices, data.applications) !== '¿Este pago cubre estas dos facturas?') {
    throw new Error('Primary question changed')
  }
  for (const movement of data.movements) {
    for (const id of movement.suggestionIds) {
      const suggested = data.invoices.find((item) => item.id === id)
      if (!suggested || suggested.vigencia === 'cancelado') throw new Error(`Canceled suggestion ${id}`)
    }
  }
  if (invoiceReconciliation(data.invoices.find((item) => item.id === 'inv-a102')!, data.movements, data.applications) !== 'sin_coincidencia') {
    throw new Error('Canceled invoice looks reconcilable')
  }
  const sample = [
    { date: '2026-11-10', concept: 'SPEI FLETES DEL PACIFICO', accountId: 'acc-bbva', cargo: cents(6480), abono: 0, id: 'x', origin: 'ejemplo' as const },
    { date: '2026-11-09', concept: 'COMPRA GASOLINA PEMEX GDL', accountId: 'acc-bbva', cargo: cents(1860.5), abono: 0, id: 'x', origin: 'ejemplo' as const },
    { date: '2026-11-08', concept: 'SPEI HARINERA DE ATEMAJAC', accountId: 'acc-banorte', cargo: cents(15430), abono: 0, id: 'x', origin: 'ejemplo' as const },
    { date: '2026-11-07', concept: 'COMISION SPEI', accountId: 'acc-bbva', cargo: cents(145), abono: 0, id: 'x', origin: 'ejemplo' as const },
    { date: '2026-11-06', concept: 'DEPOSITO MINI SUPER LA PAZ', accountId: 'acc-bbva', cargo: 0, abono: cents(9800), id: 'x', origin: 'ejemplo' as const },
    { date: '2026-11-04', concept: 'PAGO PROVEEDOR COMERCIALIZADORA ALTOS', accountId: 'acc-banorte', cargo: cents(4320), abono: 0, id: 'x', origin: 'ejemplo' as const },
  ]
  const suggested = sample.map((row) => suggestMovement(row, data.invoices, data.applications))
  const foliosOf = (movement: Movement) => movement.suggestionIds.map((id) => data.invoices.find((item) => item.id === id)?.folio).join(',')
  if (foliosOf(suggested[0]) !== 'F-310') throw new Error(`Fletes match ${foliosOf(suggested[0])}`)
  if (suggested[1].category !== 'combustible' || suggested[1].suggestionIds.length !== 0) throw new Error('Fuel preview match')
  if (foliosOf(suggested[2]) !== 'H-118') throw new Error(`Harinera match ${foliosOf(suggested[2])}`)
  if (suggested[3].reconciliation !== 'no_requiere') throw new Error('Commission should not need an invoice')
  if (foliosOf(suggested[4]) !== 'E-221') throw new Error(`Collection match ${foliosOf(suggested[4])}`)
  if (suggested[5].suggestionIds.length !== 0) throw new Error('Altos should stay unmatched')
}

export const SEED = build()
assertSeed(SEED)
