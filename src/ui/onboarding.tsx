import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { COMPANY, SAMPLE_CSV_NAME, SAMPLE_CSV_PATH } from '../catalog'
import { draftsToMovements, parseCsv, toPreviewRows } from '../csv'
import { fingerprint, paymentsWithoutInvoice } from '../domain'
import { money } from '../format'
import { useStore } from '../store'

const DEMO_COMPANY = {
  rfc: COMPANY.rfc,
  razon: COMPANY.name,
  comercial: COMPANY.name,
  tipo: 'moral' as const,
  web: 'www.distribuidoralacentral.mx',
  companyEmail: 'hola@distribuidoralacentral.mx',
  companyPhone: '33 3614 2200',
}

export function onboardingQuery(): boolean {
  return new URLSearchParams(window.location.search).get('onboarding') === '1'
}

const OSCAR = {
  name: 'Óscar',
  email: 'oscar@distribuidoralacentral.mx',
  phone: '33 1555 0140',
  password: 'Central2026',
  ciec: 'CiecDemo2026',
}

type Stage = 'gate' | 'account' | 'company' | 'sat' | 'bank' | 'summary'

function useTyper() {
  const timers = useRef<number[]>([])
  useEffect(() => {
    return () => timers.current.forEach((id) => window.clearTimeout(id))
  }, [])
  return (fields: { write: (value: string) => void; value: string }[]) => {
    timers.current.forEach((id) => window.clearTimeout(id))
    timers.current = []
    fields.forEach((field) => field.write(''))
    let delay = 80
    fields.forEach((field) => {
      for (let index = 1; index <= field.value.length; index += 1) {
        const next = field.value.slice(0, index)
        delay += 32
        timers.current.push(window.setTimeout(() => field.write(next), delay))
      }
      delay += 220
    })
  }
}

function clearOnboardingQuery() {
  if (!onboardingQuery()) return
  const url = new URL(window.location.href)
  url.searchParams.delete('onboarding')
  const next = `${url.pathname}${url.search}${url.hash}`
  window.history.replaceState(null, '', next || '/')
}

export function Onboarding() {
  const { state } = useStore()
  const stored = state.onboarding.step
  const step: Stage = onboardingQuery() || stored === 'done' ? 'gate' : stored
  if (step === 'gate' || step === 'account') return <Account />
  return (
    <div className="column">
      <div className="column-sheet">
        <p className="wordmark">Serbell</p>
        <Stepper step={step} />
        {step === 'company' && <Company />}
        {step === 'sat' && <Sat />}
        {step === 'bank' && <Bank />}
        {step === 'summary' && <Summary />}
      </div>
    </div>
  )
}

function Stepper({ step }: { step: Stage }) {
  const current = step === 'gate' || step === 'account' ? 0 : step === 'company' ? 1 : step === 'sat' ? 2 : step === 'bank' ? 3 : 4
  const labels = ['Cuenta', 'Tu empresa', 'SAT', 'Bancos', 'Listo']
  return (
    <ol className="stepper" aria-label="Progreso">
      {labels.map((label, index) => (
        <li key={label} className={index < current ? 'done' : index === current ? 'on' : ''}>
          <i />
          {label}
        </li>
      ))}
    </ol>
  )
}

function FillButton({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" className="btn fill-user" data-testid="fill-as-user" onClick={onClick}>
      Rellenar como el usuario
    </button>
  )
}

function Panel({ title, lede, skip, children }: { title: string; lede?: string; skip?: ReactNode; children: ReactNode }) {
  return (
    <>
      <div className="board-head">
        <h1>{title}</h1>
        {skip}
      </div>
      {lede && <p className="lede">{lede}</p>}
      {children}
    </>
  )
}

function Account() {
  const { state, patchOnboarding } = useStore()
  const saved = state.onboarding.profile
  const [name, setName] = useState(saved.name)
  const [email, setEmail] = useState(saved.email)
  const [phone, setPhone] = useState(saved.phone)
  const [password, setPassword] = useState('')
  const type = useTyper()

  function continueAccount() {
    clearOnboardingQuery()
    patchOnboarding({ step: 'company', profile: { name: name.trim(), email: email.trim(), phone: phone.trim() } })
  }

  return (
    <div className="split">
      <aside className="split-side">
        <p className="wordmark">Serbell</p>
        <h2>La mesa donde cuadran facturas y banco.</h2>
        <p>Serbellito ordena los CFDIs, los movimientos y el siguiente paso. En pesos mexicanos, en este navegador.</p>
        <ul className="benefits">
          <li>
            <span>01</span>
            Conciliar cada movimiento con el CFDI del mismo monto.
          </li>
          <li>
            <span>02</span>
            Organizar los gastos por proveedor, RFC y categoría.
          </li>
          <li>
            <span>03</span>
            Ver qué sigue: un cobro, un complemento o un pago abierto.
          </li>
        </ul>
        <p className="split-from">Llegas desde serbell.com</p>
      </aside>
      <section className="split-form">
        <Stepper step="account" />
        <h1>Crea tu cuenta</h1>
        <p className="lede">Nombre, correo, celular y contraseña. La contraseña se queda en esta pantalla.</p>
        <FillButton
          onClick={() =>
            type([
              { write: setName, value: OSCAR.name },
              { write: setEmail, value: OSCAR.email },
              { write: setPhone, value: OSCAR.phone },
              { write: setPassword, value: OSCAR.password },
            ])
          }
        />
        <form
          className="pill-form"
          onSubmit={(event) => {
            event.preventDefault()
            continueAccount()
          }}
        >
        <label className="field">
          Nombre
          <input value={name} autoComplete="name" onChange={(event) => setName(event.target.value)} />
        </label>
        <label className="field">
          Correo
          <input type="email" value={email} autoComplete="email" onChange={(event) => setEmail(event.target.value)} />
        </label>
        <label className="field">
          Celular
          <input value={phone} inputMode="tel" autoComplete="tel" onChange={(event) => setPhone(event.target.value)} />
        </label>
        <label className="field">
          Contraseña
          <input type="password" value={password} autoComplete="new-password" onChange={(event) => setPassword(event.target.value)} />
        </label>
        <button type="submit" className="btn primary" data-testid="account-next">
          Continuar
        </button>
      </form>
        <button
          type="button"
          className="text-login"
          data-testid="gate-login"
          onClick={() => {
            clearOnboardingQuery()
            patchOnboarding({ step: 'done' })
          }}
        >
          Iniciar sesión
        </button>
      </section>
    </div>
  )
}

function Company() {
  const { state, patchOnboarding } = useStore()
  const saved = state.onboarding.profile
  const [rfc, setRfc] = useState(saved.rfc)
  const [razon, setRazon] = useState(saved.razon)
  const [comercial, setComercial] = useState(saved.comercial)
  const [tipo, setTipo] = useState(saved.tipo)
  const [web, setWeb] = useState(saved.web)
  const [email, setEmail] = useState(saved.companyEmail)
  const [phone, setPhone] = useState(saved.companyPhone)
  const type = useTyper()

  function fillCompany() {
    type([
      { write: setRfc, value: DEMO_COMPANY.rfc },
      { write: setRazon, value: DEMO_COMPANY.razon },
      { write: setComercial, value: DEMO_COMPANY.comercial },
      { write: setWeb, value: DEMO_COMPANY.web },
      { write: setEmail, value: DEMO_COMPANY.companyEmail },
      { write: setPhone, value: DEMO_COMPANY.companyPhone },
    ])
    window.setTimeout(() => setTipo(DEMO_COMPANY.tipo), 6400)
  }

  function continueCompany() {
    patchOnboarding({
      step: 'sat',
      profile: {
        rfc: rfc.trim(),
        razon: razon.trim(),
        comercial: comercial.trim(),
        tipo,
        web: web.trim(),
        companyEmail: email.trim(),
        companyPhone: phone.trim(),
      },
    })
  }

  return (
    <Panel
      title="Tu empresa"
      lede="Puedes continuar con lo que esté lleno."
      skip={
        <button type="button" className="btn quiet" data-testid="skip-company" onClick={() => patchOnboarding({ step: 'sat' })}>
          Lo agrego después
        </button>
      }
    >
      <FillButton onClick={fillCompany} />
      <form
        className="pill-form"
        onSubmit={(event) => {
          event.preventDefault()
          continueCompany()
        }}
      >
        <label className="field">
          RFC
          <input value={rfc} onChange={(event) => setRfc(event.target.value)} />
        </label>
        <label className="field">
          Razón social
          <input value={razon} onChange={(event) => setRazon(event.target.value)} />
        </label>
        <label className="field">
          Nombre comercial
          <input value={comercial} onChange={(event) => setComercial(event.target.value)} />
        </label>
        <label className="field">
          Tipo de persona
          <select value={tipo} onChange={(event) => setTipo(event.target.value as '' | 'fisica' | 'moral')}>
            <option value="">Elige</option>
            <option value="fisica">Persona física</option>
            <option value="moral">Persona moral</option>
          </select>
        </label>
        <label className="field">
          Página web
          <input value={web} onChange={(event) => setWeb(event.target.value)} />
        </label>
        <label className="field">
          Correo
          <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
        </label>
        <label className="field">
          Teléfono
          <input value={phone} onChange={(event) => setPhone(event.target.value)} />
        </label>
        <button type="submit" className="btn primary" data-testid="company-next">
          Continuar
        </button>
      </form>
    </Panel>
  )
}

function Sat() {
  const { state, patchOnboarding } = useStore()
  const [rfc, setRfc] = useState(state.onboarding.profile.rfc)
  const [password, setPassword] = useState('')
  const [running, setRunning] = useState(false)
  const [beat, setBeat] = useState(0)
  const [hint, setHint] = useState('')
  const type = useTyper()
  const received = state.invoices.filter((invoice) => invoice.direction === 'recibida').length
  const issued = state.invoices.filter((invoice) => invoice.direction === 'emitida').length
  const lines = [
    'Consultando al SAT · simulación',
    `Descargando 100 CFDIs: ${received} recibidas y ${issued} emitidas`,
    'Verificando vigencias y complementos',
    'Un pago de Empaques de Occidente por $18,560 puede cubrir A-184 y A-191.',
    'Falta el complemento de A-191.',
  ]

  useEffect(() => {
    if (!running) return
    if (beat >= lines.length) {
      const timer = window.setTimeout(() => patchOnboarding({ step: 'bank', sat: 'connected' }), 600)
      return () => window.clearTimeout(timer)
    }
    const timer = window.setTimeout(() => setBeat((current) => current + 1), 700)
    return () => window.clearTimeout(timer)
  }, [running, beat, lines.length, patchOnboarding])

  function start() {
    if (!rfc.trim() || !password) {
      setHint('Escribe el RFC y la contraseña CIEC para simular la consulta. También puedes saltar.')
      return
    }
    setHint('')
    setBeat(1)
    setRunning(true)
  }

  return (
    <Panel
      title="Hola, bienvenido. Conectemos el SAT."
      lede="Esto es una simulación. La contraseña no se envía al SAT."
      skip={
        <button type="button" className="btn quiet" data-testid="skip-sat" onClick={() => patchOnboarding({ step: 'bank', sat: 'skipped' })}>
          Saltar
        </button>
      }
    >
      {!running ? (
        <form
          className="pill-form"
          onSubmit={(event) => {
            event.preventDefault()
            start()
          }}
        >
          <label className="field">
            RFC
            <input value={rfc} onChange={(event) => setRfc(event.target.value)} />
          </label>
          <label className="field">
            Contraseña CIEC
            <input type="password" value={password} autoComplete="off" onChange={(event) => setPassword(event.target.value)} />
          </label>
          {hint && <p className="field-error">{hint}</p>}
          <FillButton
            onClick={() =>
              type([
                { write: setRfc, value: state.onboarding.profile.rfc || DEMO_COMPANY.rfc },
                { write: setPassword, value: OSCAR.ciec },
              ])
            }
          />
          <button type="submit" className="btn primary" data-testid="sat-next">
            Continuar
          </button>
        </form>
      ) : (
        <ol className="gate-run" data-testid="sat-run">
          {lines.slice(0, beat).map((line) => (
            <li key={line} className="on">
              {line}
            </li>
          ))}
        </ol>
      )}
    </Panel>
  )
}

function Bank() {
  const { state, patchOnboarding, importMovements } = useStore()
  const [running, setRunning] = useState(false)
  const [beat, setBeat] = useState(0)
  const [lines, setLines] = useState<string[]>([])
  const [error, setError] = useState('')
  const timer = useRef<number | null>(null)

  useEffect(() => {
    return () => {
      if (timer.current) window.clearInterval(timer.current)
    }
  }, [])

  function stop() {
    if (timer.current) {
      window.clearInterval(timer.current)
      timer.current = null
    }
  }

  function skip() {
    stop()
    patchOnboarding({ step: 'summary', bank: 'skipped', bankFile: '', bankAdded: 0 })
  }

  async function begin(text: string, fileName: string, origin: 'ejemplo' | 'csv') {
    setError('')
    const parsed = parseCsv(text)
    if ('error' in parsed) {
      setError(parsed.error)
      return
    }
    const rows = toPreviewRows(parsed.rows, state.movements)
    const drafted = draftsToMovements(rows, state.invoices, state.applications, origin, fileName, state.categoryRules)
    const known = new Set(state.movements.map((movement) => fingerprint(movement)))
    const fresh = drafted.filter((movement) => !known.has(fingerprint(movement)))
    const shown = fresh.slice(0, 6).map((movement) => {
      const amount = movement.cargo > 0 ? money(movement.cargo) : money(movement.abono)
      return `${movement.concept} · ${amount}`
    })
    const script = [
      origin === 'ejemplo' ? 'Abriendo el estado de cuenta de ejemplo' : `Leyendo ${fileName}`,
      'Separando cargos y abonos',
      ...shown,
      fresh.length
        ? `Quedaron ${fresh.length} movimientos nuevos. Los que ya estaban en la demo no salen de este archivo.`
        : 'Esos movimientos ya estaban en la demo. No los volví a cargar ni los atribuí a este archivo.',
    ]
    setLines(script)
    setBeat(1)
    setRunning(true)
    let step = 1
    stop()
    timer.current = window.setInterval(() => {
      step += 1
      setBeat(step)
      if (step < script.length) return
      stop()
      timer.current = window.setTimeout(() => {
        importMovements(fresh)
        patchOnboarding({
          step: 'summary',
          bank: origin === 'ejemplo' ? 'example' : 'file',
          bankFile: fileName,
          bankAdded: fresh.length,
        })
      }, 500)
    }, 450)
  }

  async function useSample() {
    setError('')
    try {
      const response = await fetch(SAMPLE_CSV_PATH)
      if (!response.ok) throw new Error('No pude abrir el archivo de ejemplo.')
      await begin(await response.text(), SAMPLE_CSV_NAME, 'ejemplo')
    } catch {
      setError('No pude abrir el archivo de ejemplo.')
    }
  }

  async function takeFile(file: File) {
    const name = file.name.toLowerCase()
    const csv = name.endsWith('.csv') || file.type === 'text/csv'
    if (!csv) {
      setError('No leí este archivo. El estado de cuenta de ejemplo sí se puede usar.')
      return
    }
    await begin(await file.text(), file.name, 'csv')
  }

  return (
    <Panel
      title="Sube tus movimientos"
      lede="Estado de cuenta del banco. También es una simulación: nada sale de este navegador."
      skip={
        <button type="button" className="btn quiet" data-testid="skip-bank" onClick={skip}>
          Saltar
        </button>
      }
    >
      {!running ? (
        <div
          className="gate-drop"
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => {
            event.preventDefault()
            const file = event.dataTransfer.files?.[0]
            if (file) void takeFile(file)
          }}
        >
          <p>Suelta un CSV aquí, o usa el archivo de ejemplo.</p>
          <div className="gate-actions">
            <button type="button" className="btn primary" data-testid="use-sample-bank" onClick={() => void useSample()}>
              Usar archivo de ejemplo
            </button>
            <label className="btn">
              Elegir archivo
              <input
                type="file"
                hidden
                accept=".csv,.xlsx,.xls,.pdf,text/csv"
                onChange={(event) => {
                  const file = event.target.files?.[0]
                  event.target.value = ''
                  if (file) void takeFile(file)
                }}
              />
            </label>
          </div>
          {error && <p className="field-error">{error}</p>}
        </div>
      ) : (
        <ol className="gate-run" data-testid="bank-run">
          {lines.slice(0, beat).map((line) => (
            <li key={line} className="on">
              {line}
            </li>
          ))}
        </ol>
      )}
    </Panel>
  )
}

function Summary() {
  const { state, patchOnboarding } = useStore()
  const { sat, bank, bankFile, bankAdded } = state.onboarding
  const received = state.invoices.filter((invoice) => invoice.direction === 'recibida').length
  const issued = state.invoices.filter((invoice) => invoice.direction === 'emitida').length
  const unbilled = paymentsWithoutInvoice(state.movements, state.applications)
  const unbilledTotal = unbilled.reduce((sum, movement) => sum + movement.cargo, 0)
  const company = state.onboarding.profile.razon || COMPANY.name

  return (
    <Panel title="Esto es lo que vi" lede={`${company}. Todo sigue en este navegador.`}>
      <div className="gate-summary" data-testid="onboarding-summary">
        {sat === 'connected' ? (
          <article className="gate-card-item">
            <strong>SAT</strong>
            <p>
              Descargué {received + issued} CFDIs: {received} recibidas y {issued} emitidas.
            </p>
          </article>
        ) : (
          <article className="gate-card-item">
            <strong>SAT</strong>
            <p>Saltaste la conexión. No descargué facturas.</p>
          </article>
        )}
        {bank === 'skipped' ? (
          <article className="gate-card-item">
            <strong>Banco</strong>
            <p>Saltaste el estado de cuenta. No leí un archivo.</p>
          </article>
        ) : (
          <article className="gate-card-item">
            <strong>Banco</strong>
            <p>
              {bank === 'example' ? 'Leí el estado de cuenta de ejemplo' : `Leí ${bankFile}`}
              {bankAdded ? `: ${bankAdded} movimientos nuevos.` : '. Esos movimientos ya estaban; no los atribuí de nuevo a un archivo.'} Los
              precargados de la demo siguen siendo de la demo.
            </p>
          </article>
        )}
        {sat === 'connected' && (
          <>
            <article className="gate-card-item">
              <strong>El pago de $18,560</strong>
              <p>Empaques de Occidente puede cubrir las facturas A-184 y A-191.</p>
            </article>
            <article className="gate-card-item">
              <strong>Pagos sin factura</strong>
              <p>
                {unbilled.length} {unbilled.length === 1 ? 'pago' : 'pagos'} por {money(unbilledTotal)}.
              </p>
            </article>
            <article className="gate-card-item">
              <strong>Siguiente paso</strong>
              <p>Confirma ese match o pide el complemento de A-191.</p>
            </article>
          </>
        )}
      </div>
      <div className="gate-actions">
        <button type="button" className="btn primary" data-testid="enter-inicio" onClick={() => patchOnboarding({ step: 'done' })}>
          Entrar a Inicio
        </button>
      </div>
    </Panel>
  )
}
