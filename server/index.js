import express from 'express'
import cors from 'cors'
import Anthropic from '@anthropic-ai/sdk'
import 'dotenv/config'

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

function buildDietaryRestrictionLines(dietaryPreferences) {
  const lines = []
  if (dietaryPreferences?.noPork) lines.push('- No pork or pork-derived products (bacon, ham, lard, etc.)')
  if (dietaryPreferences?.vegan) lines.push('- Vegan: strictly no animal products (no meat, poultry, seafood, dairy, eggs, honey)')
  if (dietaryPreferences?.dairyFree) lines.push('- Dairy free: no milk, cheese, butter, cream, yogurt, or any dairy derivatives')
  if (dietaryPreferences?.glutenFree) lines.push('- Gluten free: no wheat, barley, rye, or gluten-containing ingredients')
  if (dietaryPreferences?.noNuts) lines.push('- No nuts or tree nuts (treat as allergy — safety-critical)')
  if (dietaryPreferences?.custom?.trim()) lines.push(`- ${dietaryPreferences.custom.trim()}`)
  return lines
}

function parseJsonResponse(text) {
  let t = text.trim()
  if (t.startsWith('```')) {
    const match = t.match(/```(?:json)?\s*([\s\S]*?)```/)
    if (match) t = match[1].trim()
  }
  const start = t.indexOf('{')
  const end = t.lastIndexOf('}')
  if (start !== -1 && end !== -1) t = t.slice(start, end + 1)
  return JSON.parse(t)
}

app.post('/api/transform', async (req, res) => {
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

    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userMessage }]
    })

    const result = parseJsonResponse(message.content[0].text)
    res.json(result)
  } catch (err) {
    console.error('Transform error:', err.message)
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

app.get('/api/health', (_req, res) => res.json({ status: 'ok', model: 'claude-sonnet-4-6' }))

app.listen(PORT, () => {
  console.log(`\n🌿 Old2New API server running on http://localhost:${PORT}`)
  console.log(`   API key configured: ${process.env.ANTHROPIC_API_KEY && process.env.ANTHROPIC_API_KEY !== 'your_api_key_here' ? '✅ Yes' : '❌ No — add to .env file'}\n`)
})
