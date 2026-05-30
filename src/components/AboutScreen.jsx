export default function AboutScreen() {
  return (
    <div className="animate-in">
      <div className="screen-header">
        <div className="header-logo">
          <div className="header-logo-icon">🌿</div>
          <span className="header-logo-text">Fresh<span>Fix</span></span>
        </div>
      </div>

      <div className="about-hero">
        <div className="about-logo">🌿</div>
        <div className="about-name">FreshFix</div>
        <div className="about-version">Version 1.0 · Powered by Claude AI</div>
      </div>

      <div className="about-content">

        <div className="about-section">
          <h3>About FreshFix</h3>
          <p>
            FreshFix uses AI to intelligently transform your favorite recipes into healthier versions
            that match your dietary preferences — whether you're on a GLP-1 medication, following keto,
            eating Mediterranean, or any other healthy diet.
          </p>
          <p>
            Paste any recipe or just type a dish name, select your diet preferences, and FreshFix will
            suggest smart ingredient swaps while keeping the spirit of the original dish.
          </p>
        </div>

        <div className="about-section">
          <h3>Supported Diets</h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
            {['💊 GLP-1 Friendly', '🥑 Keto', '🫒 Mediterranean', '💪 High Protein', '🍬 Low Sugar', '🔥 Low Calorie', '❤️ Diabetic Friendly'].map(d => (
              <span key={d} className="badge badge-green" style={{ fontSize: 13, padding: '5px 12px' }}>{d}</span>
            ))}
          </div>
        </div>

        <div className="about-section">
          <h3>⚠️ Important Legal Disclaimer</h3>
          <div className="about-legal">
            <p><strong>FreshFix is a recipe transformation tool for informational purposes ONLY.</strong></p>
            <p>We are NOT doctors, dietitians, or medical professionals. FreshFix does NOT provide medical advice, diagnosis, or treatment.</p>
            <p>Always consult your physician or registered dietitian before making dietary changes, especially if you are taking GLP-1 medications such as Ozempic, Wegovy, or Mounjaro.</p>
            <p>Individual nutritional needs vary. Calorie and macro estimates are approximate and for general guidance only. Results may differ per person.</p>
            <p>By using FreshFix, you agree that this is not medical advice and that you will consult your healthcare provider before making any dietary changes.</p>
          </div>
        </div>

        <div className="about-section">
          <h3>Privacy</h3>
          <p>
            FreshFix does not collect or store personal data. Your recipes and saved results
            are stored only on your device. Recipe text is sent to the Claude AI API solely
            for transformation purposes and is not retained.
          </p>
        </div>

        <div className="about-section">
          <h3>Contact</h3>
          <div className="about-contact">
            <p>
              Have questions or feedback?<br />
              <a href="mailto:kimwallace.affiliate@gmail.com">kimwallace.affiliate@gmail.com</a>
            </p>
            <p style={{ marginTop: 8, color: 'var(--text-muted)', fontSize: 13 }}>
              FreshFix is an independent app and is not affiliated with any pharmaceutical company
              or medical institution.
            </p>
          </div>
        </div>

      </div>

      <div className="footer-disclaimer">
        <p>FreshFix is for informational purposes only. Not medical advice. Consult your physician before changing your diet.</p>
      </div>
    </div>
  )
}
