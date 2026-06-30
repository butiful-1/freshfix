import Anthropic from '@anthropic-ai/sdk'
import { checkConsistency, buildDietaryRestrictionLines, parseJsonResponse } from './recipeConsistency.js'

export const config = { maxDuration: 30 }

const ALLOWED_ORIGINS = [
  'https://old2new.app',
  'https://www.old2new.app',
  'https://old2new-app.vercel.app',
  'http://localhost:5174',
  'http://localhost:5173',
  'http://localhost:4173',
]

export const VALID_MEAL_TYPES = ['Breakfast', 'Lunch', 'Dinner', 'Snack', 'Dessert']

const PORK_PROTEINS = ['Pork']
const MEAT_PROTEINS = ['Chicken', 'Beef', 'Fish', 'Shrimp', 'Pork', 'Lamb', 'Turkey', 'Eggs']

// Strip protein filters that conflict with saved dietary restrictions.
// Dietary restrictions always win — this prevents the AI from ignoring them.
function resolveFilters(filters, dietaryPreferences) {
  if (!filters) return {}
  const resolved = { ...filters }
  if (dietaryPreferences?.noPork && PORK_PROTEINS.includes(resolved.protein)) {
    console.log('[suggest] stripped conflicting protein filter:', resolved.protein, '(noPork active)')
    resolved.protein = null
  }
  if (dietaryPreferences?.vegan && MEAT_PROTEINS.includes(resolved.protein)) {
    console.log('[suggest] stripped conflicting protein filter:', resolved.protein, '(vegan active)')
    resolved.protein = null
  }
  return resolved
}

function buildUserMessage(mealType, filters, restrictionLines) {
  const parts = [`Meal type: ${mealType}`]
  if (filters.protein)     parts.push(`Preferred protein: ${filters.protein}`)
  if (filters.cuisine)     parts.push(`Cuisine style: ${filters.cuisine}`)
  if (filters.cookingTime) parts.push(`Max cooking time: ${filters.cookingTime}`)
  if (filters.budget)      parts.push(`Budget level: ${filters.budget}`)

  const restrictionsSection = restrictionLines.length > 0
    ? `\nDietary restrictions (STRICTLY required — do not suggest anything containing these):\n${restrictionLines.join('\n')}\n`
    : ''

  return `${parts.join('\n')}${restrictionsSection}\n\nSuggest 5 varied, interesting meal ideas. Return diverse options — different cuisines, flavors, and cooking styles where possible.`
}

const SYSTEM_PROMPT = `You are Old2New, a creative meal suggestion assistant. Suggest delicious, practical meal ideas based on the user's preferences and dietary restrictions.

CRITICAL RULE: Respond ONLY with valid JSON matching this exact structure:
{
  "ideas": [
    {
      "name": "string — recipe name, max 6 words",
      "description": "string — one-line description, max 15 words",
      "cookingTime": "string — e.g. '20 mins' or '1 hr'",
      "calories": number or null,
      "emoji": "string — single emoji representing the dish",
      "imagePrompt": "string — detailed visual description for food photography, e.g. 'golden teriyaki salmon bowl with white rice, steamed broccoli, sesame seeds, top-down view, natural light'"
    }
  ]
}`

// Scans name, description, AND imagePrompt — imagePrompt can describe a dish
// in ways the short name/description don't, so all three fields need checking.
function checkIdeaConsistency(idea, dietaryPreferences) {
  const fakeRecipe = {
    transformedRecipe: {
      ingredients: [{ amount: '', item: idea.name }],
      instructions: [idea.description, idea.imagePrompt || ''],
    },
    shoppingList: {},
  }
  return checkConsistency(fakeRecipe, dietaryPreferences)
}

// Resolves conflicting filters internally so callers pass raw user input.
// Throws only on API failure — consistency failures are handled by returning
// fewer than 5 ideas (never returning a violating one).
export async function generateMealIdeas({ mealType, filters: rawFilters, dietaryPreferences, client }) {
  const filters = resolveFilters(rawFilters, dietaryPreferences)
  const restrictionLines = buildDietaryRestrictionLines(dietaryPreferences)
  const userMessage = buildUserMessage(mealType, filters, restrictionLines)

  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1500,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userMessage }],
  })

  const parsed = parseJsonResponse(message.content[0].text)
  const ideas = parsed.ideas || []

  const clean = []
  const violating = []
  for (const idea of ideas) {
    const violations = checkIdeaConsistency(idea, dietaryPreferences)
    if (violations.length > 0) {
      console.error('[suggest] idea failed consistency check:', idea.name, JSON.stringify(violations))
      violating.push(idea)
    } else {
      clean.push(idea)
    }
  }

  // One retry to replace failing ideas — never return a violating one
  if (violating.length > 0 && clean.length < 5) {
    console.log(`[suggest] ${violating.length} idea(s) failed — retrying for replacements`)
    const violatingNames = violating.map(i => i.name).join(', ')
    const retryMessage = `${userMessage}\n\nDo NOT suggest any of these (they violated dietary restrictions): ${violatingNames}. Return only ${violating.length} replacement idea(s) as a JSON "ideas" array.`
    try {
      const retry = await client.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 800,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: retryMessage }],
      })
      const retryParsed = parseJsonResponse(retry.content[0].text)
      for (const idea of retryParsed.ideas || []) {
        const violations = checkIdeaConsistency(idea, dietaryPreferences)
        if (violations.length === 0) {
          clean.push(idea)
        } else {
          console.error('[suggest] retry idea also failed — dropping:', idea.name)
        }
      }
    } catch (retryErr) {
      console.error('[suggest] retry call failed:', retryErr.message)
    }
  }

  return clean.slice(0, 5)
}

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

  const { mealType, filters, dietaryPreferences } = req.body || {}

  if (!mealType || !VALID_MEAL_TYPES.includes(mealType)) {
    return res.status(400).json({ error: 'A valid meal type is required.' })
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey || apiKey === 'your_api_key_here') {
    return res.status(500).json({ error: 'API key not configured.' })
  }

  const client = new Anthropic({ apiKey })

  try {
    const ideas = await generateMealIdeas({ mealType, filters, dietaryPreferences, client })
    return res.json({ ideas })
  } catch (err) {
    console.error('[suggest] error:', err.message)
    if (err instanceof SyntaxError) {
      return res.status(500).json({ error: 'Something went wrong. Please try again.' })
    }
    if (err.error?.type === 'overloaded_error' || err.status === 503) {
      return res.status(503).json({ error: '🌿 Our kitchen is a little busy right now. Please try again in a moment!' })
    }
    return res.status(500).json({ error: 'Something went wrong. Please try again!' })
  }
}
