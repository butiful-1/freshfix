import { useEffect, useState } from 'react'
import { apiUrl } from '../apiBase'
import { IAP_PRODUCTS, PLAN_DISPLAY_NAMES } from '../iap/products.js'
import { openExternal } from './shared/SourcesLink.jsx'
import { SHORT_DISCLAIMER } from '../healthDisclaimer.js'

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
      'PDF cookbook download',
      'Priority Transformations',
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
      'PDF cookbook download',
      'Priority Transformations',
      'Priority support',
    ],
    stripeKey: 'family',
  },
]

const FAQ_WEB = [
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

const FAQ_IOS = [
  {
    q: 'How does billing work?',
    a: 'Plus and Premium are monthly auto-renewing subscriptions purchased through Apple In-App Purchase and billed to your Apple Account. The price shown is charged each month until you cancel.',
  },
  {
    q: 'Can I cancel anytime?',
    a: 'Yes. Cancel in Settings → Apple Account → Subscriptions (or tap Manage Subscription here). Your plan stays active until the end of the current billing period, then reverts to Free. Cancellation must happen at least 24 hours before the period ends to avoid the next charge.',
  },
  {
    q: 'Is there a free trial?',
    a: `The Free plan includes ${FREE_LIMIT} Recipe Upgrades every month — forever — so you can try Old2New before subscribing.`,
  },
  {
    q: "What's the difference between Plus and Premium?",
    a: 'Plus gives you 50 Recipe Upgrades per month. Premium gives you 150 Recipe Upgrades per month plus priority support.',
  },
  {
    q: 'Can I switch between plans?',
    a: 'Yes. Both plans are in the same subscription group, so you can move between Plus and Premium at any time without holding two subscriptions. Apple applies upgrades immediately (prorated) and downgrades at your next renewal.',
  },
  {
    q: 'I already subscribed on old2new.app. Do I need to buy again?',
    a: 'No. Sign in with the same account and your existing plan works here. If your plan does not appear, tap Restore Purchases or sign out and back in.',
  },
  {
    q: 'Is my recipe data private?',
    a: 'Your saved recipes are stored securely in your account. Recipe text is sent to the Claude AI API for transformation only — it is not retained or used for training. We do not sell your data.',
  },
]

const FAQ_GOOGLE = [
  {
    q: 'How does billing work?',
    a: 'Plus and Premium are monthly auto-renewing subscriptions purchased through Google Play and billed to the Google account on this device. The price shown is charged when you confirm the purchase and again each month until you cancel.',
  },
  {
    q: 'Can I cancel anytime?',
    a: 'Yes. Open the Google Play app → tap your profile → Payments & subscriptions → Subscriptions → Old2New (or tap Manage Subscription here). Cancelling stops future charges; your plan stays active until the end of the current billing period, then reverts to Free.',
  },
  {
    q: 'Is there a free trial?',
    a: `The Free plan includes ${FREE_LIMIT} Recipe Upgrades every month — forever — so you can try Old2New before subscribing.`,
  },
  {
    q: "What's the difference between Plus and Premium?",
    a: 'Plus gives you 50 Recipe Upgrades per month. Premium gives you 150 Recipe Upgrades per month plus priority support.',
  },
  {
    q: 'Can I switch between plans?',
    a: 'Yes. You never hold two subscriptions at once: switching to Premium takes effect immediately and Google Play charges the prorated difference; switching to Plus takes effect at your next renewal.',
  },
  {
    q: 'I already subscribed on old2new.app. Do I need to buy again?',
    a: 'No. Sign in with the same account and your existing plan works here. If your plan does not appear, tap Restore Purchases or sign out and back in.',
  },
  {
    q: 'Is my recipe data private?',
    a: 'Your saved recipes are stored securely in your account. Recipe text is sent to the Claude AI API for transformation only — it is not retained or used for training. We do not sell your data.',
  },
]

// Wording that differs between the two in-app stores.
const STORE_COPY = {
  apple: {
    name: 'App Store',
    account: 'Apple Account',
    opening: 'Opening App Store…',
    noneFound: 'No Apple subscription was found for this Apple Account.',
    manageHint: 'Manage or cancel anytime in Settings → Apple Account → Subscriptions.',
    disclosure: 'Plus and Premium are monthly auto-renewing subscriptions billed to your Apple Account at the price shown. Payment is charged at confirmation of purchase and the subscription renews automatically each month unless cancelled at least 24 hours before the end of the current period.',
    elsewhere: 'Your current plan is billed through Apple. Change plans in the Old2New iPhone app or in Settings → Apple Account → Subscriptions.',
    faq: FAQ_IOS,
  },
  google: {
    name: 'Google Play',
    account: 'Google account',
    opening: 'Opening Google Play…',
    noneFound: 'No Google Play subscription was found for the Google account on this device.',
    manageHint: 'Manage or cancel anytime in the Google Play app under Payments & subscriptions → Subscriptions.',
    disclosure: 'Plus and Premium are monthly auto-renewing subscriptions billed through Google Play at the price shown. Payment is charged to your Google Play account when you confirm the purchase, and the subscription renews automatically every month at the same price until you cancel. Cancelling stops future charges; your plan stays active until the end of the current billing period.',
    elsewhere: 'Your current plan is billed through Google Play. Change plans in the Old2New Android app or in Google Play → Subscriptions.',
    faq: FAQ_GOOGLE,
  },
}

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

// Props for the in-app stores (Apple In-App Purchase on iOS, App Store 3.1.1;
// Google Play Billing in the Android app):
//   appleIAP          — true on the native iOS app (kept for compatibility)
//   storeIAP          — 'apple' | 'google' | null: which store sells plans here
//   appleProducts     — [{ plan, priceString, ... }] from the store (localized prices)
//   appleProductsError— message if the store could not load products
//   onApplePurchase(plan) → Promise<{ pending?, deferred?, message?, plan? }>
//   onRestorePurchases()  → Promise<{ plan, restored }>
//   onManageSubscription()
//   planSource        — 'apple' | 'google' | 'stripe' | 'manual' | null (who granted the current plan)
export default function PricingScreen({ plan, swapUsage, onBack, user, appleIAP = false, storeIAP = null, appleProducts, appleProductsError, onApplePurchase, onRestorePurchases, onManageSubscription, planSource }) {
  const [loading, setLoading] = useState(null)
  const [error, setError]     = useState('')
  const [notice, setNotice]   = useState('')

  const store = storeIAP || (appleIAP ? 'apple' : null)
  const inApp = !!store
  const copy = inApp ? STORE_COPY[store] : null

  const swapsLeft = Math.max(0, FREE_LIMIT - (swapUsage?.count || 0))

  useEffect(() => { setError(''); setNotice('') }, [plan])

  const storePriceFor = (planKey) => appleProducts?.find(p => p.plan === planKey)?.priceString || null

  async function handleSubscribe(planKey) {
    setLoading(planKey)
    setError('')
    setNotice('')
    if (inApp) {
      try {
        const outcome = await onApplePurchase(planKey)
        if (outcome?.pending || outcome?.deferred) setNotice(outcome.message)
        else setNotice(`You're now on ${PLAN_DISPLAY_NAMES[outcome?.plan] || IAP_PRODUCTS[planKey].name}. Thank you!`)
      } catch (e) {
        if (e?.name !== 'PurchaseCancelled') setError(e?.message || 'Purchase could not be completed. You have not been charged.')
      } finally {
        setLoading(null)
      }
      return
    }
    try {
      const res = await fetch(apiUrl('/api/create-checkout'), {
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

  async function handleRestore() {
    setLoading('restore')
    setError('')
    setNotice('')
    try {
      const result = await onRestorePurchases()
      if (result?.restored && result.plan !== 'free') {
        setNotice(`Restored: your ${PLAN_DISPLAY_NAMES[result.plan]} plan is active.`)
      } else if (result?.plan && result.plan !== 'free') {
        const via = planSource === 'stripe' ? ' (purchased on old2new.app)'
          : planSource === 'manual' ? ' (complimentary)'
          : planSource === 'apple' ? ' (purchased through Apple)'
          : planSource === 'google' ? ' (purchased through Google Play)'
          : ''
        setNotice(`${copy.noneFound} Your ${PLAN_DISPLAY_NAMES[result.plan]} plan is active${via}.`)
      } else {
        setNotice(`${copy.noneFound} If you subscribed on old2new.app, make sure you are signed in with the same Old2New account.`)
      }
    } catch (e) {
      setError(e?.message || 'Could not restore purchases. Please try again.')
    } finally {
      setLoading(null)
    }
  }

  const FAQ = inApp ? copy.faq : FAQ_WEB
  // A paid plan granted elsewhere (Stripe on old2new.app, a complimentary
  // membership, or the other store) must not be sold again on top: the customer
  // would pay twice for the same thing (App Store 3.1.2(b); same principle on
  // Google Play). The cards become informational; Restore stays.
  const managedElsewhere = inApp && plan !== 'free' && !!planSource && planSource !== store
  const elsewhereMessage = planSource === 'manual' ? 'Your current plan is complimentary and already includes this.'
    : planSource === 'stripe' ? 'Your current plan is billed on old2new.app. Change plans there to switch.'
    : STORE_COPY[planSource]?.elsewhere || ''
  const currentPlanNote = planSource === 'manual' ? 'Complimentary plan'
    : planSource === 'stripe' ? 'Purchased on old2new.app'
    : planSource === 'apple' ? 'Purchased through Apple'
    : planSource === 'google' ? 'Purchased through Google Play'
    : ''

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
          More Monthly Recipe Transformations
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
      {notice && (
        <div role="status" style={{ margin: '0 16px 8px', fontSize: 13, color: 'var(--green-dark)', background: 'var(--green-pale)', border: '1px solid var(--green-light)', borderRadius: 10, padding: '10px 12px', lineHeight: 1.5 }}>
          {notice}
        </div>
      )}
      {inApp && appleProductsError && (
        <div className="error-msg" style={{ margin: '0 16px 8px' }}>
          <span className="error-icon">⚠️</span>
          <span>{appleProductsError}</span>
        </div>
      )}

      {/* Plan cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: '16px 16px 8px' }}>
        {PLANS.map((p) => {
          const isCurrent = plan === p.id
          const isLoading = loading === p.stripeKey
          const price = inApp && p.stripeKey ? (storePriceFor(p.stripeKey) || p.price) : p.price
          const isPaidCurrentElsewhere = isCurrent && !!planSource && planSource !== store && inApp
          const productsReady = !inApp || !!storePriceFor(p.stripeKey)

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
                    <span style={{ fontSize: 26, fontWeight: 800, color: p.color }}>{price}</span>
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

                {p.stripeKey && managedElsewhere && !isCurrent ? (
                  <p style={{ fontSize: 12.5, color: 'var(--text-muted)', textAlign: 'center', padding: '10px 0', lineHeight: 1.5 }}>
                    {elsewhereMessage}
                  </p>
                ) : p.stripeKey ? (
                  <>
                    <button
                      className="btn btn-primary"
                      style={{ background: isCurrent ? 'var(--gray-200)' : p.color, boxShadow: 'none' }}
                      onClick={() => !isCurrent && handleSubscribe(p.stripeKey)}
                      disabled={isCurrent || !!loading || !productsReady}
                    >
                      {isLoading
                        ? <><div className="spinner" /> {inApp ? copy.opening : 'Redirecting to Stripe…'}</>
                        : isCurrent
                          ? '✓ Active'
                          : inApp
                            ? (plan !== 'free' ? `Switch to ${p.name} →` : `Subscribe to ${p.name} →`)
                            : `Start ${p.name} →`}
                    </button>
                    {inApp && !isCurrent && (
                      <p style={{ fontSize: 11.5, color: 'var(--text-muted)', textAlign: 'center', marginTop: 8, lineHeight: 1.5 }}>
                        Old2New {p.name} · 1 month · {price}/month, billed monthly through {copy.name}, auto-renews until cancelled
                      </p>
                    )}
                    {isPaidCurrentElsewhere && (
                      <p style={{ fontSize: 11.5, color: 'var(--text-muted)', textAlign: 'center', marginTop: 8, lineHeight: 1.5 }}>
                        {currentPlanNote}
                      </p>
                    )}
                  </>
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

      {inApp ? (
        <div style={{ padding: '8px 16px 4px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <button className="btn btn-outline" style={{ width: '100%' }} onClick={handleRestore} disabled={!!loading}>
              {loading === 'restore' ? <><div className="spinner spinner-green" style={{ borderTopColor: 'var(--green)' }} /> Restoring…</> : 'Restore Purchases'}
            </button>
            {planSource === store && plan !== 'free' && onManageSubscription && (
              <button className="btn btn-ghost" style={{ width: '100%' }} onClick={onManageSubscription} disabled={!!loading}>
                Manage Subscription
              </button>
            )}
          </div>
          <p style={{ textAlign: 'center', fontSize: 11.5, color: 'var(--text-muted)', lineHeight: 1.55, marginTop: 12 }}>
            {copy.disclosure} {copy.manageHint}
            {' '}
            <a href="https://old2new.app/terms.html" onClick={(e) => { e.preventDefault(); openExternal('https://old2new.app/terms.html') }} style={{ color: 'var(--green-dark)', fontWeight: 700 }}>Terms of Use</a>
            {' · '}
            <a href="https://old2new.app/privacy.html" onClick={(e) => { e.preventDefault(); openExternal('https://old2new.app/privacy.html') }} style={{ color: 'var(--green-dark)', fontWeight: 700 }}>Privacy Policy</a>
          </p>
        </div>
      ) : (
        <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-muted)', padding: '8px 16px 4px' }}>
          Cancel anytime · No hidden fees · Billed monthly via Stripe
        </p>
      )}

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
        <p>{SHORT_DISCLAIMER}</p>
      </div>
    </div>
  )
}
