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

export default function AboutScreen({ user, onLogout }) {
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
            Old2New does not collect or store personal data. Your recipes and saved results
            are stored only on your device. Recipe text is sent to the Claude AI API solely
            for transformation — it is not retained or used for training.
          </p>
        </div>

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
          </div>
        )}

        {/* Contact */}
        <div className="about-section">
          <h3>Contact</h3>
          <div className="about-contact">
            <p>
              Questions, feedback, or partnership enquiries?
            </p>
            <a
              href="mailto:hello@freshfix.app"
              style={{
                display: 'inline-block', marginTop: 10,
                background: 'var(--green-pale)',
                color: 'var(--green-dark)',
                border: '1px solid var(--green-light)',
                borderRadius: 12, padding: '10px 20px',
                fontSize: 15, fontWeight: 700, textDecoration: 'none',
              }}
            >
              ✉️ hello@freshfix.app
            </a>
            <p style={{ marginTop: 14, color: 'var(--text-muted)', fontSize: 13 }}>
              Old2New is an independent app not affiliated with any pharmaceutical company or medical institution.
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
