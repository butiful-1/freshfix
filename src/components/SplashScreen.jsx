import { useEffect, useState } from 'react'

export default function SplashScreen({ onGetStarted }) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 80)
    return () => clearTimeout(t)
  }, [])

  return (
    <div className="splash">
      <div className={`splash-content ${visible ? 'visible' : ''}`}>
        <div className="splash-logo-wrap">
          <div className="splash-logo">🌿</div>
        </div>

        <h1 className="splash-title">
          Fresh<span>Fix</span>
        </h1>
        <p className="splash-tagline">
          Fix your favorite recipes. Make them fresh and healthy.
        </p>

        <div className="splash-features">
          <div className="splash-feature">
            <div className="splash-feature-icon">💊</div>
            <div>
              <div className="splash-feature-text">GLP-1 Friendly</div>
              <div className="splash-feature-sub">Ozempic, Wegovy & Mounjaro support</div>
            </div>
          </div>
          <div className="splash-feature">
            <div className="splash-feature-icon">🥑</div>
            <div>
              <div className="splash-feature-text">Keto & Low-Carb</div>
              <div className="splash-feature-sub">Smart carb swaps that taste amazing</div>
            </div>
          </div>
          <div className="splash-feature">
            <div className="splash-feature-icon">🫒</div>
            <div>
              <div className="splash-feature-text">Mediterranean & More</div>
              <div className="splash-feature-sub">All healthy diets supported</div>
            </div>
          </div>
        </div>

        <button className="btn btn-primary splash-btn" onClick={onGetStarted}>
          Get Started →
        </button>

        <p className="splash-legal">
          FreshFix is for informational purposes only. Not medical advice.<br />
          Always consult your physician before changing your diet.
        </p>
      </div>
    </div>
  )
}
