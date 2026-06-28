import { useEffect, useRef, useState } from 'react'
import { supabase } from '../supabase'

const G  = '#22C55E'
const GD = '#16A34A'
const GP = '#DCFCE7'
const GB = '#F0FDF4'
const T  = '#1A2E1B'
const TM = '#7A9A7C'

const FEATURES = [
  {
    icon: '🤖',
    title: 'AI-Powered Swaps',
    desc: 'Claude AI analyzes your recipe and makes smart, personalized ingredient substitutions tailored to your exact diet.',
  },
  {
    icon: '🎯',
    title: '7 Diet Types Supported',
    desc: 'GLP-1, Keto, Mediterranean, High Protein, Low Sugar, Low Calorie, and Diabetic Friendly — all in one app.',
  },
  {
    icon: '⚡',
    title: 'Instant Results',
    desc: 'Full transformed recipe + calorie comparison + shopping list in seconds. Save, share, and cook immediately.',
  },
]

const TESTIMONIALS = [
  {
    name: 'Sarah M.',
    badge: '💊 GLP-1 Friendly',
    quote: 'Old2New keeps me on track with my Ozempic journey. The pasta alternatives are incredible and actually taste amazing!',
    stars: 5,
  },
  {
    name: 'Mike T.',
    badge: '🥑 Keto',
    quote: 'Finally keto recipes my whole family loves. The pizza fix alone made upgrading worth every penny.',
    stars: 5,
  },
  {
    name: 'Jennifer K.',
    badge: '🫒 Mediterranean',
    quote: 'Saving 200+ calories per meal without losing any flavor. This app completely changed how I cook.',
    stars: 5,
  },
]

const PLANS = [
  {
    name: 'Free',
    price: '$0',
    period: 'forever',
    perks: '5 Recipe Upgrades/month · All diet types',
    color: '#6B9E6D',
    planKey: null,
  },
  {
    name: 'Plus',
    price: '$14.99',
    period: '/mo',
    perks: '50 Recipe Upgrades/month · Save up to 50 recipes',
    color: G,
    popular: true,
    planKey: 'wellness',
  },
  {
    name: 'Premium',
    price: '$24.99',
    period: '/mo',
    perks: '150 Recipe Upgrades/month · Priority AI',
    color: GD,
    planKey: 'family',
  },
]

function StarRow({ count }) {
  return (
    <div style={{ fontSize: 15, marginBottom: 10, color: '#F59E0B', letterSpacing: 1 }}>
      {'★'.repeat(count)}
    </div>
  )
}

export default function SplashScreen({ onSignUp, onLogin }) {
  const [visible, setVisible]   = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const pricingRef = useRef(null)

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 80)
    return () => clearTimeout(t)
  }, [])

  const scrollToPricing = () =>
    pricingRef.current?.scrollIntoView({ behavior: 'smooth' })

  function handleGoogleSignIn() {
    setGoogleLoading(true)
    supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.hostname === 'localhost'
          ? `${window.location.origin}/auth/callback`
          : 'https://old2new.app/auth/callback'
      }
    }).catch(err => {
      console.error('[Old2New] Google OAuth error:', err)
      setGoogleLoading(false)
    })
  }

  return (
    <div style={{ background: 'white', minHeight: '100vh', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>

      {/* ── HERO ───────────────────────────────────── */}
      <section style={{
        background: `linear-gradient(160deg, ${GP} 0%, ${GB} 40%, white 100%)`,
        padding: '60px 24px 52px',
        textAlign: 'center',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', top: -80, right: -80, width: 240, height: 240, borderRadius: '50%', background: `radial-gradient(circle, ${GP}AA, transparent 70%)`, pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: -40, left: -60, width: 180, height: 180, borderRadius: '50%', background: `radial-gradient(circle, ${GB}EE, transparent 70%)`, pointerEvents: 'none' }} />

        <div style={{
          opacity: visible ? 1 : 0,
          transform: visible ? 'translateY(0)' : 'translateY(24px)',
          transition: 'opacity 0.5s ease, transform 0.5s ease',
          position: 'relative',
        }}>
          {/* Logo */}
          <div style={{
            width: 92, height: 92, borderRadius: 26, background: G,
            margin: '0 auto 22px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 48, boxShadow: `0 16px 48px ${G}44`,
          }}>
            🌿
          </div>

          {/* App name */}
          <h1 style={{ fontSize: 48, fontWeight: 800, color: T, letterSpacing: -2, marginBottom: 16, lineHeight: 1 }}>
            Old<span style={{ color: '#F59E0B' }}>2</span><span style={{ color: G }}>New</span>
          </h1>

          {/* Headline */}
          <p style={{ fontSize: 22, fontWeight: 700, color: T, lineHeight: 1.35, marginBottom: 12, letterSpacing: -0.5 }}>
            Transform your old comfort recipes<br />into healthy new favorites
          </p>

          {/* CTAs */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 320, margin: '0 auto 24px' }}>
            <button className="btn btn-primary" onClick={onSignUp} style={{ fontSize: 17, minHeight: 54 }}>
              🌿 Sign Up Free
            </button>
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={googleLoading}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, width: '100%', minHeight: 52, background: 'white', border: '1.5px solid #DADCE0', borderRadius: 28, fontSize: 15, fontWeight: 600, color: '#3C4043', cursor: googleLoading ? 'not-allowed' : 'pointer', opacity: googleLoading ? 0.5 : 1 }}
            >
              <svg width="18" height="18" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" style={{ flexShrink: 0 }}><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>
              {googleLoading ? 'Connecting to Google…' : 'Continue with Google'}
            </button>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn btn-secondary" onClick={onLogin} style={{ fontSize: 15, flex: 1 }}>
                Sign In
              </button>
              <button className="btn btn-secondary" onClick={scrollToPricing} style={{ fontSize: 15, flex: 1 }}>
                Pricing →
              </button>
            </div>
          </div>

          {/* Diet badges */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, justifyContent: 'center' }}>
            {['💊 GLP-1', '🥑 Keto', '🫒 Mediterranean', '💪 High Protein', '❤️ Diabetic Friendly', '🔥 Low Calorie'].map(d => (
              <span key={d} className="badge badge-green" style={{ fontSize: 12 }}>{d}</span>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES ───────────────────────────────── */}
      <section style={{ padding: '48px 20px', background: 'white' }}>
        <h2 style={{ fontSize: 24, fontWeight: 800, color: T, textAlign: 'center', letterSpacing: -0.5, marginBottom: 6 }}>
          Why Old2New?
        </h2>
        <p style={{ fontSize: 14, color: TM, textAlign: 'center', marginBottom: 28 }}>
          Smart recipe transformation in seconds
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {FEATURES.map((f, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'flex-start', gap: 16,
              padding: '18px 20px',
              background: i === 1 ? GP : '#FAFAFA',
              borderRadius: 20,
              border: `1px solid ${i === 1 ? '#BBF7D0' : '#E8E8E8'}`,
              boxShadow: i === 1 ? `0 4px 16px ${G}1A` : 'none',
            }}>
              <div style={{
                width: 52, height: 52, borderRadius: 16,
                background: i === 1 ? G : 'white',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 26, flexShrink: 0,
                boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
              }}>
                {f.icon}
              </div>
              <div>
                <div style={{ fontSize: 16, fontWeight: 700, color: T, marginBottom: 5 }}>{f.title}</div>
                <div style={{ fontSize: 13, color: '#4B7A4D', lineHeight: 1.55 }}>{f.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── TESTIMONIALS ───────────────────────────── */}
      <section style={{ padding: '44px 0 52px', background: '#FAFAFA', borderTop: '1px solid #E8E8E8', borderBottom: '1px solid #E8E8E8' }}>
        <h2 style={{ fontSize: 24, fontWeight: 800, color: T, textAlign: 'center', letterSpacing: -0.5, marginBottom: 4, padding: '0 20px' }}>
          What People Are Saying
        </h2>
        <p style={{ fontSize: 14, color: TM, textAlign: 'center', marginBottom: 26, padding: '0 20px' }}>
          Join thousands fixing their favorite recipes
        </p>

        {/* Horizontal scroll row */}
        <div style={{ display: 'flex', gap: 14, overflowX: 'auto', padding: '4px 20px 8px', scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}>
          {TESTIMONIALS.map((t, i) => (
            <div key={i} style={{
              flexShrink: 0, width: 268,
              background: 'white', borderRadius: 20,
              padding: '22px 20px',
              border: '1px solid #E8E8E8',
              boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
            }}>
              <StarRow count={t.stars} />
              <p style={{ fontSize: 14, color: '#3D5C3E', lineHeight: 1.65, marginBottom: 16, fontStyle: 'italic' }}>
                "{t.quote}"
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: GP, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>
                  {t.badge.slice(0, 2)}
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: T }}>{t.name}</div>
                  <div style={{ fontSize: 11, color: TM }}>{t.badge}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── PRICING PREVIEW ────────────────────────── */}
      <section ref={pricingRef} style={{ padding: '52px 20px 44px', background: 'white' }}>
        <h2 style={{ fontSize: 24, fontWeight: 800, color: T, textAlign: 'center', letterSpacing: -0.5, marginBottom: 6 }}>
          Simple Pricing
        </h2>
        <p style={{ fontSize: 14, color: TM, textAlign: 'center', marginBottom: 28 }}>
          Start free. Upgrade when you're ready.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {PLANS.map((p) => (
            <div key={p.name} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '16px 18px',
              background: p.popular ? GP : '#FAFAFA',
              borderRadius: 18,
              border: `2px solid ${p.popular ? G : '#E0E0E0'}`,
              boxShadow: p.popular ? `0 4px 20px ${G}22` : 'none',
              position: 'relative',
            }}>
              {p.popular && (
                <div style={{
                  position: 'absolute', top: -11, left: 14,
                  background: G, color: 'white',
                  fontSize: 10, fontWeight: 700,
                  padding: '3px 10px', borderRadius: 10, letterSpacing: 0.5,
                }}>
                  MOST POPULAR
                </div>
              )}
              <div>
                <div style={{ fontSize: 16, fontWeight: 700, color: T }}>{p.name}</div>
                <div style={{ fontSize: 12, color: TM, marginTop: 3 }}>{p.perks}</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: 20, fontWeight: 800, color: p.color }}>{p.price}</span>
                  <span style={{ fontSize: 11, color: TM }}>{p.period}</span>
                </div>
                <button
                  onClick={onSignUp}
                  style={{
                    background: p.color, color: 'white',
                    border: 'none', borderRadius: 12, padding: '8px 14px',
                    fontSize: 13, fontWeight: 700, cursor: 'pointer',
                    whiteSpace: 'nowrap', minWidth: 68,
                  }}
                >
                  {p.planKey ? 'Start →' : 'Free →'}
                </button>
              </div>
            </div>
          ))}
        </div>

        <p style={{ textAlign: 'center', fontSize: 12, color: TM, marginTop: 16 }}>
          Cancel anytime · No hidden fees · Powered by Stripe
        </p>
      </section>

      {/* ── FINAL CTA ──────────────────────────────── */}
      <section style={{
        padding: '44px 24px 36px',
        background: `linear-gradient(160deg, ${GP}, white)`,
        textAlign: 'center',
        borderTop: '1px solid #BBF7D0',
      }}>
        <div style={{ fontSize: 44, marginBottom: 18 }}>🌿</div>
        <h2 style={{ fontSize: 24, fontWeight: 800, color: T, letterSpacing: -0.5, marginBottom: 10 }}>
          Ready to fix your recipes?
        </h2>
        <p style={{ fontSize: 15, color: TM, lineHeight: 1.65, marginBottom: 28, maxWidth: 280, margin: '0 auto 28px' }}>
          Join thousands eating healthier without giving up their favorite foods.
        </p>
        <button
          className="btn btn-primary"
          onClick={onSignUp}
          style={{ maxWidth: 320, width: '100%', fontSize: 17, minHeight: 54 }}
        >
          🌿 Sign Up Free →
        </button>
        <button
          onClick={onLogin}
          style={{ background: 'none', border: 'none', color: 'var(--green-dark)', fontWeight: 600, fontSize: 14, cursor: 'pointer', marginTop: 10 }}
        >
          Already have an account? Sign In →
        </button>
      </section>

      {/* ── FOOTER ─────────────────────────────────── */}
      <footer style={{ padding: '24px 24px 36px', background: T, textAlign: 'center' }}>
        <div style={{ fontSize: 22, fontWeight: 800, color: 'white', marginBottom: 6, letterSpacing: -0.5 }}>
          Old<span style={{ color: '#F59E0B' }}>2</span><span style={{ color: G }}>New</span>
        </div>
        <p style={{ fontSize: 11, color: '#4B7A4D', lineHeight: 1.6, marginBottom: 14 }}>
          Old2New is for informational purposes only. Not medical advice.<br />
          Always consult your physician before changing your diet.
        </p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 16, flexWrap: 'wrap' }}>
          <a href="mailto:admin@old2new.app" onClick={(e) => { e.preventDefault(); window.open('mailto:admin@old2new.app'); }} style={{ fontSize: 12, color: G, textDecoration: 'none', cursor: 'pointer' }}>Contact</a>
          <span style={{ color: '#2D4D2E', fontSize: 12 }}>·</span>
          <span style={{ fontSize: 12, color: '#4B7A4D' }}>old2new.app</span>
        </div>
      </footer>
    </div>
  )
}
