import { formaLabel, partyByName, usoLabel } from '../catalog'
import { attentionItems, filterInvoices, invoiceFlow, invoiceSentences, partiesFor, pendingBalance } from '../domain'
import { formatDate, money } from '../format'
import { EMPTY_INVOICE_FILTERS, useStore } from '../store'
import { complementoPdf, invoicePdf } from '../pdf'
import { MxDate } from './fields'
import { PartyLines } from './party'

export function Facturas() {
  const { state, setInvoiceTab, setInvoiceFilters, openDetail, navigate } = useStore()
  if (state.detail?.type === 'invoice') return <InvoiceDetail id={state.detail.id} />

  const total = state.invoices.filter((invoice) => invoice.direction === (state.invoiceTab === 'recibidas' ? 'recibida' : 'emitida')).length
  const rows = filterInvoices(state.invoices, state.applications, state.invoiceFilters, state.invoiceTab)
  const parties = partiesFor(state.invoices, state.invoiceTab)
  const filters = state.invoiceFilters
  const active = Boolean(filters.query || filters.from || filters.to || filters.party !== 'todas' || filters.vigencia !== 'todas' || filters.pago !== 'todas' || filters.complemento !== 'todas')
  const pending = attentionItems(state).length

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
      {rows.length === 0 ? (
        <div className="empty">
          <p>Ninguna factura coincide con estos filtros.</p>
          <button type="button" className="btn quiet" onClick={() => setInvoiceFilters(EMPTY_INVOICE_FILTERS)}>
            Limpiar filtros
          </button>
        </div>
      ) : (
        <ul className="scan">
          {rows.map((invoice) => {
            const flow = invoiceFlow(invoice, state.applications)
            return (
              <li key={invoice.id}>
                <div
                  role="button"
                  tabIndex={0}
                  className="scan-row"
                  onClick={() => openDetail({ type: 'invoice', id: invoice.id })}
                  onKeyDown={(event) => {
                    if (event.key !== 'Enter' && event.key !== ' ') return
                    event.preventDefault()
                    openDetail({ type: 'invoice', id: invoice.id })
                  }}
                >
                  <div className="scan-top">
                    <strong>{invoice.folio}</strong>
                    <span className="scan-side">
                      {flow.complete && (
                        <span className="complete">
                          <span className="complete-dot" aria-hidden="true" />
                          Completo
                        </span>
                      )}
                      <span className="num">{money(invoice.total)}</span>
                    </span>
                  </div>
                  <div>{usoLabel(invoice.usoCfdi)}</div>
                  <div>
                    {formaLabel(invoice.formaPago)} · {invoice.metodo}
                  </div>
                  <div className="steps">
                    {flow.steps.map((step) => (
                      <span key={step.key} className={step.review ? 'review' : 'muted'}>
                        {step.text}
                      </span>
                    ))}
                  </div>
                  <PartyLines name={invoice.name} compact />
                  <span className="muted">
                    {formatDate(invoice.issueDate)} · saldo {money(pendingBalance(invoice, state.applications))}
                  </span>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
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
        {state.detailBack?.detail?.type === 'movement' ? '← Volver al movimiento' : '← Volver a facturas'}
      </button>
      <h1>
        {invoice.folio}
        {invoice.vigencia === 'cancelado' ? <span className="muted"> · Cancelada</span> : null}
      </h1>
      <PartyLines name={invoice.name} />
      <p>
        {usoLabel(invoice.usoCfdi)} · {formaLabel(invoice.formaPago)} · {invoice.metodo}
      </p>
      <div className="steps">
        {flow.steps.map((step) => (
          <span key={step.key} className={step.review ? 'review' : 'muted'}>
            {step.text}
          </span>
        ))}
        {flow.complete && (
          <span className="complete">
            <span className="complete-dot" aria-hidden="true" />
            Completo
          </span>
        )}
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
