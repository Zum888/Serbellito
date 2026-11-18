import { accountLabel } from '../catalog'
import { applyIds, invoicesForMovement, isChoiceCase, movementsForInvoice, reconcileQuestion } from '../domain'
import { formatDate, money } from '../format'
import { useStore } from '../store'
import type { Invoice, Movement } from '../types'

export function MatchPanel() {
  const { state, closeDetail } = useStore()
  if (state.detail?.type === 'invoice') return <InvoiceMatches id={state.detail.id} onClose={closeDetail} />
  if (state.detail?.type === 'movement') return <MovementMatches id={state.detail.id} onClose={closeDetail} />
  return null
}

function InvoiceMatches({ id, onClose }: { id: string; onClose: () => void }) {
  const { state, confirmReconcile } = useStore()
  const invoice = state.invoices.find((item) => item.id === id)
  if (!invoice) return null
  const rows = movementsForInvoice(invoice, state.movements, state.invoices, state.applications)
  return (
    <div className="rail-inner">
      <button type="button" className="btn quiet match-close" onClick={onClose}>
        Cerrar
      </button>
      <h2>Movimientos que pueden coincidir</h2>
      <p className="muted">Elige uno para relacionarlo con {invoice.folio}.</p>
      {rows.length === 0 ? (
        <p className="muted">Ningún movimiento abierto cubre este saldo.</p>
      ) : (
        <ul className="match-list">
          {rows.map((movement) => (
            <MovementChoice key={movement.id} movement={movement} invoice={invoice} onMatch={(ids) => confirmReconcile(movement.id, ids)} />
          ))}
        </ul>
      )}
    </div>
  )
}

function MovementMatches({ id, onClose }: { id: string; onClose: () => void }) {
  const { state, confirmReconcile } = useStore()
  const movement = state.movements.find((item) => item.id === id)
  if (!movement) return null
  const rows = invoicesForMovement(movement, state.invoices, state.applications)
  const pair = movement.suggestionIds.length === 2 && !isChoiceCase(movement, state.invoices, state.applications)
  return (
    <div className="rail-inner">
      <button type="button" className="btn quiet match-close" onClick={onClose}>
        Cerrar
      </button>
      <h2>Facturas sin conciliar</h2>
      {pair && <p>{reconcileQuestion(movement, state.invoices, state.applications)}</p>}
      <p className="muted">Elige una para relacionarla con este movimiento.</p>
      {rows.length === 0 ? (
        <p className="muted">No hay facturas vigentes con saldo.</p>
      ) : (
        <ul className="match-list">
          {rows.map((invoice) => {
            const ids = applyIds(movement, invoice, state.invoices, state.applications)
            const suggested = movement.suggestionIds.includes(invoice.id)
            return (
              <li key={invoice.id}>
                <strong>{invoice.folio}</strong>
                <span>
                  {invoice.name} · {money(invoice.total)}
                </span>
                {ids && ids.length > 1 && <span className="muted">Este pago también cubre la otra factura sugerida.</span>}
                {ids && (
                  <button type="button" className={suggested ? 'btn primary' : 'btn quiet'} onClick={() => confirmReconcile(movement.id, ids)}>
                    {ids.length > 1 ? 'Relacionar las dos' : 'Relacionar'}
                  </button>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

function MovementChoice({
  movement,
  invoice,
  onMatch,
}: {
  movement: Movement
  invoice: Invoice
  onMatch: (ids: string[]) => void
}) {
  const { state } = useStore()
  const ids = applyIds(movement, invoice, state.invoices, state.applications)
  const suggested = movement.suggestionIds.includes(invoice.id)
  return (
    <li>
      <strong>{formatDate(movement.date)}</strong>
      <span>
        {movement.concept} · {accountLabel(movement.accountId)} · {money(movement.cargo || movement.abono)}
      </span>
      {ids && ids.length > 1 && <span className="muted">Cubre las dos facturas de esta sugerencia.</span>}
      <button type="button" className={suggested ? 'btn primary' : 'btn quiet'} disabled={!ids} onClick={() => ids && onMatch(ids)}>
        {ids && ids.length > 1 ? 'Relacionar las dos' : 'Relacionar'}
      </button>
    </li>
  )
}
