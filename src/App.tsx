import { useEffect, useState } from 'react'
import { COMPANY } from './catalog'
import { attentionItems } from './domain'
import { useStore } from './store'
import { Bancos } from './ui/bancos'
import { Facturas } from './ui/facturas'
import { IconBank, IconFile, IconHome, IconMenu, IconPanel } from './ui/icons'
import { AttentionList, AttentionRail, Inicio, ReconcilePanel } from './ui/inicio'
import { UploadDialog } from './ui/upload'
import type { AttentionItem } from './types'

export function App() {
  const { state, toggleSidebar, navigate, openReconcile, openDetail, pdf, closePdf, reset } = useStore()
  const [menu, setMenu] = useState(false)
  const [sheet, setSheet] = useState(false)
  const [confirmReset, setConfirmReset] = useState(false)
  const items = attentionItems(state)

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key !== 'Escape') return
      setMenu(false)
      setSheet(false)
      setConfirmReset(false)
      if (pdf) closePdf()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [closePdf, pdf])

  function openItem(item: AttentionItem) {
    setSheet(false)
    setMenu(false)
    if (item.kind === 'reconcile' && item.movementId) openReconcile(item.movementId)
    else if (item.invoiceId) openDetail({ type: 'invoice', id: item.invoiceId })
  }

  function go(route: 'inicio' | 'bancos' | 'facturas') {
    setMenu(false)
    navigate(route)
  }

  return (
    <div className={`shell${state.reconcileId ? ' reconciling' : ''}${state.sidebarCollapsed ? ' is-collapsed' : ''}`}>
      <aside className={`sidebar${state.sidebarCollapsed ? ' collapsed' : ''}${menu ? ' mobile-open' : ''}`}>
        <div className="brand">
          <div className="brand-top">
            <strong>Serbellito</strong>
            <button type="button" className="icon-btn" aria-label={state.sidebarCollapsed ? 'Mostrar menú' : 'Ocultar menú'} onClick={toggleSidebar}>
              <IconPanel />
            </button>
          </div>
          <div className="brand-copy">
            <div>{COMPANY.name}</div>
            <div className="demo-flag">Empresa de demostración</div>
          </div>
        </div>
        <nav>
          <button type="button" className={state.route === 'inicio' ? 'nav on' : 'nav'} onClick={() => go('inicio')}>
            <IconHome />
            <span>Inicio</span>
          </button>
          <button type="button" className={state.route === 'bancos' ? 'nav on' : 'nav'} onClick={() => go('bancos')}>
            <IconBank />
            <span>Bancos</span>
          </button>
          <button type="button" className={state.route === 'facturas' ? 'nav on' : 'nav'} onClick={() => go('facturas')}>
            <IconFile />
            <span>Facturas SAT</span>
          </button>
        </nav>
        <button type="button" className="reset" onClick={() => setConfirmReset(true)}>
          Reiniciar demo
        </button>
      </aside>
      {menu && <button type="button" className="backdrop" aria-label="Cerrar menú" onClick={() => setMenu(false)} />}
      <div className="workspace">
        <div className="center">
          <header className="mobile-top">
            <div className="mobile-top-row">
              <button type="button" className="icon-btn" aria-label="Abrir menú" onClick={() => setMenu(true)}>
                <IconMenu />
              </button>
              <div>
                <strong>Serbellito</strong>
                <div className="demo-flag">Empresa de demostración</div>
              </div>
            </div>
            <button type="button" className="att-launch" data-testid="mobile-attention" onClick={() => setSheet(true)}>
              Necesita tu atención · {items.length}
            </button>
          </header>
          {state.route === 'inicio' && <Inicio />}
          {state.route === 'bancos' && <Bancos />}
          {state.route === 'facturas' && <Facturas />}
        </div>
        {state.route === 'inicio' && (
          <aside className="rail">{state.reconcileId ? <ReconcilePanel key={state.reconcileId} /> : <AttentionRail onOpen={openItem} />}</aside>
        )}
      </div>
      {sheet && (
        <div className="modal-back" onClick={() => setSheet(false)}>
          <div className="sheet" role="dialog" aria-label="Necesita tu atención" onClick={(event) => event.stopPropagation()}>
            <h2>Necesita tu atención · {items.length}</h2>
            <AttentionList items={items} onOpen={openItem} />
            <button type="button" className="btn quiet" onClick={() => setSheet(false)}>
              Cerrar
            </button>
          </div>
        </div>
      )}
      {confirmReset && (
        <div className="modal-back" onClick={() => setConfirmReset(false)}>
          <div className="modal" role="dialog" aria-labelledby="reset-title" onClick={(event) => event.stopPropagation()}>
            <h2 id="reset-title">¿Reiniciar la demostración?</h2>
            <p>Se borra la conversación y vuelven los datos de ejemplo.</p>
            <div className="modal-actions">
              <button type="button" className="btn quiet" onClick={() => setConfirmReset(false)}>
                Cancelar
              </button>
              <button
                type="button"
                className="btn primary"
                onClick={() => {
                  reset()
                  setConfirmReset(false)
                  setSheet(false)
                }}
              >
                Reiniciar
              </button>
            </div>
          </div>
        </div>
      )}
      {pdf && (
        <div className="modal-back" onClick={closePdf}>
          <div className="modal viewer" role="dialog" aria-label={pdf.title} onClick={(event) => event.stopPropagation()}>
            <div className="viewer-bar">
              <h2>{pdf.title}</h2>
              <div className="doc-actions">
                <a className="btn quiet" href={pdf.url} download={pdf.filename}>
                  Descargar
                </a>
                <button type="button" className="btn primary" onClick={closePdf}>
                  Cerrar
                </button>
              </div>
            </div>
            <iframe title={pdf.title} src={pdf.url} />
          </div>
        </div>
      )}
      <UploadDialog />
    </div>
  )
}
