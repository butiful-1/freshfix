import { Component } from 'react'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    console.error('[Old2New] Render error:', error.message, info?.componentStack)
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          minHeight: '100vh', padding: 24, textAlign: 'center',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
          background: 'linear-gradient(160deg, #DCFCE7, #F0FDF4 40%, white 100%)',
        }}>
          <div style={{ fontSize: 56, marginBottom: 20 }}>🌿</div>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: '#1A2E1B', marginBottom: 10 }}>
            Something went wrong
          </h2>
          <p style={{ fontSize: 14, color: '#7A9A7C', marginBottom: 6, maxWidth: 300, lineHeight: 1.55 }}>
            {this.state.error.message || 'An unexpected error occurred.'}
          </p>
          <p style={{ fontSize: 12, color: '#AAAAAA', marginBottom: 28, maxWidth: 300 }}>
            Check the browser console for details.
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '12px 28px', background: '#22C55E', color: 'white',
              border: 'none', borderRadius: 14, fontSize: 15, fontWeight: 700,
              cursor: 'pointer', boxShadow: '0 4px 16px rgba(34,197,94,0.35)',
            }}
          >
            Reload App
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
