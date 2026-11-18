import { Component } from 'react'
import type { ErrorInfo, ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import { StoreProvider } from './store'
import './styles.css'

class Boundary extends Component<{ children: ReactNode }, { error: string | null }> {
  state = { error: null as string | null }

  static getDerivedStateFromError(error: Error) {
    return { error: error.message }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(error, info)
  }

  render() {
    if (this.state.error) {
      return (
        <div className="crash">
          <h1>Algo salió mal en la demostración.</h1>
          <p>{this.state.error}</p>
          <button
            type="button"
            className="btn primary"
            onClick={() => {
              localStorage.removeItem('serbellito.demo.v1')
              window.location.reload()
            }}
          >
            Reiniciar demo
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

createRoot(document.getElementById('root')!).render(
  <Boundary>
    <StoreProvider>
      <App />
    </StoreProvider>
  </Boundary>,
)
