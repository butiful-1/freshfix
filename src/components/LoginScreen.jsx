import { useState } from 'react'
import { supabase } from '../supabase'

export default function LoginScreen({ onSignUp }) {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading]   = useState(false)
  const [googleLoad, setGoogleLoad] = useState(false)
  const [error, setError]       = useState('')
  const [forgotMode, setForgotMode] = useState(false)
  const [resetSent, setResetSent]   = useState(false)

  async function handleSignIn(e) {
    e.preventDefault()
    if (!email.trim() || !password.trim()) { setError('Email and password are required.'); return }

    setLoading(true); setError('')
    const { error: err } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
    setLoading(false)
    if (err) setError(err.message)
    // On success, onAuthStateChange in App.jsx handles redirect
  }

  async function handleForgotPassword(e) {
    e.preventDefault()
    if (!email.trim()) { setError('Enter your email address first.'); return }

    setLoading(true); setError('')
    const { error: err } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    setLoading(false)
    if (err) { setError(err.message); return }
    setResetSent(true)
  }

  async function handleGoogle() {
    setGoogleLoad(true); setError('')
    const { error: err } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    })
    if (err) { setError(err.message); setGoogleLoad(false) }
  }

  if (resetSent) {
    return (
      <div className="splash" style={{ background: 'linear-gradient(160deg, var(--green-pale), var(--green-bg) 40%, white 100%)' }}>
        <div style={{ textAlign: 'center', padding: '0 24px', maxWidth: 320 }}>
          <div style={{ fontSize: 64, marginBottom: 20 }}>🔑</div>
          <h2 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 12 }}>
            Reset link sent!
          </h2>
          <p style={{ fontSize: 15, color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: 28 }}>
            Check <strong>{email}</strong> for a password reset link.
          </p>
          <button className="btn btn-secondary" onClick={() => { setForgotMode(false); setResetSent(false) }} style={{ width: '100%' }}>
            Back to Sign In
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
      padding: '40px 24px',
    }}>
      {/* Logo */}
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <div style={{
          width: 72, height: 72, borderRadius: 20, background: 'var(--green)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 38, margin: '0 auto 14px',
          boxShadow: '0 12px 36px rgba(34,197,94,0.35)',
        }}>
          🌿
        </div>
        <h1 style={{ fontSize: 28, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: -0.8 }}>
          {forgotMode ? 'Reset password' : 'Welcome back!'}
        </h1>
        <p style={{ fontSize: 14, color: 'var(--text-muted)', marginTop: 6 }}>
          {forgotMode ? 'Enter your email to receive a reset link.' : 'Sign in to your FreshFix account.'}
        </p>
      </div>

      <div style={{ width: '100%', maxWidth: 360 }}>

        {error && (
          <div className="error-msg" style={{ marginBottom: 16 }}>
            <span className="error-icon">⚠️</span>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={forgotMode ? handleForgotPassword : handleSignIn} style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }}>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
              Email address
            </label>
            <input
              type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com" autoComplete="email" required
              style={{ background: 'white' }}
            />
          </div>

          {!forgotMode && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>
                  Password
                </label>
                <button
                  type="button" onClick={() => { setForgotMode(true); setError('') }}
                  style={{ background: 'none', border: 'none', fontSize: 12, color: 'var(--green-dark)', cursor: 'pointer', fontWeight: 600 }}
                >
                  Forgot password?
                </button>
              </div>
              <input
                type="password" value={password} onChange={e => setPassword(e.target.value)}
                placeholder="Your password" autoComplete="current-password" required
                style={{ background: 'white' }}
              />
            </div>
          )}

          <button type="submit" className="btn btn-primary" disabled={loading} style={{ marginTop: 4, minHeight: 50, fontSize: 16 }}>
            {loading
              ? <><div className="spinner" /> {forgotMode ? 'Sending link…' : 'Signing in…'}</>
              : forgotMode ? '🔑 Send Reset Link' : '→ Sign In'
            }
          </button>

          {forgotMode && (
            <button type="button" className="btn btn-ghost" onClick={() => { setForgotMode(false); setError('') }}>
              ← Back to Sign In
            </button>
          )}
        </form>

        {!forgotMode && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '4px 0 12px' }}>
              <div style={{ flex: 1, height: 1, background: 'var(--gray-300)' }} />
              <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>or</span>
              <div style={{ flex: 1, height: 1, background: 'var(--gray-300)' }} />
            </div>

            <button
              className="btn"
              onClick={handleGoogle}
              disabled={googleLoad}
              style={{
                width: '100%', background: 'white', color: 'var(--text-primary)',
                border: '2px solid var(--gray-300)', fontWeight: 600, minHeight: 50,
                boxShadow: 'var(--shadow-xs)',
              }}
            >
              {googleLoad
                ? <><div className="spinner spinner-green" style={{ borderTopColor: 'var(--green)' }} /> Redirecting…</>
                : <><span style={{ fontSize: 20, marginRight: 4 }}>G</span> Sign in with Google</>
              }
            </button>
          </>
        )}

        <div style={{ textAlign: 'center', marginTop: 20 }}>
          <p style={{ fontSize: 14, color: 'var(--text-muted)' }}>
            Don't have an account?{' '}
            <button onClick={onSignUp} style={{ background: 'none', border: 'none', color: 'var(--green-dark)', fontWeight: 700, cursor: 'pointer', fontSize: 14 }}>
              Sign Up Free
            </button>
          </p>
        </div>
      </div>

      <p style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center', marginTop: 28, maxWidth: 300, lineHeight: 1.6 }}>
        FreshFix is for informational purposes only. Not medical advice.
      </p>
    </div>
  )
}
