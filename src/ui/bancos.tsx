import { CATEGORIES, CATEGORY_SHORT, accountLabel, selectedAccountId } from '../catalog'
import {
  COMPLEMENTO_LABEL,
  PAGO_LABEL,
  RECON_LABEL,
  attentionItems,
  bankTotals,
  filterMovements,
  linkedInvoices,
  movementSentences,
  paymentStatus,
} from '../domain'
import { formatDate, money } from '../format'
import { EMPTY_BANK_FILTERS, useStore } from '../store'
import type { Category, Movement } from '../types'
import { AccountChips } from './accounts'
import { MxDate } from './fields'
import { PartyLines } from './party'

function filtersActive(filters: { query: string; category: string; reconciliation: string; from: string; to: string }) {
  return Boolean(filters.query || filters.from || filters.to || filters.category !== 'todas' || filters.reconciliation !== 'todas')
}

export function Bancos() {
  const { state, setBankFilters, openUpload, navigate } = useStore()
  if (state.detail?.type === 'movement') return <MovementDetail id={state.detail.id} />

  const accountId = selectedAccountId(state.bankFilters.account)
  const filters = { ...state.bankFilters, account: accountId }
  const rows = filterMovements(state.movements, state.applications, state.invoices, filters)
  const totals = bankTotals(state.movements, accountId)
  const cargo = rows.reduce((sum, movement) => sum + movement.cargo, 0)
  const pending = attentionItems(state).length

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <h1>Bancos</h1>
          <p className="muted">Movimientos de las dos cuentas de la bodega.</p>
        </div>
        <div className="head-actions">
          <button type="button" className="btn quiet attention-jump" onClick={() => navigate('inicio')}>
            Necesita tu atención · {pending}
          </button>
          <button type="button" className="btn primary" onClick={() => openUpload()}>
            Subir estado de cuenta
          </button>
        </div>
      </header>
      <AccountChips accountId={accountId} onSelect={(account) => setBankFilters({ ...filters, account })} />
      <div className="bank-totals">
        <div>
          <span>Ingresos</span>
          <strong>{money(totals.ingresos)}</strong>
        </div>
        <div>
          <span>Gastos</span>
          <strong>{money(totals.gastos)}</strong>
        </div>
      </div>
      <div className="filters">
        <label className="field grow">
          <span>Buscar</span>
          <input
            value={filters.query}
            placeholder="Concepto, subnombre o factura"
            onChange={(event) => setBankFilters({ ...filters, query: event.target.value })}
          />
        </label>
        <label className="field">
          <span>Categoría</span>
          <select value={filters.category} onChange={(event) => setBankFilters({ ...filters, category: event.target.value })}>
            <option value="todas">Todas</option>
            {CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {CATEGORY_SHORT[category]}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Conciliación</span>
          <select
            value={filters.reconciliation}
            onChange={(event) => setBankFilters({ ...filters, reconciliation: event.target.value })}
          >
            <option value="todas">Todas</option>
            <option value="por_revisar">Por revisar</option>
            <option value="confirmada">Confirmados</option>
            <option value="sin_factura">Sin factura</option>
            <option value="no_requiere">No requieren factura</option>
          </select>
        </label>
        <MxDate label="Desde" value={filters.from} onChange={(from) => setBankFilters({ ...filters, from })} />
        <MxDate label="Hasta" value={filters.to} onChange={(to) => setBankFilters({ ...filters, to })} />
        {filtersActive(filters) && (
          <button type="button" className="btn quiet" onClick={() => setBankFilters({ ...EMPTY_BANK_FILTERS, account: accountId })}>
            Limpiar filtros
          </button>
        )}
      </div>
      <p className="count" data-testid="bank-count">
        {rows.length} {rows.length === 1 ? 'movimiento' : 'movimientos'}
        {filters.reconciliation === 'sin_factura' ? ` · ${money(cargo)}` : ''}
      </p>
      {rows.length === 0 ? (
        <div className="empty">
          <p>Ningún movimiento coincide con estos filtros.</p>
          <button type="button" className="btn quiet" onClick={() => setBankFilters({ ...EMPTY_BANK_FILTERS, account: accountId })}>
            Limpiar filtros
          </button>
        </div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Concepto bancario</th>
                <th>Cuenta</th>
                <th>Cargo o abono</th>
                <th>Categoría sugerida</th>
                <th>Factura</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((movement) => (
                <MovementRow key={movement.id} movement={movement} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function MovementRow({ movement }: { movement: Movement }) {
  const { state, openDetail, setCategory } = useStore()
  const links = linkedInvoices(movement, state.invoices, state.applications)
  return (
    <tr className="click" onClick={() => openDetail({ type: 'movement', id: movement.id })}>
      <td>{formatDate(movement.date)}</td>
      <td>
        <div>{movement.concept}</div>
        <div className={movement.reconciliation === 'por_revisar' ? 'review' : 'muted'}>{RECON_LABEL[movement.reconciliation]}</div>
        {[...new Set(links.map((invoice) => invoice.name))].map((name) => (
          <PartyLines key={name} name={name} compact />
        ))}
      </td>
      <td>{accountLabel(movement.accountId)}</td>
      <td className="num">{movement.cargo > 0 ? money(movement.cargo) : money(movement.abono)}</td>
      <td>
        <select
          aria-label={`Categoría de ${movement.concept}`}
          value={movement.category}
          onClick={(event) => event.stopPropagation()}
          onChange={(event) => setCategory(movement.id, event.target.value as Category)}
        >
          {CATEGORIES.map((category) => (
            <option key={category} value={category}>
              {CATEGORY_SHORT[category]}
            </option>
          ))}
        </select>
      </td>
      <td>
        {links.length === 0 && '—'}
        {links.map((invoice) => (
          <button
            key={invoice.id}
            type="button"
            className="link"
            onClick={(event) => {
              event.stopPropagation()
              openDetail({ type: 'invoice', id: invoice.id })
            }}
          >
            {invoice.folio}
          </button>
        ))}
      </td>
    </tr>
  )
}

function MovementDetail({ id }: { id: string }) {
  const { state, closeDetail, openDetail, openReconcile, undoReconcile, setCategory } = useStore()
  const movement = state.movements.find((item) => item.id === id)
  if (!movement) {
    return (
      <div className="page">
        <button type="button" className="btn quiet" onClick={closeDetail}>
          ← Volver
        </button>
        <p>No encontré ese movimiento.</p>
      </div>
    )
  }
  const related = movement.relatedMovementId ? state.movements.find((item) => item.id === movement.relatedMovementId) : undefined
  const links = linkedInvoices(movement, state.invoices, state.applications)
  return (
    <div className="page detail">
      <button type="button" className="btn quiet" onClick={closeDetail}>
        {state.detailBack?.detail?.type === 'invoice'
          ? '← Volver a la factura'
          : state.detailBack?.detail
            ? '← Volver al movimiento anterior'
            : '← Volver a bancos'}
      </button>
      <h1>{movement.cargo > 0 ? 'Cargo' : 'Abono'} {money(movement.cargo || movement.abono)}</h1>
      <div className="sentences">
        {movementSentences(movement, state.invoices, state.applications).map((line) => (
          <p key={line}>{line}</p>
        ))}
      </div>
      <label className="field">
        <span>Categoría</span>
        <select aria-label="Categoría" value={movement.category} onChange={(event) => setCategory(movement.id, event.target.value as Category)}>
          {CATEGORIES.map((category) => (
            <option key={category} value={category}>
              {CATEGORY_SHORT[category]}
            </option>
          ))}
        </select>
      </label>
      {links.length > 0 && (
        <div className="stack">
          <h2>Facturas relacionadas</h2>
          {links.map((invoice) => (
            <div key={invoice.id} className="stack">
              <button type="button" className="link" onClick={() => openDetail({ type: 'invoice', id: invoice.id })}>
                {invoice.folio} · {money(invoice.total)} · {PAGO_LABEL[paymentStatus(invoice, state.applications)]} · complemento {COMPLEMENTO_LABEL[invoice.complemento]}
              </button>
              <PartyLines name={invoice.name} />
            </div>
          ))}
        </div>
      )}
      {related && (
        <button type="button" className="btn quiet" onClick={() => openDetail({ type: 'movement', id: related.id })}>
          Ver el traspaso en la otra cuenta
        </button>
      )}
      <div className="stack">
        {movement.reconciliation === 'por_revisar' && (
          <button type="button" className="btn primary" onClick={() => openReconcile(movement.id)}>
            Revisar coincidencia
          </button>
        )}
        {movement.reconciliation === 'confirmada' && state.applications.some((item) => item.movementId === movement.id) && (
          <button type="button" className="btn quiet" onClick={() => undoReconcile(movement.id)}>
            Deshacer conciliación
          </button>
        )}
      </div>
    </div>
  )
}
