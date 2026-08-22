import { generateFoodImage } from './_lib/generateFoodImage.js'

export const config = { maxDuration: 60 }

const ALLOWED_ORIGINS = [
  'https://old2new.app',
  'https://www.old2new.app',
  'http://localhost:5174',
  'http://localhost:5173',
  'http://localhost:4173',
]

export default async function handler(req, res) {
  const origin = req.headers.origin
  if (ALLOWED_ORIGINS.includes(origin)) res.setHeader('Access-Control-Allow-Origin', origin)
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  res.setHeader('Vary', 'Origin')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { imagePrompt } = req.body || {}
  if (!imagePrompt) return res.status(400).json({ error: 'imagePrompt is required' })

  if (!process.env.OPENAI_API_KEY) return res.status(500).json({ error: 'OPENAI_API_KEY not configured' })
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return res.status(500).json({ error: 'Storage not configured' })
  }

  try {
    const { imageUrl, imagePrompt: fullPrompt, imageModel, imageGeneratedAt } = await generateFoodImage(imagePrompt)
    return res.json({ imageUrl, imagePrompt: fullPrompt, imageModel, imageGeneratedAt })
  } catch (err) {
    console.error('[Old2New] Image generation error:', err.message)
    return res.status(500).json({ error: 'Image generation failed. Recipe saved without image.' })
  }
}
