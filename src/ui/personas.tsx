import { useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import {
  CUSTOMERS,
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
  SUPPLIERS,
  categoryLabel,
  partyByRfc,
  partyMatches,
  type Party,
} from '../catalog'
import { partyLedgers, partyMovements, paymentStatus } from '../domain'
import { formatDate, money, norm } from '../format'
import { useStore } from '../store'
import type { PartyProfile } from '../types'

function shownParty(rfc: string, profiles: PartyProfile[]): Party | undefined {
  const base = partyByRfc(rfc)
  if (!base) return undefined
  const edit = profiles.find((item) => item.rfc === rfc)
  if (!edit) return base
  return { ...base, razonSocial: edit.razonSocial, nombreComercial: edit.nombreComercial, subnombre: edit.subnombre }
}

export function Personas() {
  const { state } = useStore()
  if (state.detail?.type === 'party') return <PartyDetail rfc={state.detail.id} />
  return <PartyList />
}

function PartyList() {
  const { state, openDetail } = useStore()
  const [tab, setTab] = useState<'cobrar' | 'pagar'>('cobrar')
  const [query, setQuery] = useState('')
  const direction = tab === 'cobrar' ? 'emitida' : 'recibida'
  const rows = useMemo(() => {
    const q = norm(query)
    return partyLedgers(state.invoices, state.applications, direction).filter((row) => {
      if (!q) return true
      const party = shownParty(row.rfc, state.partyProfiles)
      if (party && partyMatches(party, query)) return true
      return norm(`${row.name} ${row.rfc}`).includes(q)
    })
  }, [direction, query, state.applications, state.invoices, state.partyProfiles])

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <h1>Clientes y proveedores</h1>
          <p className="muted">Lo que falta por cobrar o por pagar, a partir de las facturas y del RFC.</p>
        </div>
      </header>
      <div className="tabs">
        <button type="button" className={tab === 'cobrar' ? 'on' : ''} onClick={() => setTab('cobrar')}>
          Por cobrar
        </button>
        <button type="button" className={tab === 'pagar' ? 'on' : ''} onClick={() => setTab('pagar')}>
          Por pagar
        </button>
      </div>
      <label className="field grow cat-search">
        <span>Buscar</span>
        <input value={query} placeholder="Subnombre, razón social o RFC" onChange={(event) => setQuery(event.target.value)} />
      </label>
      {rows.length === 0 ? (
        <p className="empty">Nadie coincide.</p>
      ) : (
        <div className="table-wrap">
          <table className="ledger">
            <tbody>
              {rows.map((row) => {
                const party = shownParty(row.rfc, state.partyProfiles)
                return (
                  <tr key={row.rfc} className="click" onClick={() => openDetail({ type: 'party', id: row.rfc })}>
                    <td>
                      <span className="who">
                        <strong>{party?.subnombre ?? row.name}</strong>
                        <span>{party?.razonSocial ?? row.rfc}</span>
                      </span>
                    </td>
                    <td className="num">{row.pending > 0 ? money(row.pending) : 'Al corriente'}</td>
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

function PartyDetail({ rfc }: { rfc: string }) {
  const { state, closeDetail, openDetail, saveProfile, saveRule, createCategory } = useStore()
  const party = shownParty(rfc, state.partyProfiles)
  const [razonSocial, setRazonSocial] = useState(party?.razonSocial ?? '')
  const [nombreComercial, setNombreComercial] = useState(party?.nombreComercial ?? '')
  const [subnombre, setSubnombre] = useState(party?.subnombre ?? '')
  const [picked, setPicked] = useState('')
  const [freshName, setFreshName] = useState('')
  if (!party) {
    return (
      <div className="page">
        <button type="button" className="btn quiet" onClick={closeDetail}>
          ← Volver
        </button>
        <p>No encontré ese RFC.</p>
      </div>
    )
  }
  const side: 'gasto' | 'ingreso' = CUSTOMERS.some((item) => item.rfc === rfc) && !SUPPLIERS.some((item) => item.rfc === rfc) ? 'ingreso' : 'gasto'
  const rule = state.categoryRules.find((item) => item.rfc === rfc)
  const choices = [
    ...new Set([
      ...(side === 'gasto' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES),
      ...state.customCategories.filter((item) => item.side === side).map((item) => item.name),
      ...state.categoryRules.filter((item) => item.side === side).map((item) => item.category),
    ]),
  ]
  const selected = picked || rule?.category || choices[0] || ''
  const invoices = state.invoices
    .filter((invoice) => invoice.rfc === rfc && invoice.vigencia === 'vigente')
    .sort((a, b) => b.issueDate.localeCompare(a.issueDate))
  const movements = partyMovements(rfc, state.movements, state.invoices, state.applications)

  function saveIdentity(event: FormEvent) {
    event.preventDefault()
    saveProfile({ rfc, razonSocial, nombreComercial, subnombre })
  }

  function saveAlways(event: FormEvent) {
    event.preventDefault()
    const created = freshName.trim()
    const category = created || selected
    if (!category) return
    if (created) createCategory(created, side)
    saveRule({ rfc, side, category })
    setFreshName('')
    setPicked(category)
  }

  return (
    <div className="page detail">
      <button type="button" className="btn quiet" onClick={closeDetail}>
        ← Volver
      </button>
      <h1>{subnombre || party.subnombre}</h1>
      <p className="muted">RFC {party.rfc}</p>
      <form className="rule-form" onSubmit={saveIdentity}>
        <div className="rule-grid">
          <label className="field">
            <span>Razón social</span>
            <input value={razonSocial} onChange={(event) => setRazonSocial(event.target.value)} />
          </label>
          <label className="field">
            <span>Nombre comercial</span>
            <input value={nombreComercial} onChange={(event) => setNombreComercial(event.target.value)} />
          </label>
          <label className="field">
            <span>Subnombre</span>
            <input value={subnombre} onChange={(event) => setSubnombre(event.target.value)} />
          </label>
          <button type="submit" className="btn quiet">
            Guardar datos
          </button>
        </div>
      </form>
      <form className="rule-form" onSubmit={saveAlways}>
        <h2>{side === 'gasto' ? 'Categoría de gasto' : 'Concepto de ingreso'}</h2>
        <p className="muted">{rule ? `Siempre: ${categoryLabel(rule.category)}` : 'Todavía no hay una regla para este RFC.'}</p>
        <div className="rule-grid">
          <label className="field">
            <span>Usar</span>
            <select value={selected} onChange={(event) => setPicked(event.target.value)}>
              {choices.map((category) => (
                <option key={category} value={category}>
                  {categoryLabel(category)}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>O una categoría nueva</span>
            <input value={freshName} placeholder={side === 'gasto' ? 'pago por construcción' : 'cobro de mostrador'} onChange={(event) => setFreshName(event.target.value)} />
          </label>
          <button type="submit" className="btn quiet">
            Usar siempre para este RFC
          </button>
        </div>
      </form>
      <div className="unmatched-cols">
        <div>
          <h2>Facturas</h2>
          {invoices.length === 0 ? (
            <p className="muted">Sin facturas vigentes.</p>
          ) : (
            <ul className="thin-list">
              {invoices.map((invoice) => (
                <li key={invoice.id}>
                  <button type="button" onClick={() => openDetail({ type: 'invoice', id: invoice.id })}>
                    <strong>{invoice.folio}</strong>
                    <span>
                      {formatDate(invoice.issueDate)} · {money(invoice.total)} · {paymentStatus(invoice, state.applications) === 'pagada' ? 'Pagada' : paymentStatus(invoice, state.applications) === 'parcial' ? 'Parcial' : 'Sin pago'}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div>
          <h2>Movimientos</h2>
          {movements.length === 0 ? (
            <p className="muted">Sin movimientos ligados.</p>
          ) : (
            <ul className="thin-list">
              {movements.map((movement) => (
                <li key={movement.id}>
                  <button type="button" onClick={() => openDetail({ type: 'movement', id: movement.id })}>
                    <strong>{formatDate(movement.date)}</strong>
                    <span>
                      {movement.concept} · {money(movement.cargo || movement.abono)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
