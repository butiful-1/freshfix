import { useState } from 'react'

const FREE_LIMIT = 5

const PLANS = [
  {
    id: 'free',
    name: 'Free',
    price: '$0',
    period: 'forever',
    emoji: '🌱',
    color: '#6B9E6D',
    features: [
      `5 Recipe Upgrades Every Month`,
      'All 7 diet types',
      'Shopping list',
      'Save up to 5 recipes',
    ],
    stripeKey: null,
  },
  {
    id: 'wellness',
    name: 'Plus',
    price: '$14.99',
    period: '/mo',
    emoji: '💚',
    color: '#22C55E',
    popular: true,
    features: [
      '50 Recipe Upgrades Every Month',
      'All 7 diet types',
      'Shopping list',
      'Save up to 50 recipes',
      'Priority AI processing',
    ],
    stripeKey: 'wellness',
  },
  {
    id: 'family',
    name: 'Premium',
    price: '$24.99',
    period: '/mo',
    emoji: '⚡',
    color: '#16A34A',
    features: [
      '150 Recipe Upgrades Every Month',
      'All 7 diet types',
      'Shopping list',
      'Save up to 150 recipes',
      'Priority AI processing',
      'Priority support',
    ],
    stripeKey: 'family',
  },
]

const FAQ = [
  {
    q: 'Can I cancel anytime?',
    a: 'Yes — cancel anytime with no penalties. Your plan stays active until the end of the billing period, then reverts to Free.',
  },
  {
    q: 'Is there a free trial for paid plans?',
    a: `We offer ${FREE_LIMIT} free Recipe Upgrades every month on the Free plan — forever. Try Old2New before you commit to anything.`,
  },
  {
    q: 'What payment methods are accepted?',
    a: 'All major credit and debit cards via Stripe\'s secure checkout. Apple Pay and Google Pay are available where supported.',
  },
  {
    q: "What's the difference between Plus and Premium?",
    a: 'Plus gives you 50 Recipe Upgrades per month — great for most people. Premium gives you 150 Recipe Upgrades per month plus priority support, ideal for power users or households cooking multiple diet types.',
  },
  {
    q: 'Can I switch between plans?',
    a: 'Yes. Upgrade or downgrade at any time. Changes take effect at your next billing cycle. Upgrades are prorated.',
  },
  {
    q: 'Is my recipe data private?',
    a: 'Your saved recipes are stored securely in your account. Recipe text is sent to the Claude AI API for transformation only — it is not retained or used for training. We do not sell your data.',
  },
]

function FaqItem({ q, a }) {
  const [open, setOpen] = useState(false)
  return (
    <div style={{
      borderBottom: '1px solid var(--gray-200)',
      overflow: 'hidden',
    }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', background: 'none', border: 'none',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 0', cursor: 'pointer', textAlign: 'left', gap: 12,
          fontFamily: 'var(--font)',
        }}
      >
        <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.4 }}>{q}</span>
        <span style={{
          fontSize: 18, color: 'var(--green)', flexShrink: 0,
          transform: open ? 'rotate(45deg)' : 'rotate(0)',
          transition: 'transform 0.2s ease',
          display: 'inline-block',
        }}>+</span>
      </button>
      {open && (
        <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.65, paddingBottom: 16, marginTop: -4 }}>
          {a}
        </p>
      )}
    </div>
  )
}

export default function PricingScreen({ plan, swapUsage, onBack, user }) {
  const [loading, setLoading] = useState(null)
  const [error, setError]     = useState('')

  const swapsLeft = Math.max(0, FREE_LIMIT - (swapUsage?.count || 0))

  async function handleSubscribe(planKey) {
    setLoading(planKey)
    setError('')
    try {
      const res = await fetch('/api/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: planKey, ...(user?.id ? { userId: user.id } : {}) }),
      })
      const data = await res.json()
      if (data.url) { window.location.href = data.url; return }
      setError(data.error || 'Something went wrong. Please try again.')
    } catch {
      setError('Could not connect to payment service. Please try again.')
    }
    setLoading(null)
  }

  return (
    <div className="animate-in">
      <div className="screen-header">
        <button className="back-btn" onClick={onBack} aria-label="Back">←</button>
        <h1>Pricing</h1>
      </div>

      {/* Header */}
      <div style={{ padding: '24px 16px 8px', textAlign: 'center' }}>
        <div style={{ fontSize: 40, marginBottom: 10 }}>🌿</div>
        <h2 style={{ fontSize: 26, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: -0.8, marginBottom: 8 }}>
          Fix Recipes Without Limits
        </h2>
        <p style={{ fontSize: 15, color: 'var(--text-muted)', lineHeight: 1.5 }}>
          Upgrade for more monthly Recipe Upgrades and saved recipes.
        </p>

        {plan === 'free' && (
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: swapsLeft === 0 ? 'var(--red-bg)' : 'var(--green-pale)',
            color: swapsLeft === 0 ? 'var(--red)' : 'var(--green-dark)',
            border: `1px solid ${swapsLeft === 0 ? '#FFCDD2' : 'var(--green-light)'}`,
            borderRadius: 20, padding: '6px 14px',
            fontSize: 13, fontWeight: 600, marginTop: 12,
          }}>
            {swapsLeft === 0 ? '⚠️' : '✨'}
            {swapsLeft === 0
              ? `You've used all ${FREE_LIMIT} Recipe Upgrades this month`
              : `${swapsLeft} of ${FREE_LIMIT} Recipe Upgrades Remaining This Month`}
          </div>
        )}
      </div>

      {error && (
        <div className="error-msg" style={{ margin: '0 16px 8px' }}>
          <span className="error-icon">⚠️</span>
          <span>{error}</span>
        </div>
      )}

      {/* Plan cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: '16px 16px 8px' }}>
        {PLANS.map((p) => {
          const isCurrent = plan === p.id
          const isLoading = loading === p.stripeKey

          return (
            <div key={p.id} style={{
              background: 'white',
              border: `2px solid ${isCurrent ? p.color : 'var(--gray-200)'}`,
              borderRadius: 20, overflow: 'hidden',
              boxShadow: isCurrent ? `0 4px 20px ${p.color}22` : 'var(--shadow-xs)',
              position: 'relative',
            }}>
              {p.popular && (
                <div style={{ background: p.color, color: 'white', textAlign: 'center', fontSize: 12, fontWeight: 700, padding: '5px 0', letterSpacing: 0.5 }}>
                  ⭐ MOST POPULAR
                </div>
              )}
              <div style={{ padding: '20px 20px 16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 28 }}>{p.emoji}</span>
                    <div>
                      <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)' }}>{p.name}</div>
                      {isCurrent && (
                        <div style={{ fontSize: 11, fontWeight: 700, color: p.color, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                          Current Plan
                        </div>
                      )}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: 26, fontWeight: 800, color: p.color }}>{p.price}</span>
                    <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{p.period}</span>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 18 }}>
                  {p.features.map((f) => (
                    <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: 'var(--text-secondary)' }}>
                      <span style={{ color: p.color, fontWeight: 700, fontSize: 16, flexShrink: 0 }}>✓</span>
                      {f}
                    </div>
                  ))}
                </div>

                {p.stripeKey ? (
                  <button
                    className="btn btn-primary"
                    style={{ background: isCurrent ? 'var(--gray-200)' : p.color, boxShadow: 'none' }}
                    onClick={() => !isCurrent && handleSubscribe(p.stripeKey)}
                    disabled={isCurrent || isLoading}
                  >
                    {isLoading ? <><div className="spinner" /> Redirecting to Stripe…</> : isCurrent ? '✓ Active' : `Start ${p.name} →`}
                  </button>
                ) : (
                  <div style={{ textAlign: 'center', fontSize: 14, color: isCurrent ? p.color : 'var(--text-muted)', fontWeight: isCurrent ? 700 : 400, padding: '10px 0' }}>
                    {isCurrent ? '✓ Your current plan' : 'No credit card required'}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-muted)', padding: '8px 16px 4px' }}>
        Cancel anytime · No hidden fees · Billed monthly via Stripe
      </p>

      {/* FAQ */}
      <div style={{ padding: '32px 16px 16px' }}>
        <h3 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: -0.4, marginBottom: 4 }}>
          Frequently Asked Questions
        </h3>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>
          Everything you need to know about Old2New pricing.
        </p>
        <div>
          {FAQ.map((item) => <FaqItem key={item.q} q={item.q} a={item.a} />)}
        </div>

        <div style={{
          marginTop: 28, padding: '20px', background: 'var(--green-pale)',
          borderRadius: 16, border: '1px solid var(--green-light)', textAlign: 'center',
        }}>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 8 }}>
            Still have questions?
          </p>
          <a
            href="mailto:admin@old2new.app"
            onClick={(e) => { e.preventDefault(); window.open('mailto:admin@old2new.app'); }}
            style={{ fontSize: 14, fontWeight: 700, color: 'var(--green-dark)', textDecoration: 'none', cursor: 'pointer' }}
          >
            ✉️ admin@old2new.app
          </a>
        </div>
      </div>

      <div className="footer-disclaimer" style={{ marginTop: 8 }}>
        <p>Old2New is for informational purposes only. Not medical advice. Consult your physician before changing your diet.</p>
      </div>
    </div>
  )
}
