import { useEffect, useState } from 'react'

const PLAN_LABELS = {
  wellness: { name: 'Basic',  emoji: '💚', tagline: '50 recipe fixes per month unlocked!' },
  family:   { name: 'Pro',    emoji: '⚡', tagline: '150 recipe fixes per month unlocked!' },
}

export default function PaymentSuccessScreen({ sessionId, onPlanUpdate, onContinue }) {
  const [status, setStatus] = useState('verifying') // verifying | success | error
  const [planInfo, setPlanInfo] = useState(null)

  useEffect(() => {
    if (!sessionId) {
      setStatus('error')
      return
    }
    fetch(`/api/verify-session?sessionId=${sessionId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.plan && data.status === 'paid') {
          setPlanInfo(PLAN_LABELS[data.plan] || PLAN_LABELS.wellness)
          onPlanUpdate(data.plan)
          setStatus('success')
        } else {
          setStatus('error')
        }
      })
      .catch(() => setStatus('error'))
  }, [sessionId])

  return (
    <div className="animate-in" style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '40px 24px', textAlign: 'center',
      background: 'linear-gradient(160deg, var(--green-pale) 0%, var(--green-bg) 40%, white 100%)',
    }}>

      {status === 'verifying' && (
        <>
          <div style={{ fontSize: 64, marginBottom: 24 }}>🌿</div>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 12 }}>
            Confirming your subscription…
          </h1>
          <div className="loading-dots" style={{ marginTop: 16 }}>
            <span /><span /><span />
          </div>
        </>
      )}

      {status === 'success' && planInfo && (
        <>
          <div style={{
            width: 100, height: 100, borderRadius: 28,
            background: 'var(--green)', display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            fontSize: 52, marginBottom: 28,
            boxShadow: '0 16px 48px rgba(34,197,94,0.4)',
          }}>
            {planInfo.emoji}
          </div>
          <h1 style={{ fontSize: 30, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: -1, marginBottom: 10 }}>
            Welcome to {planInfo.name}! 🎉
          </h1>
          <p style={{ fontSize: 17, color: 'var(--green-dark)', fontWeight: 600, marginBottom: 8 }}>
            {planInfo.tagline}
          </p>
          <p style={{ fontSize: 15, color: 'var(--text-muted)', lineHeight: 1.6, maxWidth: 300, marginBottom: 36 }}>
            Your subscription is active. Start fixing your favorite recipes right now!
          </p>
          <button className="btn btn-primary" style={{ maxWidth: 320, width: '100%' }} onClick={onContinue}>
            🌿 Start Fixing Recipes →
          </button>
        </>
      )}

      {status === 'error' && (
        <>
          <div style={{ fontSize: 64, marginBottom: 20 }}>✅</div>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 10 }}>
            Payment Received!
          </h1>
          <p style={{ fontSize: 15, color: 'var(--text-muted)', lineHeight: 1.6, maxWidth: 300, marginBottom: 28 }}>
            Your subscription is being activated. It may take a moment to reflect.
          </p>
          <button className="btn btn-primary" style={{ maxWidth: 320, width: '100%' }} onClick={onContinue}>
            Continue to Old2New →
          </button>
        </>
      )}
    </div>
  )
}
