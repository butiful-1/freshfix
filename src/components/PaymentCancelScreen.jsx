export default function PaymentCancelScreen({ onBack }) {
  return (
    <div className="animate-in" style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '40px 24px', textAlign: 'center',
    }}>
      <div style={{ fontSize: 64, marginBottom: 24 }}>💭</div>
      <h1 style={{ fontSize: 26, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: -0.8, marginBottom: 10 }}>
        No worries!
      </h1>
      <p style={{ fontSize: 15, color: 'var(--text-muted)', lineHeight: 1.6, maxWidth: 300, marginBottom: 8 }}>
        You weren't charged. Your free plan is still active.
      </p>
      <p style={{ fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.6, maxWidth: 300, marginBottom: 36 }}>
        You can upgrade anytime from the Pricing page when you're ready.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%', maxWidth: 320 }}>
        <button className="btn btn-primary" onClick={onBack}>
          View Plans Again
        </button>
        <button className="btn btn-ghost" onClick={() => {
          window.history.replaceState({}, '', '/')
          onBack()
        }}>
          Back to Home
        </button>
      </div>
    </div>
  )
}
