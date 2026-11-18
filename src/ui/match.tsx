import { useState } from 'react'
import { accountLabel } from '../catalog'
import {
  invoicesForMovement,
  isChoiceCase,
  movementRemaining,
  openMovementsForInvoice,
  pendingBalance,
  reconcileQuestion,
} from '../domain'
import { formatDate, money } from '../format'
import { useStore } from '../store'

export function MatchPanel() {
  const { state, closeDetail } = useStore()
  if (state.detail?.type === 'invoice') return <InvoiceMatches key={state.detail.id} id={state.detail.id} onClose={closeDetail} />
  if (state.detail?.type === 'movement') return <MovementMatches key={state.detail.id} id={state.detail.id} onClose={closeDetail} />
  return null
}

function InvoiceMatches({ id, onClose }: { id: string; onClose: () => void }) {
  const { state, confirmReconcile } = useStore()
  const invoice = state.invoices.find((item) => item.id === id)
  const rows = invoice ? openMovementsForInvoice(invoice, state.movements, state.applications) : []
  const [selected, setSelected] = useState<string[]>(() => rows.filter((movement) => movement.suggestionIds.includes(id)).map((movement) => movement.id))
  if (!invoice) return null
  const balance = pendingBalance(invoice, state.applications)
  const chosen = rows.filter((movement) => selected.includes(movement.id))
  const selectedTotal = chosen.reduce((sum, movement) => sum + movementRemaining(movement, state.applications), 0)
  const difference = balance - selectedTotal

  function toggle(movementId: string) {
    setSelected((current) => (current.includes(movementId) ? current.filter((item) => item !== movementId) : [...current, movementId]))
  }

  function apply() {
    for (const movementId of selected) confirmReconcile(movementId, [id])
    setSelected([])
  }

  return (
    <div className="rail-inner">
      <button type="button" className="btn quiet match-close" onClick={onClose}>
        Cerrar
      </button>
      <h2>Movimientos</h2>
      <p className="muted">Marca uno o varios para {invoice.folio}. Varios pagos pueden cubrir la misma factura.</p>
      {rows.length === 0 ? (
        <p className="muted">No hay movimientos con saldo.</p>
      ) : (
        <ul className="match-list">
          {rows.map((movement) => (
            <li key={movement.id}>
              <label className="match-check">
                <input type="checkbox" checked={selected.includes(movement.id)} onChange={() => toggle(movement.id)} />
                <span>
                  <strong>{formatDate(movement.date)}</strong>
                  <span>
                    {movement.concept} · {accountLabel(movement.accountId)} · {money(movementRemaining(movement, state.applications))}
                  </span>
                </span>
              </label>
            </li>
          ))}
        </ul>
      )}
      <div className="match-sum">
        <span>Saldo de la factura {money(balance)}</span>
        <span>Seleccionado {money(selectedTotal)}</span>
        <strong>Diferencia {money(difference)}</strong>
      </div>
      <button type="button" className="btn primary" disabled={selected.length === 0 || balance <= 0} onClick={apply}>
        Aplicar
      </button>
    </div>
  )
}

function MovementMatches({ id, onClose }: { id: string; onClose: () => void }) {
  const { state, confirmReconcile } = useStore()
  const movement = state.movements.find((item) => item.id === id)
  const rows = movement ? invoicesForMovement(movement, state.invoices, state.applications) : []
  const choice = movement ? isChoiceCase(movement, state.invoices, state.applications) : false
  const [selected, setSelected] = useState<string[]>(() =>
    movement && !choice ? movement.suggestionIds.filter((invoiceId) => rows.some((invoice) => invoice.id === invoiceId)) : [],
  )
  if (!movement) return null
  const balance = movementRemaining(movement, state.applications)
  const chosen = rows.filter((invoice) => selected.includes(invoice.id))
  const selectedTotal = chosen.reduce((sum, invoice) => sum + pendingBalance(invoice, state.applications), 0)
  const difference = balance - selectedTotal
  const pair = movement.suggestionIds.length === 2 && !choice

  function toggle(invoiceId: string) {
    setSelected((current) => (current.includes(invoiceId) ? current.filter((item) => item !== invoiceId) : [...current, invoiceId]))
  }

  return (
    <div className="rail-inner">
      <button type="button" className="btn quiet match-close" onClick={onClose}>
        Cerrar
      </button>
      <h2>Facturas sin conciliar</h2>
      {pair && <p>{reconcileQuestion(movement, state.invoices, state.applications)}</p>}
      <p className="muted">Marca una o varias. Un pago puede cubrir más de una factura.</p>
      {rows.length === 0 ? (
        <p className="muted">No hay facturas vigentes con saldo.</p>
      ) : (
        <ul className="match-list">
          {rows.map((invoice) => (
            <li key={invoice.id}>
              <label className="match-check">
                <input type="checkbox" checked={selected.includes(invoice.id)} onChange={() => toggle(invoice.id)} />
                <span>
                  <strong>{invoice.folio}</strong>
                  <span>
                    {invoice.name} · {money(pendingBalance(invoice, state.applications))} · {invoice.metodo}
                  </span>
                </span>
              </label>
            </li>
          ))}
        </ul>
      )}
      <div className="match-sum">
        <span>Saldo del movimiento {money(balance)}</span>
        <span>Seleccionado {money(selectedTotal)}</span>
        <strong>Diferencia {money(difference)}</strong>
      </div>
      <button
        type="button"
        className="btn primary"
        disabled={selected.length === 0 || balance <= 0}
        onClick={() => confirmReconcile(movement.id, selected)}
      >
        Aplicar
      </button>
    </div>
  )
}
