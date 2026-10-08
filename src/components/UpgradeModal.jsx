import { useState } from 'react'
import { apiUrl } from '../apiBase'
import { IAP_PRODUCTS } from '../iap/products.js'

// Shown when the monthly transformation quota is used up.
//   • Web: Stripe Checkout (unchanged).
//   • iOS native: Apple In-App Purchase via `onApplePurchase(plan)` (App Store 3.1.1).
//   • Android TWA: no purchases — informational only.
export default function UpgradeModal({ onClose, onViewPlans, swapUsage, isTWA, appleIAP, onApplePurchase, onRestorePurchases, appleProducts }) {
  const [loading, setLoading] = useState(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const priceFor = (plan) => appleProducts?.find(p => p.plan === plan)?.priceString || IAP_PRODUCTS[plan].fallbackPrice

  async function handleSubscribe(plan) {
    setLoading(plan)
    setError('')
    setNotice('')
    if (appleIAP) {
      try {
        const outcome = await onApplePurchase(plan)
        if (outcome?.pending) { setNotice(outcome.message); setLoading(null); return }
        onClose()
      } catch (e) {
        if (e?.name !== 'PurchaseCancelled') setError(e?.message || 'Purchase could not be completed.')
        setLoading(null)
      }
      return
    }
    try {
      const res = await fetch(apiUrl('/api/create-checkout'), {
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

  const noPurchases = isTWA && !appleIAP

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
            {noPurchases
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
        {notice && (
          <div role="status" style={{ fontSize: 13, color: 'var(--green-dark)', background: 'var(--green-pale)', border: '1px solid var(--green-light)', borderRadius: 10, padding: '10px 12px', marginBottom: 12, lineHeight: 1.5 }}>
            {notice}
          </div>
        )}

        {noPurchases ? (
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
                  <><div className="spinner" /> {appleIAP ? 'Opening App Store…' : 'Redirecting…'}</>
                ) : (
                  <>💚 Plus — {priceFor('wellness')}/mo · 50 Recipe Upgrades/month</>
                )}
              </button>

              <button
                className="btn btn-outline"
                onClick={() => handleSubscribe('family')}
                disabled={!!loading}
              >
                {loading === 'family' ? (
                  <><div className="spinner spinner-green" style={{ borderTopColor: 'var(--green)' }} /> {appleIAP ? 'Opening App Store…' : 'Redirecting…'}</>
                ) : (
                  <>⭐ Premium — {priceFor('family')}/mo · 150 Recipe Upgrades/month</>
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
              {appleIAP && onRestorePurchases && (
                <button
                  className="btn btn-ghost"
                  onClick={onRestorePurchases}
                  disabled={!!loading}
                  style={{ width: '100%', fontSize: 13 }}
                >
                  Restore Purchases
                </button>
              )}
            </div>

            {appleIAP && (
              <p style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center', lineHeight: 1.5, marginBottom: 10 }}>
                Monthly auto-renewing subscriptions billed to your Apple Account. Cancel anytime in Settings → Apple Account → Subscriptions.
              </p>
            )}

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
