// Guard tests for the x402 payment gate on the agent-facing paid endpoints.
// These test the gate logic (402 challenge shape, payment-term matching,
// verify/settle sequencing, internal-secret bypass, rate limiting) with the
// Anthropic SDK and the facilitator both mocked — not a live-money test.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const ORIGINAL_ENV = { ...process.env }

function mockRes() {
  const res = {
    statusCode: null,
    headers: {},
    body: null,
    ended: false,
    setHeader(name, value) { this.headers[name] = value },
    status(code) { this.statusCode = code; return this },
    json(body) { this.body = body; return this },
    end() { this.ended = true; return this },
  }
  return res
}

function mockReq({ method = 'POST', headers = {}, body = {} } = {}) {
  return { method, headers, body, socket: { remoteAddress: '203.0.113.1' } }
}

function decodeHeader(b64) {
  return JSON.parse(Buffer.from(b64, 'base64').toString('utf8'))
}

let fetchMock

beforeEach(() => {
  vi.resetModules()
  process.env.AGENT_API_SECRET = 'test-secret-64-characters-long-enough-for-a-real-hmac-shared-key'
  process.env.ANTHROPIC_API_KEY_AGENT = 'sk-ant-test-key-not-real'
  process.env.X402_PAY_TO_ADDRESS = '0x2D6503F39026E53FEBadbDf54B4F56150b4f1aEE'
  process.env.X402_NETWORK = 'eip155:84532'
  delete process.env.X402_TRANSFORM_IMAGE_PRICE_USD

  fetchMock = vi.fn()
  vi.stubGlobal('fetch', fetchMock)

  vi.doMock('@anthropic-ai/sdk', () => {
    return {
      default: class Anthropic {
        constructor() {}
        messages = {
          create: vi.fn().mockResolvedValue({
            usage: { input_tokens: 500, output_tokens: 300 },
            content: [{
              text: JSON.stringify({
                transformedRecipe: {
                  name: 'Test Dish',
                  ingredients: [{ amount: '1 cup', item: 'oat milk', note: '' }],
                  instructions: ['Mix it.'],
                },
                shoppingList: { produce: [], protein: [], dairy: [], pantry: [], other: [] },
              }),
            }],
          }),
        }
      },
    }
  })
})

afterEach(() => {
  process.env = { ...ORIGINAL_ENV }
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

// Each test uses a unique IP so the module-level rate limiter doesn't leak
// state between tests.
let ipCounter = 0
function nextIp() {
  ipCounter += 1
  return `198.51.100.${ipCounter}`
}

describe('api/agent/transform.js — x402 gate', () => {
  it('returns 402 with a PAYMENT-REQUIRED challenge when no payment or key is present', async () => {
    const { default: handler } = await import('../api/agent/transform.js')
    const req = mockReq({ headers: { host: 'old2new.app', 'x-forwarded-for': nextIp() }, body: { recipe: 'a'.repeat(20), diets: ['vegan'] } })
    const res = mockRes()

    await handler(req, res)

    expect(res.statusCode).toBe(402)
    expect(res.headers['PAYMENT-REQUIRED']).toBeTruthy()
    const challenge = decodeHeader(res.headers['PAYMENT-REQUIRED'])
    expect(challenge.x402Version).toBe(2)
    expect(challenge.accepts[0].amount).toBe('100000') // $0.10 in atomic USDC (6 decimals)
    expect(challenge.accepts[0].payTo).toBe('0x2D6503F39026E53FEBadbDf54B4F56150b4f1aEE')
    expect(challenge.accepts[0].network).toBe('eip155:84532')
    expect(fetchMock).not.toHaveBeenCalled() // no facilitator call for an absent payment

    // x402scan's Quickstart requires a WWW-Authenticate header on the runtime
    // challenge, in addition to PAYMENT-REQUIRED.
    const wwwAuth = res.headers['WWW-Authenticate']
    expect(wwwAuth).toBeTruthy()
    expect(wwwAuth).toMatch(/^x402\s/) // scheme name agentcash-discovery's protocol detector looks for
    expect(wwwAuth).toContain('amount="100000"')
    expect(wwwAuth).toContain('payTo="0x2D6503F39026E53FEBadbDf54B4F56150b4f1aEE"')
    expect(wwwAuth).toContain('network="eip155:84532"')

    // agentcash-discovery's live audit reads input/output schema from
    // extensions.bazaar.schema on the runtime 402 body itself.
    const bazaarSchema = challenge.extensions?.bazaar?.schema
    expect(bazaarSchema?.properties?.input?.properties?.body?.type).toBe('object')
    expect(bazaarSchema?.properties?.output?.properties?.example?.ok).toBe(true)
  })

  it('returns 402 for a malformed PAYMENT-SIGNATURE header', async () => {
    const { default: handler } = await import('../api/agent/transform.js')
    const req = mockReq({
      headers: { host: 'old2new.app', 'x-forwarded-for': nextIp(), 'payment-signature': 'not-valid-base64-json!!!' },
      body: { recipe: 'a'.repeat(20), diets: ['vegan'] },
    })
    const res = mockRes()

    await handler(req, res)

    expect(res.statusCode).toBe(402)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('returns 402 without calling the facilitator when payment terms do not match the price', async () => {
    const { default: handler } = await import('../api/agent/transform.js')
    const badPayload = Buffer.from(JSON.stringify({
      x402Version: 2,
      accepted: { scheme: 'exact', network: 'eip155:84532', amount: '1', asset: '0xdead', payTo: '0xdead', maxTimeoutSeconds: 60 },
      payload: { signature: '0x', authorization: {} },
    })).toString('base64')

    const req = mockReq({
      headers: { host: 'old2new.app', 'x-forwarded-for': nextIp(), 'payment-signature': badPayload },
      body: { recipe: 'a'.repeat(20), diets: ['vegan'] },
    })
    const res = mockRes()

    await handler(req, res)

    expect(res.statusCode).toBe(402)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('rejects an unverified payment (facilitator says isValid: false) without settling', async () => {
    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({ isValid: false, invalidReason: 'insufficient_funds' }) })

    const { default: handler } = await import('../api/agent/transform.js')
    const { paymentRequirements } = await import('../api/_lib/x402.js')
    const requirements = paymentRequirements({ amountUsd: 0.10, network: 'eip155:84532' })
    const goodPayload = Buffer.from(JSON.stringify({
      x402Version: 2,
      accepted: requirements,
      payload: { signature: '0xsig', authorization: { from: '0xbuyer', to: requirements.payTo, value: requirements.amount, validAfter: '0', validBefore: '9999999999', nonce: '0xnonce' } },
    })).toString('base64')

    const req = mockReq({
      headers: { host: 'old2new.app', 'x-forwarded-for': nextIp(), 'payment-signature': goodPayload },
      body: { recipe: 'a'.repeat(20), diets: ['vegan'] },
    })
    const res = mockRes()

    await handler(req, res)

    expect(fetchMock).toHaveBeenCalledTimes(1) // only /verify — never reaches /settle
    expect(fetchMock.mock.calls[0][0]).toContain('/verify')
    expect(res.statusCode).toBe(402)
    expect(res.body.error).toBe('insufficient_funds')
  })

  it('verifies, performs the work, and settles on a fully valid paid request', async () => {
    fetchMock
      .mockResolvedValueOnce({ ok: true, json: async () => ({ isValid: true, payer: '0xbuyer' }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ success: true, payer: '0xbuyer', transaction: '0xtx', network: 'eip155:84532' }) })

    const { default: handler } = await import('../api/agent/transform.js')
    const { paymentRequirements } = await import('../api/_lib/x402.js')
    const requirements = paymentRequirements({ amountUsd: 0.10, network: 'eip155:84532' })
    const goodPayload = Buffer.from(JSON.stringify({
      x402Version: 2,
      accepted: requirements,
      payload: { signature: '0xsig', authorization: { from: '0xbuyer', to: requirements.payTo, value: requirements.amount, validAfter: '0', validBefore: '9999999999', nonce: '0xnonce' } },
    })).toString('base64')

    const req = mockReq({
      headers: { host: 'old2new.app', 'x-forwarded-for': nextIp(), 'payment-signature': goodPayload },
      body: { recipe: 'a'.repeat(20), diets: ['vegan'] },
    })
    const res = mockRes()

    await handler(req, res)

    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(fetchMock.mock.calls[0][0]).toContain('/verify')
    expect(fetchMock.mock.calls[1][0]).toContain('/settle')
    expect(res.statusCode).toBe(200)
    expect(res.body.ok).toBe(true)
    expect(res.headers['PAYMENT-RESPONSE']).toBeTruthy()
  })

  it('does not settle when settlement itself fails after a successful transform', async () => {
    fetchMock
      .mockResolvedValueOnce({ ok: true, json: async () => ({ isValid: true, payer: '0xbuyer' }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ success: false, errorReason: 'insufficient_funds', transaction: '', network: 'eip155:84532' }) })

    const { default: handler } = await import('../api/agent/transform.js')
    const { paymentRequirements } = await import('../api/_lib/x402.js')
    const requirements = paymentRequirements({ amountUsd: 0.10, network: 'eip155:84532' })
    const goodPayload = Buffer.from(JSON.stringify({
      x402Version: 2,
      accepted: requirements,
      payload: { signature: '0xsig', authorization: { from: '0xbuyer', to: requirements.payTo, value: requirements.amount, validAfter: '0', validBefore: '9999999999', nonce: '0xnonce' } },
    })).toString('base64')

    const req = mockReq({
      headers: { host: 'old2new.app', 'x-forwarded-for': nextIp(), 'payment-signature': goodPayload },
      body: { recipe: 'a'.repeat(20), diets: ['vegan'] },
    })
    const res = mockRes()

    await handler(req, res)

    expect(res.statusCode).toBe(402)
    expect(res.body.error).toBe('settlement_failed')
    expect(res.body.result).toBeUndefined() // the transformed recipe must not leak without payment
  })

  it('bypasses payment entirely with a valid X-Agent-Key and never calls the facilitator', async () => {
    const { default: handler } = await import('../api/agent/transform.js')
    const req = mockReq({
      headers: { host: 'old2new.app', 'x-forwarded-for': nextIp(), 'x-agent-key': process.env.AGENT_API_SECRET },
      body: { recipe: 'a'.repeat(20), diets: ['vegan'] },
    })
    const res = mockRes()

    await handler(req, res)

    expect(fetchMock).not.toHaveBeenCalled()
    expect(res.statusCode).toBe(200)
    expect(res.body.ok).toBe(true)
    expect(res.headers['PAYMENT-RESPONSE']).toBeUndefined()
  })

  it('an incorrect X-Agent-Key falls through to the payment gate, not a bare 401', async () => {
    const { default: handler } = await import('../api/agent/transform.js')
    const req = mockReq({
      headers: { host: 'old2new.app', 'x-forwarded-for': nextIp(), 'x-agent-key': 'totally-wrong-key' },
      body: { recipe: 'a'.repeat(20), diets: ['vegan'] },
    })
    const res = mockRes()

    await handler(req, res)

    expect(res.statusCode).toBe(402)
  })

  it('returns 503 when ANTHROPIC_API_KEY_AGENT is not configured', async () => {
    delete process.env.ANTHROPIC_API_KEY_AGENT
    const { default: handler } = await import('../api/agent/transform.js')
    const req = mockReq({ headers: { host: 'old2new.app', 'x-forwarded-for': nextIp() }, body: {} })
    const res = mockRes()

    await handler(req, res)

    expect(res.statusCode).toBe(503)
  })

  it('rate-limits a single IP after repeated requests', async () => {
    const { default: handler } = await import('../api/agent/transform.js')
    const ip = nextIp()
    let last
    for (let i = 0; i < 25; i++) {
      const req = mockReq({ headers: { host: 'old2new.app', 'x-forwarded-for': ip }, body: {} })
      const res = mockRes()
      await handler(req, res)
      last = res
    }
    expect(last.statusCode).toBe(429)
  })
})

describe('api/agent/transform-image.js — pricing gate', () => {
  it('returns 503 pricing_pending for a public request when no price is configured', async () => {
    const { default: handler } = await import('../api/agent/transform-image.js')
    const req = mockReq({ headers: { host: 'old2new.app', 'x-forwarded-for': nextIp() }, body: { recipe: 'a'.repeat(20), diets: ['vegan'] } })
    const res = mockRes()

    await handler(req, res)

    expect(res.statusCode).toBe(503)
    expect(res.body.error).toBe('pricing_pending')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('still allows the internal X-Agent-Key path with no price configured, for cost testing', async () => {
    vi.doMock('../api/_lib/generateFoodImage.js', () => ({
      generateFoodImage: vi.fn().mockResolvedValue({
        imageUrl: 'https://example.com/img.png',
        imagePrompt: 'test',
        imageModel: 'gpt-image-1',
        imageGeneratedAt: new Date().toISOString(),
        usage: null,
      }),
    }))
    const { default: handler } = await import('../api/agent/transform-image.js')
    const req = mockReq({
      headers: { host: 'old2new.app', 'x-forwarded-for': nextIp(), 'x-agent-key': process.env.AGENT_API_SECRET },
      body: { recipe: 'a'.repeat(20), diets: ['vegan'] },
    })
    const res = mockRes()

    await handler(req, res)

    expect(res.statusCode).toBe(200)
    expect(res.body.image.imageUrl).toBe('https://example.com/img.png')
  })

  it('sends a $0.25 WWW-Authenticate challenge once a price is configured', async () => {
    process.env.X402_TRANSFORM_IMAGE_PRICE_USD = '0.25'
    const { default: handler } = await import('../api/agent/transform-image.js')
    const req = mockReq({ headers: { host: 'old2new.app', 'x-forwarded-for': nextIp() }, body: {} })
    const res = mockRes()

    await handler(req, res)

    expect(res.statusCode).toBe(402)
    const wwwAuth = res.headers['WWW-Authenticate']
    expect(wwwAuth).toBeTruthy()
    expect(wwwAuth).toMatch(/^x402\s/)
    expect(wwwAuth).toContain('amount="250000"') // $0.25 in atomic USDC
  })
})
