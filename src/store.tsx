import { createContext, useContext, useEffect, useMemo, useReducer, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { EXAMPLE_RULES, selectedAccountId } from './catalog'
import { interpret } from './chat'
import { fingerprint, guidedOrder } from './domain'
import { todayIso, uid } from './format'
import { SEED } from './seed'
import type {
  AppState,
  BankFilters,
  Category,
  CategoryRule,
  ChatAction,
  ChatMessage,
  CustomCategory,
  Detail,
  InvoiceFilters,
  InvoiceTab,
  Movement,
  PartyProfile,
  RouteName,
} from './types'
import { pendingBalance } from './domain'

const KEY = 'serbellito.demo.v2'

export const EMPTY_BANK_FILTERS: BankFilters = {
  query: '',
  account: 'acc-bbva',
  category: 'todas',
  reconciliation: 'todas',
  from: '',
  to: '',
}

export const EMPTY_INVOICE_FILTERS: InvoiceFilters = {
  query: '',
  party: 'todas',
  vigencia: 'todas',
  pago: 'todas',
  complemento: 'todas',
  from: '',
  to: '',
}

function addCategory(categories: CustomCategory[], name: string, side: 'gasto' | 'ingreso'): CustomCategory[] {
  const trimmed = name.trim()
  if (!trimmed) return categories
  if (categories.some((item) => item.name.localeCompare(trimmed, 'es-MX', { sensitivity: 'accent' }) === 0)) return categories
  return [...categories, { name: trimmed, side }]
}

function cleanProfile(profile: PartyProfile): PartyProfile | null {
  const razonSocial = profile.razonSocial.trim()
  const nombreComercial = profile.nombreComercial.trim()
  const subnombre = profile.subnombre.trim()
  if (!profile.rfc || !razonSocial || !nombreComercial || !subnombre) return null
  return { rfc: profile.rfc, razonSocial, nombreComercial, subnombre }
}

function upsertRule(rules: CategoryRule[], rule: CategoryRule): CategoryRule[] {
  const category = rule.category.trim()
  if (!rule.rfc || !category) return rules
  return [...rules.filter((item) => item.rfc !== rule.rfc), { rfc: rule.rfc, side: rule.side, category }]
}

function freshState(): AppState {
  return {
    version: 2,
    guided: null,
    categoryRules: EXAMPLE_RULES,
    customCategories: [],
    partyProfiles: [],
    messages: [],
    movements: SEED.movements,
    invoices: SEED.invoices,
    complementos: SEED.complementos,
    applications: SEED.applications,
    sidebarCollapsed: false,
    route: 'inicio',
    detail: null,
    detailBack: null,
    reconcileId: null,
    attentionExpanded: false,
    bankFilters: EMPTY_BANK_FILTERS,
    invoiceTab: 'recibidas',
    invoiceFilters: EMPTY_INVOICE_FILTERS,
  }
}

function loadState(): AppState {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return freshState()
    const parsed = JSON.parse(raw) as AppState
    if (parsed.version !== 2 || parsed.invoices?.length !== 100 || !Array.isArray(parsed.movements)) return freshState()
    if (parsed.invoices.some((invoice) => !invoice.usoCfdi || !invoice.formaPago)) return freshState()
    if (!Array.isArray(parsed.categoryRules)) parsed.categoryRules = EXAMPLE_RULES
    if (!Array.isArray(parsed.customCategories)) parsed.customCategories = []
    if (!Array.isArray(parsed.partyProfiles)) parsed.partyProfiles = []
    parsed.messages = []
    parsed.guided = null
    parsed.route = 'inicio'
    parsed.detail = null
    parsed.detailBack = null
    parsed.reconcileId = null
    return parsed
  } catch {
    return freshState()
  }
}

type Action =
  | { type: 'reset' }
  | { type: 'add-message'; message: ChatMessage }
  | { type: 'replace-message'; id: string; message: ChatMessage }
  | { type: 'toggle-sidebar' }
  | { type: 'navigate'; route: RouteName }
  | { type: 'open-detail'; detail: Detail }
  | { type: 'close-detail' }
  | { type: 'open-reconcile'; movementId: string }
  | { type: 'close-reconcile' }
  | { type: 'bank-filters'; filters: BankFilters }
  | { type: 'invoice-filters'; filters: InvoiceFilters }
  | { type: 'invoice-tab'; tab: InvoiceTab }
  | { type: 'toggle-attention' }
  | { type: 'select-account'; accountId: string }
  | { type: 'open-category'; category: Category }
  | { type: 'set-category'; movementId: string; category: Category; always?: { rfc: string; side: 'gasto' | 'ingreso' } }
  | { type: 'save-rule'; rfc: string; side: 'gasto' | 'ingreso'; category: string }
  | { type: 'create-category'; name: string; side: 'gasto' | 'ingreso' }
  | { type: 'save-profile'; profile: PartyProfile }
  | { type: 'confirm'; movementId: string; invoiceIds: string[] }
  | { type: 'undo'; movementId: string }
  | { type: 'complemento'; invoiceId: string }
  | { type: 'import'; movements: Movement[] }
  | { type: 'party'; direction: 'recibida' | 'emitida'; name: string }
  | { type: 'guided-arm'; order: string[] }
  | { type: 'guided-advance' }

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'reset':
      return freshState()
    case 'add-message':
      return { ...state, messages: [...state.messages, action.message] }
    case 'replace-message':
      return { ...state, messages: state.messages.map((message) => (message.id === action.id ? action.message : message)) }
    case 'toggle-sidebar':
      return { ...state, sidebarCollapsed: !state.sidebarCollapsed }
    case 'navigate':
      return { ...state, route: action.route, detail: null, detailBack: null, reconcileId: action.route === 'inicio' ? state.reconcileId : null }
    case 'open-detail':
      return {
        ...state,
        detailBack: { route: state.route, detail: state.detail },
        detail: action.detail,
        route: action.detail.type === 'invoice' ? 'facturas' : action.detail.type === 'party' ? 'personas' : 'bancos',
        reconcileId: null,
      }
    case 'close-detail':
      if (!state.detailBack) return { ...state, detail: null }
      return { ...state, route: state.detailBack.route, detail: state.detailBack.detail, detailBack: null }
    case 'open-reconcile':
      return { ...state, route: 'inicio', detail: null, detailBack: null, reconcileId: action.movementId }
    case 'close-reconcile':
      return { ...state, reconcileId: null }
    case 'bank-filters':
      return { ...state, bankFilters: action.filters, route: 'bancos', detail: null, detailBack: null, reconcileId: null }
    case 'select-account':
      return { ...state, bankFilters: { ...state.bankFilters, account: action.accountId } }
    case 'open-category':
      return {
        ...state,
        route: 'bancos',
        detail: null,
        detailBack: null,
        reconcileId: null,
        bankFilters: {
          ...EMPTY_BANK_FILTERS,
          account: selectedAccountId(state.bankFilters.account),
          category: action.category,
        },
      }
    case 'invoice-filters':
      return { ...state, invoiceFilters: action.filters }
    case 'invoice-tab':
      return { ...state, invoiceTab: action.tab, invoiceFilters: { ...state.invoiceFilters, party: 'todas' } }
    case 'toggle-attention':
      return { ...state, attentionExpanded: !state.attentionExpanded }
    case 'set-category':
      return {
        ...state,
        categoryRules: action.always ? upsertRule(state.categoryRules, { ...action.always, category: action.category }) : state.categoryRules,
        movements: state.movements.map((movement) => {
          if (movement.id !== action.movementId) return movement
          let reconciliation = movement.reconciliation
          if (movement.reconciliation !== 'confirmada') {
            if (action.category === 'traspasos entre cuentas propias' || action.category === 'comisiones') reconciliation = 'no_requiere'
            else if (movement.reconciliation === 'no_requiere') {
              reconciliation = movement.suggestionIds.length ? 'por_revisar' : 'sin_coincidencia'
            }
          }
          return { ...movement, category: action.category, reconciliation }
        }),
      }
    case 'save-rule':
      return { ...state, categoryRules: upsertRule(state.categoryRules, action) }
    case 'create-category':
      return { ...state, customCategories: addCategory(state.customCategories, action.name, action.side) }
    case 'save-profile': {
      const profile = cleanProfile(action.profile)
      if (!profile) return state
      return { ...state, partyProfiles: [...state.partyProfiles.filter((item) => item.rfc !== profile.rfc), profile] }
    }
    case 'confirm': {
      const movement = state.movements.find((item) => item.id === action.movementId)
      if (!movement || movement.reconciliation === 'confirmada') return state
      const direction = movement.cargo > 0 ? 'recibida' : 'emitida'
      const payment = movement.cargo > 0 ? movement.cargo : movement.abono
      const chosen = [...new Set(action.invoiceIds)]
        .map((id) => state.invoices.find((invoice) => invoice.id === id))
        .filter((invoice): invoice is NonNullable<typeof invoice> => Boolean(invoice))
        .filter((invoice) => invoice.vigencia === 'vigente' && invoice.direction === direction)
        .map((invoice) => ({ invoice, pending: pendingBalance(invoice, state.applications) }))
        .filter((item) => item.pending > 0)
      if (!chosen.length) return state
      const sum = chosen.reduce((total, item) => total + item.pending, 0)
      let amounts: { id: string; amount: number }[] = []
      if (sum === payment) amounts = chosen.map((item) => ({ id: item.invoice.id, amount: item.pending }))
      else if (chosen.length === 1 && chosen[0].pending > payment) amounts = [{ id: chosen[0].invoice.id, amount: payment }]
      else return state
      return {
        ...state,
        applications: [
          ...state.applications,
          ...amounts.map((item) => ({
            id: uid('app'),
            movementId: movement.id,
            invoiceId: item.id,
            amount: item.amount,
          })),
        ],
        movements: state.movements.map((item) => (item.id === movement.id ? { ...item, reconciliation: 'confirmada' } : item)),
      }
    }
    case 'undo': {
      const movement = state.movements.find((item) => item.id === action.movementId)
      if (!movement || movement.reconciliation !== 'confirmada') return state
      return {
        ...state,
        applications: state.applications.filter((item) => item.movementId !== movement.id),
        movements: state.movements.map((item) =>
          item.id === movement.id
            ? { ...item, reconciliation: item.suggestionIds.length ? 'por_revisar' : 'sin_coincidencia' }
            : item,
        ),
      }
    }
    case 'complemento': {
      const invoice = state.invoices.find((item) => item.id === action.invoiceId)
      if (!invoice || invoice.complemento !== 'pendiente') return state
      const paid = state.applications.filter((item) => item.invoiceId === invoice.id).reduce((sum, item) => sum + item.amount, 0)
      return {
        ...state,
        invoices: state.invoices.map((item) => (item.id === invoice.id ? { ...item, complemento: 'recibido' } : item)),
        complementos: [
          ...state.complementos,
          {
            id: uid('comp'),
            invoiceId: invoice.id,
            folio: `CP-${invoice.folio}`,
            uuid: uid('uuid'),
            fecha: todayIso(),
            amount: paid || invoice.total,
          },
        ],
      }
    }
    case 'import': {
      const known = new Set(state.movements.map((movement) => fingerprint(movement)))
      const fresh = action.movements.filter((movement) => !known.has(fingerprint(movement)))
      if (!fresh.length) return state
      return { ...state, movements: [...state.movements, ...fresh] }
    }
    case 'party':
      return {
        ...state,
        route: 'facturas',
        detail: null,
        detailBack: null,
        reconcileId: null,
        invoiceTab: action.direction === 'recibida' ? 'recibidas' : 'emitidas',
        invoiceFilters: { ...EMPTY_INVOICE_FILTERS, party: action.name },
      }
    case 'guided-arm':
      return {
        ...state,
        route: 'inicio',
        detail: null,
        detailBack: null,
        reconcileId: null,
        guided: { phase: 'drop', order: action.order, checks: 0, step: 0 },
      }
    case 'guided-advance': {
      const guided = state.guided
      if (!guided || guided.phase === 'done') return state
      if (guided.phase === 'drop') {
        return { ...state, guided: { ...guided, phase: 'checklist', checks: 1 } }
      }
      if (guided.phase === 'checklist') {
        if (guided.checks >= 4) {
          return {
            ...state,
            route: 'facturas',
            detail: null,
            detailBack: null,
            reconcileId: null,
            invoiceTab: 'recibidas',
            invoiceFilters: EMPTY_INVOICE_FILTERS,
            guided: { ...guided, phase: 'running', step: 0 },
          }
        }
        return { ...state, guided: { ...guided, checks: guided.checks + 1 } }
      }
      const next = Math.min(guided.order.length, guided.step + 8)
      if (next >= guided.order.length) {
        return { ...state, invoiceTab: 'recibidas', guided: { ...guided, step: next, phase: 'done' } }
      }
      return { ...state, guided: { ...guided, step: next } }
    }
    default:
      return state
  }
}

type PdfView = { url: string; filename: string; title: string }

type StoreValue = {
  state: AppState
  ask: (text: string) => void
  runAction: (action: ChatAction) => void
  toggleSidebar: () => void
  navigate: (route: RouteName) => void
  openDetail: (detail: Detail) => void
  closeDetail: () => void
  openReconcile: (movementId: string) => void
  closeReconcile: () => void
  setBankFilters: (filters: BankFilters) => void
  selectAccount: (accountId: string) => void
  openCategory: (category: Category) => void
  setInvoiceFilters: (filters: InvoiceFilters) => void
  setInvoiceTab: (tab: InvoiceTab) => void
  toggleAttention: () => void
  setCategory: (movementId: string, category: Category, always?: { rfc: string; side: 'gasto' | 'ingreso' }) => void
  saveRule: (rule: { rfc: string; side: 'gasto' | 'ingreso'; category: string }) => void
  createCategory: (name: string, side: 'gasto' | 'ingreso') => void
  saveProfile: (profile: PartyProfile) => void
  openParty: (direction: 'recibida' | 'emitida', name: string) => void
  confirmReconcile: (movementId: string, invoiceIds: string[]) => void
  undoReconcile: (movementId: string) => void
  simulateComplemento: (invoiceId: string) => void
  importMovements: (movements: Movement[]) => void
  reset: () => void
  startGuidedFlow: () => void
  uploadOpen: boolean
  uploadFile: File | null
  uploadToken: number
  openUpload: (file?: File) => void
  closeUpload: () => void
  pdf: PdfView | null
  openPdf: (file: { blob: Blob; filename: string }, title: string) => void
  closePdf: () => void
  downloadFile: (file: { blob: Blob; filename: string }) => void
}

const StoreContext = createContext<StoreValue | null>(null)

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, loadState)
  const [uploadOpen, setUploadOpen] = useState(false)
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [uploadToken, setUploadToken] = useState(0)
  const [pdf, setPdf] = useState<PdfView | null>(null)
  const epoch = useRef(0)

  useEffect(() => {
    localStorage.setItem(KEY, JSON.stringify(state))
  }, [state])

  useEffect(() => {
    const guided = state.guided
    if (!guided || guided.phase === 'done') return
    const delay = guided.phase === 'drop' ? 1100 : guided.phase === 'checklist' ? 650 : 420
    const timer = window.setTimeout(() => dispatch({ type: 'guided-advance' }), delay)
    return () => window.clearTimeout(timer)
  }, [state.guided])

  const api = useMemo<StoreValue>(() => {
    const openUpload = (file?: File) => {
      setUploadFile(file ?? null)
      setUploadToken((token) => token + 1)
      setUploadOpen(true)
    }
    const ask = (text: string) => {
      const reply = interpret(text)
      const currentEpoch = epoch.current
      dispatch({ type: 'add-message', message: { id: uid('msg'), role: 'user', kind: 'text', text } })
      if (reply.openUpload) openUpload()
      if (reply.fiscal) {
        const loadingId = uid('msg')
        dispatch({
          type: 'add-message',
          message: { id: loadingId, role: 'assistant', kind: 'sat-loading', text: 'Consultando al SAT · simulación' },
        })
        const consultedAt = new Date().toISOString()
        window.setTimeout(() => {
          if (epoch.current !== currentEpoch) return
          dispatch({
            type: 'replace-message',
            id: loadingId,
            message: {
              id: loadingId,
              role: 'assistant',
              kind: 'fiscal',
              text: reply.text,
              fiscal: { doc: reply.fiscal!, consultedAt },
            },
          })
        }, 700)
        return
      }
      dispatch({
        type: 'add-message',
        message: {
          id: uid('msg'),
          role: 'assistant',
          kind: reply.kind,
          text: reply.text,
          supplier: reply.supplier,
          actions: reply.actions,
        },
      })
    }
    const runAction = (action: ChatAction) => {
      if (action.type === 'ask') ask(action.text)
      else if (action.type === 'upload') openUpload()
      else if (action.type === 'banks-unbilled') {
        dispatch({ type: 'bank-filters', filters: { ...EMPTY_BANK_FILTERS, reconciliation: 'sin_factura' } })
      } else if (action.type === 'reconcile') dispatch({ type: 'open-reconcile', movementId: action.movementId })
      else if (action.type === 'invoice') dispatch({ type: 'open-detail', detail: { type: 'invoice', id: action.invoiceId } })
      else if (action.type === 'party-invoices') dispatch({ type: 'party', direction: action.direction, name: action.name })
    }
    return {
      state,
      ask,
      runAction,
      toggleSidebar: () => dispatch({ type: 'toggle-sidebar' }),
      navigate: (route) => dispatch({ type: 'navigate', route }),
      openDetail: (detail) => dispatch({ type: 'open-detail', detail }),
      closeDetail: () => dispatch({ type: 'close-detail' }),
      openReconcile: (movementId) => dispatch({ type: 'open-reconcile', movementId }),
      closeReconcile: () => dispatch({ type: 'close-reconcile' }),
      setBankFilters: (filters) => dispatch({ type: 'bank-filters', filters }),
      selectAccount: (accountId) => dispatch({ type: 'select-account', accountId }),
      openCategory: (category) => dispatch({ type: 'open-category', category }),
      setInvoiceFilters: (filters) => dispatch({ type: 'invoice-filters', filters }),
      setInvoiceTab: (tab) => dispatch({ type: 'invoice-tab', tab }),
      toggleAttention: () => dispatch({ type: 'toggle-attention' }),
      setCategory: (movementId, category, always) => dispatch({ type: 'set-category', movementId, category, always }),
      saveRule: (rule) => dispatch({ type: 'save-rule', ...rule }),
      createCategory: (name, side) => dispatch({ type: 'create-category', name, side }),
      saveProfile: (profile) => dispatch({ type: 'save-profile', profile }),
      openParty: (direction, name) => dispatch({ type: 'party', direction, name }),
      confirmReconcile: (movementId, invoiceIds) => dispatch({ type: 'confirm', movementId, invoiceIds }),
      undoReconcile: (movementId) => dispatch({ type: 'undo', movementId }),
      simulateComplemento: (invoiceId) => dispatch({ type: 'complemento', invoiceId }),
      importMovements: (movements) => dispatch({ type: 'import', movements }),
      reset: () => {
        epoch.current += 1
        localStorage.removeItem(KEY)
        dispatch({ type: 'reset' })
      },
      startGuidedFlow: () => {
        const phase = state.guided?.phase
        if (phase === 'drop' || phase === 'checklist' || phase === 'running') return
        dispatch({ type: 'guided-arm', order: guidedOrder(state.invoices, state.applications) })
      },
      uploadOpen,
      uploadFile,
      uploadToken,
      openUpload,
      closeUpload: () => setUploadOpen(false),
      pdf,
      openPdf: (file, title) => {
        const url = URL.createObjectURL(file.blob)
        setPdf((current) => {
          if (current) URL.revokeObjectURL(current.url)
          return { url, filename: file.filename, title }
        })
      },
      closePdf: () => {
        setPdf((current) => {
          if (current) URL.revokeObjectURL(current.url)
          return null
        })
      },
      downloadFile: (file) => {
        const url = URL.createObjectURL(file.blob)
        const link = document.createElement('a')
        link.href = url
        link.download = file.filename
        document.body.appendChild(link)
        link.click()
        link.remove()
        window.setTimeout(() => URL.revokeObjectURL(url), 1500)
      },
    }
  }, [pdf, state, uploadFile, uploadOpen, uploadToken])

  return <StoreContext.Provider value={api}>{children}</StoreContext.Provider>
}

export function useStore(): StoreValue {
  const value = useContext(StoreContext)
  if (!value) throw new Error('Store missing')
  return value
}
