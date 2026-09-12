// Pure decision logic for Supabase auth-state events, extracted from the
// onAuthStateChange handler in App.jsx so the rules can be unit-tested without
// mounting the app or a DOM.
//
// THE BUG THIS FIXES (intermittent Google sign-in kick-back / Apple 2.1a bounce)
// --------------------------------------------------------------------------
// Supabase emits an INITIAL_SESSION event whenever the auth client initializes
// or a listener subscribes. On the OAuth callback path the session does not
// exist yet — it is created by exchangeCodeForSession() — and on a cold start
// it is still being restored from storage. In both cases INITIAL_SESSION fires
// with session === null.
//
// The old handler treated EVERY null-session event as a sign-out: it cleared
// the user and navigated to the splash/sign-in screen. Because that null
// INITIAL_SESSION and the real SIGNED_IN race for the same auth lock, whichever
// lands last wins. When the null event lands last, it destroyed the session the
// exchange had just created and bounced the user back to sign-in — intermittently.
//
// The fix: a null session is only a sign-out when the event is an actual
// sign-out event (SIGNED_OUT / USER_DELETED) AND no callback exchange is in
// flight. INITIAL_SESSION (and any other event) with a null session is transient
// and must be ignored — never used to clear a valid or imminent session.

// Events that genuinely mean "there is no longer a user".
export const AUTH_CLEARING_EVENTS = new Set(['SIGNED_OUT', 'USER_DELETED'])

// Public, no-auth pages that must never be redirected to the app or splash by
// an auth event (marketing/SEO surfaces). Mirrors the guards in App.jsx.
export function isPublicPath(pathname = '') {
  return (
    pathname.startsWith('/recipe/') ||
    pathname.startsWith('/recipes/') ||
    pathname === '/blog' ||
    pathname.startsWith('/blog/') ||
    pathname === '/about' ||
    pathname === '/contact'
  )
}

// Given a Supabase auth event, the session it carried, and the app's current
// auth context, return the single action the app should take. Pure: no side
// effects, no DOM, no Supabase calls.
//
//   ctx.inCallback      — an OAuth/verify code exchange is in flight; that flow
//                         owns navigation, so the listener must not navigate and
//                         must not sign the user out from under it.
//   ctx.appInitialized  — the app has already routed a signed-in user into the
//                         app once this session (so a repeat SIGNED_IN must not
//                         re-navigate, e.g. a token refresh on window refocus).
//
// Action types:
//   'recovery'          — password-recovery link: go to reset-password.
//   'adopt-callback'    — a user arrived while a callback exchange is in flight:
//                         adopt the session but let the callback flow navigate.
//   'sign-in-navigate'  — first sign-in of the session: load data and go to app.
//   'refresh-user'      — a user-bearing event that must only refresh in-memory
//                         user state, never navigate (INITIAL_SESSION with a
//                         restored user, TOKEN_REFRESHED, USER_UPDATED, or a
//                         repeat SIGNED_IN once already initialized).
//   'sign-out'          — a genuine sign-out: clear state and go to splash.
//   'ignore'            — transient/irrelevant: do nothing. THIS is what a null
//                         INITIAL_SESSION now maps to instead of a sign-out.
export function decideAuthAction(event, session, ctx = {}) {
  const { inCallback = false, appInitialized = false } = ctx
  const hasUser = !!session?.user

  if (event === 'PASSWORD_RECOVERY') {
    return { type: 'recovery' }
  }

  if (hasUser) {
    if (event === 'SIGNED_IN' && inCallback) return { type: 'adopt-callback' }
    if (event === 'SIGNED_IN' && !appInitialized) return { type: 'sign-in-navigate' }
    // Any other user-bearing event (INITIAL_SESSION with a restored user,
    // TOKEN_REFRESHED, USER_UPDATED, or a repeat SIGNED_IN when already in the
    // app) refreshes the in-memory user only. Never re-navigates.
    return { type: 'refresh-user' }
  }

  // No user in THIS event. Only a real sign-out clears state and navigates.
  // A callback exchange in flight owns the outcome, so never sign out under it.
  if (AUTH_CLEARING_EVENTS.has(event) && !inCallback) {
    return { type: 'sign-out' }
  }

  // Transient null session (INITIAL_SESSION before the exchange completes or
  // before cold-start restore finishes, or any stray null event): do nothing.
  return { type: 'ignore' }
}
