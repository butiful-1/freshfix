// Seller-side x402 protocol v2 helpers (HTTP transport).
// Spec: https://github.com/coinbase/x402/blob/main/specs/x402-specification-v2.md
// Header names/shapes verified against specs/transports-v2/http.md — this is the
// v2 header set (PAYMENT-REQUIRED / PAYMENT-SIGNATURE / PAYMENT-RESPONSE), not
// the older v1 X-PAYMENT / X-PAYMENT-RESPONSE pair.
//
// Facilitator: defaults to the free, no-auth Mogami v2 facilitator, which
// confirmed support for both eip155:84532 (Base Sepolia) and eip155:8453
// (Base mainnet) via its /supported endpoint. Override with X402_FACILITATOR_URL.
//
// Network defaults to Base Sepolia so nothing settles real funds until
// X402_NETWORK=eip155:8453 is set explicitly for production.

const FACILITATOR_BASE = process.env.X402_FACILITATOR_URL || 'https://v2.facilitator.mogami.tech'
const NETWORK = process.env.X402_NETWORK || 'eip155:84532'

// USDC contract addresses AND EIP-712 domain names per network. The exact/EVM
// scheme signs an EIP-3009 transferWithAuthorization against the token's own
// domain, so `extra.name`/`extra.version` must equal what the contract uses or
// the signature reverts at settlement. Verified 2026-09-08 by recomputing the
// contract's DOMAIN_SEPARATOR(): Base mainnet USDC is "USD Coin" (NOT "USDC" —
// the value advertised before this fix, which Mogami's shallow /verify accepted
// but the chain would reject); Base Sepolia's test USDC is "USDC". Version "2"
// on both. Do not change without re-verifying on-chain.
const USDC = {
  'eip155:8453': { asset: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', name: 'USD Coin', version: '2' }, // Base mainnet
  'eip155:84532': { asset: '0x036CbD53842c5426634e7929541eC2318f3dCF7e', name: 'USDC', version: '2' }, // Base Sepolia
}

export const SERVICE_NAME = 'Old2New Agent API'
export const SERVICE_TAGS = ['recipes', 'food', 'nutrition', 'dietary-restrictions', 'ai']

function sellerAddress() {
  const addr = process.env.X402_PAY_TO_ADDRESS
  if (!addr) throw new Error('X402_PAY_TO_ADDRESS is not configured')
  return addr
}

// USDC has 6 decimals.
function usdToAtomicUsdc(usd) {
  return String(Math.round(usd * 1e6))
}

export function currentNetwork() {
  return NETWORK
}

export function usdcFor(network = NETWORK) {
  const token = USDC[network]
  if (!token) throw new Error(`No USDC asset configured for network ${network}`)
  return token
}

// How long the buyer's signed EIP-3009 authorization stays valid. x402 clients
// set `validBefore = now + maxTimeoutSeconds` when they sign, and we settle
// only AFTER the paid work is produced — so this must cover the route's whole
// verify → work → settle span, or the facilitator rejects the settlement as
// expired and the buyer's completed result is withheld. 60s fits a single
// model call (transform); routes that do more work pass a larger value.
export const DEFAULT_MAX_TIMEOUT_SECONDS = 60

export function paymentRequirements({ amountUsd, network = NETWORK, maxTimeoutSeconds = DEFAULT_MAX_TIMEOUT_SECONDS }) {
  const token = usdcFor(network)
  return {
    scheme: 'exact',
    network,
    amount: usdToAtomicUsdc(amountUsd),
    asset: token.asset,
    payTo: sellerAddress(),
    maxTimeoutSeconds,
    extra: { name: token.name, version: token.version, assetTransferMethod: 'eip3009' },
  }
}

function toB64(obj) {
  return Buffer.from(JSON.stringify(obj)).toString('base64')
}

export function decodeB64Header(value) {
  if (typeof value !== 'string' || !value) return null
  try {
    return JSON.parse(Buffer.from(value, 'base64').toString('utf8'))
  } catch {
    return null
  }
}

// RFC 7235 auth-challenge string for one PaymentRequirements entry, scheme
// name "x402" so agentcash-discovery's substring-based protocol detector
// (`www-authenticate` containing "x402") recognizes it. x402scan's Quickstart
// requires a WWW-Authenticate header on every unpaid challenge in addition to
// the PAYMENT-REQUIRED header/body — this is that header, not a replacement
// for either.
function wwwAuthenticateChallenge(req) {
  const parts = [
    `realm="${req.payTo}"`,
    `scheme="${req.scheme}"`,
    `network="${req.network}"`,
    `amount="${req.amount}"`,
    `asset="${req.asset}"`,
    `payTo="${req.payTo}"`,
    `maxTimeoutSeconds="${req.maxTimeoutSeconds}"`,
  ]
  return `x402 ${parts.join(', ')}`
}

// Bazaar discovery block, read by two consumers:
//   - CDP Bazaar / Agentic.Market: `extensions.bazaar.info` (input example with
//     type/method/bodyType/body, output example) + `schema`, the shape
//     @x402/extensions `declareDiscoveryExtension` emits for a JSON-body route
//     (verified against the published package v2.25.0). A missing `info` block
//     is a hard rejection in CDP's validator.
//   - x402scan / agentcash: reads `schema.properties.input` / `.output`
//     (traced from the @agentcash/discovery CLI source, extractSchemas2).
// One schema satisfies both because it nests `input.properties.body` and
// `output.properties.example`.
export function buildBazaarExtension({ method = 'POST', inputSchema, inputExample, outputExample }) {
  if (!inputSchema && !outputExample) return {}
  const info = {
    input: { type: 'http', method, bodyType: 'json', body: inputExample || {} },
    ...(outputExample ? { output: { type: 'json', example: outputExample } } : {}),
  }
  const schema = {
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    type: 'object',
    properties: {
      input: {
        type: 'object',
        properties: {
          type: { type: 'string', const: 'http' },
          method: { type: 'string', enum: [method] },
          bodyType: { type: 'string', enum: ['json'] },
          body: inputSchema || { type: 'object', properties: {} },
        },
        required: ['type', 'method', 'bodyType', 'body'],
        additionalProperties: false,
      },
      ...(outputExample ? { output: { type: 'object', properties: { type: { type: 'string' }, example: { type: 'object' } }, required: ['type'] } } : {}),
    },
    required: ['input'],
  }
  return { bazaar: { info, schema } }
}

export function buildPaymentRequired({ resourceUrl, description, amountUsd, network = NETWORK, maxTimeoutSeconds = DEFAULT_MAX_TIMEOUT_SECONDS, mimeType = 'application/json', error, inputSchema, inputExample, outputExample, iconUrl }) {
  return {
    x402Version: 2,
    error,
    resource: {
      url: resourceUrl,
      description,
      mimeType,
      serviceName: SERVICE_NAME,
      tags: SERVICE_TAGS,
      ...(iconUrl ? { iconUrl } : {}),
    },
    accepts: [paymentRequirements({ amountUsd, network, maxTimeoutSeconds })],
    extensions: buildBazaarExtension({ method: 'POST', inputSchema, inputExample, outputExample }),
  }
}

// Sends a 402 challenge per specs/transports-v2/http.md: PAYMENT-REQUIRED
// header carries the base64 PaymentRequired object; body echoes the same JSON
// for clients/tools that don't parse headers. WWW-Authenticate carries the
// same terms in RFC 7235 challenge form, per x402scan's runtime requirement.
export function send402(res, params) {
  const body = buildPaymentRequired(params)
  res.setHeader('PAYMENT-REQUIRED', toB64(body))
  res.setHeader('WWW-Authenticate', body.accepts.map(wwwAuthenticateChallenge).join(', '))
  return res.status(402).json(body)
}

async function facilitatorCall(path, payload) {
  const resp = await fetch(`${FACILITATOR_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  let data = {}
  try {
    data = await resp.json()
  } catch {
    // leave data as {}
  }
  return { ok: resp.ok, status: resp.status, data }
}

export async function verifyPayment(paymentPayload, requirements) {
  return facilitatorCall('/verify', { x402Version: 2, paymentPayload, paymentRequirements: requirements })
}

export async function settlePayment(paymentPayload, requirements) {
  return facilitatorCall('/settle', { x402Version: 2, paymentPayload, paymentRequirements: requirements })
}

export function sendPaymentResponseHeader(res, settleData) {
  res.setHeader('PAYMENT-RESPONSE', toB64(settleData))
}

// Confirms the payload a buyer sent actually matches the price/recipient/asset
// we advertised — a buyer cannot dictate its own price by editing `accepted`
// before signing (the signature itself still covers `accepted`, but this catches
// mismatches before we spend a facilitator call on them).
export function paymentMatchesExpected(paymentPayload, expected) {
  const got = paymentPayload?.accepted
  return (
    got &&
    got.scheme === expected.scheme &&
    got.network === expected.network &&
    got.amount === expected.amount &&
    got.asset === expected.asset &&
    got.payTo === expected.payTo
  )
}
