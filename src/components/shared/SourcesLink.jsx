import { useEffect, useState } from 'react'
import { Browser } from '@capacitor/browser'
import { sourcesForTopics, SOURCE_TOPICS } from '../../data/healthSources.js'
import { HEALTH_DISCLAIMER, NUTRITION_METHODOLOGY } from '../../healthDisclaimer.js'
import { isNativeApp } from '../../authRedirect.js'

// Opens an external URL. In the native app a plain <a target="_blank"> does
// nothing useful inside the WKWebView, so use the system browser sheet.
export function openExternal(url) {
  if (isNativeApp()) {
    Browser.open({ url }).catch(() => { window.open(url, '_blank') })
  } else {
    window.open(url, '_blank', 'noopener,noreferrer')
  }
}

// Small "Sources" control that sits next to any health or nutrition
// statement and opens a sheet listing the authoritative sources behind it.
//   topics       — keys from SOURCE_TOPICS to pull sources for
//   label        — button text (default "Sources")
//   title        — sheet heading
//   intro        — optional sentence(s) shown above the list (e.g. a goal definition)
//   showMethodology — include the nutrition-estimate methodology paragraphs
//   onViewAll    — navigate to the central References page (in-app)
export default function SourcesLink({ topics = [], label = 'Sources', title = 'Sources', intro, showMethodology = false, onViewAll, style, compact = false }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        className="sources-link"
        style={{
          background: 'none', border: '1px solid var(--green-light)', color: 'var(--green-dark)',
          borderRadius: 999, padding: compact ? '2px 9px' : '4px 11px', fontSize: compact ? 11 : 12, fontWeight: 700,
          cursor: 'pointer', fontFamily: 'var(--font)', display: 'inline-flex', alignItems: 'center', gap: 4,
          lineHeight: 1.3, ...style,
        }}
      >
        <span aria-hidden="true">📚</span> {label}
      </button>
      {open && (
        <SourcesSheet
          topics={topics} title={title} intro={intro} showMethodology={showMethodology}
          onClose={() => setOpen(false)}
          onViewAll={onViewAll ? () => { setOpen(false); onViewAll() } : undefined}
        />
      )}
    </>
  )
}

export function SourcesSheet({ topics, title, intro, showMethodology, onClose, onViewAll }) {
  const sources = sourcesForTopics(topics)
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-label={title} onClick={onClose} style={{ zIndex: 1500 }}>
      <div className="modal-sheet" onClick={e => e.stopPropagation()} style={{ maxHeight: '85vh', overflowY: 'auto' }}>
        <div className="modal-handle" />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>📚 {title}</h2>
          <button type="button" onClick={onClose} aria-label="Close" style={{ background: 'var(--gray-100)', border: 'none', borderRadius: 999, width: 30, height: 30, fontSize: 16, cursor: 'pointer' }}>✕</button>
        </div>

        {intro && (
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.55, marginBottom: 12 }}>{intro}</p>
        )}

        {showMethodology && (
          <div style={{ background: 'var(--gray-50)', border: '1px solid var(--gray-200)', borderRadius: 12, padding: '12px 14px', marginBottom: 12 }}>
            <p style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 6 }}>How Old2New estimates nutrition</p>
            {NUTRITION_METHODOLOGY.map((line, i) => (
              <p key={i} style={{ fontSize: 12.5, color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: 6 }}>{line}</p>
            ))}
          </div>
        )}

        <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>
          {topics.filter(t => SOURCE_TOPICS[t]).map(t => SOURCE_TOPICS[t]).join(' · ')}
        </p>

        <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {sources.map(s => (
            <li key={s.id} style={{ border: '1px solid var(--gray-200)', borderRadius: 12, padding: '10px 12px', background: 'white' }}>
              <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginBottom: 2 }}>{s.org}</div>
              <a
                href={s.url}
                onClick={(e) => { e.preventDefault(); openExternal(s.url) }}
                style={{ fontSize: 14, fontWeight: 700, color: 'var(--green-dark)', textDecoration: 'underline', lineHeight: 1.4 }}
              >
                {s.title} ↗
              </a>
              <div style={{ fontSize: 12.5, color: 'var(--text-secondary)', lineHeight: 1.45, marginTop: 4 }}>{s.subject}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>Accessed {s.accessed}</div>
            </li>
          ))}
        </ul>

        <div className="disclaimer-badge" style={{ margin: '0 0 12px' }}>
          <span className="disclaimer-badge-icon">⚕️</span>
          <p>{HEALTH_DISCLAIMER}</p>
        </div>

        {onViewAll && (
          <button type="button" className="btn btn-outline" style={{ width: '100%', marginBottom: 8 }} onClick={onViewAll}>
            View all references
          </button>
        )}
        <button type="button" className="btn btn-ghost" style={{ width: '100%' }} onClick={onClose}>Close</button>
      </div>
    </div>
  )
}
