import { useMemo, useState } from 'react'
import type { FormEvent, KeyboardEvent } from 'react'
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
import { movementRfc, partyLedgers, partyMovements, paymentStatus } from '../domain'
import { formatDate, money, norm } from '../format'
import { SEED } from '../seed'
import { useStore } from '../store'
import type { PartyNickname, PartyProfile } from '../types'

const demoRfcs = new Set(SEED.invoices.map((invoice) => invoice.rfc))
for (const movement of SEED.movements) {
  const rfc = movementRfc(movement, SEED.invoices, SEED.applications)
  if (rfc) demoRfcs.add(rfc)
}

function justArrived(rfc: string, nicknames: PartyNickname[]): boolean {
  return !demoRfcs.has(rfc) && !nicknameOf(rfc, nicknames)
}

function shownParty(rfc: string, profiles: PartyProfile[]): Party | undefined {
  const base = partyByRfc(rfc)
  if (!base) return undefined
  const edit = profiles.find((item) => item.rfc === rfc)
  if (!edit) return base
  return { ...base, razonSocial: edit.razonSocial, nombreComercial: edit.nombreComercial, subnombre: edit.subnombre }
}

function legalName(rfc: string, fallback: string, profiles: PartyProfile[]): string {
  return shownParty(rfc, profiles)?.razonSocial || fallback
}

function nicknameOf(rfc: string, nicknames: PartyNickname[]): PartyNickname | undefined {
  return nicknames.find((item) => item.rfc === rfc)
}

export function Personas() {
  const { state } = useStore()
  const [tour, setTour] = useState(false)
  if (state.detail?.type === 'party') return <PartyDetail rfc={state.detail.id} />
  if (tour) return <NicknameTour onClose={() => setTour(false)} />
  return <PartyList onTour={() => setTour(true)} />
}

function PartyList({ onTour }: { onTour: () => void }) {
  const { state } = useStore()
  const [tab, setTab] = useState<'clientes' | 'proveedores'>('clientes')
  const [query, setQuery] = useState('')
  const direction = tab === 'clientes' ? 'emitida' : 'recibida'
  const rows = useMemo(() => {
    const q = norm(query)
    return partyLedgers(state.invoices, state.applications, direction).filter((row) => {
      if (!q) return true
      const party = shownParty(row.rfc, state.partyProfiles)
      const nick = nicknameOf(row.rfc, state.nicknames)
      if (party && partyMatches(party, query)) return true
      return norm(`${nick?.apodo ?? ''} ${row.name} ${row.rfc}`).includes(q)
    })
  }, [direction, query, state.applications, state.invoices, state.nicknames, state.partyProfiles])

  return (
    <div className="page people">
      <header className="page-head">
        <div>
          <h1>Clientes y proveedores</h1>
          <p className="muted">El apodo es el nombre con el que tú los reconoces.</p>
        </div>
        <button type="button" className="nick-primary" data-testid="poner-apodos" onClick={onTour}>
          Poner apodos
        </button>
      </header>
      <div className="tabs">
        <button type="button" className={tab === 'clientes' ? 'on' : ''} onClick={() => setTab('clientes')}>
          Clientes
        </button>
        <button type="button" className={tab === 'proveedores' ? 'on' : ''} onClick={() => setTab('proveedores')}>
          Proveedores
        </button>
      </div>
      <label className="field grow cat-search">
        <span>Buscar</span>
        <input value={query} placeholder="Apodo, razón social o RFC" onChange={(event) => setQuery(event.target.value)} />
      </label>
      {rows.length === 0 ? (
        <p className="empty">Nadie coincide.</p>
      ) : (
        <ul className="nick-list">
          {rows.map((row) => (
            <PartyNick
              key={row.rfc}
              rfc={row.rfc}
              legal={legalName(row.rfc, row.name, state.partyProfiles)}
              asking={justArrived(row.rfc, state.nicknames)}
            />
          ))}
        </ul>
      )}
    </div>
  )
}

function PartyNick({ rfc, legal, asking }: { rfc: string; legal: string; asking: boolean }) {
  const { state, saveNickname } = useStore()
  const record = nicknameOf(rfc, state.nicknames)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(record?.apodo ?? '')
  const firstTime = asking && !record
  const hasApodo = Boolean(record?.apodo)
  const showEditor = firstTime || editing
  const shown = hasApodo ? record?.apodo ?? legal : legal

  function start(event: { preventDefault: () => void; stopPropagation: () => void }) {
    event.preventDefault()
    event.stopPropagation()
    if (!editing) setDraft(record?.apodo ?? '')
    setEditing(true)
  }

  function save(event: { preventDefault: () => void; stopPropagation: () => void }) {
    event.preventDefault()
    event.stopPropagation()
    const apodo = draft.trim()
    saveNickname(rfc, apodo, apodo.length === 0)
    setDraft(apodo)
    setEditing(false)
  }

  function onKey(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter') {
      event.preventDefault()
      save(event)
    }
    if (event.key === 'Escape' && !firstTime) {
      event.preventDefault()
      setDraft(record?.apodo ?? '')
      setEditing(false)
    }
  }

  return (
    <li className="nick-row" data-testid={`nick-${rfc}`}>
      <div className="nick-name">
        {hasApodo ? (
          <button type="button" className="nick-name-hit" onClick={start}>
            <strong>{shown}</strong>
          </button>
        ) : (
          <strong>{shown}</strong>
        )}
        {!hasApodo && !showEditor && (
          <button type="button" className="nick-put" onClick={start}>
            poner apodo
          </button>
        )}
      </div>
      {hasApodo && (
        <p className="nick-meta">
          <span>{legal}</span>
          <span>{rfc}</span>
        </p>
      )}
      {showEditor && (
        <div className="nick-edit">
          {firstTime && <span className="nick-ask">¿Cómo le llamas?</span>}
          <input
            value={draft}
            aria-label={firstTime ? '¿Cómo le llamas?' : `Apodo de ${shown}`}
            placeholder="Apodo"
            autoFocus={editing && !firstTime}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={onKey}
          />
          <button type="button" className="nick-save" onClick={save}>
            Guardar
          </button>
          {firstTime && (
            <button
              type="button"
              className="nick-skip"
              onClick={(event) => {
                event.preventDefault()
                event.stopPropagation()
                saveNickname(rfc, '', true)
                setDraft('')
                setEditing(false)
              }}
            >
              Saltar
            </button>
          )}
        </div>
      )}
    </li>
  )
}

function NicknameTour({ onClose }: { onClose: () => void }) {
  const { state, saveNickname } = useStore()
  const rows = useMemo(() => {
    const seen = new Map<string, string>()
    for (const direction of ['emitida', 'recibida'] as const) {
      for (const row of partyLedgers(state.invoices, state.applications, direction)) {
        if (!seen.has(row.rfc)) seen.set(row.rfc, legalName(row.rfc, row.name, state.partyProfiles))
      }
    }
    return [...seen.entries()]
      .map(([rfc, legal]) => ({ rfc, legal }))
      .sort((a, b) => a.legal.localeCompare(b.legal, 'es-MX'))
  }, [state.applications, state.invoices, state.partyProfiles])

  return (
    <div className="page people" data-testid="nick-tour">
      <header className="page-head">
        <div>
          <h1>Poner apodos</h1>
          <p className="muted">Un campo por empresa. Enter guarda. Sin el resto de la ficha.</p>
        </div>
        <button type="button" className="nick-primary" onClick={onClose}>
          Listo
        </button>
      </header>
      <ul className="nick-tour">
        {rows.map((row) => {
          const current = nicknameOf(row.rfc, state.nicknames)?.apodo ?? ''
          return (
            <li key={row.rfc}>
              <div>
                <span className="legal">{row.legal}</span>
                <input
                  name="apodo"
                  defaultValue={current}
                  placeholder="Apodo"
                  aria-label={`Apodo de ${row.legal}`}
                  onKeyDown={(event) => {
                    if (event.key !== 'Enter') return
                    event.preventDefault()
                    const apodo = event.currentTarget.value.trim()
                    if (apodo) saveNickname(row.rfc, apodo, false)
                  }}
                />
              </div>
              <span className="rfc">{row.rfc}</span>
            </li>
          )
        })}
      </ul>
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
