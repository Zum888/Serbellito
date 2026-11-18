export type Direction = 'recibida' | 'emitida'
export type Metodo = 'PUE' | 'PPD'
export type Vigencia = 'vigente' | 'cancelado'
export type ComplementoStatus = 'no_aplica' | 'pendiente' | 'recibido'
export type Reconciliation = 'sin_coincidencia' | 'por_revisar' | 'confirmada' | 'no_requiere'
export type PaymentStatus = 'sin_pago' | 'parcial' | 'pagada'

export type KnownCategory =
  | 'mercancía'
  | 'empaques'
  | 'fletes'
  | 'combustible'
  | 'cobros de clientes'
  | 'comisiones'
  | 'traspasos entre cuentas propias'

export type Category = KnownCategory | (string & {})

export type CategoryRule = {
  rfc: string
  side: 'gasto' | 'ingreso'
  category: string
}

export type CustomCategory = {
  name: string
  side: 'gasto' | 'ingreso'
}

export type PartyProfile = {
  rfc: string
  razonSocial: string
  nombreComercial: string
  subnombre: string
}

export type Invoice = {
  id: string
  direction: Direction
  folio: string
  uuid: string
  rfc: string
  name: string
  issueDate: string
  total: number
  metodo: Metodo
  vigencia: Vigencia
  complemento: ComplementoStatus
  concept: string
  usoCfdi: string
  formaPago: string
}

export type Movement = {
  id: string
  date: string
  concept: string
  accountId: string
  cargo: number
  abono: number
  category: Category
  reconciliation: Reconciliation
  suggestionIds: string[]
  relatedMovementId?: string
  reference?: string
  origin: 'seed' | 'ejemplo' | 'csv'
  sourceName?: string
}

export type Application = {
  id: string
  movementId: string
  invoiceId: string
  amount: number
}

export type Complemento = {
  id: string
  invoiceId: string
  folio: string
  uuid: string
  fecha: string
  amount: number
}

export type RouteName = 'inicio' | 'bancos' | 'facturas' | 'categorias' | 'personas'

export type Detail = { type: 'invoice' | 'movement' | 'party'; id: string }

export type BankFilters = {
  query: string
  account: string
  category: string
  reconciliation: string
  from: string
  to: string
}

export type InvoiceTab = 'recibidas' | 'emitidas'

export type InvoiceFilters = {
  query: string
  party: string
  vigencia: string
  pago: string
  complemento: string
  from: string
  to: string
}

export type FiscalDoc = 'constancia' | 'opinion'

export type ChatAction =
  | { type: 'ask'; text: string }
  | { type: 'banks-unbilled' }
  | { type: 'upload' }
  | { type: 'reconcile'; movementId: string }
  | { type: 'invoice'; invoiceId: string }
  | { type: 'party-invoices'; direction: Direction; name: string }

export type ChatMessage = {
  id: string
  role: 'user' | 'assistant'
  kind:
    | 'text'
    | 'debt'
    | 'unbilled'
    | 'pending'
    | 'fiscal'
    | 'sat-loading'
    | 'upload'
    | 'import'
  text: string
  supplier?: string
  fiscal?: { doc: FiscalDoc; consultedAt: string }
  actions?: { label: string; action: ChatAction }[]
}

export type GuidedFlow = {
  phase: 'drop' | 'checklist' | 'running' | 'done'
  order: string[]
  checks: number
  step: number
}

export type AppState = {
  version: 2
  guided: GuidedFlow | null
  categoryRules: CategoryRule[]
  customCategories: CustomCategory[]
  partyProfiles: PartyProfile[]
  messages: ChatMessage[]
  movements: Movement[]
  invoices: Invoice[]
  complementos: Complemento[]
  applications: Application[]
  sidebarCollapsed: boolean
  route: RouteName
  detail: Detail | null
  detailBack: { route: RouteName; detail: Detail | null } | null
  reconcileId: string | null
  attentionExpanded: boolean
  bankFilters: BankFilters
  invoiceTab: InvoiceTab
  invoiceFilters: InvoiceFilters
}

export type AttentionItem = {
  id: string
  title: string
  line: string
  action: string
  tone: 'review'
  kind: 'reconcile' | 'complemento'
  movementId?: string
  invoiceId?: string
}
