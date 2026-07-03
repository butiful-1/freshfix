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
  { num: 1, title: 'Transform a Recipe',    desc: 'Paste a recipe or simply type the meal you love.',                                                                          file: 'app-step-1.jpg' },
  { num: 2, title: 'See Your New Recipe',   desc: 'Old2New instantly creates a healthier version while keeping the flavors you love.',                                         file: 'app-step-2.jpg' },
  { num: 3, title: 'Compare the Nutrition', desc: 'See calories, protein, carbs, fat and fiber before and after your transformation.',                                         file: 'app-step-3.jpg' },
  { num: 4, title: 'Save Your Favorites',   desc: 'Build your own collection of healthier recipes and return to them anytime.',                                                file: 'app-step-4.jpg' },
]

const TRUST = [
  {
    title: 'Made for real kitchens',
    paragraphs: [
      'Everyday meals.\nBusy weeknights.\nFamily favorites.',
      "Healthy cooking shouldn't feel complicated.",
    ],
  },
  {
    title: 'No guilt. No strict plans.',
    paragraphs: [
      'Keep the meals you already love.',
      'Simply discover fresh ways to make them a little lighter and more balanced.',
    ],
  },
  {
    title: 'Save what you love',
    paragraphs: [
      'Build your own collection of favorite recipes.',
      'Return to them anytime.',
    ],
  },
]

// ── Testimonials ──────────────────────────────────────────────────────────────
// Placeholder names — replace with real verified user testimonials before launch
const TESTIMONIALS = [
  {
    quote: "I made the healthier chicken Alfredo and my husband asked for seconds.",
    author: "Sarah T.",
  },
  {
    quote: "I never thought I could make a lighter version of my mom's lasagna taste this good.",
    author: "Rachel M.",
  },
  {
    quote: "Old2New made it so easy to find a healthier version of our Friday pizza night.",
    author: "Tom R.",
  },
]

// ── Social links ─────────────────────────────────────────────────────────────
// Replace href="#" values with real profile URLs before launch
const SOCIALS = [
  {
    label: 'TikTok',
    href: '#', // https://www.tiktok.com/@yourhandle
    icon: (
      <svg width="19" height="19" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.27 6.27 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V9.21a8.16 8.16 0 004.78 1.52V7.27a4.85 4.85 0 01-1.01-.58z" />
      </svg>
    ),
  },
  {
    label: 'Instagram',
    href: '#', // https://www.instagram.com/yourhandle
    icon: (
      <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="2" y="2" width="20" height="20" rx="5" />
        <path d="M16 11.37A4 4 0 1112.63 8 4 4 0 0116 11.37z" />
        <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
      </svg>
    ),
  },
  {
    label: 'Facebook',
    href: '#', // https://www.facebook.com/yourpage
    icon: (
      <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z" />
      </svg>
    ),
  },
  {
    label: 'Pinterest',
    href: '#', // https://www.pinterest.com/yourprofile
    icon: (
      <svg width="19" height="19" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M12 0C5.373 0 0 5.373 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738a.36.36 0 01.083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.632-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146 1.124.347 2.317.535 3.554.535 6.627 0 12-5.373 12-12S18.627 0 12 0z" />
      </svg>
    ),
  },
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

// ── Editorial background texture ──────────────────────────────────────────────
// Layers a blurred, desaturated food photo behind a warm semi-transparent overlay.
// Sections show warm base color until the matching /images/bg-*.jpg is dropped in.
function BgTex({ file, blur = 1, pos = 'center', size = 'cover' }) {
  return (
    <div aria-hidden="true" style={{
      position: 'absolute', inset: 0, zIndex: 0,
      backgroundImage: `url(/images/${file})`,
      backgroundSize: size,
      backgroundPosition: pos,
      filter: `blur(${blur}px) saturate(0.85) brightness(0.95)`,
      transform: 'scale(1.06)',
      pointerEvents: 'none',
    }} />
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
export default function SplashScreen({ onSignUp, onLogin, isTWA }) {
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
      {/*
        Background texture: bg-herbs.jpg — Freshness · herbs on marble · 8% opacity
      */}
      <section className="hp-hero">
        <div className="hp-hero-image">
          <img
            src="/images/hero-shrimp.jpg"
            alt="Fresh healthy shrimp dish prepared at home"
          />
        </div>

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
      <section ref={recipesRef} style={{ padding: '108px 40px', background: 'white', position: 'relative', overflow: 'hidden' }}>
        <BgTex file="bg-herbs-top.jpg" pos="center top" />
        <div style={{ maxWidth: 1240, margin: '0 auto', position: 'relative', zIndex: 2 }}>
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
                  <img
                    src={`/images/${r.file}`}
                    alt={r.title}
                    style={{ width: '100%', aspectRatio: '4 / 3', objectFit: 'cover', borderRadius: 3, display: 'block' }}
                  />
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
      <section ref={howRef} style={{ padding: '100px 32px 110px', background: CRM, position: 'relative', overflow: 'hidden', marginTop: -10 }}>
        <BgTex file="bg-cuttingboard.jpg" pos="center" />
        <FadeIn style={{ maxWidth: 1175, margin: '0 auto', position: 'relative', zIndex: 2 }}>
          <img
            src="/images/4-easy-steps.png"
            alt="Four Easy Steps: Transform a Recipe, See Your New Recipe, Compare the Nutrition, Save Your Favorites"
            style={{
              width: '100%',
              maxWidth: 1175,
              height: 'auto',
              display: 'block',
              margin: '0 auto',
              borderRadius: 20,
              boxShadow: '0 8px 40px rgba(0,0,0,0.12)',
            }}
          />
        </FadeIn>
      </section>

      {/* ── EDITORIAL SPLIT ─────────────────────────────────────────────── */}
      {/*
        hp-editorial: image left 56%, text right 44% on desktop
                      stacked on mobile
      */}
      {/*
        Background texture: bg-harvest.jpg — Seasonal · garden harvest at edges · 15% opacity
      */}
      <section className="hp-editorial" style={{ background: 'white', position: 'relative', overflow: 'hidden', marginTop: -10 }}>
        <BgTex file="bg-harvest.jpg" />

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
        <div className="hp-editorial-img" style={{ position: 'relative', zIndex: 2 }}>
          <img
            src="/images/story-kitchen.jpg"
            alt="A warm home kitchen with fresh ingredients on the counter"
          />
        </div>

        <FadeIn className="hp-editorial-text" style={{ position: 'relative', zIndex: 2, background: 'rgba(255,252,246,0.96)' }}>
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

      {/* ── WHY PEOPLE LOVE OLD2NEW ──────────────────────────────────── */}
      <section style={{ padding: '112px 40px', background: 'white', position: 'relative', overflow: 'hidden', marginTop: -10 }}>
        <BgTex file="bg-kitchen.jpg" pos="center" />
        <div style={{ maxWidth: 1100, margin: '0 auto', position: 'relative', zIndex: 2 }}>
          <FadeIn style={{ textAlign: 'center', marginBottom: 80 }}>
            <h2 style={{ fontFamily: SRF, fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: 700, color: T, letterSpacing: -1.2 }}>
              Why People Love Old2New
            </h2>
          </FadeIn>
          <FadeIn delay={0.1}>
            <div className="hp-trust">
              {TRUST.map((item, i) => (
                <div key={i} style={{ background: 'rgba(255,252,246,0.94)', borderRadius: 16, padding: '40px 36px', boxShadow: '0 8px 32px rgba(0,0,0,0.07)', border: '1px solid rgba(80,60,40,0.07)' }}>
                  <div style={{ width: 28, height: 2, background: G, marginBottom: 32 }} />
                  <h3 style={{ fontFamily: SRF, fontSize: 22, fontWeight: 700, color: T, marginBottom: 22, lineHeight: 1.25, letterSpacing: -0.5 }}>
                    {item.title}
                  </h3>
                  {item.paragraphs.map((p, j) => (
                    <p key={j} style={{
                      fontSize: 15, color: TM, lineHeight: 1.95, fontFamily: SF,
                      whiteSpace: 'pre-line',
                      marginBottom: j < item.paragraphs.length - 1 ? 18 : 0,
                    }}>
                      {p}
                    </p>
                  ))}
                </div>
              ))}
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ── FROM OUR COMMUNITY ───────────────────────────────────────── */}
      <section style={{ padding: '112px 40px', background: CRM, position: 'relative', overflow: 'hidden', marginTop: -10 }}>
        <BgTex file="bg-community.jpg" pos="center bottom" />
        <div style={{ maxWidth: 1100, margin: '0 auto', position: 'relative', zIndex: 2 }}>
          <FadeIn style={{ textAlign: 'center', marginBottom: 64 }}>
            <h2 style={{ fontFamily: SRF, fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: 700, color: T, letterSpacing: -1.2, marginBottom: 18 }}>
              From Our Community
            </h2>
            <p style={{ fontSize: 16, color: TM, lineHeight: 1.75, maxWidth: 500, margin: '0 auto', fontFamily: SF }}>
              Real feedback from people discovering healthier ways to cook the meals they already love.
            </p>
          </FadeIn>
          <FadeIn delay={0.1}>
            <div className="hp-testimonials">
              {TESTIMONIALS.map((t, i) => (
                <div key={i} style={{
                  background: 'rgba(255,252,246,0.97)',
                  borderRadius: 14,
                  padding: '40px 36px',
                  boxShadow: '0 8px 36px rgba(0,0,0,0.10)',
                  border: '1px solid rgba(80,60,40,0.07)',
                }}>
                  <div style={{ fontSize: 13, color: '#F59E0B', letterSpacing: 3, marginBottom: 24 }}>★★★★★</div>
                  <p style={{ fontFamily: SRF, fontSize: 17, fontStyle: 'italic', color: T, lineHeight: 1.75, marginBottom: 28 }}>
                    "{t.quote}"
                  </p>
                  <p style={{ fontSize: 11, color: TM, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', fontFamily: SF }}>
                    — {t.author}
                  </p>
                </div>
              ))}
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ── FAQ ─────────────────────────────────────────────────────────── */}
      <section ref={faqRef} style={{ padding: '88px 40px', background: 'white', position: 'relative', overflow: 'hidden', marginTop: -10 }}>
        <BgTex file="bg-kitchen.jpg" pos="center" />
        <FadeIn style={{ maxWidth: 1100, margin: '0 auto', position: 'relative', zIndex: 2 }}>
          <div className="hp-faq" style={{ background: 'rgba(255,252,246,0.93)', borderRadius: 18, padding: 'clamp(40px, 5vw, 72px)', boxShadow: '0 16px 45px rgba(0,0,0,0.08)', border: '1px solid rgba(80,60,40,0.08)' }}>

            {/* Left: editorial intro */}
            <div className="hp-faq-intro">
              <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: 2.5, color: '#7D8E7F', textTransform: 'uppercase', marginBottom: 20, fontFamily: SF }}>
                Questions
              </p>
              <h2 style={{ fontFamily: SRF, fontSize: 'clamp(24px, 3vw, 36px)', fontWeight: 700, color: T, letterSpacing: -1, lineHeight: 1.2, marginBottom: 20 }}>
                Questions before you start?
              </h2>
              <p style={{ fontSize: 15, color: TM, lineHeight: 1.85, fontFamily: SF, marginBottom: 16 }}>
                Old2New is simple, flexible, and made for real-life cooking.
              </p>
              <p style={{ fontSize: 15, color: TM, lineHeight: 1.85, fontFamily: SF }}>
                Whether you're making small changes or starting fresh, we're here to help you enjoy the meals you already love.
              </p>
            </div>

            {/* Right: accordion */}
            <div style={{ flex: 1 }}>
              {FAQ.map(item => {
                const a = (isTWA && item.q === 'How many recipes can I save for free?')
                  ? 'Free accounts include 5 Recipe Upgrades and 5 saved recipes per month.'
                  : item.a
                return <FaqItem key={item.q} q={item.q} a={a} />
              })}
            </div>

          </div>
        </FadeIn>
      </section>

      {/* ── FINAL CTA ────────────────────────────────────────────────── */}
      <section style={{
        position: 'relative',
        overflow: 'hidden',
        minHeight: 580,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundImage: 'url(/images/bg-cta.jpg)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        marginTop: -10,
      }}>
        {/* Dark warm overlay for text readability over the lifestyle photo */}
        <div aria-hidden="true" style={{ position: 'absolute', inset: 0, background: 'rgba(16,10,4,0.58)', zIndex: 1, pointerEvents: 'none' }} />

        <FadeIn style={{ position: 'relative', zIndex: 2, textAlign: 'center', padding: '116px 40px', maxWidth: 560, width: '100%' }}>
          <h2 style={{
            fontFamily: SRF, fontSize: 'clamp(30px, 4vw, 52px)', fontWeight: 700,
            color: 'white', letterSpacing: -1.5, lineHeight: 1.07, marginBottom: 20,
          }}>
            Ready to rediscover your favorite meals?
          </h2>
          <p style={{ fontSize: 17, color: 'rgba(255,255,255,0.72)', lineHeight: 1.7, marginBottom: 48, fontFamily: SF }}>
            Start with one recipe you already love.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 300, margin: '0 auto' }}>
            <button onClick={onSignUp}
              style={{ background: G, color: 'white', border: 'none', borderRadius: 4, padding: '17px 36px', fontSize: 15, fontWeight: 600, cursor: 'pointer', fontFamily: SF, transition: 'background 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.background = GD}
              onMouseLeave={e => e.currentTarget.style.background = G}
            >Start Free</button>
            <button onClick={onLogin}
              style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.6)', fontSize: 14, cursor: 'pointer', fontFamily: SF, padding: '6px 0' }}
            >
              Already have an account?{' '}
              <span style={{ color: 'white', fontWeight: 600 }}>Sign In</span>
            </button>
          </div>
        </FadeIn>
      </section>

      {/* ── FOOTER ──────────────────────────────────────────────────────── */}
      <footer style={{ background: '#F2EDE5', position: 'relative', overflow: 'hidden', marginTop: -10 }}>
        <BgTex file="bg-footer.jpg" pos="center top" />
        <div style={{ maxWidth: 1320, margin: '0 auto', padding: '56px 40px 44px', position: 'relative', zIndex: 2 }}>

          {/* Top row: Logo + tagline | Social icons */}
          <div className="hp-footer-top" style={{ marginBottom: 40 }}>
            <div>
              <button
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                aria-label="Back to top"
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}
              >
                <div style={{ width: 44, height: 44, borderRadius: 10, background: G, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 23 }}>🌿</div>
                <span style={{ fontSize: 25, fontWeight: 700, color: T, letterSpacing: -0.5, fontFamily: SF }}>
                  Old<span style={{ color: '#F59E0B' }}>2</span><span style={{ color: G }}>New</span>
                </span>
              </button>
              <p style={{ fontSize: 15, color: '#5A5A5A', fontFamily: SF, paddingLeft: 54 }}>
                Your favorite recipes, a little better.
              </p>
            </div>
            <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
              {SOCIALS.map(({ label, href, icon }) => (
                <a key={label} href={href} aria-label={label} target="_blank" rel="noopener noreferrer"
                  style={{ color: '#2B2B2B', display: 'flex', transition: 'color 0.18s' }}
                  onMouseEnter={e => e.currentTarget.style.color = G}
                  onMouseLeave={e => e.currentTarget.style.color = '#2B2B2B'}
                >{icon}</a>
              ))}
            </div>
          </div>

          {/* Divider */}
          <div style={{ borderTop: '1px solid rgba(80,60,40,0.12)', marginBottom: 28 }} />

          {/* Links row: all centered */}
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', gap: 4, marginBottom: 32 }}>
            {[
              { label: 'Recipes',      action: () => scrollTo(recipesRef) },
              { label: 'How It Works', action: () => scrollTo(howRef) },
              { label: 'FAQ',          action: () => scrollTo(faqRef) },
            ].map(({ label, action }) => (
              <button key={label} onClick={action}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: '#2B2B2B', fontFamily: SF, padding: '4px 10px', borderRadius: 4 }}
                onMouseEnter={e => e.currentTarget.style.color = G}
                onMouseLeave={e => e.currentTarget.style.color = '#2B2B2B'}
              >{label}</button>
            ))}
            <span style={{ color: '#D1C9BE', fontSize: 13, padding: '0 2px' }}>·</span>
            <a href="/privacy.html" style={{ fontSize: 13, color: '#2B2B2B', textDecoration: 'none', padding: '4px 10px' }} onMouseEnter={e => e.target.style.color = G} onMouseLeave={e => e.target.style.color = '#2B2B2B'}>Privacy</a>
            <a href="/terms.html"   style={{ fontSize: 13, color: '#2B2B2B', textDecoration: 'none', padding: '4px 10px' }} onMouseEnter={e => e.target.style.color = G} onMouseLeave={e => e.target.style.color = '#2B2B2B'}>Terms</a>
            <a href="mailto:admin@old2new.app" style={{ fontSize: 13, color: '#2B2B2B', textDecoration: 'none', padding: '4px 10px' }} onMouseEnter={e => e.target.style.color = G} onMouseLeave={e => e.target.style.color = '#2B2B2B'}>Contact</a>
            <span style={{ color: '#D1C9BE', fontSize: 13, padding: '0 2px' }}>·</span>
            <a href="mailto:admin@old2new.app"
              style={{ fontSize: 13, color: '#2B2B2B', textDecoration: 'none', fontFamily: SF, padding: '4px 10px' }}
              onMouseEnter={e => e.target.style.color = G}
              onMouseLeave={e => e.target.style.color = '#2B2B2B'}
            >admin@old2new.app</a>
          </div>

          {/* Legal */}
          <p style={{ fontSize: 11, color: '#666666', textAlign: 'center', lineHeight: 1.8, fontFamily: SF }}>
            Old2New is for informational purposes only. Not medical advice. Consult your physician before changing your diet.
          </p>

        </div>
      </footer>
    </div>
  )
}
