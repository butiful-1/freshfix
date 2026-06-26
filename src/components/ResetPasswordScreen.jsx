import { useState } from 'react'
import { supabase } from '../supabase'

export default function ResetPasswordScreen({ onSuccess }) {
  const [password, setPassword] = useState('')
  const [confirm,  setConfirm]  = useState('')
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    if (password.length < 6)  { setError('Password must be at least 6 characters.'); return }
    if (password !== confirm)  { setError('Passwords do not match.'); return }
    setLoading(true)
    setError('')
    const { error: err } = await supabase.auth.updateUser({ password })
    setLoading(false)
    if (err) { setError(err.message); return }
    onSuccess()
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(160deg, var(--green-pale) 0%, var(--green-bg) 35%, white 100%)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: '40px 20px',
    }}>
      <div style={{ textAlign: 'center', marginBottom: 28 }}>
        <div style={{
          width: 72, height: 72, borderRadius: 20, background: 'var(--green)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 38, margin: '0 auto 14px',
          boxShadow: '0 12px 36px rgba(34,197,94,0.35)',
        }}>
          🔑
        </div>
        <h1 style={{ fontSize: 26, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: -0.8 }}>
          Set new password
        </h1>
        <p style={{ fontSize: 14, color: 'var(--text-muted)', marginTop: 6 }}>
          Choose a strong password for your Old2New account.
        </p>
      </div>

      <div style={{ width: '100%', maxWidth: 400 }}>
        {error && (
          <div className="error-msg" style={{ marginBottom: 16 }}>
            <span className="error-icon">⚠️</span>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
              New password
            </label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="At least 6 characters" autoComplete="new-password" required />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
              Confirm password
            </label>
            <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="Repeat your new password" autoComplete="new-password" required />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
            style={{ marginTop: 4, minHeight: 52, fontSize: 16 }}
          >
            {loading ? 'Updating password…' : '🔑 Update Password'}
          </button>
        </form>
      </div>

      <p style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center', marginTop: 28, maxWidth: 300, lineHeight: 1.6 }}>
        Old2New is for informational purposes only. Not medical advice.
      </p>
    </div>
  )
}
