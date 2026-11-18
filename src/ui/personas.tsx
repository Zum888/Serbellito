import { useMemo, useState } from 'react'
import { partyByRfc, partyMatches } from '../catalog'
import { partyLedgers } from '../domain'
import { money, norm } from '../format'
import { useStore } from '../store'
import { PartyLines } from './party'

export function Personas() {
  const { state, openParty } = useStore()
  const [tab, setTab] = useState<'cobrar' | 'pagar'>('cobrar')
  const [query, setQuery] = useState('')
  const direction = tab === 'cobrar' ? 'emitida' : 'recibida'
  const rows = useMemo(() => {
    const q = norm(query)
    return partyLedgers(state.invoices, state.applications, direction).filter((row) => {
      if (!q) return true
      const party = partyByRfc(row.rfc)
      if (party && partyMatches(party, query)) return true
      return norm(`${row.name} ${row.rfc}`).includes(q)
    })
  }, [direction, query, state.applications, state.invoices])

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
          <table>
            <thead>
              <tr>
                <th>{tab === 'cobrar' ? 'Cliente' : 'Proveedor'}</th>
                <th className="num">{tab === 'cobrar' ? 'Por cobrar' : 'Por pagar'}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const party = partyByRfc(row.rfc)
                return (
                  <tr key={row.rfc} className="click" onClick={() => openParty(direction, row.name)}>
                    <td>{party ? <PartyLines party={party} /> : <div>{row.name}</div>}</td>
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
