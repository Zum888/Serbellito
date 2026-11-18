import { useState } from 'react'
import { CATEGORIES, CATEGORY_SHORT, accountById, partiesInCategory, partyMatches, selectedAccountId } from '../catalog'
import { categoryAmount } from '../domain'
import { money, norm } from '../format'
import { useStore } from '../store'
import { AccountChips } from './accounts'
import { PartyLines } from './party'

export function Categorias() {
  const { state, openCategory, selectAccount } = useStore()
  const [query, setQuery] = useState('')
  const accountId = selectedAccountId(state.bankFilters.account)
  const account = accountById(accountId)
  const q = norm(query)
  const rows = CATEGORIES.flatMap((category) => {
    const parties = partiesInCategory(category).filter((party) => partyMatches(party, query))
    const nameHit = q.length > 0 && norm(CATEGORY_SHORT[category]).includes(q)
    if (q && parties.length === 0 && !nameHit) return []
    return [{ category, parties, amount: categoryAmount(state.movements, category, accountId) }]
  })

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <h1>Categorías</h1>
          <p className="muted">
            Montos de {account?.bank} · {account?.mask}. Toca una categoría para verla en Bancos.
          </p>
        </div>
      </header>
      <AccountChips accountId={accountId} onSelect={selectAccount} />
      <label className="field grow cat-search">
        <span>Buscar proveedor</span>
        <input
          value={query}
          placeholder="Subnombre, razón social o RFC"
          onChange={(event) => setQuery(event.target.value)}
        />
      </label>
      <ul className="cat-list">
        {rows.map((row) => (
          <li key={row.category}>
            <button type="button" className="cat-row" onClick={() => openCategory(row.category)}>
              <span>{CATEGORY_SHORT[row.category]}</span>
              <span className="num">{money(row.amount)}</span>
            </button>
            {row.parties.length > 0 && (
              <ul className="party-list">
                {row.parties.map((party) => (
                  <li key={party.name}>
                    <PartyLines party={party} />
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ul>
      {rows.length === 0 && <p className="empty">Ningún proveedor coincide con ese subnombre.</p>}
    </div>
  )
}
