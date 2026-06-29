import { useEffect, useRef, useState } from 'react'
import { supabase } from '../supabase'

// ── Brand tokens ──────────────────────────────────────────────────────────────
const G   = '#22C55E'
const GD  = '#16A34A'
const T   = '#111827'
const TM  = '#6B7280'
const CRM = '#F8F3EB'   // warm linen
const IPH = '#E8E3DA'   // image placeholder neutral
const SF  = '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
const SRF = 'Georgia, "Times New Roman", serif'

// ── Data ──────────────────────────────────────────────────────────────────────
const RECIPES = [
  { title: 'Lighter Protein Pizza',     file: 'recipe-pizza.jpg'    },
  { title: 'Creamy Lighter Alfredo',    file: 'recipe-alfredo.jpg'  },
  { title: 'Protein Cookie Bites',      file: 'recipe-cookies.jpg'  },
  { title: 'Better Burger Bowl',        file: 'recipe-burger.jpg'   },
]

const STEPS = [
  { num: '01', title: 'Choose a recipe you love'  },
  { num: '02', title: 'Pick your cooking goal'    },
  { num: '03', title: 'Get a fresh new version'   },
  { num: '04', title: 'Save and cook'             },
]

const FAQ = [
  {
    q: 'What is Old2New?',
    a: 'A recipe companion that turns your favorite dishes into healthier versions — complete with ingredient swaps and a shopping list.',
  },
  {
    q: 'Is this a diet app?',
    a: 'Not at all. No calorie counting, no meal plans. Just better versions of the meals you already cook.',
  },
  {
    q: 'Can I use family recipes?',
    a: 'Yes. Paste in any recipe — a handwritten card, a dish name, or something from memory — and get a fresh new version.',
  },
  {
    q: 'Will it work with comfort food?',
    a: 'Comfort food is our specialty. Mac & cheese, lasagna, fried chicken — if you love it, we can help you feel good about eating it.',
  },
  {
    q: 'How many recipes can I save for free?',
    a: 'Free accounts include 5 Recipe Upgrades and 5 saved recipes per month. Upgrade to Plus or Premium for more.',
  },
]

// ── Neutral image placeholder ─────────────────────────────────────────────────
// Replace <ImgPh> with <img src={`/images/${file}`} ... /> when photos are ready
function ImgPh({ file, className, style }) {
  return (
    <div
      className={className}
      aria-hidden="true"
      style={{
        background: IPH,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        ...style,
      }}
    >
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" style={{ opacity: 0.22 }}>
        <rect x="3" y="3" width="18" height="18" rx="2" stroke="#5C4D3A" strokeWidth="1.4" />
        <circle cx="8.5" cy="8.5" r="1.5" fill="#5C4D3A" />
        <path d="M3 16l5-5 4 4 3-3 6 6" stroke="#5C4D3A" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span style={{ fontSize: 10, color: '#B8AFA3', letterSpacing: 1.8, textTransform: 'uppercase', fontFamily: SF }}>
        {file}
      </span>
    </div>
  )
}

// ── FAQ accordion ─────────────────────────────────────────────────────────────
function FaqItem({ q, a }) {
  const [open, setOpen] = useState(false)
  return (
    <div style={{ borderBottom: '1px solid #E8E4DE' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', background: 'none', border: 'none',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '22px 0', cursor: 'pointer', textAlign: 'left', gap: 16,
          fontFamily: SF,
        }}
      >
        <span style={{ fontSize: 16, fontWeight: 600, color: T, lineHeight: 1.4, fontFamily: SF }}>{q}</span>
        <span style={{
          fontSize: 20, color: GD, flexShrink: 0, display: 'inline-block',
          transform: open ? 'rotate(45deg)' : 'none',
          transition: 'transform 0.2s ease',
          fontFamily: SF,
        }}>+</span>
      </button>
      {open && (
        <p style={{ fontSize: 15, color: TM, lineHeight: 1.8, paddingBottom: 22, marginTop: -4, fontFamily: SF }}>
          {a}
        </p>
      )}
    </div>
  )
}

// ── Fade-in on scroll ─────────────────────────────────────────────────────────
function FadeIn({ children, style, className, delay = 0 }) {
  const ref = useRef(null)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { setVisible(true); obs.disconnect() }
    }, { threshold: 0.08 })
    obs.observe(el)
    return () => obs.disconnect()
  }, [])
  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'none' : 'translateY(22px)',
        transition: `opacity 0.6s ease ${delay}s, transform 0.6s ease ${delay}s`,
        ...style,
      }}
    >
      {children}
    </div>
  )
}

// ── Google SVG ────────────────────────────────────────────────────────────────
function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true" style={{ flexShrink: 0 }}>
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export default function SplashScreen({ onSignUp, onLogin }) {
  const [navScrolled, setNavScrolled] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)

  const recipesRef = useRef(null)
  const howRef     = useRef(null)
  const faqRef     = useRef(null)

  useEffect(() => {
    const fn = () => setNavScrolled(window.scrollY > 24)
    window.addEventListener('scroll', fn, { passive: true })
    return () => window.removeEventListener('scroll', fn)
  }, [])

  const scrollTo = (ref) => ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })

  function handleGoogleSignIn() {
    setGoogleLoading(true)
    supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.hostname === 'localhost'
          ? `${window.location.origin}/auth/callback`
          : 'https://old2new.app/auth/callback',
      },
    }).catch(err => {
      console.error('[Old2New] Google OAuth error:', err)
      setGoogleLoading(false)
    })
  }

  return (
    <div style={{ background: 'white', minHeight: '100vh', fontFamily: SF, overflowX: 'hidden' }}>

      {/* ── NAVIGATION ──────────────────────────────────────────────────── */}
      <nav style={{
        position: 'sticky', top: 0, zIndex: 100,
        background: navScrolled ? 'rgba(255,255,255,0.96)' : 'white',
        backdropFilter: navScrolled ? 'blur(12px)' : 'none',
        WebkitBackdropFilter: navScrolled ? 'blur(12px)' : 'none',
        borderBottom: '1px solid #EDE8E1',
        boxShadow: navScrolled ? '0 1px 16px rgba(0,0,0,0.05)' : 'none',
        transition: 'box-shadow 0.3s, background 0.3s',
      }}>
        <div style={{
          maxWidth: 1320, margin: '0 auto', padding: '0 40px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 68,
        }}>

          {/* Logo */}
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            aria-label="Old2New — back to top"
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', gap: 9 }}
          >
            <div style={{ width: 34, height: 34, borderRadius: 8, background: G, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>🌿</div>
            <span style={{ fontSize: 19, fontWeight: 700, color: T, letterSpacing: -0.5, fontFamily: SF }}>
              Old<span style={{ color: '#F59E0B' }}>2</span><span style={{ color: G }}>New</span>
            </span>
          </button>

          {/* Desktop nav */}
          <div className="hp-desktop-nav" style={{ alignItems: 'center', gap: 4 }}>
            {[
              { label: 'Recipes',      action: () => scrollTo(recipesRef) },
              { label: 'How It Works', action: () => scrollTo(howRef) },
              { label: 'FAQ',          action: () => scrollTo(faqRef) },
            ].map(({ label, action }) => (
              <button key={label} onClick={action}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 500, color: TM, padding: '8px 16px', borderRadius: 5, fontFamily: SF, transition: 'color 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.color = T}
                onMouseLeave={e => e.currentTarget.style.color = TM}
              >{label}</button>
            ))}
            <button onClick={onLogin}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 500, color: TM, padding: '8px 16px', borderRadius: 5, fontFamily: SF, marginLeft: 4, transition: 'color 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.color = T}
              onMouseLeave={e => e.currentTarget.style.color = TM}
            >Sign In</button>
            <button onClick={onSignUp}
              style={{ background: G, color: 'white', border: 'none', borderRadius: 4, padding: '10px 24px', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: SF, marginLeft: 8, transition: 'background 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.background = GD}
              onMouseLeave={e => e.currentTarget.style.background = G}
            >Get Started</button>
          </div>

          {/* Mobile CTA */}
          <button className="hp-mobile-cta" onClick={onSignUp}
            style={{ background: G, color: 'white', border: 'none', borderRadius: 4, padding: '9px 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: SF }}
          >Get Started</button>
        </div>
      </nav>

      {/* ── HERO ────────────────────────────────────────────────────────── */}
      {/*
        hp-hero: 2-column on desktop (image left 58%, text right 42%)
                 stacked on mobile (image top, text below)
      */}
      <section className="hp-hero" style={{ background: CRM }}>

        {/*
          Replace <ImgPh> with:
          <img
            src="/images/hero-food.jpg"
            alt="Beautiful fresh healthy meal on a bright kitchen counter"
            className="hp-hero-img"
            style={{ objectFit: 'cover', width: '100%', height: '100%', display: 'block' }}
          />
          Recommended: 1400×900px · warm natural light · wide-angle food photography
        */}
        <ImgPh file="hero-food.jpg" className="hp-hero-img" />

        <div className="hp-hero-text">
          <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: 2.5, color: '#7D8E7F', textTransform: 'uppercase', marginBottom: 28, fontFamily: SF }}>
            Recipe Transformation
          </p>
          <h1 style={{ fontFamily: SRF, fontSize: 'clamp(40px, 5vw, 68px)', fontWeight: 700, color: T, letterSpacing: -2, lineHeight: 1.02, marginBottom: 18 }}>
            Eat What You Love.
          </h1>
          <h2 style={{ fontFamily: SRF, fontSize: 'clamp(24px, 3vw, 42px)', fontWeight: 400, color: '#3D6B3F', letterSpacing: -0.5, lineHeight: 1.2, marginBottom: 48, fontStyle: 'italic' }}>
            Just a Little Healthier.
          </h2>
          <div className="hp-hero-btns">
            <button onClick={onSignUp}
              style={{ background: G, color: 'white', border: 'none', borderRadius: 4, padding: '15px 38px', fontSize: 15, fontWeight: 600, cursor: 'pointer', fontFamily: SF, transition: 'background 0.15s', whiteSpace: 'nowrap' }}
              onMouseEnter={e => e.currentTarget.style.background = GD}
              onMouseLeave={e => e.currentTarget.style.background = G}
            >Start Free</button>
            <button onClick={() => scrollTo(recipesRef)}
              style={{ background: 'transparent', color: T, border: '1.5px solid #C2BAB0', borderRadius: 4, padding: '14px 32px', fontSize: 15, fontWeight: 500, cursor: 'pointer', fontFamily: SF, transition: 'border-color 0.15s', whiteSpace: 'nowrap' }}
              onMouseEnter={e => e.currentTarget.style.borderColor = T}
              onMouseLeave={e => e.currentTarget.style.borderColor = '#C2BAB0'}
            >Browse Recipes</button>
          </div>
        </div>
      </section>

      {/* ── RECIPE GALLERY ──────────────────────────────────────────────── */}
      <section ref={recipesRef} style={{ padding: '108px 40px', background: 'white' }}>
        <div style={{ maxWidth: 1240, margin: '0 auto' }}>
          <FadeIn style={{ textAlign: 'center', marginBottom: 72 }}>
            <h2 style={{ fontFamily: SRF, fontSize: 'clamp(30px, 4vw, 52px)', fontWeight: 700, color: T, letterSpacing: -1.5, lineHeight: 1.05 }}>
              Old Favorites. Fresh New Twists.
            </h2>
          </FadeIn>
          <FadeIn delay={0.1}>
            <div className="hp-recipes-grid">
              {RECIPES.map((r, i) => (
                <figure key={i} style={{ margin: 0 }}>
                  {/*
                    Replace <ImgPh> with:
                    <img
                      src={`/images/${r.file}`}
                      alt={r.title}
                      style={{ width:'100%', aspectRatio:'4/3', objectFit:'cover', display:'block', borderRadius: 3 }}
                    />
                    Recommended: 800×600px per card · warm food photography
                  */}
                  <ImgPh file={r.file} style={{ width: '100%', aspectRatio: '4 / 3', borderRadius: 3 }} />
                  <figcaption style={{
                    fontSize: 15, fontWeight: 600, color: T,
                    marginTop: 16, lineHeight: 1.4, fontFamily: SF,
                  }}>
                    {r.title}
                  </figcaption>
                </figure>
              ))}
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ── HOW IT WORKS ────────────────────────────────────────────────── */}
      <section ref={howRef} style={{ padding: '108px 40px', background: CRM }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <FadeIn style={{ textAlign: 'center', marginBottom: 80 }}>
            <h2 style={{ fontFamily: SRF, fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: 700, color: T, letterSpacing: -1.2 }}>
              Four Easy Steps
            </h2>
          </FadeIn>
          <FadeIn delay={0.1}>
            <div className="hp-steps">
              {STEPS.map((step, i) => (
                <div key={i} style={{ borderTop: `2.5px solid ${G}`, paddingTop: 28 }}>
                  <div style={{
                    fontSize: 'clamp(40px, 5vw, 60px)', fontWeight: 800,
                    color: '#D5EBDA', letterSpacing: -3, lineHeight: 1,
                    marginBottom: 20, fontFamily: SF,
                  }}>
                    {step.num}
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 600, color: T, lineHeight: 1.45, fontFamily: SF }}>
                    {step.title}
                  </div>
                </div>
              ))}
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ── EDITORIAL SPLIT ─────────────────────────────────────────────── */}
      {/*
        hp-editorial: image left 56%, text right 44% on desktop
                      stacked on mobile
      */}
      <section className="hp-editorial" style={{ background: 'white' }}>

        {/*
          Replace <ImgPh> with:
          <img
            src="/images/story-kitchen.jpg"
            alt="A warm home kitchen with fresh ingredients on the counter"
            className="hp-editorial-img"
            style={{ objectFit: 'cover', width: '100%', height: '100%', display: 'block' }}
          />
          Recommended: 1400×900px · warm kitchen/cooking scene · natural light
        */}
        <ImgPh file="story-kitchen.jpg" className="hp-editorial-img" />

        <FadeIn className="hp-editorial-text">
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: 2.5, color: '#7D8E7F', textTransform: 'uppercase', marginBottom: 24, fontFamily: SF }}>
              Our Story
            </p>
            <h2 style={{ fontFamily: SRF, fontSize: 'clamp(26px, 3.5vw, 44px)', fontWeight: 700, color: T, letterSpacing: -1.2, lineHeight: 1.15, marginBottom: 24 }}>
              Your favorite comfort foods. Just a little better.
            </h2>
            <p style={{ fontSize: 16, color: TM, lineHeight: 1.85, marginBottom: 40, fontFamily: SF }}>
              Healthy eating should feel happy. Old2New helps you discover fresh new ways to enjoy the meals you already love.
            </p>
            <button onClick={onSignUp}
              style={{
                background: 'transparent', color: GD,
                border: '1.5px solid #22C55E', borderRadius: 4,
                padding: '13px 30px', fontSize: 15, fontWeight: 600,
                cursor: 'pointer', fontFamily: SF, transition: 'all 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = G; e.currentTarget.style.color = 'white'; e.currentTarget.style.borderColor = G }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = GD; e.currentTarget.style.borderColor = '#22C55E' }}
            >Start Cooking</button>
          </div>
        </FadeIn>
      </section>

      {/* ── FAQ ─────────────────────────────────────────────────────────── */}
      <section ref={faqRef} style={{ padding: '108px 40px', background: '#FAFAF8' }}>
        <FadeIn style={{ maxWidth: 740, margin: '0 auto' }}>
          <h2 style={{
            fontFamily: SRF, fontSize: 'clamp(26px, 4vw, 40px)',
            fontWeight: 700, color: T, textAlign: 'center',
            letterSpacing: -1.2, marginBottom: 56,
          }}>
            Common Questions
          </h2>
          <div style={{ background: 'white', borderRadius: 6, padding: '4px 44px 20px', boxShadow: '0 2px 24px rgba(0,0,0,0.05)' }}>
            {FAQ.map(item => <FaqItem key={item.q} q={item.q} a={item.a} />)}
          </div>
        </FadeIn>
      </section>

      {/* ── FINAL CTA ───────────────────────────────────────────────────── */}
      <section style={{ padding: '120px 40px', background: CRM, textAlign: 'center', borderTop: '1px solid #EDE8E1' }}>
        <FadeIn style={{ maxWidth: 560, margin: '0 auto' }}>
          <h2 style={{
            fontFamily: SRF,
            fontSize: 'clamp(28px, 4vw, 48px)',
            fontWeight: 700, color: T, letterSpacing: -1.5,
            lineHeight: 1.1, marginBottom: 52,
          }}>
            Ready to rediscover your favorite meals?
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 320, margin: '0 auto' }}>
            <button onClick={onSignUp}
              style={{ background: G, color: 'white', border: 'none', borderRadius: 4, padding: '18px 36px', fontSize: 16, fontWeight: 600, cursor: 'pointer', fontFamily: SF, transition: 'background 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.background = GD}
              onMouseLeave={e => e.currentTarget.style.background = G}
            >Start Free</button>
            <button
              onClick={handleGoogleSignIn}
              disabled={googleLoading}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, width: '100%', padding: '15px 24px', background: 'white', border: '1.5px solid #DADCE0', borderRadius: 4, fontSize: 15, fontWeight: 500, color: '#3C4043', cursor: googleLoading ? 'not-allowed' : 'pointer', opacity: googleLoading ? 0.6 : 1, fontFamily: SF, transition: 'border-color 0.15s' }}
              onMouseEnter={e => { if (!googleLoading) e.currentTarget.style.borderColor = '#BDBDBD' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = '#DADCE0' }}
            >
              <GoogleIcon />
              {googleLoading ? 'Connecting…' : 'Continue with Google'}
            </button>
            <button onClick={onLogin}
              style={{ background: 'none', border: 'none', color: TM, fontSize: 14, cursor: 'pointer', fontFamily: SF, padding: '8px 0' }}
            >
              Already have an account?{' '}
              <span style={{ color: GD, fontWeight: 600 }}>Sign In</span>
            </button>
          </div>
        </FadeIn>
      </section>

      {/* ── FOOTER ──────────────────────────────────────────────────────── */}
      <footer style={{ padding: '52px 40px', background: '#F2EDE5', borderTop: '1px solid #EDE8E1' }}>
        <div style={{ maxWidth: 1320, margin: '0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24 }}>

          <button
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            aria-label="Back to top"
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', gap: 8 }}
          >
            <div style={{ width: 32, height: 32, borderRadius: 7, background: G, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17 }}>🌿</div>
            <span style={{ fontSize: 18, fontWeight: 700, color: T, letterSpacing: -0.5, fontFamily: SF }}>
              Old<span style={{ color: '#F59E0B' }}>2</span><span style={{ color: G }}>New</span>
            </span>
          </button>

          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', justifyContent: 'center' }}>
            {[
              { label: 'Recipes',      action: () => scrollTo(recipesRef) },
              { label: 'How It Works', action: () => scrollTo(howRef) },
              { label: 'FAQ',          action: () => scrollTo(faqRef) },
            ].map(({ label, action }) => (
              <button key={label} onClick={action}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: TM, fontFamily: SF, padding: '4px 10px', borderRadius: 4 }}
                onMouseEnter={e => e.currentTarget.style.color = T}
                onMouseLeave={e => e.currentTarget.style.color = TM}
              >{label}</button>
            ))}
            <span style={{ color: '#D1C9BE', fontSize: 13, display: 'flex', alignItems: 'center' }}>·</span>
            <a href="/privacy.html" style={{ fontSize: 13, color: TM, textDecoration: 'none', padding: '4px 10px' }} onMouseEnter={e => e.target.style.color = T} onMouseLeave={e => e.target.style.color = TM}>Privacy</a>
            <a href="/terms.html"   style={{ fontSize: 13, color: TM, textDecoration: 'none', padding: '4px 10px' }} onMouseEnter={e => e.target.style.color = T} onMouseLeave={e => e.target.style.color = TM}>Terms</a>
            <a href="mailto:admin@old2new.app" style={{ fontSize: 13, color: TM, textDecoration: 'none', padding: '4px 10px' }} onMouseEnter={e => e.target.style.color = T} onMouseLeave={e => e.target.style.color = TM}>Contact</a>
          </div>

          <div style={{ fontSize: 12, color: '#A89E93', textAlign: 'center', lineHeight: 1.8, fontFamily: SF }}>
            <a href="mailto:admin@old2new.app" style={{ color: '#A89E93', textDecoration: 'none' }}>admin@old2new.app</a>
            <br />
            Old2New is for informational purposes only. Not medical advice. Consult your physician before changing your diet.
          </div>
        </div>
      </footer>
    </div>
  )
}
