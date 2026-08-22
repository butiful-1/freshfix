// Agent-facing paid recipe transformation, x402-protected. Isolated from the
// consumer app: no Supabase, no quota, no Stripe. Reuses api/transform.js's
// SYSTEM_PROMPT and the shared dietary safety checks so agent output can never
// drift from the consumer product.
//
// Fails closed: if AGENT_API_SECRET or ANTHROPIC_API_KEY_AGENT is unset, every
// request returns 503.
//
// Payment: a valid X-Agent-Key header (shared secret) bypasses x402 entirely —
// that's the internal/testing path. Everyone else must attach a PAYMENT-SIGNATURE
// header per x402 v2 (specs/transports-v2/http.md); payment is verified before
// the model runs and settled only after a result is actually produced, so a
// failed transform or repair never gets paid for.

import Anthropic from '@anthropic-ai/sdk'
import { randomUUID, timingSafeEqual, createHash } from 'crypto'
import {
  checkConsistency,
  buildDietaryRestrictionLines,
  parseJsonResponse,
  runRepair,
} from '../recipeConsistency.js'
import { SYSTEM_PROMPT } from '../transform.js'
import { paymentRequirements, decodeB64Header, send402, verifyPayment, settlePayment, sendPaymentResponseHeader, paymentMatchesExpected, currentNetwork } from '../_lib/x402.js'
import { rateLimit, clientIp } from '../_lib/rateLimit.js'
import { TRANSFORM_INPUT_SCHEMA, TRANSFORM_OUTPUT_EXAMPLE } from '../_lib/bazaarSchemas.js'

export const config = { maxDuration: 120 }

const SCHEMA_VERSION = '1.0'
const MODEL = 'claude-sonnet-4-6'
const PRICE_USD = 0.10
const RESOURCE_PATH = '/api/agent/transform'
const RESOURCE_DESCRIPTION =
  'Transform a recipe to match dietary restrictions and health goals using Old2New\'s recipe-consistency and safety pipeline.'

const LIMITS = { recipe: 8000, healthGoal: 300, custom: 200, diets: 10, dietLength: 60 }

const RESTRICTION_KEYS = ['dairyFree', 'glutenFree', 'noNuts', 'noPork', 'vegan']

const DISCLAIMER =
  'Nutrition values are estimates, not measurements. This is not medical advice. ' +
  'Verify every ingredient against the end user’s actual allergies and medical ' +
  'restrictions before preparing or consuming this recipe.'

function fail(res, status, error, message) {
  return res.status(status).json({ ok: false, error, message })
}

// Hash both sides so the compare is fixed-length and leaks neither content nor length.
function secretMatches(provided, expected) {
  if (typeof provided !== 'string' || !provided) return false
  const a = createHash('sha256').update(provided).digest()
  const b = createHash('sha256').update(expected).digest()
  return timingSafeEqual(a, b)
}

// Strip control characters (keeping \t \n \r) so a caller cannot smuggle
// formatting or fake structure into the prompt.
function clean(value, max) {
  if (typeof value !== 'string') return ''
  return value
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    .trim()
    .slice(0, max)
}

function validate(body) {
  const recipe = clean(body?.recipe, LIMITS.recipe)
  if (recipe.length < 10) {
    return { error: 'recipe must be a string of at least 10 characters.' }
  }

  const rawDiets = body?.diets
  if (rawDiets !== undefined && !Array.isArray(rawDiets)) {
    return { error: 'diets must be an array of strings when provided.' }
  }
  const diets = (rawDiets || [])
    .slice(0, LIMITS.diets)
    .map(d => clean(d, LIMITS.dietLength))
    .filter(Boolean)

  const healthGoal = clean(body?.healthGoal, LIMITS.healthGoal)

  if (diets.length === 0 && !healthGoal) {
    return { error: 'Provide at least one entry in diets, or a healthGoal.' }
  }

  const raw = body?.restrictions
  if (raw !== undefined && (typeof raw !== 'object' || raw === null || Array.isArray(raw))) {
    return { error: 'restrictions must be an object when provided.' }
  }
  const restrictions = {}
  for (const key of RESTRICTION_KEYS) {
    if (raw?.[key] === true) restrictions[key] = true
  }
  const custom = clean(raw?.custom, LIMITS.custom)
  if (custom) restrictions.custom = custom

  return { recipe, diets, healthGoal, restrictions }
}

export default async function handler(req, res) {
  // Agents call server-side; there is no browser origin to allow-list.
  // The shared secret is the gate, not CORS.
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Agent-Key, PAYMENT-SIGNATURE')
  res.setHeader('Access-Control-Expose-Headers', 'PAYMENT-REQUIRED, PAYMENT-RESPONSE, WWW-Authenticate')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return fail(res, 405, 'method_not_allowed', 'Use POST.')

  if (!rateLimit(clientIp(req))) {
    return fail(res, 429, 'rate_limited', 'Too many requests. Please slow down and retry shortly.')
  }

  const secret = process.env.AGENT_API_SECRET
  const apiKey = process.env.ANTHROPIC_API_KEY_AGENT
  if (!secret || !apiKey) {
    // Not configured in this environment — stay dark rather than fall back to
    // the consumer ANTHROPIC_API_KEY.
    return fail(res, 503, 'not_enabled', 'The agent API is not enabled in this environment.')
  }

  const resourceUrl = `https://${req.headers.host}${RESOURCE_PATH}`
  const network = currentNetwork()
  const usingInternalKey = secretMatches(req.headers['x-agent-key'], secret)
  const challengeDefaults = {
    resourceUrl,
    description: RESOURCE_DESCRIPTION,
    amountUsd: PRICE_USD,
    network,
    inputSchema: TRANSFORM_INPUT_SCHEMA,
    outputExample: TRANSFORM_OUTPUT_EXAMPLE,
  }

  let paymentPayload = null
  let requirements = null

  if (!usingInternalKey) {
    const expected = paymentRequirements({ amountUsd: PRICE_USD, network })

    const paymentHeader = req.headers['payment-signature']
    if (!paymentHeader) {
      return send402(res, { ...challengeDefaults, error: 'PAYMENT-SIGNATURE header is required' })
    }

    paymentPayload = decodeB64Header(paymentHeader)
    if (!paymentPayload) {
      return send402(res, { ...challengeDefaults, error: 'PAYMENT-SIGNATURE header is not valid base64-encoded JSON.' })
    }

    if (!paymentMatchesExpected(paymentPayload, expected)) {
      return send402(res, { ...challengeDefaults, error: 'Payment terms do not match this resource\'s price, asset, network, or recipient.' })
    }

    requirements = expected

    let verifyResult
    try {
      verifyResult = await verifyPayment(paymentPayload, requirements)
    } catch (err) {
      console.error('[agent-transform] facilitator /verify unreachable:', err.message)
      return fail(res, 502, 'facilitator_unavailable', 'Could not reach the payment facilitator. Please retry.')
    }
    if (!verifyResult.ok || !verifyResult.data?.isValid) {
      return send402(res, { ...challengeDefaults, error: verifyResult.data?.invalidReason || 'Payment verification failed.' })
    }
  }

  const input = validate(req.body || {})
  if (input.error) return fail(res, 400, 'invalid_request', input.error)

  const requestId = randomUUID()
  const startedAt = Date.now()
  const client = new Anthropic({ apiKey })

  try {
    // Prompt assembly mirrors api/transform.js — keep the two in sync.
    const restrictionLines = buildDietaryRestrictionLines(input.restrictions)
    const restrictionsSection = restrictionLines.length > 0
      ? `\nIMPORTANT dietary restrictions that MUST be strictly followed:\n${restrictionLines.join('\n')}\n`
      : ''
    const healthGoalSection = input.healthGoal
      ? `\nAdditional health goal or dietary preference: ${input.healthGoal}`
      : ''

    const userMessage = `Please transform this recipe for the following diet preferences: ${input.diets.join(', ') || input.healthGoal}.${restrictionsSection}${healthGoalSection}

Recipe input:
${input.recipe}

Transform it according to the diet preferences${restrictionLines.length > 0 ? ' AND dietary restrictions' : ''} and return the JSON response.`

    const message = await client.messages.create({
      model: MODEL,
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userMessage }],
    })

    const result = parseJsonResponse(message.content[0].text)

    // Same fail-closed dietary chain as the consumer endpoint: runRepair mutates
    // `result` in place and throws if violations remain after repair.
    const violations = checkConsistency(result, input.restrictions)
    if (violations.length > 0) {
      const violationDesc = violations.map(v => `${v.restriction}: found "${v.term}"`).join(', ')
      const isSafetyCritical = violations.some(v => v.restriction === 'noNuts')
      try {
        await runRepair(client, result, violationDesc, input.restrictions)
      } catch (repairErr) {
        console.error(
          `[agent-transform ${requestId}] [${isSafetyCritical ? 'CRITICAL' : 'HIGH'}] Repair failed — ${violationDesc}. Error: ${repairErr.message}`
        )
        // No result was produced — do not settle payment for it.
        return fail(
          res,
          422,
          'dietary_conflict',
          'A dietary restriction could not be satisfied for this recipe. No result was returned.'
        )
      }
    }

    console.log(
      `[agent-transform ${requestId}] ok in ${Date.now() - startedAt}ms, violations: ${violations.length}, ` +
      `usage: input=${message.usage?.input_tokens} output=${message.usage?.output_tokens}`
    )

    // Settle only after a deliverable result exists — a failed transform or an
    // unrepairable dietary conflict must never be paid for (both return above
    // before this point).
    if (!usingInternalKey) {
      let settleResult
      try {
        settleResult = await settlePayment(paymentPayload, requirements)
      } catch (err) {
        console.error(`[agent-transform ${requestId}] facilitator /settle unreachable:`, err.message)
        return fail(res, 502, 'facilitator_unavailable', 'The result was produced but payment could not be settled. Please retry.')
      }
      if (!settleResult.ok || !settleResult.data?.success) {
        console.error(`[agent-transform ${requestId}] settlement failed:`, settleResult.data?.errorReason)
        return fail(res, 402, 'settlement_failed', 'Payment could not be settled. No result was returned.')
      }
      sendPaymentResponseHeader(res, settleResult.data)
    }

    return res.status(200).json({
      ok: true,
      schemaVersion: SCHEMA_VERSION,
      requestId,
      model: MODEL,
      restrictionsApplied: input.restrictions,
      result,
      disclaimer: DISCLAIMER,
    })
  } catch (err) {
    console.error(`[agent-transform ${requestId}] error after ${Date.now() - startedAt}ms:`, err.message)
    if (err instanceof SyntaxError) {
      return fail(res, 502, 'invalid_model_output', 'The model returned an unparseable result. Please retry.')
    }
    if (err.status === 401) {
      return fail(res, 503, 'not_enabled', 'The agent API is not correctly configured.')
    }
    if (err.error?.type === 'overloaded_error' || err.status === 503) {
      return fail(res, 503, 'upstream_busy', 'The transformation service is busy. Please retry shortly.')
    }
    return fail(res, 500, 'internal_error', 'Something went wrong. Please try again.')
  }
}
