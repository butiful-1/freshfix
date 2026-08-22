// Agent-facing paid recipe transformation + food photo, x402-protected.
// Separate paid operation from api/agent/transform.js — clean architecture
// over a one-endpoint-does-everything design, per product decision.
//
// Reuses the same transformation/safety pipeline as api/agent/transform.js
// (mirrors it — keep the two in sync) and the same OpenAI + Supabase image
// pipeline as api/generate-image.js via api/_lib/generateFoodImage.js.
//
// PRICING GATE: the public x402 price is NOT activated until
// X402_TRANSFORM_IMAGE_PRICE_USD is set — until then, public (unpaid-key)
// requests get 503 pricing_pending. The X-Agent-Key internal bypass still
// works with no price set, so real cost can be measured before a price is
// chosen. Do not set this env var in any environment until the cost
// calculation has been shown and approved.

import Anthropic from '@anthropic-ai/sdk'
import { randomUUID, timingSafeEqual, createHash } from 'crypto'
import {
  checkConsistency,
  buildDietaryRestrictionLines,
  parseJsonResponse,
  runRepair,
} from '../recipeConsistency.js'
import { SYSTEM_PROMPT } from '../transform.js'
import { generateFoodImage } from '../_lib/generateFoodImage.js'
import { paymentRequirements, decodeB64Header, send402, verifyPayment, settlePayment, sendPaymentResponseHeader, paymentMatchesExpected, currentNetwork } from '../_lib/x402.js'
import { rateLimit, clientIp } from '../_lib/rateLimit.js'
import { TRANSFORM_INPUT_SCHEMA, TRANSFORM_IMAGE_OUTPUT_EXAMPLE } from '../_lib/bazaarSchemas.js'

export const config = { maxDuration: 120 }

const SCHEMA_VERSION = '1.0'
const MODEL = 'claude-sonnet-4-6'
const RESOURCE_PATH = '/api/agent/transform-image'
const RESOURCE_DESCRIPTION =
  'Transform a recipe for dietary restrictions and health goals, then generate a food photo of the result.'

const LIMITS = { recipe: 8000, healthGoal: 300, custom: 200, diets: 10, dietLength: 60 }
const RESTRICTION_KEYS = ['dairyFree', 'glutenFree', 'noNuts', 'noPork', 'vegan']

const DISCLAIMER =
  'Nutrition values are estimates, not measurements. This is not medical advice. ' +
  'Verify every ingredient against the end user’s actual allergies and medical ' +
  'restrictions before preparing or consuming this recipe. The image is an AI-generated ' +
  'illustration, not a photo of the actual prepared dish.'

function fail(res, status, error, message) {
  return res.status(status).json({ ok: false, error, message })
}

function secretMatches(provided, expected) {
  if (typeof provided !== 'string' || !provided) return false
  const a = createHash('sha256').update(provided).digest()
  const b = createHash('sha256').update(expected).digest()
  return timingSafeEqual(a, b)
}

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

function configuredPriceUsd() {
  const raw = process.env.X402_TRANSFORM_IMAGE_PRICE_USD
  if (!raw) return null
  const n = Number(raw)
  return Number.isFinite(n) && n > 0 ? n : null
}

export default async function handler(req, res) {
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
    return fail(res, 503, 'not_enabled', 'The agent API is not enabled in this environment.')
  }

  const resourceUrl = `https://${req.headers.host}${RESOURCE_PATH}`
  const network = currentNetwork()
  const usingInternalKey = secretMatches(req.headers['x-agent-key'], secret)
  const priceUsd = configuredPriceUsd()

  let paymentPayload = null
  let requirements = null

  if (!usingInternalKey) {
    if (priceUsd === null) {
      return fail(
        res,
        503,
        'pricing_pending',
        'Transform + Image is not yet available for public payment. The price has not been finalized.'
      )
    }

    const expected = paymentRequirements({ amountUsd: priceUsd, network })
    const challengeDefaults = {
      resourceUrl,
      description: RESOURCE_DESCRIPTION,
      amountUsd: priceUsd,
      network,
      inputSchema: TRANSFORM_INPUT_SCHEMA,
      outputExample: TRANSFORM_IMAGE_OUTPUT_EXAMPLE,
    }

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
      console.error('[agent-transform-image] facilitator /verify unreachable:', err.message)
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

    const violations = checkConsistency(result, input.restrictions)
    if (violations.length > 0) {
      const violationDesc = violations.map(v => `${v.restriction}: found "${v.term}"`).join(', ')
      const isSafetyCritical = violations.some(v => v.restriction === 'noNuts')
      try {
        await runRepair(client, result, violationDesc, input.restrictions)
      } catch (repairErr) {
        console.error(
          `[agent-transform-image ${requestId}] [${isSafetyCritical ? 'CRITICAL' : 'HIGH'}] Repair failed — ${violationDesc}. Error: ${repairErr.message}`
        )
        return fail(
          res,
          422,
          'dietary_conflict',
          'A dietary restriction could not be satisfied for this recipe. No result was returned.'
        )
      }
    }

    const dishName = result.transformedRecipe?.name || result.transformedRecipe?.title || 'the transformed dish'
    const ingredientList = (result.transformedRecipe?.ingredients || [])
      .map(i => `${i.amount ?? ''} ${i.item ?? ''}`.trim()).filter(Boolean).join(', ')
    const imagePrompt = `${dishName}. Ingredients: ${ingredientList}`.slice(0, 800)

    let image
    try {
      image = await generateFoodImage(imagePrompt)
    } catch (imgErr) {
      console.error(`[agent-transform-image ${requestId}] image generation failed:`, imgErr.message)
      // The transformed recipe succeeded but the image — half the paid
      // deliverable — did not. Do not settle for a partial result.
      return fail(
        res,
        502,
        'image_generation_failed',
        'The recipe transformed successfully but image generation failed. No result was returned.'
      )
    }

    console.log(
      `[agent-transform-image ${requestId}] ok in ${Date.now() - startedAt}ms, violations: ${violations.length}, ` +
      `transformUsage: input=${message.usage?.input_tokens} output=${message.usage?.output_tokens}, ` +
      `imageUsage: ${JSON.stringify(image.usage)}`
    )

    if (!usingInternalKey) {
      let settleResult
      try {
        settleResult = await settlePayment(paymentPayload, requirements)
      } catch (err) {
        console.error(`[agent-transform-image ${requestId}] facilitator /settle unreachable:`, err.message)
        return fail(res, 502, 'facilitator_unavailable', 'The result was produced but payment could not be settled. Please retry.')
      }
      if (!settleResult.ok || !settleResult.data?.success) {
        console.error(`[agent-transform-image ${requestId}] settlement failed:`, settleResult.data?.errorReason)
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
      image: { imageUrl: image.imageUrl, imageModel: image.imageModel },
      disclaimer: DISCLAIMER,
    })
  } catch (err) {
    console.error(`[agent-transform-image ${requestId}] error after ${Date.now() - startedAt}ms:`, err.message)
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
