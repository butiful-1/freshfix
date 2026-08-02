import GooglePlayBadge from './GooglePlayBadge'

const T   = '#111827'
const TM  = '#6B7280'
const SF  = '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
const SRF = 'Georgia, "Times New Roman", serif'

// Single shared conversion CTA — used at the end of every blog article
// (via BlogPostPage.jsx) and on the homepage (via SplashScreen.jsx), so
// wording and styling only exist in one place. The badge row is a
// flex-wrap container so a second badge (Apple App Store, once iOS
// launches) can simply be dropped in next to GooglePlayBadge with no
// layout changes needed.
export default function Old2NewCTA() {
  return (
    <section style={{
      margin: '36px 0 0', padding: '40px 28px', background: 'var(--green-bg, #F0FDF4)',
      border: '1px solid rgba(34,197,94,0.2)', borderRadius: 20, textAlign: 'center',
    }}>
      <h3 style={{
        fontFamily: SRF, fontSize: 'clamp(20px, 3vw, 26px)', fontWeight: 700,
        color: T, marginBottom: 14, letterSpacing: -0.5, lineHeight: 1.25,
      }}>
        🌿 Ready to Transform Your Favorite Recipe?
      </h3>

      <p style={{
        fontSize: 15.5, color: TM, lineHeight: 1.7, maxWidth: 480,
        margin: '0 auto 28px', fontFamily: SF,
      }}>
        You don't have to give up the comfort foods you love. Old2New transforms your
        favorite recipes into healthier versions tailored to your goals — whether
        that's High Protein, GLP-1 Friendly, Mediterranean, Diabetic Friendly, or
        your own custom preferences.
      </p>

      <div style={{
        display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center',
        gap: 16, marginBottom: 22,
      }}>
        <a
          href="https://old2new.app"
          className="btn btn-primary"
          style={{ width: 'auto', padding: '15px 32px', textDecoration: 'none' }}
        >
          Try Old2New on the Web
        </a>

        {/* Badge row — add an Apple App Store badge here alongside
            GooglePlayBadge once iOS launches; flex-wrap handles both
            sizes and stacking on narrow screens with no changes needed. */}
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
          <GooglePlayBadge />
        </div>
      </div>

      <p style={{ fontSize: 13, color: TM, fontFamily: SF, fontStyle: 'italic' }}>
        Better ingredients. Same comfort.
      </p>
    </section>
  )
}
