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

// USDC contract addresses, verified live via eth_call symbol() against public
// Base RPCs — do not change without re-verifying on-chain.
const USDC_ASSETS = {
  'eip155:8453': '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', // Base mainnet
  'eip155:84532': '0x036CbD53842c5426634e7929541eC2318f3dCF7e', // Base Sepolia
}

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

export function paymentRequirements({ amountUsd, network = NETWORK }) {
  const asset = USDC_ASSETS[network]
  if (!asset) throw new Error(`No USDC asset configured for network ${network}`)
  return {
    scheme: 'exact',
    network,
    amount: usdToAtomicUsdc(amountUsd),
    asset,
    payTo: sellerAddress(),
    maxTimeoutSeconds: 60,
    extra: { name: 'USDC', version: '2' },
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

// Sends a 402 challenge per specs/transports-v2/http.md: PAYMENT-REQUIRED
// header carries the base64 PaymentRequired object; body echoes the same JSON
// for clients/tools that don't parse headers. WWW-Authenticate carries the
// same terms in RFC 7235 challenge form, per x402scan's runtime requirement.
export function send402(res, { resourceUrl, description, amountUsd, network = NETWORK, mimeType = 'application/json', error, inputSchema, outputExample }) {
  const accepts = [paymentRequirements({ amountUsd, network })]
  // agentcash-discovery's live audit (SCHEMA_INPUT_MISSING/SCHEMA_OUTPUT_MISSING)
  // reads this shape from the runtime 402 body itself, not from openapi.json —
  // traced from the actual @agentcash/discovery CLI source (extractSchemas2).
  const bazaar = inputSchema || outputExample
    ? {
        bazaar: {
          schema: {
            properties: {
              ...(inputSchema ? { input: { properties: { body: inputSchema } } } : {}),
              ...(outputExample ? { output: { properties: { example: outputExample } } } : {}),
            },
          },
        },
      }
    : {}
  const body = {
    x402Version: 2,
    error,
    resource: { url: resourceUrl, description, mimeType },
    accepts,
    extensions: bazaar,
  }
  res.setHeader('PAYMENT-REQUIRED', toB64(body))
  res.setHeader('WWW-Authenticate', accepts.map(wwwAuthenticateChallenge).join(', '))
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
