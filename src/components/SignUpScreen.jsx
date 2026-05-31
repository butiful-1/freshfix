import { useState } from 'react'
import { supabase } from '../supabase'

export default function SignUpScreen({ onLogin }) {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const [done, setDone]         = useState(false)

  async function handleSignUp(e) {
    e.preventDefault()
    if (!email.trim() || !password.trim()) { setError('Email and password are required.'); return }
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return }

    setLoading(true); setError('')
    const { data, error: err } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        emailRedirectTo: 'https://old2new.app',
      },
    })
    setLoading(false)

    if (err) { setError(err.message); return }
    if (!data.session) {
      setDone(true)
    }
    // If session exists (email confirm disabled), onAuthStateChange handles redirect
  }

  if (done) {
    return (
      <div className="splash" style={{ background: 'linear-gradient(160deg, var(--green-pale), var(--green-bg) 40%, white 100%)' }}>
        <div style={{ textAlign: 'center', padding: '0 24px', maxWidth: 320 }}>
          <div style={{ fontSize: 64, marginBottom: 20 }}>📬</div>
          <h2 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 12 }}>
            Check your email!
          </h2>
          <p style={{ fontSize: 15, color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: 8 }}>
            We sent a confirmation link to <strong>{email}</strong>.
          </p>
          <p style={{ fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: 28 }}>
            Click the link in the email to activate your account, then come back here to sign in.
          </p>
          <button className="btn btn-primary" onClick={onLogin} style={{ width: '100%', marginBottom: 10 }}>
            Go to Sign In →
          </button>
          <button className="btn btn-ghost" onClick={() => setDone(false)} style={{ width: '100%' }}>
            Resend email
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(160deg, var(--green-pale) 0%, var(--green-bg) 35%, white 100%)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: '40px 20px',
    }}>
      {/* Logo */}
      <div style={{ textAlign: 'center', marginBottom: 28 }}>
        <div style={{
          width: 72, height: 72, borderRadius: 20, background: 'var(--green)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 38, margin: '0 auto 14px',
          boxShadow: '0 12px 36px rgba(34,197,94,0.35)',
        }}>
          🌿
        </div>
        <h1 style={{ fontSize: 26, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: -0.8 }}>
          Create your account
        </h1>
        <p style={{ fontSize: 14, color: 'var(--text-muted)', marginTop: 6 }}>
          Start free — no credit card needed.
        </p>
      </div>

      {/* Form */}
      <div style={{ width: '100%', maxWidth: 400 }}>
        {error && (
          <div className="error-msg" style={{ marginBottom: 16 }}>
            <span className="error-icon">⚠️</span>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSignUp} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
              Email address
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              required
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="At least 8 characters"
              autoComplete="new-password"
              required
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
            style={{ marginTop: 4, minHeight: 52, fontSize: 16 }}
          >
            {loading ? <><div className="spinner" /> Creating account…</> : '🌿 Create Free Account'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: 20 }}>
          <p style={{ fontSize: 14, color: 'var(--text-muted)' }}>
            Already have an account?{' '}
            <button
              onClick={onLogin}
              style={{ background: 'none', border: 'none', color: 'var(--green-dark)', fontWeight: 700, cursor: 'pointer', fontSize: 14 }}
            >
              Sign In
            </button>
          </p>
        </div>
      </div>

      <p style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center', marginTop: 28, maxWidth: 300, lineHeight: 1.6 }}>
        By creating an account you agree to our terms. Old2New is for informational purposes only. Not medical advice.
      </p>
    </div>
  )
}
