import { useState } from 'react'

export default function UpgradeModal({ onClose, onViewPlans, swapUsage, isTWA }) {
  const [loading, setLoading] = useState(null)
  const [error, setError] = useState('')

  async function handleSubscribe(plan) {
    setLoading(plan)
    setError('')
    try {
      const res = await fetch('/api/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan }),
      })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        setError(data.error || 'Something went wrong.')
        setLoading(null)
      }
    } catch {
      setError('Could not reach payment service. Try again.')
      setLoading(null)
    }
  }

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true">
      <div className="modal-sheet">
        <div className="modal-handle" />

        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <div style={{
            width: 64, height: 64, borderRadius: 18,
            background: '#FFF3E0', margin: '0 auto 14px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 32,
          }}>
            🌿
          </div>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 8, letterSpacing: -0.5 }}>
            You've Used All 5 Recipe Upgrades
          </h2>
          <p style={{ fontSize: 15, color: 'var(--text-muted)', lineHeight: 1.5 }}>
            {isTWA
              ? "You've used all 5 Recipe Upgrades this month. Come back next month for 5 more free Recipe Upgrades."
              : "You've used all 5 Recipe Upgrades this month. Upgrade for more monthly Recipe Upgrades, or come back next month for 5 more free Recipe Upgrades."}
          </p>
        </div>

        {error && (
          <div className="error-msg mb-12">
            <span className="error-icon">⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {isTWA ? (
          <button
            className="btn btn-primary"
            onClick={onClose}
            style={{ width: '100%' }}
          >
            OK
          </button>
        ) : (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 12 }}>
              <button
                className="btn btn-primary"
                onClick={() => handleSubscribe('wellness')}
                disabled={!!loading}
                style={{ position: 'relative' }}
              >
                {loading === 'wellness' ? (
                  <><div className="spinner" /> Redirecting…</>
                ) : (
                  <>💚 Plus — $14.99/mo · 50 Recipe Upgrades/month</>
                )}
              </button>

              <button
                className="btn btn-outline"
                onClick={() => handleSubscribe('family')}
                disabled={!!loading}
              >
                {loading === 'family' ? (
                  <><div className="spinner spinner-green" style={{ borderTopColor: 'var(--green)' }} /> Redirecting…</>
                ) : (
                  <>⭐ Premium — $24.99/mo · 150 Recipe Upgrades/month</>
                )}
              </button>

              <button
                className="btn btn-ghost"
                onClick={onViewPlans}
                disabled={!!loading}
                style={{ width: '100%' }}
              >
                See all plans →
              </button>
            </div>

            <button
              className="btn btn-ghost"
              onClick={onClose}
              style={{ width: '100%', color: 'var(--text-muted)', fontSize: 13 }}
              disabled={!!loading}
            >
              Not now
            </button>
          </>
        )}
      </div>
    </div>
  )
}
