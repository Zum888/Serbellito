import { useState } from 'react'
import {
  CUSTOMERS,
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
  SUPPLIERS,
  categoryChoices,
  categoryLabel,
  partyByRfc,
  partyMatches,
} from '../catalog'
import { categoryAmount } from '../domain'
import { money, norm } from '../format'
import { useStore } from '../store'
import { PartyLines } from './party'

export function Categorias() {
  const { state, saveRule } = useStore()
  const [query, setQuery] = useState('')
  const [side, setSide] = useState<'gasto' | 'ingreso'>('gasto')
  const [rfc, setRfc] = useState(SUPPLIERS[0]?.rfc ?? '')
  const [picked, setPicked] = useState('mercancía')
  const [custom, setCustom] = useState('')
  const parties = side === 'gasto' ? SUPPLIERS : CUSTOMERS
  const presets = side === 'gasto' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES
  const q = norm(query)
  const labels = categoryChoices([...state.categoryRules.map((rule) => rule.category), ...state.movements.map((movement) => movement.category)])
  const rows = labels.flatMap((category) => {
    const rules = state.categoryRules.filter((rule) => rule.category === category)
    const named = norm(categoryLabel(category)).includes(q)
    const people = rules.filter((rule) => {
      const party = partyByRfc(rule.rfc)
      return party ? partyMatches(party, query) : norm(rule.rfc).includes(q)
    })
    if (q && !named && people.length === 0) return []
    return [{ category, rules: q && !named ? people : rules, amount: categoryAmount(state.movements, category) }]
  })

  function changeSide(next: 'gasto' | 'ingreso') {
    setSide(next)
    setRfc((next === 'gasto' ? SUPPLIERS : CUSTOMERS)[0]?.rfc ?? '')
    setPicked(next === 'gasto' ? 'mercancía' : 'cobros de clientes')
    setCustom('')
  }

  function save() {
    const category = (picked === 'otro' ? custom : picked).trim()
    if (!rfc || !category) return
    saveRule({ rfc, side, category })
    setCustom('')
  }

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <h1>Categorías</h1>
          <p className="muted">Una regla por RFC. Los movimientos nuevos la toman solos.</p>
        </div>
      </header>
      <form
        className="rule-form"
        onSubmit={(event) => {
          event.preventDefault()
          save()
        }}
      >
        <p className="muted">
          Un proveedor siempre cae en un gasto, por ejemplo pago por construcción. Un cliente, en un concepto de ingreso.
        </p>
        <div className="rule-grid">
          <label className="field">
            <span>Quién</span>
            <select value={side} onChange={(event) => changeSide(event.target.value as 'gasto' | 'ingreso')}>
              <option value="gasto">Proveedor</option>
              <option value="ingreso">Cliente</option>
            </select>
          </label>
          <label className="field">
            <span>RFC</span>
            <select value={rfc} onChange={(event) => setRfc(event.target.value)}>
              {parties.map((party) => (
                <option key={party.rfc} value={party.rfc}>
                  {party.subnombre} · {party.rfc}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>{side === 'gasto' ? 'Categoría de gasto' : 'Concepto de ingreso'}</span>
            <select value={picked} onChange={(event) => setPicked(event.target.value)}>
              {presets.map((category) => (
                <option key={category} value={category}>
                  {categoryLabel(category)}
                </option>
              ))}
              <option value="otro">Otro</option>
            </select>
          </label>
          {picked === 'otro' && (
            <label className="field">
              <span>Nombre</span>
              <input
                value={custom}
                placeholder={side === 'gasto' ? 'pago por construcción' : 'cobro de mostrador'}
                onChange={(event) => setCustom(event.target.value)}
              />
            </label>
          )}
          <button type="submit" className="btn quiet">
            Guardar regla
          </button>
        </div>
      </form>
      <label className="field grow cat-search">
        <span>Buscar</span>
        <input value={query} placeholder="Subnombre, razón social o categoría" onChange={(event) => setQuery(event.target.value)} />
      </label>
      <ul className="cat-list">
        {rows.map((row) => (
          <li key={row.category}>
            <div className="cat-row">
              <span>{categoryLabel(row.category)}</span>
              <span className="num">{money(row.amount)}</span>
            </div>
            {row.rules.length > 0 && (
              <ul className="party-list">
                {row.rules.map((rule) => {
                  const party = partyByRfc(rule.rfc)
                  return (
                    <li key={rule.rfc}>
                      {party ? <PartyLines party={party} /> : <p className="muted">{rule.rfc}</p>}
                    </li>
                  )
                })}
              </ul>
            )}
          </li>
        ))}
      </ul>
      {rows.length === 0 && <p className="empty">Ninguna regla coincide.</p>}
    </div>
  )
}
