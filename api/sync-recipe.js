import Anthropic from '@anthropic-ai/sdk'
import { checkConsistency, buildDietaryRestrictionLines, parseJsonResponse, runRepair } from './recipeConsistency.js'

export const config = { maxDuration: 30 }

const ALLOWED_ORIGINS = [
  'https://freshfix.app',
  'https://www.freshfix.app',
  'https://freshfix-app.vercel.app',
  'http://localhost:5174',
  'http://localhost:5173',
  'http://localhost:4173',
]

const SYNC_SYSTEM_PROMPT = `You are Old2New. The user has edited the ingredient list of a recipe. Rewrite the instructions and shoppingList to match the updated ingredients exactly, following the user's dietary restrictions.

CRITICAL RULE: Respond ONLY with valid JSON matching this exact structure:
{
  "instructions": ["string - step 1", "string - step 2"],
  "shoppingList": {
    "produce": ["string"],
    "protein": ["string"],
    "dairy": ["string"],
    "pantry": ["string"],
    "other": ["string"]
  }
}`

export default async function handler(req, res) {
  const origin = req.headers.origin
  if (ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin)
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  res.setHeader('Vary', 'Origin')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { recipe, dietaryPreferences } = req.body || {}

  if (!recipe?.transformedRecipe?.ingredients?.length) {
    return res.status(400).json({ error: 'Recipe with ingredients is required.' })
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey || apiKey === 'your_api_key_here') {
    return res.status(500).json({ error: 'API key not configured.' })
  }

  const client = new Anthropic({ apiKey })

  try {
    const ingredientList = recipe.transformedRecipe.ingredients
      .map(i => `${i.amount} ${i.item}`.trim())
      .join(', ')

    const restrictionLines = buildDietaryRestrictionLines(dietaryPreferences)
    const restrictionsSection = restrictionLines.length > 0
      ? `\nDietary restrictions that MUST be followed:\n${restrictionLines.join('\n')}\n`
      : ''

    const sync = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1500,
      system: SYNC_SYSTEM_PROMPT,
      messages: [{
        role: 'user',
        content: `Updated ingredient list: ${ingredientList}${restrictionsSection}\n\nRewrite the instructions and shoppingList to match these ingredients exactly.`,
      }],
    })

    const synced = parseJsonResponse(sync.content[0].text)
    if (synced.instructions) recipe.transformedRecipe.instructions = synced.instructions
    if (synced.shoppingList) recipe.shoppingList = synced.shoppingList

    // Safety gate: verify the synced result respects dietary restrictions.
    const violations = checkConsistency(recipe, dietaryPreferences)
    if (violations.length > 0) {
      const violationDesc = violations.map(v => `${v.restriction}: found "${v.term}"`).join(', ')
      const isSafetyCritical = violations.some(v => v.restriction === 'noNuts')
      try {
        await runRepair(client, recipe, violationDesc, dietaryPreferences)
      } catch (repairErr) {
        console.error(
          `[${isSafetyCritical ? 'CRITICAL' : 'HIGH'}] Sync-repair call failed — dietary violation unresolved. Violations: ${violationDesc}. Error: ${repairErr.message}`
        )
        return res.status(500).json({
          error: 'We detected a dietary restriction issue that could not be safely resolved. Please try again.',
        })
      }
    }

    return res.json(recipe)
  } catch (err) {
    console.error('Sync-recipe error:', err.message)
    if (err instanceof SyntaxError) {
      return res.status(500).json({ error: 'Something went wrong. Please try again.' })
    }
    if (err.status === 401) {
      return res.status(500).json({ error: 'Invalid API key.' })
    }
    if (err.error?.type === 'overloaded_error' || err.status === 503) {
      return res.status(503).json({ error: '🌿 Our kitchen is a little busy right now. Please try again in a moment!' })
    }
    return res.status(500).json({ error: 'Something went wrong. Please try again!' })
  }
}
