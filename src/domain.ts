import { ACCOUNTS, CUSTOMERS, SUPPLIERS, accountLabel, partyAliases, partySearchText, type Party } from './catalog'
import { daysBetween, formatDate, formatDateLong, money, norm } from './format'
import type {
  Application,
  AttentionItem,
  Category,
  CategoryRule,
  Complemento,
  GuidedFlow,
  Invoice,
  Movement,
  PaymentStatus,
  Reconciliation,
} from './types'

export function paidAmount(invoiceId: string, applications: Application[]): number {
  return applications.filter((item) => item.invoiceId === invoiceId).reduce((sum, item) => sum + item.amount, 0)
}

export function pendingBalance(invoice: Invoice, applications: Application[]): number {
  return Math.max(0, invoice.total - paidAmount(invoice.id, applications))
}

export function paymentStatus(invoice: Invoice, applications: Application[]): PaymentStatus {
  const paid = paidAmount(invoice.id, applications)
  if (paid <= 0) return 'sin_pago'
  if (paid < invoice.total) return 'parcial'
  return 'pagada'
}

export function invoiceReconciliation(
  invoice: Invoice,
  movements: Movement[],
  applications: Application[],
): Reconciliation {
  if (invoice.vigencia === 'cancelado') return 'sin_coincidencia'
  if (applications.some((item) => item.invoiceId === invoice.id)) return 'confirmada'
  if (movements.some((item) => item.reconciliation === 'por_revisar' && item.suggestionIds.includes(invoice.id))) {
    return 'por_revisar'
  }
  return 'sin_coincidencia'
}

export function paymentOf(movement: { cargo: number; abono: number }): number {
  return movement.cargo > 0 ? movement.cargo : movement.abono
}

export function isPaymentWithoutInvoice(movement: Movement, applications: Application[]): boolean {
  if (movement.cargo <= 0) return false
  if (movement.reconciliation === 'no_requiere') return false
  if (movement.category === 'comisiones' || movement.category === 'traspasos entre cuentas propias') return false
  return !applications.some((item) => item.movementId === movement.id)
}

export function paymentsWithoutInvoice(movements: Movement[], applications: Application[]): Movement[] {
  return movements.filter((movement) => isPaymentWithoutInvoice(movement, applications))
}

export function supplierRows(name: string, invoices: Invoice[], applications: Application[]) {
  return invoices
    .filter((invoice) => invoice.direction === 'recibida' && invoice.vigencia === 'vigente' && norm(invoice.name) === norm(name))
    .map((invoice) => ({
      invoice,
      pending: pendingBalance(invoice, applications),
      paid: paidAmount(invoice.id, applications),
    }))
}

export function supplierDebt(name: string, invoices: Invoice[], applications: Application[]): number {
  return supplierRows(name, invoices, applications).reduce((sum, row) => sum + row.pending, 0)
}

export function customerRows(name: string, invoices: Invoice[], applications: Application[]) {
  return invoices
    .filter((invoice) => invoice.direction === 'emitida' && invoice.vigencia === 'vigente' && norm(invoice.name) === norm(name))
    .map((invoice) => ({
      invoice,
      pending: pendingBalance(invoice, applications),
      paid: paidAmount(invoice.id, applications),
    }))
}

function aliasHit(normalized: string, alias: string): boolean {
  const aliasNorm = norm(alias)
  if (!aliasNorm) return false
  if (normalized.includes(aliasNorm)) return true
  const words = aliasNorm.split(' ').filter((word) => word.length > 4)
  return words.length >= 2 && words.every((word) => normalized.includes(word))
}

export function findParty(text: string): { name: string; kind: 'supplier' | 'customer' } | null {
  const normalized = norm(text)
  const all = [
    ...SUPPLIERS.map((party) => ({ party, kind: 'supplier' as const })),
    ...CUSTOMERS.map((party) => ({ party, kind: 'customer' as const })),
  ]
  const hits = all.filter(({ party }) => partyAliases(party).some((alias) => aliasHit(normalized, alias)))
  hits.sort((a, b) => {
    const length = (party: Party) => Math.max(...partyAliases(party).map((alias) => norm(alias).length))
    return length(b.party) - length(a.party)
  })
  const hit = hits[0]
  return hit ? { name: hit.party.name, kind: hit.kind } : null
}

function significantWords(name: string): string[] {
  return norm(name).split(' ').filter((word) => word.length > 3)
}

export function nameInConcept(concept: string, name: string): boolean {
  const normalized = norm(concept)
  const words = significantWords(name)
  if (!words.length) return false
  const hits = words.filter((word) => normalized.includes(word))
  if (words.length === 1) return hits.length === 1
  return hits.length >= 2
}

function bestParty(concept: string, parties: Party[]): Party | null {
  const hits = parties.filter((party) => partyAliases(party).some((alias) => nameInConcept(concept, alias)))
  hits.sort((a, b) => {
    const score = (party: Party) => Math.max(...partyAliases(party).map((alias) => significantWords(alias).length))
    return score(b) - score(a) || b.name.length - a.name.length
  })
  return hits[0] ?? null
}

export function isChoiceCase(movement: Movement, invoices: Invoice[], applications: Application[]): boolean {
  if (movement.suggestionIds.length < 2) return false
  const payment = paymentOf(movement)
  const amounts = movement.suggestionIds.map((id) => {
    const invoice = invoices.find((item) => item.id === id)
    return invoice ? pendingBalance(invoice, applications) : -1
  })
  return amounts.every((amount) => amount === payment)
}

function subsetSumIds(open: { id: string; pending: number }[], target: number): string[] | null {
  const singles = open.filter((item) => item.pending === target)
  if (singles.length >= 2) return singles.map((item) => item.id)
  if (singles.length === 1) return [singles[0].id]

  const pairs: string[][] = []
  for (let i = 0; i < open.length; i += 1) {
    for (let j = i + 1; j < open.length; j += 1) {
      if (open[i].pending + open[j].pending === target) pairs.push([open[i].id, open[j].id])
    }
  }
  if (pairs.length === 1) return pairs[0]

  const triples: string[][] = []
  for (let i = 0; i < open.length; i += 1) {
    for (let j = i + 1; j < open.length; j += 1) {
      for (let k = j + 1; k < open.length; k += 1) {
        if (open[i].pending + open[j].pending + open[k].pending === target) {
          triples.push([open[i].id, open[j].id, open[k].id])
        }
      }
    }
  }
  if (triples.length === 1) return triples[0]
  return null
}

export function suggestMovement(
  draft: Omit<Movement, 'category' | 'reconciliation' | 'suggestionIds'>,
  invoices: Invoice[],
  applications: Application[],
  rules: CategoryRule[] = [],
): Movement {
  const concept = norm(draft.concept)
  if (concept.includes('traspaso') || concept.includes('cuenta propia')) {
    return { ...draft, category: 'traspasos entre cuentas propias', reconciliation: 'no_requiere', suggestionIds: [] }
  }
  if (concept.includes('comision')) {
    return { ...draft, category: 'comisiones', reconciliation: 'no_requiere', suggestionIds: [] }
  }

  const payment = paymentOf(draft)
  const direction = draft.cargo > 0 ? 'recibida' : 'emitida'
  const parties = direction === 'recibida' ? SUPPLIERS : CUSTOMERS
  const party = bestParty(draft.concept, parties)
  const partyName = party?.name ?? null
  const ruled = party ? rules.find((rule) => rule.rfc === party.rfc) : undefined
  let category: Category = ruled?.category ?? (draft.abono > 0 ? 'cobros de clientes' : 'mercancía')
  if (!ruled && (concept.includes('gasolina') || concept.includes('combustible') || concept.includes('diesel') || concept.includes('pemex'))) {
    category = 'combustible'
  }
  if (!ruled && party && category === 'mercancía') category = party.category
  if (!ruled && party && category === 'cobros de clientes' && direction === 'recibida') category = party.category

  if (!partyName || payment <= 0) {
    return { ...draft, category, reconciliation: 'sin_coincidencia', suggestionIds: [] }
  }

  const open = invoices
    .filter((invoice) => invoice.direction === direction && invoice.vigencia === 'vigente' && norm(invoice.name) === norm(partyName))
    .map((invoice) => ({ id: invoice.id, pending: pendingBalance(invoice, applications) }))
    .filter((invoice) => invoice.pending > 0)

  const suggestionIds = subsetSumIds(open, payment) ?? []
  return {
    ...draft,
    category,
    reconciliation: suggestionIds.length ? 'por_revisar' : 'sin_coincidencia',
    suggestionIds,
  }
}

export function fingerprint(movement: Pick<Movement, 'date' | 'concept' | 'cargo' | 'abono' | 'accountId'>): string {
  return [movement.date, norm(movement.concept), movement.cargo, movement.abono, movement.accountId].join('|')
}

export function duplicateStatus(
  row: Pick<Movement, 'date' | 'concept' | 'cargo' | 'abono' | 'accountId'>,
  movements: Movement[],
): 'nuevo' | 'duplicado' | 'posible' {
  const id = fingerprint(row)
  if (movements.some((movement) => fingerprint(movement) === id)) return 'duplicado'
  const possible = movements.some((movement) => {
    if (movement.cargo !== row.cargo || movement.abono !== row.abono) return false
    if (movement.cargo === 0 && movement.abono === 0) return false
    const days = Math.abs(daysBetween(movement.date, row.date))
    if (days === 0 || days > 5) return false
    const known = new Set(norm(movement.concept).split(' ').filter((word) => word.length > 4))
    return norm(row.concept)
      .split(' ')
      .filter((word) => word.length > 4)
      .some((word) => known.has(word))
  })
  return possible ? 'posible' : 'nuevo'
}

export function eligibleInvoices(movement: Movement, invoices: Invoice[], applications: Application[]): Invoice[] {
  const direction = movement.cargo > 0 ? 'recibida' : 'emitida'
  return invoices
    .filter((invoice) => invoice.direction === direction && invoice.vigencia === 'vigente' && pendingBalance(invoice, applications) > 0)
    .sort((a, b) => a.name.localeCompare(b.name, 'es-MX') || a.folio.localeCompare(b.folio, 'es-MX'))
}

export function selectedPending(ids: string[], invoices: Invoice[], applications: Application[]): number {
  return ids.reduce((sum, id) => {
    const invoice = invoices.find((item) => item.id === id)
    return sum + (invoice ? pendingBalance(invoice, applications) : 0)
  }, 0)
}

export function reconcileQuestion(movement: Movement, invoices: Invoice[], applications: Application[]): string {
  if (movement.reconciliation === 'confirmada') return reconcileResultCopy(movement, invoices, applications)
  if (isChoiceCase(movement, invoices, applications)) return '¿Cuál de estas facturas corresponde a este pago?'
  if (movement.suggestionIds.length === 2) return '¿Este pago cubre estas dos facturas?'
  if (movement.suggestionIds.length === 1) return '¿Este pago corresponde a esta factura?'
  return '¿A qué facturas corresponde este pago?'
}

export function reconcileResultCopy(movement: Movement, invoices: Invoice[], applications: Application[]): string {
  const applied = applications
    .filter((item) => item.movementId === movement.id)
    .map((item) => invoices.find((invoice) => invoice.id === item.invoiceId))
    .filter((invoice): invoice is Invoice => Boolean(invoice))
  const missing = applied.filter((invoice) => invoice.complemento === 'pendiente')
  const empaques = applied.some((invoice) => invoice.folio === 'A-184') && applied.some((invoice) => invoice.folio === 'A-191')
  if (empaques && missing.some((invoice) => invoice.folio === 'A-191')) {
    return 'Las dos facturas quedaron pagadas. Falta el complemento de A-191'
  }
  if (empaques) return 'Las dos facturas quedaron pagadas.'
  if (applied.length === 1 && paymentStatus(applied[0], applications) === 'parcial') {
    return `${applied[0].folio} recibió este pago. El saldo pendiente es ${money(pendingBalance(applied[0], applications))}.`
  }
  if (missing.length === 1) return `${applied.map((invoice) => invoice.folio).join(' y ')} quedó pagada. Falta el complemento de ${missing[0].folio}.`
  if (applied.length === 1) return `${applied[0].folio} quedó pagada.`
  if (applied.length > 1) return 'Las facturas quedaron pagadas.'
  return 'El movimiento quedó conciliado.'
}

export function attentionItems(input: {
  movements: Movement[]
  invoices: Invoice[]
  applications: Application[]
}): AttentionItem[] {
  const reconciles: (AttentionItem & { sort: string })[] = input.movements
    .filter((movement) => movement.reconciliation === 'por_revisar' && movement.suggestionIds.length > 0)
    .map((movement) => {
      const suggested = movement.suggestionIds
        .map((id) => input.invoices.find((invoice) => invoice.id === id))
        .filter((invoice): invoice is Invoice => Boolean(invoice))
      const names = [...new Set(suggested.map((invoice) => invoice.name))]
      const choice = isChoiceCase(movement, input.invoices, input.applications)
      const title = `${names.length === 1 ? names[0] : 'Varios proveedores'} · ${money(paymentOf(movement))}`
      let line = 'Hay una factura por el mismo monto'
      if (choice) line = 'Hay dos facturas por el mismo monto'
      else if (suggested.length === 2) line = 'Podría cubrir dos facturas'
      else if (suggested.length > 2) line = 'Podría cubrir varias facturas'
      return {
        id: `rec-${movement.id}`,
        title,
        line,
        action: choice ? 'Elegir factura' : 'Revisar coincidencia',
        tone: 'review' as const,
        kind: 'reconcile' as const,
        movementId: movement.id,
        sort: movement.id === 'mov-empaques' ? '0' : movement.id === 'mov-sierra' ? '1' : `2-${movement.date}`,
      }
    })

  const complementos: (AttentionItem & { sort: string })[] = input.invoices
    .filter(
      (invoice) =>
        invoice.direction === 'recibida' &&
        invoice.vigencia === 'vigente' &&
        invoice.complemento === 'pendiente' &&
        paymentStatus(invoice, input.applications) === 'pagada',
    )
    .map((invoice) => ({
      id: `comp-${invoice.id}`,
      title: `Falta el complemento de ${invoice.folio}`,
      line: `${invoice.name} · factura pagada`,
      action: 'Ver factura',
      tone: 'review' as const,
      kind: 'complemento' as const,
      invoiceId: invoice.id,
      sort: `3-${invoice.issueDate}-${invoice.folio}`,
    }))

  return [...reconciles, ...complementos]
    .sort((a, b) => a.sort.localeCompare(b.sort))
    .map((item) => ({
      id: item.id,
      title: item.title,
      line: item.line,
      action: item.action,
      tone: item.tone,
      kind: item.kind,
      movementId: item.movementId,
      invoiceId: item.invoiceId,
    }))
}

export function debtNarrative(name: string, invoices: Invoice[], applications: Application[]): { text: string; invoiceIds: string[] } {
  const party = findParty(name) ?? (norm(name) === norm('Empaques de Occidente') ? { name: 'Empaques de Occidente', kind: 'supplier' as const } : null)
  if (!party) {
    return {
      text: 'Dime el proveedor con el nombre que aparece en la factura. Por ejemplo: ¿Cuánto le debo a Empaques de Occidente?',
      invoiceIds: [],
    }
  }
  if (party.kind === 'customer') {
    const rows = customerRows(party.name, invoices, applications)
    const debt = rows.reduce((sum, row) => sum + row.pending, 0)
    return {
      text: `${party.name} es cliente. El saldo por cobrar es ${money(debt)}. Lo ves en Facturas SAT, pestaña Emitidas.`,
      invoiceIds: rows.filter((row) => row.pending > 0).map((row) => row.invoice.id),
    }
  }
  const rows = supplierRows(party.name, invoices, applications)
  const debt = rows.reduce((sum, row) => sum + row.pending, 0)
  const open = rows.filter((row) => row.pending > 0)
  const recent = rows.filter((row) => row.invoice.issueDate >= '2026-10-01')
  const shown = open.length ? open : recent
  const details = shown.map((row) => {
    const complemento =
      row.invoice.complemento === 'pendiente' ? ', complemento pendiente' : row.invoice.complemento === 'recibido' ? ', con complemento' : ''
    if (row.pending > 0) return `${row.invoice.folio} por ${money(row.invoice.total)}, saldo ${money(row.pending)}${complemento}`
    return `${row.invoice.folio} por ${money(row.invoice.total)}, pagada${complemento}`
  })
  const head = debt === 0 ? `No le debes nada a ${party.name}. El saldo es $0.` : `Le debes ${money(debt)} a ${party.name}.`
  const body = details.length ? `${details.join('. ')}.` : 'No hay facturas vigentes con saldo.'
  const note = shown.some((row) => row.invoice.complemento === 'pendiente' && row.pending === 0)
    ? ' El complemento pendiente no suma deuda.'
    : ''
  return { text: `${head} ${body}${note}`, invoiceIds: shown.map((row) => row.invoice.id) }
}

export function unbilledNarrative(movements: Movement[], applications: Application[]): { text: string; count: number; total: number } {
  const list = paymentsWithoutInvoice(movements, applications)
  const total = list.reduce((sum, movement) => sum + movement.cargo, 0)
  const text =
    list.length === 0
      ? 'No tienes pagos sin factura. Los cargos ya están aplicados o no requieren comprobante.'
      : `Tienes ${list.length} ${list.length === 1 ? 'pago' : 'pagos'} sin factura por ${money(total)}.`
  return { text, count: list.length, total }
}

export function invoiceSentences(
  invoice: Invoice,
  invoices: Invoice[],
  movements: Movement[],
  applications: Application[],
  complementos: Complemento[],
): string[] {
  const paid = paidAmount(invoice.id, applications)
  const pending = pendingBalance(invoice, applications)
  const status = paymentStatus(invoice, applications)
  const who = invoice.direction === 'recibida' ? 'recibida de' : 'emitida a'
  const lines = [
    `Factura ${who} ${invoice.name} por ${money(invoice.total)}, del ${formatDateLong(invoice.issueDate)}. ${
      invoice.vigencia === 'cancelado' ? 'Está cancelada.' : 'Está vigente.'
    }`,
  ]
  if (invoice.vigencia === 'cancelado') {
    lines.push('No la uso para conciliar ni para calcular saldos.')
    return lines
  }
  if (status === 'sin_pago') lines.push(`No hay pagos aplicados. El saldo pendiente es ${money(pending)}.`)
  else if (status === 'parcial') lines.push(`Hay pagos aplicados por ${money(paid)}. El saldo pendiente es ${money(pending)}.`)
  else lines.push(`Los pagos aplicados cubren el total. El saldo pendiente es ${money(0)}.`)

  if (invoice.metodo === 'PPD') {
    if (invoice.complemento === 'recibido') lines.push('Es PPD y el complemento de pago ya está en el expediente.')
    else if (invoice.complemento === 'pendiente') lines.push('Es PPD y todavía falta el complemento de pago. Eso no aumenta el saldo.')
    else lines.push('Es PPD.')
  } else lines.push('Es PUE. El complemento de pago no aplica.')

  const appliedMoves = applications
    .filter((item) => item.invoiceId === invoice.id)
    .map((item) => ({ item, movement: movements.find((movement) => movement.id === item.movementId) }))
    .filter((entry) => entry.movement)
  if (appliedMoves.length) {
    lines.push(
      appliedMoves
        .map((entry) => `El movimiento del ${formatDate(entry.movement!.date)} aplicó ${money(entry.item.amount)} (${entry.movement!.concept}).`)
        .join(' '),
    )
  }
  const suggestion = movements.find((movement) => movement.reconciliation === 'por_revisar' && movement.suggestionIds.includes(invoice.id))
  if (suggestion) {
    const companions = suggestion.suggestionIds.filter((id) => id !== invoice.id).map((id) => invoices.find((item) => item.id === id)?.folio).filter(Boolean)
    lines.push(
      companions.length
        ? `La transferencia del ${formatDate(suggestion.date)} por ${money(paymentOf(suggestion))} está pendiente de tu confirmación, junto con ${companions.join(' y ')}.`
        : `La transferencia del ${formatDate(suggestion.date)} por ${money(paymentOf(suggestion))} está pendiente de tu confirmación.`,
    )
  }
  if (complementos.some((item) => item.invoiceId === invoice.id)) {
    lines.push('Puedes abrir el complemento de muestra desde los documentos.')
  }
  return lines
}

export function movementSentences(movement: Movement, invoices: Invoice[], applications: Application[]): string[] {
  const account = accountLabel(movement.accountId)
  const kind = movement.cargo > 0 ? `Cargo de ${money(movement.cargo)}` : `Abono de ${money(movement.abono)}`
  const lines = [
    `${kind} en ${account} el ${formatDateLong(movement.date)}. Concepto: ${movement.concept}.`,
    `La categoría es ${movement.category}.`,
  ]
  if (movement.reconciliation === 'no_requiere') {
    lines.push(
      movement.category === 'traspasos entre cuentas propias'
        ? 'Es un traspaso entre cuentas propias. No necesita factura.'
        : 'Este movimiento no necesita factura.',
    )
  }
  const applied = applications.filter((item) => item.movementId === movement.id)
  if (applied.length) {
    const bits = applied.map((item) => {
      const invoice = invoices.find((entry) => entry.id === item.invoiceId)
      return `${invoice?.folio ?? 'factura'} por ${money(item.amount)}`
    })
    lines.push(`Aplicado a ${bits.join(' y ')}.`)
  } else if (movement.reconciliation === 'por_revisar' && movement.suggestionIds.length) {
    const bits = movement.suggestionIds.map((id) => invoices.find((invoice) => invoice.id === id)?.folio).filter(Boolean)
    lines.push(`Sugiero revisarlo con ${bits.join(' y ')}. Todavía no está confirmado.`)
  } else if (movement.reconciliation === 'sin_coincidencia' && movement.cargo > 0) {
    lines.push('No encontré una factura vigente que coincida con este cargo.')
  }
  if (movement.origin === 'ejemplo') lines.push('Se agregó desde el estado de cuenta de ejemplo.')
  if (movement.origin === 'csv' && movement.sourceName) lines.push(`Se agregó desde el archivo ${movement.sourceName}.`)
  if (movement.reference) lines.push(`Referencia ${movement.reference}.`)
  return lines
}

export function filterMovements(
  movements: Movement[],
  applications: Application[],
  invoices: Invoice[],
  filters: { query: string; account: string; category: string; reconciliation: string; from: string; to: string },
): Movement[] {
  const query = norm(filters.query)
  return movements
    .filter((movement) => {
      if (filters.account !== 'todas' && movement.accountId !== filters.account) return false
      if (filters.category !== 'todas' && movement.category !== filters.category) return false
      if (filters.from && movement.date < filters.from) return false
      if (filters.to && movement.date > filters.to) return false
      if (filters.reconciliation === 'sin_factura' && !isPaymentWithoutInvoice(movement, applications)) return false
      if (filters.reconciliation !== 'todas' && filters.reconciliation !== 'sin_factura' && movement.reconciliation !== filters.reconciliation) {
        return false
      }
      if (!query) return true
      const linked = [...movement.suggestionIds, ...applications.filter((item) => item.movementId === movement.id).map((item) => item.invoiceId)]
      const folios = linked
        .map((id) => invoices.find((invoice) => invoice.id === id))
        .filter((invoice): invoice is Invoice => Boolean(invoice))
        .map((invoice) => `${invoice.folio} ${invoice.uuid} ${partySearchText(invoice.name)} ${invoice.usoCfdi} ${invoice.formaPago}`)
        .join(' ')
      return norm(`${movement.concept} ${movement.reference ?? ''} ${folios} ${accountLabel(movement.accountId)}`).includes(query)
    })
    .sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id))
}

export function filterInvoices(
  invoices: Invoice[],
  applications: Application[],
  filters: { query: string; party: string; vigencia: string; pago: string; complemento: string; from: string; to: string },
  tab: 'recibidas' | 'emitidas',
): Invoice[] {
  const direction = tab === 'recibidas' ? 'recibida' : 'emitida'
  const query = norm(filters.query)
  return invoices
    .filter((invoice) => invoice.direction === direction)
    .filter((invoice) => {
      if (filters.party !== 'todas' && invoice.name !== filters.party) return false
      if (filters.vigencia !== 'todas' && invoice.vigencia !== filters.vigencia) return false
      if (filters.pago !== 'todas' && paymentStatus(invoice, applications) !== filters.pago) return false
      if (filters.complemento !== 'todas' && invoice.complemento !== filters.complemento) return false
      if (filters.from && invoice.issueDate < filters.from) return false
      if (filters.to && invoice.issueDate > filters.to) return false
      if (!query) return true
      return norm(`${partySearchText(invoice.name)} ${invoice.rfc} ${invoice.folio} ${invoice.uuid} ${invoice.usoCfdi} ${invoice.formaPago} ${invoice.metodo}`).includes(query)
    })
    .sort((a, b) => b.issueDate.localeCompare(a.issueDate) || a.folio.localeCompare(b.folio, 'es-MX'))
}

export function partiesFor(invoices: Invoice[], tab: 'recibidas' | 'emitidas'): string[] {
  const direction = tab === 'recibidas' ? 'recibida' : 'emitida'
  return [...new Set(invoices.filter((invoice) => invoice.direction === direction).map((invoice) => invoice.name))].sort((a, b) =>
    a.localeCompare(b, 'es-MX'),
  )
}

export function linkedInvoices(movement: Movement, invoices: Invoice[], applications: Application[]): Invoice[] {
  const ids = [
    ...applications.filter((item) => item.movementId === movement.id).map((item) => item.invoiceId),
    ...movement.suggestionIds,
  ]
  const unique = [...new Set(ids)]
  return unique.map((id) => invoices.find((invoice) => invoice.id === id)).filter((invoice): invoice is Invoice => Boolean(invoice))
}

export function accountSummary(rows: { accountId: string }[]): string {
  const labels = [...new Set(rows.map((row) => accountLabel(row.accountId)))]
  if (labels.length === 0) return 'Sin cuenta'
  if (labels.length === 1) return labels[0]
  return labels.join(' y ')
}

export const PAGO_LABEL: Record<PaymentStatus, string> = {
  sin_pago: 'Sin pago identificado',
  parcial: 'Parcial',
  pagada: 'Pagada',
}

export const COMPLEMENTO_LABEL: Record<Invoice['complemento'], string> = {
  no_aplica: 'No aplica',
  pendiente: 'Pendiente',
  recibido: 'Recibido',
}

export const RECON_LABEL: Record<Reconciliation, string> = {
  sin_coincidencia: 'Sin coincidencia',
  por_revisar: 'Por revisar',
  confirmada: 'Confirmada',
  no_requiere: 'No requiere factura',
}

export function movementAccounts(movements: Movement[]): { id: string; label: string }[] {
  const ids = [...new Set(movements.map((movement) => movement.accountId))]
  const known = ACCOUNTS.map((account) => account.id)
  ids.sort((a, b) => known.indexOf(a as (typeof known)[number]) - known.indexOf(b as (typeof known)[number]))
  return ids.map((id) => ({ id, label: accountLabel(id) }))
}

export function movementAmount(movement: Pick<Movement, 'cargo' | 'abono'>): number {
  return movement.cargo > 0 ? movement.cargo : movement.abono
}

export function categoryAmount(movements: Movement[], category: string): number {
  return movements.filter((movement) => movement.category === category).reduce((sum, movement) => sum + movementAmount(movement), 0)
}

export function movementRfc(movement: Movement, invoices: Invoice[], applications: Application[]): string | null {
  const linked = linkedInvoices(movement, invoices, applications)
  if (linked[0]?.rfc) return linked[0].rfc
  const parties = movement.abono > 0 && movement.cargo === 0 ? CUSTOMERS : SUPPLIERS
  return bestParty(movement.concept, parties)?.rfc ?? null
}

export type PartyLedger = { rfc: string; name: string; pending: number }

export function partyLedgers(invoices: Invoice[], applications: Application[], direction: 'recibida' | 'emitida'): PartyLedger[] {
  const map = new Map<string, PartyLedger>()
  for (const invoice of invoices) {
    if (invoice.direction !== direction || invoice.vigencia !== 'vigente') continue
    const current = map.get(invoice.rfc) ?? { rfc: invoice.rfc, name: invoice.name, pending: 0 }
    current.pending += pendingBalance(invoice, applications)
    map.set(invoice.rfc, current)
  }
  return [...map.values()].sort((a, b) => b.pending - a.pending || a.name.localeCompare(b.name, 'es-MX'))
}

export function bankTotals(movements: Movement[], accountId: string): { ingresos: number; gastos: number } {
  const rows = movements.filter((movement) => movement.accountId === accountId)
  return {
    ingresos: rows.reduce((sum, movement) => sum + movement.abono, 0),
    gastos: rows.reduce((sum, movement) => sum + movement.cargo, 0),
  }
}

export type FlowStep = { key: 'factura' | 'pago' | 'complemento'; text: string; review: boolean; done: boolean }

export function invoiceFlow(invoice: Invoice, applications: Application[]): { complete: boolean; steps: FlowStep[] } {
  const pago = paymentStatus(invoice, applications)
  const transferPue = invoice.metodo === 'PUE' && invoice.formaPago === '03'
  const complementoNoAplica = invoice.complemento === 'no_aplica' || transferPue
  const complementoDone = complementoNoAplica || invoice.complemento === 'recibido'
  const pagoText = pago === 'pagada' ? 'Pagado' : pago === 'parcial' ? 'Parcial' : 'Sin pago'
  const complementoText = complementoNoAplica ? 'No aplica' : invoice.complemento === 'recibido' ? 'Recibido' : 'Pendiente'
  const review = invoice.vigencia === 'vigente' && !complementoDone && invoice.complemento === 'pendiente' && pago === 'pagada'
  const facturaDone = invoice.vigencia === 'vigente'
  const pagoDone = pago === 'pagada'
  const complete = facturaDone && pagoDone && complementoDone
  return {
    complete,
    steps: [
      { key: 'factura', text: facturaDone ? 'Lista' : 'Cancelada', review: false, done: facturaDone },
      { key: 'pago', text: pagoText, review: false, done: pagoDone },
      { key: 'complemento', text: complementoText, review, done: complementoDone },
    ],
  }
}

export function guidedOrder(invoices: Invoice[], applications: Application[]): string[] {
  return invoices
    .filter((invoice) => invoice.vigencia === 'vigente' && applications.some((item) => item.invoiceId === invoice.id))
    .sort((a, b) => {
      if (a.direction !== b.direction) return a.direction === 'recibida' ? -1 : 1
      return b.issueDate.localeCompare(a.issueDate) || a.folio.localeCompare(b.folio, 'es-MX')
    })
    .map((invoice) => invoice.id)
}

export function invoicesWithoutRelation(invoices: Invoice[], applications: Application[]): Invoice[] {
  return invoices
    .filter((invoice) => invoice.vigencia === 'vigente' && !applications.some((item) => item.invoiceId === invoice.id))
    .sort((a, b) => b.issueDate.localeCompare(a.issueDate) || a.folio.localeCompare(b.folio, 'es-MX'))
}

export function movementsWithoutRelation(movements: Movement[], applications: Application[]): Movement[] {
  return movements
    .filter((movement) => movement.reconciliation !== 'no_requiere' && !applications.some((item) => item.movementId === movement.id))
    .sort((a, b) => b.date.localeCompare(a.date) || a.id.localeCompare(b.id))
}

export function visibleFlow(
  invoice: Invoice,
  applications: Application[],
  guided: GuidedFlow | null,
): { complete: boolean; steps: FlowStep[] } {
  const flow = invoiceFlow(invoice, applications)
  if (guided?.phase !== 'running') return flow
  const index = guided.order.indexOf(invoice.id)
  if (index !== -1 && index < guided.step) return flow
  return {
    complete: false,
    steps: flow.steps.map((step) => ({ ...step, done: false, review: false, text: 'En espera' })),
  }
}
