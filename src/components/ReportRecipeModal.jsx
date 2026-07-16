import { useState } from 'react'
import { supabase } from '../supabase'

export default function ReportRecipeModal({ recipeName, recipeId, onClose }) {
  const [comments, setComments] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit() {
    setSubmitting(true)
    setError('')
    try {
      let userId = ''
      try {
        const { data } = await supabase.auth.getSession()
        userId = data?.session?.user?.id || ''
      } catch {}

      const res = await fetch('/api/report-recipe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipeName, recipeId, userId, comments }),
      })
      const data = await res.json()
      if (data.ok) {
        setSubmitted(true)
      } else {
        setError(data.error || 'Could not submit report. Please try again.')
      }
    } catch {
      setError('Could not submit report. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true">
      <div className="modal-sheet">
        <div className="modal-handle" />

        {submitted ? (
          <>
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <div style={{
                width: 64, height: 64, borderRadius: 18,
                background: 'var(--green-pale)', margin: '0 auto 14px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 32,
              }}>
                💚
              </div>
              <h2 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 8, letterSpacing: -0.5 }}>
                Report Received
              </h2>
              <p style={{ fontSize: 15, color: 'var(--text-muted)', lineHeight: 1.5 }}>
                Thank you! Your report has been received and will help us improve Old2New.
              </p>
            </div>
            <button className="btn btn-primary" onClick={onClose} style={{ width: '100%' }}>
              Done
            </button>
          </>
        ) : (
          <>
            <div style={{ textAlign: 'center', marginBottom: 16 }}>
              <div style={{
                width: 64, height: 64, borderRadius: 18,
                background: '#FFF3E0', margin: '0 auto 14px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 32,
              }}>
                ⚠️
              </div>
              <h2 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 8, letterSpacing: -0.5 }}>
                Report this Recipe
              </h2>
              <p style={{ fontSize: 15, color: 'var(--text-muted)', lineHeight: 1.5 }}>
                Found something that doesn't look right? Help us improve Old2New by reporting recipes
                that may be inaccurate, unsafe, incomplete, or inappropriate.
              </p>
            </div>

            <textarea
              value={comments}
              onChange={e => setComments(e.target.value)}
              placeholder="Optional: tell us what's wrong with this recipe…"
              rows={4}
              maxLength={2000}
              style={{ width: '100%', marginBottom: 12, resize: 'vertical' }}
            />

            {error && (
              <div className="error-msg" style={{ marginBottom: 12 }}>
                <span className="error-icon">⚠️</span>
                <span>{error}</span>
              </div>
            )}

            <button
              className="btn btn-primary"
              onClick={handleSubmit}
              disabled={submitting}
              style={{ width: '100%', marginBottom: 10 }}
            >
              {submitting ? <><div className="spinner" /> Submitting…</> : 'Submit Report'}
            </button>
            <button
              className="btn btn-ghost"
              onClick={onClose}
              disabled={submitting}
              style={{ width: '100%', color: 'var(--text-muted)', fontSize: 13 }}
            >
              Cancel
            </button>
          </>
        )}
      </div>
    </div>
  )
}
