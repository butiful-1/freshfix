import { useState } from 'react'
import { supabase } from '../supabase'
import PasswordInput from './auth/PasswordInput'

export default function LoginScreen({ onSignUp }) {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const [forgotMode, setForgotMode] = useState(false)
  const [resetSent, setResetSent]   = useState(false)
  const [hint, setHint] = useState(() => {
    const msg = localStorage.getItem('old2new_login_hint') || ''
    if (msg) localStorage.removeItem('old2new_login_hint')
    return msg
  })

  const [googleLoading, setGoogleLoading] = useState(false)

  async function handleSignIn(e) {
    e.preventDefault()
    if (!email.trim() || !password.trim()) { setError('Email and password are required.'); return }

    setLoading(true); setError('')
    const { error: err } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    })
    setLoading(false)
    if (err) setError(err.message)
    // On success, onAuthStateChange in App.jsx handles redirect
  }

  async function handleForgotPassword(e) {
    e.preventDefault()
    if (!email.trim()) { setError('Enter your email address first.'); return }

    setLoading(true); setError('')
    const resetRedirect = window.location.hostname === 'localhost'
      ? `${window.location.origin}/auth/callback?type=recovery`
      : 'https://old2new.app/auth/callback?type=recovery'
    const { error: err } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: resetRedirect,
    })
    setLoading(false)
    if (err) { setError(err.message); return }
    setResetSent(true)
  }

  function handleGoogleSignIn() {
    setGoogleLoading(true)
    supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.hostname === 'localhost'
          ? `${window.location.origin}/auth/callback`
          : 'https://old2new.app/auth/callback'
      }
    }).catch(err => {
      console.error('[Old2New] Google OAuth error:', err)
      setGoogleLoading(false)
    })
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
          <button
            className="btn btn-secondary"
            onClick={() => { setForgotMode(false); setResetSent(false) }}
            style={{ width: '100%' }}
          >
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
          {forgotMode ? 'Reset password' : 'Welcome back!'}
        </h1>
        <p style={{ fontSize: 14, color: 'var(--text-muted)', marginTop: 6 }}>
          {forgotMode ? 'Enter your email to receive a reset link.' : 'Sign in to your Old2New account.'}
        </p>
      </div>

      <div style={{ width: '100%', maxWidth: 400 }}>
        {hint && (
          <div style={{ background: 'var(--green-pale)', border: '1px solid var(--green-light)', borderRadius: 12, padding: '12px 16px', marginBottom: 16, fontSize: 14, color: 'var(--green-dark)', fontWeight: 600 }}>
            ✅ {hint}
          </div>
        )}
        {error && (
          <div className="error-msg" style={{ marginBottom: 16 }}>
            <span className="error-icon">⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {!forgotMode && (
          <>
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={googleLoading}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, width: '100%', minHeight: 52, background: 'white', border: '1.5px solid #DADCE0', borderRadius: 28, fontSize: 15, fontWeight: 600, color: '#3C4043', cursor: googleLoading ? 'not-allowed' : 'pointer', opacity: googleLoading ? 0.5 : 1, marginBottom: 4 }}
            >
              <svg width="18" height="18" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" style={{ flexShrink: 0 }}><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>
              {googleLoading ? 'Connecting to Google…' : 'Continue with Google'}
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '10px 0' }}>
              <div style={{ flex: 1, height: 1, background: 'var(--gray-300)' }} />
              <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500 }}>or</span>
              <div style={{ flex: 1, height: 1, background: 'var(--gray-300)' }} />
            </div>
          </>
        )}

        <form
          onSubmit={forgotMode ? handleForgotPassword : handleSignIn}
          style={{ display: 'flex', flexDirection: 'column', gap: 14 }}
        >
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

          {!forgotMode && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => { setForgotMode(true); setError('') }}
                  style={{ background: 'none', border: 'none', fontSize: 12, color: 'var(--green-dark)', cursor: 'pointer', fontWeight: 600 }}
                >
                  Forgot password?
                </button>
              </div>
              <PasswordInput
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Your password"
                autoComplete="current-password"
                required
                disabled={loading}
              />
            </div>
          )}

          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
            style={{ marginTop: 4, minHeight: 52, fontSize: 16 }}
          >
            {loading
              ? <><div className="spinner" /> {forgotMode ? 'Sending link…' : 'Signing in…'}</>
              : forgotMode ? '🔑 Send Reset Link' : '→ Sign In'
            }
          </button>

          {forgotMode && (
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => { setForgotMode(false); setError('') }}
            >
              ← Back to Sign In
            </button>
          )}
        </form>

        <div style={{ textAlign: 'center', marginTop: 20 }}>
          <p style={{ fontSize: 14, color: 'var(--text-muted)' }}>
            Don't have an account?{' '}
            <button
              onClick={onSignUp}
              style={{ background: 'none', border: 'none', color: 'var(--green-dark)', fontWeight: 700, cursor: 'pointer', fontSize: 14 }}
            >
              Sign Up Free
            </button>
          </p>
        </div>
      </div>

      <p style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center', marginTop: 28, maxWidth: 300, lineHeight: 1.6 }}>
        Old2New is for informational purposes only. Not medical advice.
      </p>
    </div>
  )
}
