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

export function Categorias() {
  const { state, saveRule, createCategory, renameCategory, deleteCategory, deleteRule } = useStore()
  const [query, setQuery] = useState('')
  const [side, setSide] = useState<'gasto' | 'ingreso'>('gasto')
  const [rfc, setRfc] = useState(SUPPLIERS[0]?.rfc ?? '')
  const [picked, setPicked] = useState('mercancía')
  const [custom, setCustom] = useState('')
  const [newName, setNewName] = useState('')
  const [newSide, setNewSide] = useState<'gasto' | 'ingreso'>('gasto')
  const parties = side === 'gasto' ? SUPPLIERS : CUSTOMERS
  const presets = [
    ...new Set([
      ...(side === 'gasto' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES),
      ...state.customCategories.filter((item) => item.side === side).map((item) => item.name),
      ...state.categoryRules.filter((rule) => rule.side === side).map((rule) => rule.category),
    ]),
  ]
  const q = norm(query)
  const labels = categoryChoices(
    [
      ...state.customCategories.map((item) => item.name),
      ...state.categoryRules.map((rule) => rule.category),
      ...state.movements.map((movement) => movement.category),
    ],
    state.hiddenCategories,
  )
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
          <p className="muted">Asigna una categoría a un RFC. Los movimientos nuevos de ese proveedor o cliente se clasifican solos.</p>
        </div>
      </header>
      <form
        className="rule-form"
        onSubmit={(event) => {
          event.preventDefault()
          const name = newName.trim()
          if (!name) return
          createCategory(name, newSide)
          setNewName('')
          if (newSide !== side) {
            setSide(newSide)
            setRfc((newSide === 'gasto' ? SUPPLIERS : CUSTOMERS)[0]?.rfc ?? '')
          }
          setPicked(name)
        }}
      >
        <div className="rule-grid">
          <label className="field">
            <span>Nueva categoría</span>
            <input value={newName} placeholder="pago por construcción" onChange={(event) => setNewName(event.target.value)} />
          </label>
          <label className="field">
            <span>Tipo</span>
            <select value={newSide} onChange={(event) => setNewSide(event.target.value as 'gasto' | 'ingreso')}>
              <option value="gasto">Gasto</option>
              <option value="ingreso">Ingreso</option>
            </select>
          </label>
          <button type="submit" className="btn quiet">
            Crear
          </button>
        </div>
      </form>
      <form
        className="rule-form"
        onSubmit={(event) => {
          event.preventDefault()
          save()
        }}
      >
        <p className="muted">Un proveedor cae en un gasto, por ejemplo pago por construcción. Un cliente, en un ingreso.</p>
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
            Usar siempre para este RFC
          </button>
        </div>
      </form>
      <label className="field grow cat-search">
        <span>Buscar</span>
        <input value={query} placeholder="Subnombre, razón social o categoría" onChange={(event) => setQuery(event.target.value)} />
      </label>
      <ul className="cat-list">
        {rows.map((row) => {
          const people = row.rules.map((rule) => {
            const party = partyByRfc(rule.rfc)
            const edit = state.partyProfiles.find((item) => item.rfc === rule.rfc)
            return edit?.subnombre || party?.subnombre || rule.rfc
          })
          const uses =
            people.length === 0
              ? 'Ningún RFC la usa. Los movimientos nuevos no entran aquí solos.'
              : `${people.join(', ')}. Los movimientos nuevos de ${people.length === 1 ? 'ese RFC entran' : 'esos RFC entran'} aquí solos.`
          return (
            <li key={row.category}>
              <div className="cat-row">
                <input
                  aria-label={`Nombre de ${categoryLabel(row.category)}`}
                  defaultValue={categoryLabel(row.category)}
                  onBlur={(event) => {
                    const next = event.target.value.trim()
                    if (!next || next === row.category || next === categoryLabel(row.category)) return
                    renameCategory(row.category, next)
                  }}
                />
                <span className="num">{money(row.amount)}</span>
                <button type="button" className="btn quiet" onClick={() => deleteCategory(row.category)}>
                  Eliminar
                </button>
              </div>
              <p className="rule-line">{uses}</p>
              {row.rules.map((rule) => {
                const party = partyByRfc(rule.rfc)
                const edit = state.partyProfiles.find((item) => item.rfc === rule.rfc)
                const who = edit?.subnombre || party?.subnombre || rule.rfc
                return (
                  <div key={rule.rfc} className="rule-control">
                    <span>
                      {who} · {rule.rfc}
                    </span>
                    <button type="button" className="btn quiet" onClick={() => deleteRule(rule.rfc)}>
                      Quitar regla
                    </button>
                  </div>
                )
              })}
            </li>
          )
        })}
      </ul>
      {rows.length === 0 && <p className="empty">Ninguna regla coincide.</p>}
    </div>
  )
}
