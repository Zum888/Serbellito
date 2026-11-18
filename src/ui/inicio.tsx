import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { COMPANY } from '../catalog'
import { consultedLabel, fiscalPdf } from '../pdf'
import {
  attentionItems,
  debtNarrative,
  invoiceFlow,
  isChoiceCase,
  paymentOf,
  paymentStatus,
  pendingBalance,
  reconcileQuestion,
  selectedPending,
  unbilledNarrative,
} from '../domain'
import { accountLabel } from '../catalog'
import { formatDate, money } from '../format'
import { useStore } from '../store'
import type { AttentionItem, ChatMessage, Invoice, Movement } from '../types'
import { IconArrow, IconClip } from './icons'
import { PartyLines } from './party'

export function AttentionList({ items, onOpen }: { items: AttentionItem[]; onOpen: (item: AttentionItem) => void }) {
  if (!items.length) return <p className="quiet-block">Nada pendiente por ahora.</p>
  return (
    <div className="att-list" data-testid="attention-list">
      {items.map((item) => (
        <button key={item.id} type="button" className="att-item" onClick={() => onOpen(item)}>
          <span className="att-title">
            <i className="dot" />
            {item.title}
          </span>
          <span className="att-line">{item.line}</span>
          <span className="att-action">{item.action} →</span>
        </button>
      ))}
    </div>
  )
}

export function AttentionRail({ onOpen }: { onOpen: (item: AttentionItem) => void }) {
  const { state, toggleAttention } = useStore()
  const items = attentionItems(state)
  const shown = state.attentionExpanded ? items : items.slice(0, 3)
  return (
    <div className="rail-inner">
      <h2>Necesita tu atención</h2>
      <AttentionList items={shown} onOpen={onOpen} />
      {items.length > 3 && (
        <button type="button" className="btn quiet" onClick={toggleAttention}>
          {state.attentionExpanded ? 'Ver menos' : `Ver todas · ${items.length}`}
        </button>
      )}
    </div>
  )
}

function DocActions({
  title,
  file,
}: {
  title: string
  file: { blob: Blob; filename: string }
}) {
  const { openPdf, downloadFile } = useStore()
  return (
    <div className="doc-actions">
      <button type="button" className="btn primary" onClick={() => openPdf(file, title)}>
        Ver PDF
      </button>
      <button type="button" className="btn quiet" onClick={() => downloadFile(file)}>
        Descargar
      </button>
    </div>
  )
}

function MessageView({ message }: { message: ChatMessage }) {
  const { state, runAction, openDetail } = useStore()
  if (message.role === 'user') {
    return (
      <div className="msg user">
        <p>{message.text}</p>
      </div>
    )
  }

  let text = message.text
  let invoiceIds: string[] = []
  let extra: ReactNode = null

  if (message.kind === 'debt' && message.supplier) {
    const narrative = debtNarrative(message.supplier, state.invoices, state.applications)
    text = narrative.text
    invoiceIds = narrative.invoiceIds
  }
  if (message.kind === 'unbilled') {
    const narrative = unbilledNarrative(state.movements, state.applications)
    text = narrative.text
    extra = (
      <article className="doc-card">
        <div>
          <strong>Pagos sin factura</strong>
          <p>
            {narrative.count} {narrative.count === 1 ? 'movimiento' : 'movimientos'} · {money(narrative.total)}
          </p>
        </div>
        <button type="button" className="btn primary" onClick={() => runAction({ type: 'banks-unbilled' })}>
          Ver en Bancos
        </button>
      </article>
    )
  }
  if (message.kind === 'pending') {
    const items = attentionItems(state)
    text = items.length ? `Tienes ${items.length} ${items.length === 1 ? 'pendiente' : 'pendientes'} abiertos.` : 'No tienes pendientes abiertos.'
    extra = (
      <div className="inline-actions">
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            className="btn quiet"
            onClick={() =>
              runAction(
                item.kind === 'reconcile' && item.movementId
                  ? { type: 'reconcile', movementId: item.movementId }
                  : { type: 'invoice', invoiceId: item.invoiceId! },
              )
            }
          >
            {item.title} · {item.action}
          </button>
        ))}
      </div>
    )
  }
  if (message.kind === 'fiscal' && message.fiscal) {
    const file = fiscalPdf(message.fiscal.doc, consultedLabel(message.fiscal.consultedAt))
    const name = message.fiscal.doc === 'constancia' ? 'Constancia de Situación Fiscal' : 'Opinión del cumplimiento'
    extra = (
      <article className="doc-card">
        <div>
          <strong>{name}</strong>
          <p>{COMPANY.name}</p>
          <p>RFC {COMPANY.rfc}</p>
          <p>Consulta simulada: {consultedLabel(message.fiscal.consultedAt)}</p>
        </div>
        <DocActions title={name} file={file} />
      </article>
    )
  }

  return (
    <div className={`msg assistant${message.kind === 'sat-loading' ? ' loading' : ''}`}>
      {text && <p>{text}</p>}
      {invoiceIds.map((id) => {
        const invoice = state.invoices.find((item) => item.id === id)
        if (!invoice) return null
        return (
          <button key={id} type="button" className="doc-card as-button" onClick={() => openDetail({ type: 'invoice', id })}>
            <span>
              <strong>{invoice.folio}</strong>
              <PartyLines name={invoice.name} />
              <span className="muted">
                {money(invoice.total)} · saldo {money(pendingBalance(invoice, state.applications))}
              </span>
            </span>
            <span className="att-action">Abrir factura →</span>
          </button>
        )
      })}
      {extra}
      {message.actions && message.actions.length > 0 && (
        <div className="inline-actions">
          {message.actions.map((item) => (
            <button key={item.label} type="button" className="btn quiet" onClick={() => runAction(item.action)}>
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function Composer() {
  const { ask, openUpload } = useStore()
  const [text, setText] = useState('')
  const [dragging, setDragging] = useState(false)
  const area = useRef<HTMLTextAreaElement>(null)
  const file = useRef<HTMLInputElement>(null)

  function send() {
    const value = text.trim()
    if (!value) {
      area.current?.focus()
      return
    }
    setText('')
    ask(value)
  }

  return (
    <form
      className="composer-form"
      onSubmit={(event) => {
        event.preventDefault()
        send()
      }}
    >
      <div
        className={`composer${dragging ? ' dragging' : ''}`}
        onDragOver={(event) => {
          event.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault()
          setDragging(false)
          const dropped = event.dataTransfer.files?.[0]
          if (dropped) openUpload(dropped)
        }}
      >
        <textarea
          ref={area}
          rows={2}
          data-testid="composer"
          placeholder="Pregúntame algo o arrastra tu estado de cuenta…"
          value={text}
          aria-label="Mensaje"
          onChange={(event) => setText(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault()
              send()
            }
          }}
        />
        <div className="composer-tools">
          <button type="button" className="icon-btn" aria-label="Adjuntar estado de cuenta" onClick={() => file.current?.click()}>
            <IconClip />
          </button>
          <button type="button" className={`send${text.trim() ? ' ready' : ''}`} aria-label="Enviar" onClick={send}>
            <IconArrow />
          </button>
        </div>
        {dragging && <div className="drop-hint">Suelta el estado de cuenta</div>}
      </div>
      <input
        ref={file}
        type="file"
        hidden
        accept=".csv,.xlsx,.xls,.pdf,text/csv,application/pdf"
        onChange={(event) => {
          const picked = event.target.files?.[0]
          event.target.value = ''
          if (picked) openUpload(picked)
        }}
      />
    </form>
  )
}

export function Inicio() {
  const { state, ask, openUpload } = useStore()
  const started = state.messages.some((message) => message.role === 'user')
  const end = useRef<HTMLDivElement>(null)

  useEffect(() => {
    end.current?.scrollIntoView({ block: 'end' })
  }, [state.messages])

  if (!started) {
    return (
      <div className="stage-wrap">
        <div className="stage">
          <h1 data-testid="greeting">Buenas tardes, Óscar</h1>
          <p className="lede">Hay una transferencia que me gustaría revisar contigo</p>
          <Composer />
          <div className="suggestions">
            <button type="button" data-testid="suggestion-upload" onClick={() => openUpload()}>
              Subir estado de cuenta
            </button>
            <button type="button" data-testid="suggestion-constancia" onClick={() => ask('Pedir mi constancia')}>
              Pedir mi constancia
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="chat">
      <div className="thread" aria-live="polite">
        {state.messages.map((message) => (
          <MessageView key={message.id} message={message} />
        ))}
        <div ref={end} />
      </div>
      <div className="dock">
        <Composer />
      </div>
    </div>
  )
}

function TransferBlock({ movement }: { movement: Movement }) {
  return (
    <div className="transfer">
      <div>
        <div className="eyebrow">{movement.cargo > 0 ? 'Transferencia' : 'Abono'}</div>
        <div>
          {formatDate(movement.date)} · {accountLabel(movement.accountId)}
        </div>
        <div className="concept">{movement.concept}</div>
      </div>
      <div className="transfer-amt">
        <div className="eyebrow">{movement.cargo > 0 ? 'Cargo' : 'Abono'}</div>
        <strong>{money(paymentOf(movement))}</strong>
      </div>
    </div>
  )
}

function selectionFor(movement: Movement, invoices: Invoice[], applications: Parameters<typeof isChoiceCase>[2]): string[] {
  if (movement.reconciliation === 'confirmada') {
    return applications.filter((item) => item.movementId === movement.id).map((item) => item.invoiceId)
  }
  if (isChoiceCase(movement, invoices, applications)) return []
  return [...movement.suggestionIds]
}

function FlowMark({ invoice, applications }: { invoice: Invoice; applications: Parameters<typeof invoiceFlow>[1] }) {
  const flow = invoiceFlow(invoice, applications)
  if (flow.complete) {
    return (
      <span className="complete">
        <span className="complete-dot" aria-hidden="true" />
        Completo
      </span>
    )
  }
  const pago = paymentStatus(invoice, applications)
  if (flow.steps.some((step) => step.review)) return <span className="review">Falta complemento</span>
  return <span className="muted">{pago === 'parcial' ? 'Parcial' : 'Pagada'}</span>
}

function invoiceNote(invoice: Invoice): string {
  if (invoice.complemento === 'pendiente') return 'Factura vigente · falta complemento'
  if (invoice.complemento === 'recibido') return 'Factura vigente · complemento en el expediente'
  return 'Factura vigente'
}

export function ReconcilePanel() {
  const { state, closeReconcile, confirmReconcile, openDetail } = useStore()
  const movement = state.movements.find((item) => item.id === state.reconcileId)
  const [selected, setSelected] = useState<string[]>(() => (movement ? selectionFor(movement, state.invoices, state.applications) : []))
  const [showOthers, setShowOthers] = useState(false)
  const [manual, setManual] = useState(false)

  if (!movement) return null
  const confirmed = movement.reconciliation === 'confirmada'
  const choice = !manual && !confirmed && isChoiceCase(movement, state.invoices, state.applications)
  const payment = paymentOf(movement)
  const appliedSum = state.applications.filter((item) => item.movementId === movement.id).reduce((sum, item) => sum + item.amount, 0)
  const diff = confirmed ? payment - appliedSum : payment - selectedPending(selected, state.invoices, state.applications)
  const question = reconcileQuestion(movement, state.invoices, state.applications)
  const mainIds = [...new Set([...movement.suggestionIds, ...selected])]
  const mainInvoices = mainIds
    .map((id) => state.invoices.find((invoice) => invoice.id === id))
    .filter((invoice): invoice is Invoice => Boolean(invoice))
  const others = state.invoices.filter((invoice) => {
    const direction = movement.cargo > 0 ? 'recibida' : 'emitida'
    return invoice.direction === direction && invoice.vigencia === 'vigente' && pendingBalance(invoice, state.applications) > 0 && !mainIds.includes(invoice.id)
  })
  const empaques =
    selected.length === 2 && selected.includes('inv-a184') && selected.includes('inv-a191') && diff === 0
  const canExact = !confirmed && diff === 0 && selected.length > 0
  const canPartial = !confirmed && selected.length === 1 && diff < 0
  const missing = confirmed
    ? state.invoices.find((invoice) => selected.includes(invoice.id) && invoice.complemento === 'pendiente' && invoice.folio === 'A-191')
    : undefined

  function toggle(id: string) {
    if (choice) {
      setSelected([id])
      return
    }
    setSelected((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]))
  }

  return (
    <section className="reconcile" data-testid="reconcile-panel">
      <header className="reconcile-head">
        <button type="button" className="btn quiet back" onClick={closeReconcile}>
          ← Volver
        </button>
        <h2 data-testid="reconcile-question">{question}</h2>
      </header>
      <div className="reconcile-body" data-testid="reconcile-body">
        <TransferBlock movement={movement} />
        <div className="invoice-pick">
          {mainInvoices.map((invoice) => {
            const checked = selected.includes(invoice.id)
            const amount = confirmed
              ? state.applications.find((item) => item.movementId === movement.id && item.invoiceId === invoice.id)?.amount ?? invoice.total
              : pendingBalance(invoice, state.applications)
            return (
              <label key={invoice.id} className={`pick${checked || confirmed ? ' selected' : ''}`}>
                {!confirmed && (
                  <input
                    type={choice ? 'radio' : 'checkbox'}
                    name="factura"
                    checked={checked}
                    onChange={() => toggle(invoice.id)}
                  />
                )}
                <span>
                  <strong>{invoice.folio}</strong>
                  <PartyLines name={invoice.name} />
                  <span className="muted">{invoiceNote(invoice)}</span>
                </span>
                <span className="amt">
                  {money(confirmed ? amount : invoice.total)}
                  {confirmed && <FlowMark invoice={invoice} applications={state.applications} />}
                </span>
              </label>
            )
          })}
        </div>
        {!confirmed && (
          <button
            type="button"
            className="btn quiet"
            onClick={() => {
              setManual(true)
              setShowOthers((value) => !value)
            }}
          >
            {showOthers ? 'Ocultar otras facturas' : 'Elegir otras facturas'}
          </button>
        )}
        {showOthers && !confirmed && (
          <div className="others">
            {others.length === 0 && <p className="muted">No hay otras facturas vigentes con saldo.</p>}
            {others.map((invoice) => (
              <label key={invoice.id} className="pick compact">
                <input type="checkbox" checked={false} onChange={() => toggle(invoice.id)} />
                <span>
                  <strong>{invoice.folio}</strong>
                  <PartyLines name={invoice.name} />
                  <span className="muted">Saldo {money(pendingBalance(invoice, state.applications))}</span>
                </span>
                <span className="amt">{money(invoice.total)}</span>
              </label>
            ))}
          </div>
        )}
      </div>
      <footer className="reconcile-foot">
        <div data-testid="reconcile-difference" className={diff === 0 ? undefined : 'review'}>
          Diferencia: {money(diff)}
        </div>
        <div className="foot-actions">
          {!confirmed && (
            <button type="button" className="btn quiet" onClick={closeReconcile}>
              Dejar pendiente
            </button>
          )}
          {canExact && (
            <button type="button" className="btn primary" data-testid="reconcile-confirm" onClick={() => confirmReconcile(movement.id, selected)}>
              {empaques ? 'Sí, pagué las dos' : choice ? 'Sí, pagué esta' : 'Confirmar conciliación'}
            </button>
          )}
          {canPartial && (
            <button type="button" className="btn primary" onClick={() => confirmReconcile(movement.id, selected)}>
              Aplicar como pago parcial
            </button>
          )}
          {confirmed && missing && (
            <button type="button" className="btn primary" onClick={() => openDetail({ type: 'invoice', id: missing.id })}>
              Ver factura A-191
            </button>
          )}
          {confirmed && !missing && (
            <button type="button" className="btn primary" onClick={closeReconcile}>
              Cerrar
            </button>
          )}
        </div>
      </footer>
    </section>
  )
}
