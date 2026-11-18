import { useEffect, useState } from 'react'
import { SAMPLE_CSV_NAME, SAMPLE_CSV_PATH } from '../catalog'
import { draftsToMovements, parseCsv, toPreviewRows } from '../csv'
import type { PreviewRow } from '../csv'
import { accountSummary } from '../domain'
import { fingerprint } from '../domain'
import { formatDate, formatPeriod, money } from '../format'
import { useStore } from '../store'

type Phase =
  | { name: 'pick' }
  | { name: 'loading'; label: string }
  | { name: 'error'; message: string }
  | {
      name: 'preview'
      fileName: string
      banner?: string
      origin: 'ejemplo' | 'csv'
      rows: PreviewRow[]
    }
  | { name: 'done'; added: number; matches: number; excluded: number }

function wait(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms))
}

async function readSample(): Promise<string> {
  const response = await fetch(SAMPLE_CSV_PATH)
  if (!response.ok) throw new Error('No pude abrir el archivo de ejemplo.')
  return response.text()
}

function fileKind(file: File): 'csv' | 'office' | 'bad' {
  const name = file.name.toLowerCase()
  if (name.endsWith('.csv') || file.type === 'text/csv') return 'csv'
  if (name.endsWith('.xlsx') || name.endsWith('.xls') || name.endsWith('.pdf') || file.type === 'application/pdf') return 'office'
  return 'bad'
}

export function UploadDialog() {
  const { uploadOpen, uploadFile, uploadToken, closeUpload, state, importMovements, navigate } = useStore()
  const [phase, setPhase] = useState<Phase>({ name: 'pick' })

  useEffect(() => {
    if (!uploadOpen) return
    if (!uploadFile) {
      setPhase({ name: 'pick' })
      return
    }
    void loadFile(uploadFile)
    // loadFile closes over the latest movements via state at open time; token marks a new file.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uploadOpen, uploadToken])

  if (!uploadOpen) return null

  async function loadFile(file: File) {
    setPhase({ name: 'loading', label: 'Leyendo archivo…' })
    await wait(500)
    const kind = fileKind(file)
    if (kind === 'bad') {
      setPhase({
        name: 'error',
        message:
          'No pude leer este archivo. Prueba con un CSV con columnas fecha, concepto, cargo y abono, o con un Excel o PDF para ver la vista previa de demostración.',
      })
      return
    }
    if (kind === 'office') {
      try {
        const text = await readSample()
        const parsed = parseCsv(text)
        if ('error' in parsed) {
          setPhase({ name: 'error', message: parsed.error })
          return
        }
        setPhase({
          name: 'preview',
          fileName: file.name,
          origin: 'ejemplo',
          banner: 'Vista previa de demostración. No leí este archivo. Si confirmas, agrego los movimientos del estado de cuenta de ejemplo.',
          rows: toPreviewRows(parsed.rows, state.movements),
        })
      } catch {
        setPhase({ name: 'error', message: 'No pude preparar la vista previa de demostración.' })
      }
      return
    }
    const text = await file.text()
    const parsed = parseCsv(text)
    if ('error' in parsed) {
      setPhase({ name: 'error', message: parsed.error })
      return
    }
    setPhase({
      name: 'preview',
      fileName: file.name,
      origin: 'csv',
      rows: toPreviewRows(parsed.rows, state.movements),
    })
  }

  async function useSample() {
    setPhase({ name: 'loading', label: 'Leyendo archivo…' })
    await wait(400)
    try {
      const text = await readSample()
      const parsed = parseCsv(text)
      if ('error' in parsed) {
        setPhase({ name: 'error', message: parsed.error })
        return
      }
      setPhase({
        name: 'preview',
        fileName: SAMPLE_CSV_NAME,
        origin: 'ejemplo',
        rows: toPreviewRows(parsed.rows, state.movements),
      })
    } catch {
      setPhase({ name: 'error', message: 'No pude abrir el archivo de ejemplo.' })
    }
  }

  function updateRow(index: number, include: boolean) {
    setPhase((current) => {
      if (current.name !== 'preview') return current
      return { ...current, rows: current.rows.map((row, rowIndex) => (rowIndex === index ? { ...row, include } : row)) }
    })
  }

  function confirm() {
    if (phase.name !== 'preview') return
    const drafted = draftsToMovements(phase.rows, state.invoices, state.applications, phase.origin, phase.fileName, state.categoryRules)
    const known = new Set(state.movements.map((movement) => fingerprint(movement)))
    const fresh = drafted.filter((movement) => !known.has(fingerprint(movement)))
    importMovements(fresh)
    setPhase({
      name: 'done',
      added: fresh.length,
      matches: fresh.filter((movement) => movement.reconciliation === 'por_revisar').length,
      excluded: phase.rows.filter((row) => row.status === 'duplicado').length,
    })
  }

  const preview = phase.name === 'preview' ? phase : null
  const dates = preview ? [...preview.rows].map((row) => row.date).sort() : []
  const readyCount = preview ? preview.rows.filter((row) => row.include && row.status !== 'duplicado').length : 0

  return (
    <div className="modal-back" onClick={closeUpload}>
      <div className="modal wide" role="dialog" aria-labelledby="upload-title" onClick={(event) => event.stopPropagation()}>
        <h2 id="upload-title">Subir estado de cuenta</h2>
        {phase.name === 'pick' && (
          <>
            <p>Elige un Excel, CSV o PDF. El archivo de ejemplo trae movimientos nuevos y las coincidencias de la demostración.</p>
            <div className="stack">
              <label className="btn">
                Elegir Excel, CSV o PDF
                <input
                  type="file"
                  hidden
                  accept=".csv,.xlsx,.xls,.pdf,text/csv,application/pdf"
                  onChange={(event) => {
                    const file = event.target.files?.[0]
                    event.target.value = ''
                    if (file) void loadFile(file)
                  }}
                />
              </label>
              <button type="button" className="btn primary" onClick={() => void useSample()}>
                Usar archivo de ejemplo
              </button>
              <a className="btn quiet" href={SAMPLE_CSV_PATH} download={SAMPLE_CSV_NAME}>
                Descargar archivo de ejemplo
              </a>
            </div>
          </>
        )}
        {phase.name === 'loading' && <p className="loading">{phase.label}</p>}
        {phase.name === 'error' && (
          <>
            <p className="field-error">{phase.message}</p>
            <div className="stack">
              <button type="button" className="btn" onClick={() => setPhase({ name: 'pick' })}>
                Elegir otro archivo
              </button>
              <button type="button" className="btn primary" onClick={() => void useSample()}>
                Usar archivo de ejemplo
              </button>
            </div>
          </>
        )}
        {preview && (
          <>
            {preview.banner && <p className="banner">Vista previa de demostración. {preview.banner.replace('Vista previa de demostración. ', '')}</p>}
            <p className="meta">
              <strong>{preview.fileName}</strong>
              <span>{accountSummary(preview.rows)}</span>
              <span>{dates.length ? formatPeriod(dates[0], dates[dates.length - 1]) : ''}</span>
            </p>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Concepto</th>
                    <th>Cargo</th>
                    <th>Abono</th>
                    <th>Duplicados</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.rows.map((row, index) => (
                    <tr key={`${row.date}-${row.concept}-${index}`}>
                      <td>{formatDate(row.date)}</td>
                      <td>{row.concept}</td>
                      <td className="num">{row.cargo ? money(row.cargo) : '—'}</td>
                      <td className="num">{row.abono ? money(row.abono) : '—'}</td>
                      <td>
                        {row.status === 'duplicado' && <span className="muted">Ya registrado</span>}
                        {row.status === 'posible' && (
                          <label className="check">
                            <input type="checkbox" checked={row.include} onChange={(event) => updateRow(index, event.target.checked)} />
                            Posible duplicado
                          </label>
                        )}
                        {row.status === 'nuevo' && (
                          <label className="check">
                            <input type="checkbox" checked={row.include} onChange={(event) => updateRow(index, event.target.checked)} />
                            Nuevo
                          </label>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="modal-actions">
              <button type="button" className="btn quiet" onClick={() => setPhase({ name: 'pick' })}>
                Elegir otro
              </button>
              {readyCount > 0 ? (
                <button type="button" className="btn primary" onClick={confirm}>
                  Agregar {readyCount} {readyCount === 1 ? 'movimiento' : 'movimientos'}
                </button>
              ) : (
                <button type="button" className="btn primary" onClick={closeUpload}>
                  Entendido
                </button>
              )}
            </div>
          </>
        )}
        {phase.name === 'done' && (
          <>
            <p>
              {phase.added === 0
                ? 'Estos movimientos ya estaban registrados. Los dejé fuera.'
                : `Agregué ${phase.added} ${phase.added === 1 ? 'movimiento' : 'movimientos'}.${
                    phase.matches ? ` ${phase.matches} ${phase.matches === 1 ? 'tiene' : 'tienen'} una coincidencia por revisar.` : ''
                  }${phase.excluded ? ` Excluí ${phase.excluded} que ya existían.` : ''}`}
            </p>
            <div className="modal-actions">
              <button type="button" className="btn quiet" onClick={closeUpload}>
                Cerrar
              </button>
              <button
                type="button"
                className="btn primary"
                onClick={() => {
                  closeUpload()
                  navigate('bancos')
                }}
              >
                Ver en Bancos
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
