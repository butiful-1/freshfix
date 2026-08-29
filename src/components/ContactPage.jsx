import { useState } from 'react'
import { apiUrl } from '../apiBase'
import useDocumentHead from '../seo/useDocumentHead.js'
import { CONTACT_META, contactPageJsonLd } from '../seo/seoHelpers.js'
import { PublicHeader, PublicFooter } from './shared/PublicPageChrome.jsx'
import Old2NewCTA from './Old2NewCTA.jsx'

const T   = '#111827'
const TM  = '#6B7280'
const SF  = '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
const SRF = 'Georgia, "Times New Roman", serif'

const labelStyle = { display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6, fontFamily: SF }

// Static public page — same skeleton as AboutPage.jsx. Submits to
// api/contact.js (Resend-backed). On failure, the UI falls back to
// directing the visitor to email admin@old2new.app directly rather than
// leaving them stuck — never fakes success on a failed send.
export default function ContactPage({ onSignUp, onLogin }) {
  useDocumentHead({
    title: CONTACT_META.title,
    description: CONTACT_META.description,
    canonical: CONTACT_META.canonical,
    image: CONTACT_META.image,
    jsonLd: [contactPageJsonLd()],
  })

  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' })
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState(null) // null | 'success' | 'error'

  const handleChange = (field) => (e) => setForm(prev => ({ ...prev, [field]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setResult(null)
    try {
      const res = await fetch(apiUrl('/api/contact'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      setResult(res.ok ? 'success' : 'error')
    } catch (err) {
      console.error('[Old2New] Contact form send failed:', err.message)
      setResult('error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div style={{ background: 'white', minHeight: '100vh', fontFamily: SF, overflowX: 'hidden' }}>
      <PublicHeader onSignUp={onSignUp} onLogin={onLogin} />

      <main style={{ maxWidth: 720, margin: '0 auto', padding: '0 0 40px' }}>
        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" style={{ padding: '20px 20px 0' }}>
          <ol style={{ display: 'flex', flexWrap: 'wrap', gap: 6, listStyle: 'none', fontSize: 13, color: TM, fontFamily: SF }}>
            <li><a href="/" style={{ color: TM, textDecoration: 'none' }}>Home</a></li>
            <li aria-hidden="true">/</li>
            <li aria-current="page" style={{ color: T, fontWeight: 600 }}>Contact</li>
          </ol>
        </nav>

        {/* Hero */}
        <header style={{ padding: '20px 20px 0' }}>
          <h1 style={{
            fontFamily: SRF, fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: 700,
            color: T, letterSpacing: -1, lineHeight: 1.1, marginBottom: 12,
          }}>
            Contact Old2New
          </h1>
          <p style={{ fontSize: 18, color: TM, lineHeight: 1.5, fontFamily: SF, marginBottom: 4 }}>
            Have a question, need help with your account, or want to share feedback? We'd love to hear from you.
          </p>
        </header>

        {/* Email */}
        <div className="blog-content" style={{ padding: '8px 20px 0' }}>
          <p>
            Email us at{' '}
            <a href="mailto:admin@old2new.app">admin@old2new.app</a>
          </p>
        </div>

        {/* Form */}
        <div style={{ padding: '8px 20px 0' }}>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={labelStyle}>Name</label>
              <input type="text" value={form.name} onChange={handleChange('name')} placeholder="Your name" autoComplete="name" disabled={submitting} required />
            </div>
            <div>
              <label style={labelStyle}>Email</label>
              <input type="email" value={form.email} onChange={handleChange('email')} placeholder="you@example.com" autoComplete="email" disabled={submitting} required />
            </div>
            <div>
              <label style={labelStyle}>Subject</label>
              <input type="text" value={form.subject} onChange={handleChange('subject')} placeholder="What's this about?" disabled={submitting} required />
            </div>
            <div>
              <label style={labelStyle}>Message</label>
              <textarea value={form.message} onChange={handleChange('message')} placeholder="Tell us more…" rows={6} disabled={submitting} required />
            </div>

            <button type="submit" className="btn btn-primary" disabled={submitting} style={{ marginTop: 4, minHeight: 52, fontSize: 16 }}>
              {submitting ? <><div className="spinner" /> Sending…</> : 'Send Message'}
            </button>

            {result === 'success' && (
              <div style={{
                display: 'flex', gap: 10, alignItems: 'flex-start',
                padding: '14px 16px',
                background: 'var(--green-bg)', border: '1px solid var(--green-pale)',
                borderRadius: 'var(--radius-sm)', color: 'var(--green-dark)',
                fontSize: 14, lineHeight: 1.5, fontFamily: SF,
              }}>
                <span style={{ fontSize: 18, flexShrink: 0, marginTop: 1 }}>✅</span>
                <span>Thanks! Your message has been sent. We'll get back to you at {form.email}.</span>
              </div>
            )}

            {result === 'error' && (
              <div className="error-msg">
                <span className="error-icon">⚠️</span>
                <span>
                  Something went wrong. Please email us directly at{' '}
                  <a href="mailto:admin@old2new.app" style={{ color: 'inherit', fontWeight: 700 }}>admin@old2new.app</a>
                </span>
              </div>
            )}
          </form>
        </div>

        {/* CTA — one shared component, not duplicated. */}
        <div style={{ padding: '28px 20px 0' }}>
          <Old2NewCTA />
        </div>
      </main>

      <PublicFooter />
    </div>
  )
}
