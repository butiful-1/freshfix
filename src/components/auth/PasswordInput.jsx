import { useState } from 'react'

function EyeIcon({ open }) {
  return open ? (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  ) : (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
      <line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
  )
}

function scorePassword(pw) {
  return {
    length: pw.length >= 8,
    upper:  /[A-Z]/.test(pw),
    lower:  /[a-z]/.test(pw),
    number: /[0-9]/.test(pw),
  }
}

const STRENGTH_COLOR = ['', '#ef4444', '#f97316', '#eab308', '#22c55e']
const STRENGTH_LABEL = ['', 'Weak', 'Fair', 'Good', 'Strong']

const REQUIREMENTS = [
  { key: 'length', label: 'At least 8 characters' },
  { key: 'upper',  label: 'One uppercase letter'  },
  { key: 'lower',  label: 'One lowercase letter'  },
  { key: 'number', label: 'One number'             },
]

export default function PasswordInput({
  value = '',
  onChange,
  placeholder,
  autoComplete,
  required,
  disabled,
  showStrength = false,
  ...rest
}) {
  const [visible, setVisible] = useState(false)
  const [capsLock, setCapsLock] = useState(false)
  const [touched,  setTouched]  = useState(false)

  const handleChange = (e) => {
    if (!touched) setTouched(true)
    onChange?.(e)
  }

  const handleKey = (e) => setCapsLock(e.getModifierState('CapsLock'))

  const checks    = scorePassword(value)
  const score     = Object.values(checks).filter(Boolean).length
  const showMeter = showStrength && touched && value.length > 0

  return (
    <div>
      <div style={{ position: 'relative' }}>
        <input
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKey}
          onKeyUp={handleKey}
          placeholder={placeholder}
          autoComplete={autoComplete}
          required={required}
          disabled={disabled}
          style={{ paddingRight: 48 }}
          {...rest}
        />
        <button
          type="button"
          onClick={() => setVisible(v => !v)}
          tabIndex={-1}
          aria-label={visible ? 'Hide password' : 'Show password'}
          disabled={disabled}
          style={{
            position: 'absolute',
            right: 12,
            top: '50%',
            transform: 'translateY(-50%)',
            background: 'none',
            border: 'none',
            padding: 4,
            cursor: disabled ? 'default' : 'pointer',
            color: 'var(--text-muted)',
            display: 'flex',
            alignItems: 'center',
            lineHeight: 0,
          }}
        >
          <EyeIcon open={visible} />
        </button>
      </div>

      {capsLock && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 5, fontSize: 12, color: '#d97706', fontWeight: 500 }}>
          <span>⇪</span>
          <span>Caps Lock is on</span>
        </div>
      )}

      {showMeter && (
        <div style={{ marginTop: 10 }}>
          <div style={{ display: 'flex', gap: 4, marginBottom: 5 }}>
            {[1, 2, 3, 4].map(n => (
              <div
                key={n}
                style={{
                  flex: 1,
                  height: 4,
                  borderRadius: 2,
                  background: score >= n ? STRENGTH_COLOR[score] : 'var(--gray-200)',
                  transition: 'background 0.25s',
                }}
              />
            ))}
          </div>
          <p style={{ fontSize: 12, fontWeight: 700, color: score > 0 ? STRENGTH_COLOR[score] : 'var(--text-muted)', marginBottom: 8 }}>
            {score === 0 ? 'Too weak' : STRENGTH_LABEL[score]}
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            {REQUIREMENTS.map(({ key, label }) => (
              <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12 }}>
                <span style={{
                  width: 16, height: 16, borderRadius: '50%', flexShrink: 0,
                  background: checks[key] ? 'var(--green-pale)' : 'var(--gray-200)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 9, fontWeight: 800,
                  color: checks[key] ? 'var(--green-dark)' : 'transparent',
                  transition: 'all 0.2s',
                }}>
                  ✓
                </span>
                <span style={{ color: checks[key] ? 'var(--text-secondary)' : 'var(--text-muted)', transition: 'color 0.2s' }}>
                  {label}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
