// Tests for api/delete-account.js — the authoritative account-deletion logic
// Apple 5.1.1(v) requires. Supabase admin and Stripe are mocked; no network.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const ORIGINAL_ENV = { ...process.env }

// ---- Mock @supabase/supabase-js admin client ----
const deleteUser = vi.fn()
const getUser = vi.fn()
const tableDelete = vi.fn()
function makeSupabaseMock() {
  // .from(table).delete().eq(col, val) resolves to { error: null }
  const eq = vi.fn().mockResolvedValue({ error: null })
  tableDelete.mockReturnValue({ eq })
  return {
    auth: {
      getUser,
      admin: { deleteUser },
    },
    from: vi.fn(() => ({ delete: tableDelete })),
  }
}
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => makeSupabaseMock()),
}))

// ---- Mock Stripe ----
const subCancel = vi.fn().mockResolvedValue({})
const subList = vi.fn().mockResolvedValue({ data: [] })
const custList = vi.fn().mockResolvedValue({ data: [] })
vi.mock('stripe', () => ({
  default: class Stripe {
    customers = { list: custList }
    subscriptions = { list: subList, cancel: subCancel }
  },
}))

function mockRes() {
  return {
    statusCode: null, headers: {}, body: null, ended: false,
    setHeader(k, v) { this.headers[k] = v },
    status(c) { this.statusCode = c; return this },
    json(b) { this.body = b; return this },
    end() { this.ended = true; return this },
  }
}
function mockReq({ method = 'POST', headers = {} } = {}) {
  return { method, headers: { origin: 'capacitor://localhost', ...headers } }
}

let handler
beforeEach(async () => {
  vi.clearAllMocks()
  process.env.SUPABASE_URL = 'https://x.supabase.co'
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key'
  delete process.env.STRIPE_SECRET_KEY
  getUser.mockResolvedValue({ data: { user: { id: 'user-1', email: 'kim@example.com' } }, error: null })
  deleteUser.mockResolvedValue({ error: null })
  subList.mockResolvedValue({ data: [] })
  custList.mockResolvedValue({ data: [] })
  handler = (await import('../api/delete-account.js')).default
})
afterEach(() => { process.env = { ...ORIGINAL_ENV }; vi.resetModules() })

describe('api/delete-account.js', () => {
  it('answers CORS preflight (OPTIONS) with 200 and an allowed origin', async () => {
    const res = mockRes()
    await handler(mockReq({ method: 'OPTIONS' }), res)
    expect(res.statusCode).toBe(200)
    expect(res.headers['Access-Control-Allow-Origin']).toBe('capacitor://localhost')
  })

  it('rejects non-POST with 405', async () => {
    const res = mockRes()
    await handler(mockReq({ method: 'GET' }), res)
    expect(res.statusCode).toBe(405)
  })

  it('returns 401 when no Bearer token is provided', async () => {
    const res = mockRes()
    await handler(mockReq({ headers: {} }), res)
    expect(res.statusCode).toBe(401)
    expect(deleteUser).not.toHaveBeenCalled()
  })

  it('returns 401 when the token does not resolve to a user', async () => {
    getUser.mockResolvedValue({ data: { user: null }, error: { message: 'bad jwt' } })
    const res = mockRes()
    await handler(mockReq({ headers: { authorization: 'Bearer bad' } }), res)
    expect(res.statusCode).toBe(401)
    expect(deleteUser).not.toHaveBeenCalled()
  })

  it('deletes the authenticated user and returns ok', async () => {
    const res = mockRes()
    await handler(mockReq({ headers: { authorization: 'Bearer good' } }), res)
    expect(getUser).toHaveBeenCalledWith('good')
    expect(deleteUser).toHaveBeenCalledWith('user-1')
    expect(res.statusCode).toBe(200)
    expect(res.body).toEqual({ ok: true })
  })

  it('explicitly clears the user rows before deleting the auth user (defense in depth)', async () => {
    const res = mockRes()
    await handler(mockReq({ headers: { authorization: 'Bearer good' } }), res)
    // saved_recipes and profiles both deleted
    expect(tableDelete).toHaveBeenCalledTimes(2)
    expect(res.statusCode).toBe(200)
  })

  it('cancels an active Stripe subscription before deletion', async () => {
    process.env.STRIPE_SECRET_KEY = 'sk_test_x'
    custList.mockResolvedValue({ data: [{ id: 'cus_1' }] })
    subList.mockResolvedValue({ data: [{ id: 'sub_1' }] })
    handler = (await import('../api/delete-account.js')).default
    const res = mockRes()
    await handler(mockReq({ headers: { authorization: 'Bearer good' } }), res)
    expect(subCancel).toHaveBeenCalledWith('sub_1')
    expect(deleteUser).toHaveBeenCalledWith('user-1')
    expect(res.statusCode).toBe(200)
  })

  it('does not delete the user if the subscription cancel fails (avoids a billed, deleted account)', async () => {
    process.env.STRIPE_SECRET_KEY = 'sk_test_x'
    custList.mockResolvedValue({ data: [{ id: 'cus_1' }] })
    subList.mockResolvedValue({ data: [{ id: 'sub_1' }] })
    subCancel.mockRejectedValueOnce(new Error('stripe down'))
    handler = (await import('../api/delete-account.js')).default
    const res = mockRes()
    await handler(mockReq({ headers: { authorization: 'Bearer good' } }), res)
    expect(res.statusCode).toBe(500)
    expect(deleteUser).not.toHaveBeenCalled()
  })

  it('returns 500 when the auth-user deletion itself fails', async () => {
    deleteUser.mockResolvedValue({ error: { message: 'boom' } })
    const res = mockRes()
    await handler(mockReq({ headers: { authorization: 'Bearer good' } }), res)
    expect(res.statusCode).toBe(500)
    expect(res.body.error).toMatch(/deletion failed/i)
  })

  it('returns 500 when the server is not configured with a service role key', async () => {
    delete process.env.SUPABASE_SERVICE_ROLE_KEY
    handler = (await import('../api/delete-account.js')).default
    const res = mockRes()
    await handler(mockReq({ headers: { authorization: 'Bearer good' } }), res)
    expect(res.statusCode).toBe(500)
  })
})
