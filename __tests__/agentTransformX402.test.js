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
    expect(bazaarSchema?.properties?.output?.properties?.example).toBeDefined()
    // The literal output example now lives in the CDP-style info block.
    expect(challenge.extensions?.bazaar?.info?.output?.example?.ok).toBe(true)
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

// The buyer's EIP-3009 authorization expires maxTimeoutSeconds after signing
// and the image route settles only after transform + image generation are
// both done. A live 0.25 USDC purchase (2026-09-11) completed the work and
// then failed at /settle because the shared 60s window had already lapsed.
describe('api/agent/transform-image.js — payment window covers image generation', () => {
  function mockImage() {
    vi.doMock('../api/_lib/generateFoodImage.js', () => ({
      generateFoodImage: vi.fn().mockResolvedValue({
        imageUrl: 'https://example.com/img.png',
        imagePrompt: 'test',
        imageModel: 'gpt-image-1',
        imageGeneratedAt: new Date().toISOString(),
        usage: null,
      }),
    }))
  }

  async function paidImageRequest(requirements) {
    const goodPayload = Buffer.from(JSON.stringify({
      x402Version: 2,
      accepted: requirements,
      payload: { signature: '0xsig', authorization: { from: '0xbuyer', to: requirements.payTo, value: requirements.amount, validAfter: '0', validBefore: '9999999999', nonce: '0xnonce' } },
    })).toString('base64')
    return mockReq({
      headers: { host: 'old2new.app', 'x-forwarded-for': nextIp(), 'payment-signature': goodPayload },
      body: { recipe: 'a'.repeat(20), diets: ['vegan'] },
    })
  }

  it('gives the buyer authorization at least the function maxDuration plus a settlement margin', async () => {
    const { PAYMENT_TIMEOUT_SECONDS, config } = await import('../api/agent/transform-image.js')
    const { DEFAULT_MAX_TIMEOUT_SECONDS } = await import('../api/_lib/x402.js')
    // Work can run up to maxDuration; settle is a facilitator round-trip after that.
    expect(PAYMENT_TIMEOUT_SECONDS).toBeGreaterThanOrEqual(config.maxDuration + 30)
    expect(PAYMENT_TIMEOUT_SECONDS).toBeGreaterThan(DEFAULT_MAX_TIMEOUT_SECONDS)
  })

  it('advertises the longer window in the 402 challenge, with price, payTo, asset and network unchanged', async () => {
    process.env.X402_TRANSFORM_IMAGE_PRICE_USD = '0.25'
    const { default: handler, PAYMENT_TIMEOUT_SECONDS } = await import('../api/agent/transform-image.js')
    const req = mockReq({ headers: { host: 'old2new.app', 'x-forwarded-for': nextIp() }, body: {} })
    const res = mockRes()

    await handler(req, res)

    expect(res.statusCode).toBe(402)
    const accept = decodeHeader(res.headers['PAYMENT-REQUIRED']).accepts[0]
    expect(accept.maxTimeoutSeconds).toBe(PAYMENT_TIMEOUT_SECONDS)
    expect(accept.amount).toBe('250000') // $0.25, unchanged
    expect(accept.payTo).toBe('0x2D6503F39026E53FEBadbDf54B4F56150b4f1aEE')
    expect(accept.network).toBe('eip155:84532')
    expect(accept.asset).toBe('0x036CbD53842c5426634e7929541eC2318f3dCF7e')
    expect(res.headers['WWW-Authenticate']).toContain(`maxTimeoutSeconds="${PAYMENT_TIMEOUT_SECONDS}"`)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('sends the same longer window to the facilitator on /verify and /settle, then returns the image', async () => {
    process.env.X402_TRANSFORM_IMAGE_PRICE_USD = '0.25'
    mockImage()
    fetchMock
      .mockResolvedValueOnce({ ok: true, json: async () => ({ isValid: true, payer: '0xbuyer' }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ success: true, payer: '0xbuyer', transaction: '0xtx', network: 'eip155:84532' }) })

    const { default: handler, PAYMENT_TIMEOUT_SECONDS } = await import('../api/agent/transform-image.js')
    const { paymentRequirements } = await import('../api/_lib/x402.js')
    const requirements = paymentRequirements({ amountUsd: 0.25, network: 'eip155:84532', maxTimeoutSeconds: PAYMENT_TIMEOUT_SECONDS })
    const res = mockRes()

    await handler(await paidImageRequest(requirements), res)

    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(fetchMock.mock.calls[0][0]).toContain('/verify')
    expect(fetchMock.mock.calls[1][0]).toContain('/settle')
    for (const call of fetchMock.mock.calls) {
      const sent = JSON.parse(call[1].body)
      expect(sent.paymentRequirements.maxTimeoutSeconds).toBe(PAYMENT_TIMEOUT_SECONDS)
      expect(sent.paymentRequirements.amount).toBe('250000')
    }
    expect(res.statusCode).toBe(200)
    expect(res.body.ok).toBe(true)
    expect(res.body.image.imageUrl).toBe('https://example.com/img.png')
    expect(res.headers['PAYMENT-RESPONSE']).toBeTruthy()
  })

  it('still withholds the recipe and image when settlement fails after the work is done', async () => {
    process.env.X402_TRANSFORM_IMAGE_PRICE_USD = '0.25'
    mockImage()
    fetchMock
      .mockResolvedValueOnce({ ok: true, json: async () => ({ isValid: true, payer: '0xbuyer' }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ success: false, errorReason: 'authorization_expired', transaction: '', network: 'eip155:84532' }) })

    const { default: handler, PAYMENT_TIMEOUT_SECONDS } = await import('../api/agent/transform-image.js')
    const { paymentRequirements } = await import('../api/_lib/x402.js')
    const requirements = paymentRequirements({ amountUsd: 0.25, network: 'eip155:84532', maxTimeoutSeconds: PAYMENT_TIMEOUT_SECONDS })
    const res = mockRes()

    await handler(await paidImageRequest(requirements), res)

    expect(res.statusCode).toBe(402)
    expect(res.body.error).toBe('settlement_failed')
    expect(res.body.result).toBeUndefined()
    expect(res.body.image).toBeUndefined()
    expect(res.headers['PAYMENT-RESPONSE']).toBeUndefined()
  })

  it('leaves the text transform route on the shared 60s default', async () => {
    const { default: handler } = await import('../api/agent/transform.js')
    const { DEFAULT_MAX_TIMEOUT_SECONDS, paymentRequirements } = await import('../api/_lib/x402.js')
    expect(DEFAULT_MAX_TIMEOUT_SECONDS).toBe(60)
    expect(paymentRequirements({ amountUsd: 0.10, network: 'eip155:84532' }).maxTimeoutSeconds).toBe(60)

    const req = mockReq({ headers: { host: 'old2new.app', 'x-forwarded-for': nextIp() }, body: { recipe: 'a'.repeat(20), diets: ['vegan'] } })
    const res = mockRes()
    await handler(req, res)

    expect(res.statusCode).toBe(402)
    expect(decodeHeader(res.headers['PAYMENT-REQUIRED']).accepts[0].maxTimeoutSeconds).toBe(60)
    expect(res.headers['WWW-Authenticate']).toContain('maxTimeoutSeconds="60"')
  })
})

describe('x402 challenge metadata — EIP-712 domain and Bazaar discovery', () => {
  it('advertises the on-chain USDC domain name per network and the transfer method', async () => {
    const { paymentRequirements } = await import('../api/_lib/x402.js')
    const mainnet = paymentRequirements({ amountUsd: 0.10, network: 'eip155:8453' })
    const sepolia = paymentRequirements({ amountUsd: 0.10, network: 'eip155:84532' })
    // Base mainnet USDC's DOMAIN_SEPARATOR is built from name "USD Coin" (verified on-chain 2026-09-08);
    // the Sepolia test token uses "USDC". Signing with the wrong name reverts at settlement.
    expect(mainnet.extra).toEqual({ name: 'USD Coin', version: '2', assetTransferMethod: 'eip3009' })
    expect(mainnet.asset).toBe('0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913')
    expect(sepolia.extra).toEqual({ name: 'USDC', version: '2', assetTransferMethod: 'eip3009' })
    expect(mainnet.amount).toBe('100000')
  })

  it('carries both the CDP bazaar.info block and the x402scan schema paths, plus service metadata', async () => {
    const { default: handler } = await import('../api/agent/transform.js')
    const res = mockRes()
    await handler(mockReq({ headers: { host: 'old2new.app' }, body: {} }), res)
    expect(res.statusCode).toBe(402)
    const challenge = decodeHeader(res.headers['PAYMENT-REQUIRED'])
    expect(challenge.resource).toMatchObject({ url: 'https://old2new.app/api/agent/transform', serviceName: 'Old2New Agent API', iconUrl: 'https://old2new.app/icon-192.png' })
    expect(challenge.resource.tags.length).toBeLessThanOrEqual(5)
    const bazaar = challenge.extensions.bazaar
    expect(bazaar.info.input).toMatchObject({ type: 'http', method: 'POST', bodyType: 'json' })
    expect(bazaar.info.input.body.recipe).toContain('Lasagna')
    expect(bazaar.info.output.type).toBe('json')
    expect(bazaar.info.output.example.ok).toBe(true)
    expect(bazaar.schema.properties.input.properties.body.required).toEqual(['recipe'])
    expect(bazaar.schema.properties.input.required).toEqual(['type', 'method', 'bodyType', 'body'])
    expect(bazaar.schema.properties.output.properties.example).toBeDefined()
    expect(res.headers['WWW-Authenticate']).toMatch(/^x402 /)
  })
})
