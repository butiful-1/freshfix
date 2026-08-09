import { MARKETING_CONSENT_BANNER_COPY, MARKETING_CONSENT_BANNER_SUBTITLE } from '../marketingConsent'

// Purely presentational — App.jsx owns all visibility/dismissal-count logic
// and the Supabase writes (see handleSaveMarketingConsent). Styled as a
// non-blocking floating card (same convention as the "Signed out
// successfully" toast in SplashScreen.jsx/App.jsx), not a full-screen
// overlay like DisclaimerPopup/UpgradeModal — this must never block content.
//
// Note the inverted-from-usual pattern here (by design, per product spec):
// "Maybe later" is the soft, session-only snooze (reappears next visit, up
// to 3 visits); the X in the corner is the PERMANENT decline, writing
// marketing_email_consent = false to Supabase so it never shows again.
export default function MarketingConsentBanner({ onYes, onMaybeLater, onDecline }) {
  return (
    <div
      role="dialog"
      aria-label="Marketing email preferences"
      style={{
        position: 'fixed',
        left: '50%',
        bottom: 'calc(var(--nav-h) + 12px + env(safe-area-inset-bottom, 0px))',
        transform: 'translateX(-50%)',
        width: 'calc(100% - 32px)',
        maxWidth: 430 - 32,
        zIndex: 900,
        background: 'white',
        borderRadius: 16,
        boxShadow: '0 8px 28px rgba(0,0,0,0.18)',
        border: '1px solid var(--gray-200)',
        padding: '16px 18px',
        // fadeIn (opacity-only), not fadeUp — fadeUp's keyframes set
        // `transform: translateY(...)`, which would override (not compose
        // with) this element's own `transform: translateX(-50%)` centering
        // and leave the banner shifted off-center.
        animation: 'fadeIn 0.25s ease both',
      }}
    >
      <button
        type="button"
        onClick={onDecline}
        aria-label="No, don't send me marketing emails"
        style={{
          position: 'absolute', top: 8, right: 8,
          background: 'none', border: 'none', cursor: 'pointer',
          padding: 6, display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'var(--text-muted)', lineHeight: 1,
        }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
      </button>

      <p style={{
        fontSize: 14, fontWeight: 600, color: 'var(--text-primary)',
        lineHeight: 1.45, margin: '0 24px 6px 0', fontFamily: 'var(--font)',
      }}>
        🌿 {MARKETING_CONSENT_BANNER_COPY}
      </p>
      <p style={{
        fontSize: 12.5, color: 'var(--text-muted)',
        lineHeight: 1.5, margin: '0 24px 12px 0', fontFamily: 'var(--font)',
      }}>
        {MARKETING_CONSENT_BANNER_SUBTITLE}
      </p>

      <div style={{ display: 'flex', gap: 8 }}>
        <button
          type="button"
          onClick={onYes}
          className="btn btn-primary"
          style={{ width: 'auto', minHeight: 40, padding: '10px 16px', fontSize: 13.5 }}
        >
          Yes, send me updates
        </button>
        <button
          type="button"
          onClick={onMaybeLater}
          className="btn btn-ghost"
          style={{ width: 'auto', minHeight: 40, padding: '10px 14px', fontSize: 13.5 }}
        >
          Maybe later
        </button>
      </div>
    </div>
  )
}
