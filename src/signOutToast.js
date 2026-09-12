// Message for the confirmation toast shown on the signed-out home screen after
// the session is cleared. Extracted from App.jsx so the contract is unit-testable
// without a DOM (same pattern as authState.js / deleteAccount.js).
//
// Apple Guideline 5.1.1(v): after a completed in-app account deletion the user
// must clearly see that the ACCOUNT was deleted — not just that they were
// signed out — so deletion takes precedence over the generic sign-out message.
export const SIGNED_OUT_MESSAGE = 'Signed out successfully'
export const ACCOUNT_DELETED_MESSAGE = 'Account deleted successfully'

export function signOutToastMessage({ justSignedOut = false, justDeletedAccount = false } = {}) {
  if (justDeletedAccount) return ACCOUNT_DELETED_MESSAGE
  if (justSignedOut) return SIGNED_OUT_MESSAGE
  return null
}
