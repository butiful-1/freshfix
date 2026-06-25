import express from 'express'
import cors from 'cors'
import Anthropic from '@anthropic-ai/sdk'
import 'dotenv/config'
import { checkConsistency, buildDietaryRestrictionLines, parseJsonResponse, runRepair } from '../api/recipeConsistency.js'

const app = express()
const PORT = process.env.PORT || 3001

app.use(cors({ origin: ['http://localhost:5174', 'http://localhost:5173', 'http://localhost:4173'] }))
app.use(express.json({ limit: '16kb' }))

const SYSTEM_PROMPT = `You are Old2New, a warm and encouraging recipe transformation assistant for healthy eating. You help people transform their old comfort recipes into healthy new favorites matching their diet preferences.

CRITICAL RULE: Respond ONLY with valid JSON. No markdown, no code fences, no explanatory text. Your entire response must be a single JSON object starting with { and ending with }.

When given a recipe (or just a dish name), transform it intelligently:
- Keep the spirit and comfort of the original dish
- Make smart ingredient swaps appropriate to the selected diets
- Be encouraging, friendly, and positive
- Always include a reminder to consult a healthcare provider

Your JSON response must match this EXACT structure:
{
  "transformedRecipe": {
    "name": "string - the transformed recipe name",
    "servings": number,
    "prepTime": "string e.g. 15 mins",
    "cookTime": "string e.g. 30 mins",
    "ingredients": [
      { "amount": "string", "item": "string", "note": "optional swap note or empty string" }
    ],
    "instructions": ["string - step 1", "string - step 2"]
  },
  "originalName": "string - the original dish name",
  "ingredientSwaps": [
    { "original": "string", "swapped": "string", "reason": "string - brief reason" }
  ],
  "caloriesBefore": number,
  "caloriesAfter": number,
  "macros": {
    "before": { "protein": number, "carbs": number, "fat": number, "fiber": number },
    "after": { "protein": number, "carbs": number, "fat": number, "fiber": number }
  },
  "whyTheseSwaps": "string - friendly explanation of the transformation approach. Always end with a reminder to consult their doctor or registered dietitian before making dietary changes.",
  "shoppingList": {
    "produce": ["string"],
    "protein": ["string"],
    "dairy": ["string"],
    "pantry": ["string"],
    "other": ["string"]
  },
  "encouragement": "string - 1-2 sentence motivating message about this transformation"
}`

const SUBSTITUTE_SYSTEM_PROMPT = `You are Old2New, a helpful recipe substitution assistant. Provide practical, healthy alternatives for ingredients the user wants to swap out.

CRITICAL RULE: Respond ONLY with valid JSON. No markdown, no code fences, no explanatory text. Your entire response must be a single JSON object starting with { and ending with }.

Your JSON response must match this EXACT structure:
{
  "substitutions": [
    {
      "original": "string - the original ingredient name",
      "substitute": "string - the recommended substitute",
      "reason": "string - brief friendly reason, max 15 words"
    }
  ]
}`

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

app.post('/api/transform', async (req, res) => {
  const t0 = Date.now()
  const elapsed = () => `+${Date.now() - t0}ms`
  console.log(`[transform] ${elapsed()} request received, dietaryPreferences:`, JSON.stringify(req.body?.dietaryPreferences ?? null))
  const { recipe, diets, dietaryPreferences } = req.body

  if (!recipe || !diets || !Array.isArray(diets) || diets.length === 0) {
    return res.status(400).json({ error: 'Recipe and at least one diet preference are required.' })
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey || apiKey === 'your_api_key_here') {
    return res.status(500).json({
      error: 'API key not configured. Please add your ANTHROPIC_API_KEY to the .env file and restart the server.'
    })
  }

  const client = new Anthropic({ apiKey })

  try {
    const restrictionLines = buildDietaryRestrictionLines(dietaryPreferences)
    const restrictionsSection = restrictionLines.length > 0
      ? `\nIMPORTANT dietary restrictions that MUST be strictly followed:\n${restrictionLines.join('\n')}\n`
      : ''

    const userMessage = `Please transform this recipe for the following diet preferences: ${diets.join(', ')}.${restrictionsSection}

Recipe input:
${recipe}

Transform it according to the diet preferences${restrictionLines.length > 0 ? ' AND dietary restrictions' : ''} and return the JSON response.`

    console.log(`[transform] ${elapsed()} calling Sonnet`)
    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userMessage }]
    })
    console.log(`[transform] ${elapsed()} Sonnet complete`)

    let result = parseJsonResponse(message.content[0].text)

    console.log(`[transform] ${elapsed()} running checkConsistency`)
    const violations = checkConsistency(result, dietaryPreferences)
    console.log(`[transform] ${elapsed()} checkConsistency done — violations: ${violations.length}`, violations.length ? JSON.stringify(violations) : '')
    if (violations.length > 0) {
      const violationDesc = violations.map(v => `${v.restriction}: found "${v.term}"`).join(', ')
      const isSafetyCritical = violations.some(v => v.restriction === 'noNuts')
      try {
        await runRepair(client, result, violationDesc, dietaryPreferences)
        console.log(`[transform] ${elapsed()} runRepair complete`)
      } catch (repairErr) {
        console.error(
          `[${isSafetyCritical ? 'CRITICAL' : 'HIGH'}] Repair call failed — dietary violation unresolved. Violations: ${violationDesc}. Error: ${repairErr.message}`
        )
        return res.status(500).json({
          error: 'We detected a dietary restriction issue that could not be safely resolved. Please try again.',
        })
      }
    }

    console.log(`[transform] ${elapsed()} sending response`)
    res.json(result)
  } catch (err) {
    console.error(`[transform] ${elapsed()} error:`, err.message)
    if (err instanceof SyntaxError) {
      res.status(500).json({ error: 'The AI returned an unexpected format. Please try again.' })
    } else if (err.status === 401) {
      res.status(500).json({ error: 'Invalid API key. Please check your ANTHROPIC_API_KEY in .env.' })
    } else if (err.error?.type === 'overloaded_error' || err.status === 503) {
      res.status(503).json({ error: '🌿 Our kitchen is a little busy right now. Please try again in a moment!' })
    } else {
      res.status(500).json({ error: 'Something went wrong. Please try again!' })
    }
  }
})

app.post('/api/substitute', async (req, res) => {
  const { ingredients, diets, recipeName, dietaryPreferences } = req.body

  if (!ingredients || !Array.isArray(ingredients) || ingredients.length === 0) {
    return res.status(400).json({ error: 'At least one ingredient is required.' })
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey || apiKey === 'your_api_key_here') {
    return res.status(500).json({ error: 'API key not configured.' })
  }

  const client = new Anthropic({ apiKey })

  try {
    const restrictionLines = buildDietaryRestrictionLines(dietaryPreferences)
    const contextParts = []
    if (recipeName) contextParts.push(`Recipe: ${recipeName}`)
    if (diets?.length > 0) contextParts.push(`Diet preferences: ${diets.join(', ')}`)
    if (restrictionLines.length > 0) contextParts.push(`Dietary restrictions:\n${restrictionLines.join('\n')}`)

    const userMessage = `${contextParts.join('\n')}

Please suggest healthy substitutes for these ingredients the user wants to swap out:
${ingredients.map(ing => `- ${ing}`).join('\n')}

Provide practical substitutes that work in this recipe and respect all dietary preferences and restrictions.`

    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: SUBSTITUTE_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userMessage }]
    })

    const result = parseJsonResponse(message.content[0].text)
    res.json(result)
  } catch (err) {
    console.error('Substitute error:', err.message)
    if (err instanceof SyntaxError) {
      res.status(500).json({ error: 'The AI returned an unexpected format. Please try again.' })
    } else if (err.error?.type === 'overloaded_error' || err.status === 503) {
      res.status(503).json({ error: '🌿 Our kitchen is a little busy right now. Please try again in a moment!' })
    } else {
      res.status(500).json({ error: 'Something went wrong. Please try again!' })
    }
  }
})

app.post('/api/sync-recipe', async (req, res) => {
  console.log('[sync-recipe] request received, dietaryPreferences:', JSON.stringify(req.body?.dietaryPreferences ?? null))
  const { recipe, dietaryPreferences } = req.body

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

    res.json(recipe)
  } catch (err) {
    console.error('Sync-recipe error:', err.message)
    if (err instanceof SyntaxError) {
      res.status(500).json({ error: 'The AI returned an unexpected format. Please try again.' })
    } else if (err.error?.type === 'overloaded_error' || err.status === 503) {
      res.status(503).json({ error: '🌿 Our kitchen is a little busy right now. Please try again in a moment!' })
    } else {
      res.status(500).json({ error: 'Something went wrong. Please try again!' })
    }
  }
})

app.get('/api/health', (_req, res) => res.json({ status: 'ok', model: 'claude-sonnet-4-6' }))

app.listen(PORT, () => {
  console.log(`\n🌿 Old2New API server running on http://localhost:${PORT}`)
  console.log(`   API key configured: ${process.env.ANTHROPIC_API_KEY && process.env.ANTHROPIC_API_KEY !== 'your_api_key_here' ? '✅ Yes' : '❌ No — add to .env file'}\n`)
})
