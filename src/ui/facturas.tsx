import { useEffect, useState } from 'react'
import { accountLabel, formaLabel, partyByName, usoLabel } from '../catalog'
import {
  attentionItems,
  filterInvoices,
  invoiceFlow,
  invoiceSentences,
  invoicesWithoutRelation,
  movementsWithoutRelation,
  partiesFor,
  visibleFlow,
} from '../domain'
import { formatDate, money } from '../format'
import { EMPTY_INVOICE_FILTERS, useStore } from '../store'
import { complementoPdf, invoicePdf } from '../pdf'
import type { FlowStep } from '../domain'
import type { Movement } from '../types'
import { MxDate } from './fields'
import { PartyLines } from './party'

const STEP_LABEL: Record<FlowStep['key'], string> = {
  factura: 'Factura',
  pago: 'Pago bancario',
  complemento: 'Complemento',
}

function StatusDot({ done, fresh, label, detail }: { done: boolean; fresh: boolean; label: string; detail: string }) {
  const [open, setOpen] = useState(false)
  return (
    <button
      type="button"
      className={`status-hit${done ? ' done' : ''}${fresh ? ' fresh' : ''}${open ? ' open' : ''}`}
      aria-label={`${label}: ${detail}`}
      onClick={(event) => {
        event.stopPropagation()
        setOpen((value) => !value)
      }}
    >
      <span className="status-mark" />
      <span className="status-tip">{detail}</span>
    </button>
  )
}

export function Facturas() {
  const { state, setInvoiceTab, setInvoiceFilters, openDetail, openReconcile, navigate } = useStore()
  const guided = state.guided
  const freshIds = new Set(guided?.phase === 'running' ? guided.order.slice(Math.max(0, guided.step - 8), guided.step) : [])
  const [looseOpen, setLooseOpen] = useState(false)
  useEffect(() => {
    if (state.guided?.phase === 'done') setLooseOpen(true)
  }, [state.guided?.phase])
  if (state.detail?.type === 'invoice') return <InvoiceDetail id={state.detail.id} />

  const total = state.invoices.filter((invoice) => invoice.direction === (state.invoiceTab === 'recibidas' ? 'recibida' : 'emitida')).length
  const rows = filterInvoices(state.invoices, state.applications, state.invoiceFilters, state.invoiceTab)
  const parties = partiesFor(state.invoices, state.invoiceTab)
  const filters = state.invoiceFilters
  const active = Boolean(filters.query || filters.from || filters.to || filters.party !== 'todas' || filters.vigencia !== 'todas' || filters.pago !== 'todas' || filters.complemento !== 'todas')
  const pending = attentionItems(state).length
  const looseInvoices = invoicesWithoutRelation(state.invoices, state.applications)
  const looseMovements = movementsWithoutRelation(state.movements, state.applications)

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <h1>Facturas SAT</h1>
          <p className="muted">100 comprobantes de la demostración. Los complementos no entran en esa cuenta.</p>
        </div>
        <button type="button" className="btn quiet attention-jump" onClick={() => navigate('inicio')}>
          Necesita tu atención · {pending}
        </button>
      </header>
      <button type="button" className={`loose-strip${looseOpen ? ' on' : ''}`} aria-expanded={looseOpen} onClick={() => setLooseOpen((open) => !open)}>
        <span>Sin relación</span>
        <span>
          {looseInvoices.length} {looseInvoices.length === 1 ? 'factura' : 'facturas'} · {looseMovements.length}{' '}
          {looseMovements.length === 1 ? 'movimiento' : 'movimientos'}
        </span>
      </button>
      {looseOpen && (
        <Unmatched
          invoices={looseInvoices}
          movements={looseMovements}
          onInvoice={(id) => openDetail({ type: 'invoice', id })}
          onMovement={(movement) =>
            movement.reconciliation === 'por_revisar' ? openReconcile(movement.id) : openDetail({ type: 'movement', id: movement.id })
          }
        />
      )}
      {guided?.phase === 'running' && freshIds.size > 0 && (
        <div className="fresh-panel" data-testid="recien">
          <p>Acaban de coincidir</p>
          <ul>
            {[...freshIds].map((id) => {
              const invoice = state.invoices.find((item) => item.id === id)
              if (!invoice) return null
              const flow = visibleFlow(invoice, state.applications, guided)
              return (
                <li key={id} className="fresh-chip">
                  <span>{invoice.folio}</span>
                  {flow.steps.map((step) => (
                    <StatusDot key={step.key} done={step.done} fresh={step.done} label={STEP_LABEL[step.key]} detail={step.text} />
                  ))}
                </li>
              )
            })}
          </ul>
        </div>
      )}
      <div className="tabs">
        <button type="button" className={state.invoiceTab === 'recibidas' ? 'on' : ''} onClick={() => setInvoiceTab('recibidas')}>
          Recibidas
        </button>
        <button type="button" className={state.invoiceTab === 'emitidas' ? 'on' : ''} onClick={() => setInvoiceTab('emitidas')}>
          Emitidas
        </button>
      </div>
      <div className="filters">
        <label className="field grow">
          <span>Buscar</span>
          <input
            value={filters.query}
            placeholder="Subnombre, RFC, folio o UUID"
            onChange={(event) => setInvoiceFilters({ ...filters, query: event.target.value })}
          />
        </label>
        <label className="field">
          <span>{state.invoiceTab === 'recibidas' ? 'Proveedor' : 'Cliente'}</span>
          <select value={filters.party} onChange={(event) => setInvoiceFilters({ ...filters, party: event.target.value })}>
            <option value="todas">Todos</option>
            {parties.map((party) => {
              const known = partyByName(party)
              return (
                <option key={party} value={party}>
                  {known ? `${known.subnombre} · ${known.razonSocial}` : party}
                </option>
              )
            })}
          </select>
        </label>
        <label className="field">
          <span>Vigencia</span>
          <select value={filters.vigencia} onChange={(event) => setInvoiceFilters({ ...filters, vigencia: event.target.value })}>
            <option value="todas">Todas</option>
            <option value="vigente">Vigente</option>
            <option value="cancelado">Cancelado</option>
          </select>
        </label>
        <label className="field">
          <span>Pago</span>
          <select value={filters.pago} onChange={(event) => setInvoiceFilters({ ...filters, pago: event.target.value })}>
            <option value="todas">Todos</option>
            <option value="sin_pago">Sin pago identificado</option>
            <option value="parcial">Parcial</option>
            <option value="pagada">Pagada</option>
          </select>
        </label>
        <label className="field">
          <span>Complemento</span>
          <select value={filters.complemento} onChange={(event) => setInvoiceFilters({ ...filters, complemento: event.target.value })}>
            <option value="todas">Todos</option>
            <option value="no_aplica">No aplica</option>
            <option value="pendiente">Pendiente</option>
            <option value="recibido">Recibido</option>
          </select>
        </label>
        <MxDate label="Desde" value={filters.from} onChange={(from) => setInvoiceFilters({ ...filters, from })} />
        <MxDate label="Hasta" value={filters.to} onChange={(to) => setInvoiceFilters({ ...filters, to })} />
        {active && (
          <button type="button" className="btn quiet" onClick={() => setInvoiceFilters(EMPTY_INVOICE_FILTERS)}>
            Limpiar filtros
          </button>
        )}
      </div>
      <p className="count" data-testid="invoice-count">
        {rows.length} de {total}
      </p>
      {state.guided?.phase === 'running' && (
        <p className="count" data-testid="guided-progress">
          Relacionando con el banco · {state.guided.step} de {state.guided.order.length}
        </p>
      )}
      {rows.length === 0 ? (
        <div className="empty">
          <p>Ninguna factura coincide con estos filtros.</p>
          <button type="button" className="btn quiet" onClick={() => setInvoiceFilters(EMPTY_INVOICE_FILTERS)}>
            Limpiar filtros
          </button>
        </div>
      ) : (
        <div className="table-wrap">
          <table className="invoice-table">
            <thead>
              <tr>
                <th>Folio</th>
                <th>Uso CFDI</th>
                <th>Forma de pago</th>
                <th>Método</th>
                <th>Total</th>
                <th className="status-col">Factura</th>
                <th className="status-col">Pago bancario</th>
                <th className="status-col">Complemento</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((invoice) => {
                const flow = visibleFlow(invoice, state.applications, guided)
                const fresh = freshIds.has(invoice.id)
                return (
                  <tr
                    key={invoice.id}
                    className={`click${fresh ? ' fresh' : ''}`}
                    data-guided-id={invoice.id}
                    onClick={() => openDetail({ type: 'invoice', id: invoice.id })}
                  >
                    <td>
                      <strong>{invoice.folio}</strong>
                      {flow.complete && <div className="complete">Completo</div>}
                    </td>
                    <td>{usoLabel(invoice.usoCfdi)}</td>
                    <td>{formaLabel(invoice.formaPago)}</td>
                    <td>{invoice.metodo}</td>
                    <td className="num">{money(invoice.total)}</td>
                    {flow.steps.map((step) => (
                      <td key={step.key} className="status-col">
                        <StatusDot done={step.done} fresh={fresh && step.done} label={STEP_LABEL[step.key]} detail={step.text} />
                      </td>
                    ))}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function Unmatched({
  invoices,
  movements,
  onInvoice,
  onMovement,
}: {
  invoices: ReturnType<typeof invoicesWithoutRelation>
  movements: Movement[]
  onInvoice: (id: string) => void
  onMovement: (movement: Movement) => void
}) {
  return (
    <section className="unmatched loose-panel" data-testid="sin-relacion">
      <div className="unmatched-cols">
        <div>
          <h3>Facturas sin relación</h3>
          <ul>
            {invoices.map((invoice) => (
              <li key={invoice.id}>
                <button type="button" onClick={() => onInvoice(invoice.id)}>
                  <strong>{invoice.folio}</strong>
                  <span>
                    {invoice.name} · {money(invoice.total)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h3>Movimientos sin relación</h3>
          <ul>
            {movements.map((movement) => (
              <li key={movement.id}>
                <button type="button" onClick={() => onMovement(movement)}>
                  <strong>{formatDate(movement.date)}</strong>
                  <span>
                    {movement.concept} · {accountLabel(movement.accountId)} · {money(movement.cargo || movement.abono)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}

function InvoiceDetail({ id }: { id: string }) {
  const { state, closeDetail, openDetail, openReconcile, simulateComplemento, openPdf, downloadFile } = useStore()
  const invoice = state.invoices.find((item) => item.id === id)
  if (!invoice) {
    return (
      <div className="page">
        <button type="button" className="btn quiet" onClick={closeDetail}>
          ← Volver
        </button>
        <p>No encontré esa factura.</p>
      </div>
    )
  }
  const docs = state.complementos.filter((item) => item.invoiceId === invoice.id)
  const applied = state.applications
    .filter((item) => item.invoiceId === invoice.id)
    .map((item) => ({ item, movement: state.movements.find((movement) => movement.id === item.movementId) }))
    .filter((entry) => entry.movement)
  const suggestion = state.movements.find((movement) => movement.reconciliation === 'por_revisar' && movement.suggestionIds.includes(invoice.id))
  const printed = invoicePdf(invoice)
  const flow = invoiceFlow(invoice, state.applications)

  return (
    <div className="page detail">
      <button type="button" className="btn quiet" onClick={closeDetail}>
        {state.detailBack?.detail?.type === 'movement'
          ? '← Volver al movimiento'
          : state.detailBack?.detail?.type === 'party'
            ? '← Volver'
            : '← Volver a facturas'}
      </button>
      <h1>
        {invoice.folio}
        {invoice.vigencia === 'cancelado' ? <span className="muted"> · Cancelada</span> : null}
      </h1>
      <PartyLines name={invoice.name} />
      <p>
        {usoLabel(invoice.usoCfdi)} · {formaLabel(invoice.formaPago)} · {invoice.metodo}
      </p>
      <div className="detail-strip">
        {flow.steps.map((step) => (
          <span key={step.key} className="detail-step">
            <StatusDot done={step.done} fresh={false} label={STEP_LABEL[step.key]} detail={step.text} />
            <span className="muted">{STEP_LABEL[step.key]}</span>
          </span>
        ))}
        {flow.complete && <span className="complete">Completo</span>}
      </div>
      <p className="muted uuid">UUID {invoice.uuid}</p>
      <div className="sentences">
        {invoiceSentences(invoice, state.invoices, state.movements, state.applications, state.complementos).map((line) => (
          <p key={line}>{line}</p>
        ))}
      </div>
      {applied.length > 0 && (
        <div className="stack">
          <h2>Movimientos aplicados</h2>
          {applied.map((entry) => (
            <button key={entry.item.id} type="button" className="link" onClick={() => openDetail({ type: 'movement', id: entry.movement!.id })}>
              Ver movimiento del {formatDate(entry.movement!.date)} · {money(entry.item.amount)}
            </button>
          ))}
        </div>
      )}
      {suggestion && (
        <button type="button" className="btn primary" onClick={() => openReconcile(suggestion.id)}>
          Revisar coincidencia
        </button>
      )}
      <div className="stack">
        <h2>Documentos de muestra</h2>
        <article className="doc-card">
          <div>
            <strong>Representación impresa</strong>
            <p>MUESTRA · SIN VALIDEZ OFICIAL</p>
          </div>
          <div className="doc-actions">
            <button type="button" className="btn primary" onClick={() => openPdf(printed, `Factura ${invoice.folio}`)}>
              Ver PDF
            </button>
            <button type="button" className="btn quiet" onClick={() => downloadFile(printed)}>
              Descargar
            </button>
          </div>
        </article>
        {docs.map((doc) => {
          const file = complementoPdf(invoice, doc)
          return (
            <article key={doc.id} className="doc-card">
              <div>
                <strong>Complemento {doc.folio}</strong>
                <p>
                  {formatDate(doc.fecha)} · {money(doc.amount)}
                </p>
              </div>
              <div className="doc-actions">
                <button type="button" className="btn primary" onClick={() => openPdf(file, `Complemento ${invoice.folio}`)}>
                  Ver PDF
                </button>
                <button type="button" className="btn quiet" onClick={() => downloadFile(file)}>
                  Descargar
                </button>
              </div>
            </article>
          )
        })}
        {invoice.complemento === 'pendiente' && (
          <button type="button" className="btn primary" onClick={() => simulateComplemento(invoice.id)}>
            Simular llegada del complemento
          </button>
        )}
      </div>
    </div>
  )
}
