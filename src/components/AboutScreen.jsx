import { useState } from 'react'

const PREF_OPTIONS = [
  { key: 'noPork',     label: 'No Pork',     icon: '🐷', desc: 'Excludes all pork & pork products' },
  { key: 'vegan',      label: 'Vegan',        icon: '🌱', desc: 'No animal products of any kind' },
  { key: 'dairyFree',  label: 'Dairy Free',   icon: '🥛', desc: 'No milk, cheese, butter, or cream' },
  { key: 'glutenFree', label: 'Gluten Free',  icon: '🌾', desc: 'No wheat, barley, or rye' },
  { key: 'noNuts',     label: 'No Nuts',      icon: '🥜', desc: 'Nut-allergy safe' },
]

function DietaryPreferencesSection({ dietaryPreferences, onSave }) {
  const [prefs, setPrefs] = useState({
    noPork: false, vegan: false, dairyFree: false, glutenFree: false, noNuts: false, custom: '',
    ...dietaryPreferences,
  })
  const [saved, setSaved] = useState(false)

  const toggle = (key) => {
    setPrefs(prev => ({ ...prev, [key]: !prev[key] }))
    setSaved(false)
  }

  const handleSave = () => {
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
    onSave(prefs)
  }

  return (
    <div className="about-section">
      <h3>Dietary Preferences</h3>
      <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 14, lineHeight: 1.5 }}>
        These restrictions auto-apply to every recipe transformation.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
        {PREF_OPTIONS.map(({ key, label, icon, desc }) => (
          <label
            key={key}
            style={{
              display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px',
              background: prefs[key] ? 'var(--green-pale)' : 'var(--gray-50)',
              border: `1px solid ${prefs[key] ? 'var(--green-light)' : 'var(--gray-200)'}`,
              borderRadius: 12, cursor: 'pointer', transition: 'all 0.15s',
            }}
          >
            <input
              type="checkbox"
              checked={!!prefs[key]}
              onChange={() => toggle(key)}
              style={{ width: 18, height: 18, accentColor: 'var(--green)', cursor: 'pointer', flexShrink: 0 }}
            />
            <span style={{ fontSize: 22, flexShrink: 0 }}>{icon}</span>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{label}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{desc}</div>
            </div>
          </label>
        ))}
      </div>

      <div style={{ marginBottom: 12 }}>
        <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
          Custom restriction (optional)
        </label>
        <input
          type="text"
          value={prefs.custom || ''}
          onChange={e => { setPrefs(prev => ({ ...prev, custom: e.target.value })); setSaved(false) }}
          placeholder="e.g. No shellfish, no soy..."
          style={{
            width: '100%', padding: '10px 12px', fontSize: 14,
            border: '1px solid var(--gray-200)', borderRadius: 10,
            fontFamily: 'var(--font)', color: 'var(--text-primary)',
            outline: 'none', background: 'white',
          }}
        />
      </div>

      <button
        onClick={handleSave}
        className="btn btn-primary"
        style={{ width: '100%', fontSize: 14 }}
      >
        {saved ? 'Saved! ✓' : 'Save Preferences'}
      </button>
    </div>
  )
}

const STEPS = [
  {
    n: '1',
    icon: '📋',
    title: 'Paste or type your recipe',
    desc: 'Enter a full recipe with ingredients, or just type a dish name like "Chicken Alfredo" — Old2New handles both.',
  },
  {
    n: '2',
    icon: '🎯',
    title: 'Choose your diet preferences',
    desc: 'Select from GLP-1, Keto, Mediterranean, High Protein, Low Sugar, Low Calorie, or Diabetic Friendly.',
  },
  {
    n: '3',
    icon: '✨',
    title: 'Get your fixed recipe',
    desc: 'Receive a fully transformed recipe with smart ingredient swaps, calorie comparison, macros, and a shopping list.',
  },
]

const DIETS = [
  '💊 GLP-1 Friendly', '🥑 Keto', '🫒 Mediterranean',
  '💪 High Protein', '🍬 Low Sugar', '🔥 Low Calorie', '❤️ Diabetic Friendly',
]

export default function AboutScreen({ user, onLogout, dietaryPreferences, onSavePreferences }) {
  return (
    <div className="animate-in">
      <div className="screen-header">
        <div className="header-logo">
          <div className="header-logo-icon">🌿</div>
          <span className="header-logo-text">Old<span style={{color:'var(--amber)'}}>2</span><span>New</span></span>
        </div>
      </div>

      {/* Hero */}
      <div className="about-hero">
        <div className="about-logo">🌿</div>
        <div className="about-name">Old<span style={{color:'var(--amber)'}}>2</span><span style={{color:'var(--green)'}}>New</span></div>
        <div className="about-version">Version 1.0 · Powered by Claude AI</div>
      </div>

      <div className="about-content">

        {/* What is Old2New */}
        <div className="about-section">
          <h3>What is Old2New?</h3>
          <p>
            Old2New is an AI-powered recipe transformation app that takes your favorite recipes and
            makes them healthier — without losing the flavor or comfort you love.
          </p>
          <p style={{ marginTop: 10 }}>
            Whether you're managing a GLP-1 medication like Ozempic or Wegovy, following a keto lifestyle,
            eating Mediterranean, or just trying to eat a little cleaner — Old2New adapts any recipe to
            match your goals in seconds.
          </p>
        </div>

        {/* How it works */}
        <div className="about-section">
          <h3>How It Works</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 4 }}>
            {STEPS.map((s) => (
              <div key={s.n} style={{
                display: 'flex', alignItems: 'flex-start', gap: 14,
                padding: '16px 18px',
                background: 'var(--green-pale)',
                borderRadius: 16,
                border: '1px solid var(--green-light)',
              }}>
                <div style={{
                  width: 36, height: 36, borderRadius: '50%',
                  background: 'var(--green)', color: 'white',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 15, fontWeight: 800, flexShrink: 0,
                }}>
                  {s.n}
                </div>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>
                    {s.icon} {s.title}
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.55 }}>
                    {s.desc}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Supported Diets */}
        <div className="about-section">
          <h3>Supported Diets</h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
            {DIETS.map(d => (
              <span key={d} className="badge badge-green" style={{ fontSize: 13, padding: '5px 12px' }}>{d}</span>
            ))}
          </div>
        </div>

        {/* Health Disclaimer */}
        <div className="about-section">
          <h3>⚠️ Health Disclaimer</h3>
          <div className="about-legal">
            <p><strong>Old2New is a recipe transformation tool for informational purposes ONLY.</strong></p>
            <p>
              We are not doctors, dietitians, or medical professionals. Old2New does not provide
              medical advice, diagnosis, or treatment. Calorie and macro estimates are approximate
              and for general guidance only — individual results will vary.
            </p>
            <p>
              Always consult your physician or registered dietitian before making significant dietary
              changes, especially if you are taking GLP-1 medications (Ozempic, Wegovy, Mounjaro)
              or managing a chronic health condition.
            </p>
          </div>
        </div>

        {/* Privacy */}
        <div className="about-section">
          <h3>Privacy</h3>
          <p>
            Your saved recipes are stored securely in your account. Recipe text is sent to the Claude AI API solely
            for transformation — it is not retained or used for training. We do not sell your data.
          </p>
        </div>

        {/* Dietary Preferences */}
        {user && onSavePreferences && (
          <DietaryPreferencesSection
            dietaryPreferences={dietaryPreferences || {}}
            onSave={onSavePreferences}
          />
        )}

        {/* Account */}
        {user && (
          <div className="about-section">
            <h3>Account</h3>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', background: 'var(--gray-50)', borderRadius: 14, border: '1px solid var(--gray-200)' }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>Signed in as</div>
                <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>{user.email}</div>
              </div>
              <button
                onClick={onLogout}
                style={{ background: 'var(--red-bg)', color: 'var(--red)', border: 'none', borderRadius: 10, padding: '8px 14px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
              >
                Sign Out
              </button>
            </div>
            <button
              onClick={() => window.open('https://old2new.app/delete-account.html', '_blank')}
              style={{ marginTop: 10, background: 'none', color: 'var(--red)', border: '1px solid var(--red)', borderRadius: 10, padding: '7px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer', opacity: 0.7 }}
            >
              Delete Account
            </button>
          </div>
        )}

        {/* Contact */}
        <div className="about-section">
          <h3>Contact</h3>
          <div className="about-contact">
            <p>
              Questions, feedback, or partnership inquiries?
            </p>
            <a
              href="mailto:support@storefrontsignal.com"
              onClick={(e) => { e.preventDefault(); window.open('mailto:support@storefrontsignal.com'); }}
              style={{
                display: 'inline-block', marginTop: 10,
                background: 'var(--green-pale)',
                color: 'var(--green-dark)',
                border: '1px solid var(--green-light)',
                borderRadius: 12, padding: '10px 20px',
                fontSize: 15, fontWeight: 700, textDecoration: 'none',
                cursor: 'pointer',
              }}
            >
              ✉️ support@storefrontsignal.com
            </a>
            <p style={{ marginTop: 14, color: 'var(--text-muted)', fontSize: 13 }}>
              Old2New is an independent app and is not affiliated with any food brand or company.
            </p>
          </div>
        </div>

      </div>

      <div className="footer-disclaimer">
        <p>Old2New is for informational purposes only. Not medical advice. Consult your physician before changing your diet.</p>
      </div>
    </div>
  )
}
