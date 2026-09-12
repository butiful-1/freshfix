// Reproduces the intermittent Google sign-in kick-back and Apple 2.1(a) bounce
// deterministically, at the level where the bug actually lived: the decision the
// onAuthStateChange handler makes for each auth event. The intermittency came
// from the race between a null INITIAL_SESSION event and the real SIGNED_IN
// event; here we drive every ordering the race can produce and assert the app
// never signs the user out on a non-SIGNED_OUT event.
import { describe, it, expect } from 'vitest'
import { decideAuthAction, isPublicPath, AUTH_CLEARING_EVENTS } from '../src/authState.js'

const USER = { user: { id: 'u1', email: 'kim@example.com' } }
const NONE = null

// Convenience: assert an action never destroys the session.
function isDestructive(action) {
  return action.type === 'sign-out'
}

describe('decideAuthAction — the intermittent kick-back is impossible', () => {
  it('a null INITIAL_SESSION is IGNORED, never a sign-out (the exact kick-back trigger)', () => {
    // Before the fix this drove setUser(null) + setScreen(splash).
    expect(decideAuthAction('INITIAL_SESSION', NONE, { inCallback: false, appInitialized: false }).type).toBe('ignore')
    expect(decideAuthAction('INITIAL_SESSION', NONE, { inCallback: true, appInitialized: false }).type).toBe('ignore')
    expect(decideAuthAction('INITIAL_SESSION', NONE, { inCallback: false, appInitialized: true }).type).toBe('ignore')
  })

  it('ONLY a real SIGNED_OUT (or USER_DELETED) clears the session', () => {
    expect(decideAuthAction('SIGNED_OUT', NONE, {}).type).toBe('sign-out')
    expect(decideAuthAction('USER_DELETED', NONE, {}).type).toBe('sign-out')
    // Every other null-session event is inert.
    for (const ev of ['INITIAL_SESSION', 'TOKEN_REFRESHED', 'USER_UPDATED', 'SIGNED_IN']) {
      expect(decideAuthAction(ev, NONE, {}).type).toBe('ignore')
    }
  })

  it('never signs out while a callback exchange is in flight', () => {
    expect(decideAuthAction('SIGNED_OUT', NONE, { inCallback: true }).type).toBe('ignore')
  })
})

describe('Test A — Google sign-in → callback → lands in app and STAYS signed in', () => {
  // The callback IIFE sets inCallback=true, then exchangeCodeForSession runs.
  // Two orderings of the lock race between INITIAL_SESSION and SIGNED_IN:

  it('ordering 1: exchange wins the lock first (SIGNED_IN, then a late INITIAL_SESSION)', () => {
    // SIGNED_IN arrives while the callback flow is in flight → adopt, no nav here
    // (the callback IIFE navigates to the app).
    const a = decideAuthAction('SIGNED_IN', USER, { inCallback: true, appInitialized: false })
    expect(a.type).toBe('adopt-callback')

    // A late INITIAL_SESSION now carries the real (restored) user → refresh only.
    const b = decideAuthAction('INITIAL_SESSION', USER, { inCallback: false, appInitialized: true })
    expect(b.type).toBe('refresh-user')

    // Nothing in this sequence is destructive.
    expect([a, b].some(isDestructive)).toBe(false)
  })

  it('ordering 2: INITIAL_SESSION(null) wins the lock first, before the exchange', () => {
    // This is the ordering that used to kick the user out. Now inert.
    const a = decideAuthAction('INITIAL_SESSION', NONE, { inCallback: true, appInitialized: false })
    expect(a.type).toBe('ignore')

    // Then the exchange completes and emits SIGNED_IN → adopt.
    const b = decideAuthAction('SIGNED_IN', USER, { inCallback: true, appInitialized: false })
    expect(b.type).toBe('adopt-callback')

    expect([a, b].some(isDestructive)).toBe(false)
  })

  it('a stray null event AFTER the app has navigated does not sign the user out', () => {
    // e.g. an INITIAL_SESSION emitted late by a second listener/refresh.
    const late = decideAuthAction('INITIAL_SESSION', NONE, { inCallback: false, appInitialized: true })
    expect(late.type).toBe('ignore')
    expect(isDestructive(late)).toBe(false)
  })
})

describe('Test B — cold reopen → user is still signed in', () => {
  it('a null INITIAL_SESSION racing ahead of session restore does NOT sign out', () => {
    // Cold start: getSession() will restore the stored session, but the
    // listener may fire INITIAL_SESSION(null) first. Must be inert.
    const early = decideAuthAction('INITIAL_SESSION', NONE, { inCallback: false, appInitialized: false })
    expect(early.type).toBe('ignore')
  })

  it('once the stored session is restored, the user is adopted without a spurious re-navigation', () => {
    const restored = decideAuthAction('INITIAL_SESSION', USER, { inCallback: false, appInitialized: true })
    expect(restored.type).toBe('refresh-user')
  })

  it('a token refresh on reopen keeps the user, never navigates or clears', () => {
    const refreshed = decideAuthAction('TOKEN_REFRESHED', USER, { inCallback: false, appInitialized: true })
    expect(refreshed.type).toBe('refresh-user')
    expect(isDestructive(refreshed)).toBe(false)
  })

  it('the user can still sign out deliberately', () => {
    expect(decideAuthAction('SIGNED_OUT', NONE, { inCallback: false, appInitialized: true }).type).toBe('sign-out')
  })
})

describe('decideAuthAction — normal sign-in and recovery still work', () => {
  it('first web sign-in (not a callback path) navigates into the app', () => {
    expect(decideAuthAction('SIGNED_IN', USER, { inCallback: false, appInitialized: false }).type).toBe('sign-in-navigate')
  })

  it('a repeat SIGNED_IN once already in the app only refreshes, never re-navigates', () => {
    expect(decideAuthAction('SIGNED_IN', USER, { inCallback: false, appInitialized: true }).type).toBe('refresh-user')
  })

  it('password recovery routes to reset-password', () => {
    expect(decideAuthAction('PASSWORD_RECOVERY', USER, {}).type).toBe('recovery')
  })
})

describe('isPublicPath — auth events never redirect off public marketing pages', () => {
  it('treats marketing/SEO surfaces as public (faithful to the original App.jsx guards)', () => {
    for (const p of ['/recipes/lentil-lasagna', '/blog', '/blog/x', '/about', '/contact', '/recipe/abc']) {
      expect(isPublicPath(p)).toBe(true)
    }
  })
  it('treats app/auth paths as non-public', () => {
    // Note: bare '/recipes' was NOT in the original exclusion set (only the
    // '/recipes/' prefix and exact '/blog'); preserved here unchanged.
    for (const p of ['/', '/auth/callback', '/home', '/login', '/recipes']) {
      expect(isPublicPath(p)).toBe(false)
    }
  })
  it('AUTH_CLEARING_EVENTS is limited to true sign-out events', () => {
    expect([...AUTH_CLEARING_EVENTS].sort()).toEqual(['SIGNED_OUT', 'USER_DELETED'])
  })
})
