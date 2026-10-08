import { useEffect } from 'react'
import { HEALTH_SOURCES, SOURCE_TOPICS } from '../data/healthSources.js'
import { HEALTH_GOALS } from '../data/healthGoals.js'
import { HEALTH_DISCLAIMER, NUTRITION_METHODOLOGY } from '../healthDisclaimer.js'
import { openExternal } from './shared/SourcesLink.jsx'

// Central References library (App Store 1.4.1): every source behind the
// app's health and nutrition information, grouped by topic, plus the
// nutrition-estimate methodology and the disclaimer. Reached from About,
// from every "Sources" sheet, and (on the web) at /references.
export default function ReferencesScreen({ onBack, embedded = false }) {
  // The app shell keeps one scroll container across screens; start at the top.
  useEffect(() => {
    if (embedded) return
    try { window.scrollTo(0, 0); document.querySelector('main.screen')?.scrollTo(0, 0) } catch {}
  }, [embedded])
  const grouped = Object.entries(SOURCE_TOPICS).map(([topic, label]) => ({
    topic, label, sources: HEALTH_SOURCES.filter(s => s.topics.includes(topic)),
  })).filter(g => g.sources.length > 0)

  return (
    <div className={embedded ? '' : 'animate-in'}>
      {!embedded && (
        <div className="screen-header">
          {onBack && <button className="back-btn" onClick={onBack} aria-label="Back">←</button>}
          <h1>Sources &amp; References</h1>
        </div>
      )}

      <div className="about-content" style={{ paddingTop: embedded ? 0 : undefined }}>
        <div className="about-section">
          <h3>⚕️ Health &amp; nutrition disclaimer</h3>
          <div className="about-legal"><p>{HEALTH_DISCLAIMER}</p></div>
        </div>

        <div className="about-section">
          <h3>📊 How nutrition values are estimated</h3>
          {NUTRITION_METHODOLOGY.map((line, i) => (
            <p key={i} style={{ fontSize: 13.5, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 8 }}>{line}</p>
          ))}
        </div>

        <div className="about-section">
          <h3>🎯 What each transformation goal means</h3>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 10, lineHeight: 1.5 }}>
            Goal names describe the eating pattern Old2New applies to your recipe. They describe ingredient characteristics, not medical outcomes.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {HEALTH_GOALS.map(g => (
              <div key={g.id} style={{ background: 'var(--green-pale)', border: '1px solid var(--green-light)', borderRadius: 14, padding: '12px 14px' }}>
                <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 4 }}>{g.icon} {g.id}</div>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.55, margin: 0 }}>{g.definition}</p>
                <p style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 6, marginBottom: 0 }}>
                  See: {g.topics.map(t => SOURCE_TOPICS[t]).filter(Boolean).join(' · ')}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="about-section">
          <h3>📚 Sources by topic</h3>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 12, lineHeight: 1.5 }}>
            {HEALTH_SOURCES.length} sources from U.S. government agencies (USDA, FDA, NIH, CDC), professional bodies and peer-reviewed research. Links open in your browser.
          </p>
          {grouped.map(g => (
            <div key={g.topic} id={`ref-${g.topic}`} style={{ marginBottom: 18 }}>
              <h4 style={{ fontSize: 13, fontWeight: 800, color: 'var(--green-dark)', textTransform: 'uppercase', letterSpacing: 0.5, margin: '0 0 8px' }}>{g.label}</h4>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {g.sources.map(s => (
                  <li key={`${g.topic}-${s.id}`} style={{ border: '1px solid var(--gray-200)', borderRadius: 12, padding: '10px 12px', background: 'white' }}>
                    <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginBottom: 2 }}>{s.org}</div>
                    <a href={s.url} onClick={(e) => { e.preventDefault(); openExternal(s.url) }}
                       style={{ fontSize: 14, fontWeight: 700, color: 'var(--green-dark)', textDecoration: 'underline', lineHeight: 1.4 }}>
                      {s.title} ↗
                    </a>
                    <div style={{ fontSize: 12.5, color: 'var(--text-secondary)', lineHeight: 1.45, marginTop: 4 }}>{s.subject}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4, wordBreak: 'break-all' }}>{s.url} · accessed {s.accessed}</div>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {!embedded && (
        <div className="footer-disclaimer">
          <p>{HEALTH_DISCLAIMER}</p>
        </div>
      )}
    </div>
  )
}
