// Contract for the post-sign-out confirmation toast. Apple (5.1.1(v)) asked to
// see the complete account-deletion flow through confirmation: after a
// successful deletion the user must clearly see that the ACCOUNT was deleted,
// not the generic "Signed out successfully" they'd get from the Sign Out button.
// Tested here without a DOM and without deleting a real account.
import { describe, it, expect } from 'vitest'
import { signOutToastMessage, SIGNED_OUT_MESSAGE, ACCOUNT_DELETED_MESSAGE } from '../src/signOutToast.js'

describe('signOutToastMessage', () => {
  it('a completed account deletion shows an explicit "account deleted" confirmation', () => {
    expect(signOutToastMessage({ justDeletedAccount: true })).toBe(ACCOUNT_DELETED_MESSAGE)
    expect(ACCOUNT_DELETED_MESSAGE).toMatch(/account deleted/i)
    // Must not read as a mere sign-out.
    expect(ACCOUNT_DELETED_MESSAGE).not.toMatch(/signed out/i)
  })

  it('the normal Sign Out message is unchanged', () => {
    expect(signOutToastMessage({ justSignedOut: true })).toBe(SIGNED_OUT_MESSAGE)
    expect(SIGNED_OUT_MESSAGE).toBe('Signed out successfully')
  })

  it('deletion takes precedence over sign-out if both flags are set', () => {
    // Deletion clears the session via the same signOut() call; the user must
    // still see the deletion confirmation, never the generic one.
    expect(signOutToastMessage({ justSignedOut: true, justDeletedAccount: true })).toBe(ACCOUNT_DELETED_MESSAGE)
  })

  it('shows nothing when neither has happened', () => {
    expect(signOutToastMessage({})).toBeNull()
    expect(signOutToastMessage()).toBeNull()
  })
})
