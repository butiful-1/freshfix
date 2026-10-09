import { describe, it, expect, vi } from 'vitest'
import { signOutFast } from '../src/signOut.js'

function fakeClient({ token = 'tok', adminFails = false, localError = null } = {}) {
  const calls = []
  return {
    calls,
    auth: {
      getSession: async () => ({ data: { session: token ? { access_token: token } : null } }),
      signOut: vi.fn(async (opts) => { calls.push(['local', opts]); return { error: localError } }),
      admin: { signOut: vi.fn(async (jwt, scope) => { calls.push(['global', jwt, scope]); if (adminFails) throw new Error('offline') }) },
    },
  }
}

describe('signOutFast', () => {
  it('signs out locally first (instant), then revokes server-side in the background', async () => {
    const c = fakeClient()
    const r = await signOutFast(c)
    expect(c.auth.signOut).toHaveBeenCalledWith({ scope: 'local' })
    expect(c.calls[0][0]).toBe('local')
    expect(c.auth.admin.signOut).toHaveBeenCalledWith('tok', 'global')
    expect(r.revoked).toBe(true)
  })
  it('a failed server revoke does not throw or undo the local sign-out', async () => {
    const c = fakeClient({ adminFails: true })
    await expect(signOutFast(c)).resolves.toEqual({ revoked: true })
    await new Promise(r => setTimeout(r, 0))
    expect(c.auth.signOut).toHaveBeenCalledTimes(1)
  })
  it('with no session there is nothing to revoke', async () => {
    const c = fakeClient({ token: null })
    await expect(signOutFast(c)).resolves.toEqual({ revoked: false })
    expect(c.auth.admin.signOut).not.toHaveBeenCalled()
  })
  it('propagates a local sign-out error', async () => {
    const c = fakeClient({ localError: new Error('storage') })
    await expect(signOutFast(c)).rejects.toThrow('storage')
  })
})
