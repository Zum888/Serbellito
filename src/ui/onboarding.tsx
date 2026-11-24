import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { COMPANY, SAMPLE_CSV_NAME, SAMPLE_CSV_PATH } from '../catalog'
import { draftsToMovements, parseCsv, toPreviewRows } from '../csv'
import { fingerprint, paymentsWithoutInvoice } from '../domain'
import { money } from '../format'
import { EMPTY_PROFILE, useStore } from '../store'

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

type Job = { title: string; state: string; detail: string }

function WorkList({ jobs, beat, testId }: { jobs: Job[]; beat: number; testId: string }) {
  return (
    <ol className="work" data-testid={testId}>
      {jobs.map((job, index) => {
        const place = index + 1 < beat ? 'done' : index + 1 === beat ? 'active' : 'wait'
        return (
          <li key={job.title} className={place}>
            <span className="mark" aria-hidden="true">
              {place === 'done' ? '✓' : place === 'active' ? <i /> : ''}
            </span>
            <div>
              <strong>{job.title}</strong>
              <em>{place === 'done' ? 'Listo' : place === 'active' ? job.state : 'En espera'}</em>
              {place !== 'wait' && <p>{job.detail}</p>}
              {place === 'active' && (
                <span className="bar">
                  <i />
                </span>
              )}
            </div>
          </li>
        )
      })}
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
  const [email, setEmail] = useState(state.onboarding.profile.email)
  const type = useTyper()

  function continueAccount() {
    clearOnboardingQuery()
    patchOnboarding({ step: 'company', profile: { email: email.trim() } })
  }

  return (
    <div className="split">
      <aside className="split-side">
        <div className="split-copy">
          <h2>
            Conciliación de facturas y bancos,
            <span>en automático.</span>
          </h2>
          <p>Conecta tus facturas del SAT y tus estados de cuenta para mantener tus finanzas al día.</p>
        </div>
        <div className="glass-scene">
          <article className="glass invoice">
            <span className="glass-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24">
                <path d="M7 3h7l5 5v13H7z" />
                <path d="M14 3v5h5M10 13h6M10 17h4" />
              </svg>
            </span>
            <strong>Factura</strong>
            <em>$18,560</em>
          </article>
          <article className="glass bank">
            <span className="glass-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24">
                <rect x="3" y="6" width="18" height="13" rx="2" />
                <path d="M3 10h18M7 15h4" />
              </svg>
            </span>
            <strong>Banco</strong>
            <em>Movimientos</em>
          </article>
        </div>
      </aside>
      <section className="split-form">
        <div className="door-card">
          <h1>Crea tu cuenta en Serbell</h1>
          <p className="lede">Empieza a conciliar tus facturas y bancos en minutos.</p>
          <form
            className="door-form"
            onSubmit={(event) => {
              event.preventDefault()
              continueAccount()
            }}
          >
            <label className="field">
              <span className="mail-head">
                Correo electrónico
                <button
                  type="button"
                  className="fill-user"
                  data-testid="fill-as-user"
                  onClick={() => type([{ write: setEmail, value: OSCAR.email }])}
                >
                  Rellenar como el usuario
                </button>
              </span>
              <input type="email" value={email} autoComplete="email" onChange={(event) => setEmail(event.target.value)} />
            </label>
            <button type="submit" className="btn primary" data-testid="account-next">
              Continuar
            </button>
          </form>
          <div className="dot-rule" aria-hidden="true">
            <span />
          </div>
          <button type="button" className="social">
            <GoogleMark />
            Continuar con Google
          </button>
          <p className="have-account">
            ¿Ya tienes una cuenta?{' '}
            <button
              type="button"
              data-testid="gate-login"
              onClick={() => {
                clearOnboardingQuery()
                patchOnboarding({ step: 'done' })
              }}
            >
              Iniciar sesión
            </button>
          </p>
        </div>
      </section>
      <svg className="wave" viewBox="0 0 1440 180" preserveAspectRatio="none" aria-hidden="true">
        <path d="M0 96c220 42 460-36 740-4s460 40 700 10v78H0z" />
        <path d="M0 128c240 24 480-18 760 6s460 16 680 2v44H0z" />
      </svg>
    </div>
  )
}

function GoogleMark() {
  return (
    <svg className="logo" viewBox="0 0 18 18" aria-hidden="true">
      <path className="g1" d="M17.6 9.2c0-.6-.1-1.2-.2-1.8H9v3.4h4.8a4.1 4.1 0 0 1-1.8 2.7v2.2h2.9c1.7-1.6 2.7-3.9 2.7-6.5z" />
      <path className="g2" d="M9 18c2.4 0 4.5-.8 6-2.2l-2.9-2.2c-.8.6-1.8.9-3.1.9-2.4 0-4.4-1.6-5.1-3.8H.9v2.3C2.4 16.1 5.5 18 9 18z" />
      <path className="g3" d="M3.9 10.7A5.4 5.4 0 0 1 3.6 9c0-.6.1-1.2.3-1.7V5H.9A9 9 0 0 0 0 9c0 1.4.3 2.8.9 4l3-2.3z" />
      <path className="g4" d="M9 3.6c1.3 0 2.5.5 3.4 1.3L15 2.3C13.4.9 11.4 0 9 0 5.5 0 2.4 1.9.9 5l3 2.3C4.6 5.2 6.6 3.6 9 3.6z" />
    </svg>
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
  const stop = useRef(false)
  const received = state.invoices.filter((invoice) => invoice.direction === 'recibida').length
  const issued = state.invoices.filter((invoice) => invoice.direction === 'emitida').length
  const jobs: Job[] = [
    { title: 'Conectar', state: 'conectando', detail: 'Entrando al SAT con el RFC. Simulación: la CIEC no se envía.' },
    { title: 'Bajar facturas', state: 'descargando', detail: `100 CFDIs · ${received} recibidas · ${issued} emitidas` },
    { title: 'Verificar', state: 'verificando', detail: 'Vigencias, complementos y lo que todavía no cierra.' },
    {
      title: 'Analizar',
      state: 'analizando',
      detail: 'Empaques de Occidente · $18,560 puede cubrir A-184 y A-191. Falta el complemento de A-191.',
    },
  ]

  useEffect(() => {
    if (!running || stop.current) return
    if (beat > jobs.length) {
      const timer = window.setTimeout(() => {
        if (stop.current) return
        patchOnboarding({ step: 'bank', sat: 'connected' })
      }, 700)
      return () => window.clearTimeout(timer)
    }
    const timer = window.setTimeout(() => setBeat((current) => current + 1), 1100)
    return () => window.clearTimeout(timer)
  }, [running, beat, jobs.length, patchOnboarding])

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
        <button
          type="button"
          className="btn quiet"
          data-testid="skip-sat"
          onClick={() => {
            stop.current = true
            patchOnboarding({ step: 'bank', sat: 'skipped' })
          }}
        >
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
        <WorkList jobs={jobs} beat={beat} testId="sat-run" />
      )}
    </Panel>
  )
}

function Bank() {
  const { state, patchOnboarding, importMovements } = useStore()
  const [running, setRunning] = useState(false)
  const [beat, setBeat] = useState(0)
  const [jobs, setJobs] = useState<Job[]>([])
  const [error, setError] = useState('')
  const pending = useRef<ReturnType<typeof draftsToMovements>>([])
  const outcome = useRef({ origin: 'ejemplo' as 'ejemplo' | 'csv', fileName: '', added: 0 })
  const finished = useRef(false)

  useEffect(() => {
    if (!running || finished.current) return
    if (beat > jobs.length) {
      const timer = window.setTimeout(() => {
        if (finished.current) return
        finished.current = true
        importMovements(pending.current)
        patchOnboarding({
          step: 'summary',
          bank: outcome.current.origin === 'ejemplo' ? 'example' : 'file',
          bankFile: outcome.current.fileName,
          bankAdded: outcome.current.added,
        })
      }, 700)
      return () => window.clearTimeout(timer)
    }
    const timer = window.setTimeout(() => setBeat((current) => current + 1), 1100)
    return () => window.clearTimeout(timer)
  }, [running, beat, jobs.length, importMovements, patchOnboarding])

  function skip() {
    finished.current = true
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
    const pictured = draftsToMovements(
      rows.map((row) => ({ ...row, include: true, status: row.status === 'duplicado' ? 'nuevo' : row.status })),
      state.invoices,
      state.applications,
      origin,
      fileName,
      state.categoryRules,
    )
    const cargos = pictured.filter((movement) => movement.cargo > 0).length
    const abonos = pictured.filter((movement) => movement.abono > 0).length
    const crossed = pictured.filter((movement) => movement.suggestionIds.length > 0).length
    const unmatched = pictured.filter((movement) => movement.suggestionIds.length === 0 && movement.reconciliation !== 'no_requiere').length
    pending.current = fresh
    outcome.current = { origin, fileName, added: fresh.length }
    finished.current = false
    setJobs([
      {
        title: 'Leer el estado',
        state: 'leyendo',
        detail: `${origin === 'ejemplo' ? 'Estado de cuenta de ejemplo' : fileName} · ${rows.length} movimientos`,
      },
      {
        title: 'Clasificar movimientos',
        state: 'clasificando',
        detail: `${cargos} ${cargos === 1 ? 'cargo' : 'cargos'} · ${abonos} ${abonos === 1 ? 'abono' : 'abonos'}`,
      },
      {
        title: 'Cruzar con facturas',
        state: 'cruzando',
        detail: crossed ? `${crossed} con una factura posible` : 'Ningún movimiento nuevo trae una factura posible',
      },
      {
        title: 'Dejar los que no coinciden',
        state: 'analizando',
        detail: fresh.length
          ? `${unmatched} sin coincidencia. ${fresh.length} movimientos nuevos; el resto ya estaba en la demo.`
          : 'Esos movimientos ya estaban en la demo. No los volví a cargar ni los atribuí a este archivo.',
      },
    ])
    setBeat(1)
    setRunning(true)
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
        <WorkList jobs={jobs} beat={beat} testId="bank-run" />
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
        <button
          type="button"
          className="btn"
          data-testid="back-to-gate"
          onClick={() =>
            patchOnboarding({
              step: 'gate',
              sat: 'pending',
              bank: 'pending',
              bankFile: '',
              bankAdded: 0,
              profile: { ...EMPTY_PROFILE },
            })
          }
        >
          Volver al inicio
        </button>
      </div>
    </Panel>
  )
}
