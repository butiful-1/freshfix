// Contract tests for the client-side account-deletion request. Verifies the
// in-app flow reports success and failure deterministically without a DOM.
import { describe, it, expect, vi } from 'vitest'
import { requestAccountDeletion } from '../src/deleteAccount.js'

describe('requestAccountDeletion', () => {
  it('POSTs with the Bearer token and returns ok on success', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ ok: true }) })
    const r = await requestAccountDeletion({ token: 'tok-123', endpoint: 'https://old2new.app/api/delete-account', fetchImpl })
    expect(r).toEqual({ ok: true })
    expect(fetchImpl).toHaveBeenCalledTimes(1)
    const [url, opts] = fetchImpl.mock.calls[0]
    expect(url).toBe('https://old2new.app/api/delete-account')
    expect(opts.method).toBe('POST')
    expect(opts.headers.Authorization).toBe('Bearer tok-123')
  })

  it('throws a sign-in message when no token is present (never calls fetch)', async () => {
    const fetchImpl = vi.fn()
    await expect(requestAccountDeletion({ token: null, endpoint: '/x', fetchImpl }))
      .rejects.toThrow(/sign in again/i)
    expect(fetchImpl).not.toHaveBeenCalled()
  })

  it('surfaces the server error message on a non-ok response', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: false, status: 500, json: async () => ({ error: 'Could not cancel subscription. Please contact support.' }) })
    await expect(requestAccountDeletion({ token: 't', endpoint: '/x', fetchImpl }))
      .rejects.toThrow(/cancel subscription/i)
  })

  it('falls back to a status-coded message when the error body is unreadable', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: false, status: 502, json: async () => { throw new Error('no body') } })
    await expect(requestAccountDeletion({ token: 't', endpoint: '/x', fetchImpl }))
      .rejects.toThrow(/502/)
  })

  it('reports a network error rather than a silent partial delete', async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new Error('offline'))
    await expect(requestAccountDeletion({ token: 't', endpoint: '/x', fetchImpl }))
      .rejects.toThrow(/network error/i)
  })
})
