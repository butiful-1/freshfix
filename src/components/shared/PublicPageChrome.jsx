// Shared header/footer chrome for the public /recipes pages. Visually
// matches SplashScreen.jsx's brand (same colors, fonts, button styles) but
// kept simple/static (real <a> links, no scroll-spy) since these are
// separate routes rather than sections of one long homepage.
const G  = '#22C55E'
const GD = '#16A34A'
const T  = '#111827'
const TM = '#6B7280'
const SF = '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'

export function PublicHeader({ onSignUp, onLogin }) {
  return (
    <nav style={{
      position: 'sticky', top: 0, zIndex: 100, background: 'white',
      borderBottom: '1px solid #EDE8E1', boxShadow: '0 1px 16px rgba(0,0,0,0.05)',
    }}>
      <div style={{
        maxWidth: 1320, margin: '0 auto', padding: '0 40px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 68,
      }}>
        <a href="/" aria-label="Old2New — home" style={{ display: 'flex', alignItems: 'center', gap: 9, textDecoration: 'none' }}>
          <div style={{ width: 34, height: 34, borderRadius: 8, background: G, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>🌿</div>
          <span style={{ fontSize: 19, fontWeight: 700, color: T, letterSpacing: -0.5, fontFamily: SF }}>
            Old<span style={{ color: '#F59E0B' }}>2</span><span style={{ color: G }}>New</span>
          </span>
        </a>

        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <a href="/recipes" style={{ fontSize: 14, fontWeight: 500, color: TM, padding: '8px 16px', borderRadius: 5, fontFamily: SF, textDecoration: 'none' }}>
            Recipes
          </a>
          <button onClick={onLogin} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 500, color: TM, padding: '8px 16px', borderRadius: 5, fontFamily: SF, marginLeft: 4 }}>
            Sign In
          </button>
          <button onClick={onSignUp} style={{ background: G, color: 'white', border: 'none', borderRadius: 4, padding: '10px 24px', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: SF, marginLeft: 8 }}>
            Get Started
          </button>
        </div>
      </div>
    </nav>
  )
}

export function PublicFooter() {
  return (
    <footer style={{ background: '#F2EDE5', marginTop: 40 }}>
      <div style={{ maxWidth: 1320, margin: '0 auto', padding: '40px 40px 32px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', gap: 4, marginBottom: 20 }}>
          <a href="/" style={{ fontSize: 13, color: '#2B2B2B', fontFamily: SF, padding: '4px 10px', textDecoration: 'none' }}>Home</a>
          <a href="/recipes" style={{ fontSize: 13, color: '#2B2B2B', fontFamily: SF, padding: '4px 10px', textDecoration: 'none' }}>Recipes</a>
          <span style={{ color: '#D1C9BE', fontSize: 13 }}>·</span>
          <a href="/privacy.html" style={{ fontSize: 13, color: '#2B2B2B', textDecoration: 'none', padding: '4px 10px' }}>Privacy</a>
          <a href="/terms.html" style={{ fontSize: 13, color: '#2B2B2B', textDecoration: 'none', padding: '4px 10px' }}>Terms</a>
          <a href="mailto:admin@old2new.app" style={{ fontSize: 13, color: '#2B2B2B', textDecoration: 'none', padding: '4px 10px' }}>Contact</a>
        </div>
        <p style={{ fontSize: 11, color: '#666666', textAlign: 'center', lineHeight: 1.8, fontFamily: SF }}>
          Old2New is for informational purposes only. Not medical advice. Consult your physician before changing your diet.
        </p>
      </div>
    </footer>
  )
}

export const chromeTokens = { G, GD, T, TM, SF }
