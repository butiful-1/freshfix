import { createClient } from '@supabase/supabase-js'
import { randomUUID } from 'crypto'

const ALLOWED_ORIGINS = [
  'https://old2new.app',
  'https://www.old2new.app',
  'http://localhost:5174',
  'http://localhost:5173',
  'http://localhost:4173',
]

const REPORTS_BUCKET = 'recipe-reports'

function clip(value, max) {
  return typeof value === 'string' ? value.slice(0, max) : ''
}

export default async function handler(req, res) {
  const origin = req.headers.origin
  if (ALLOWED_ORIGINS.includes(origin)) res.setHeader('Access-Control-Allow-Origin', origin)
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  res.setHeader('Vary', 'Origin')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { recipeName, recipeId, userId, comments } = req.body || {}
  if (!recipeName || typeof recipeName !== 'string') {
    return res.status(400).json({ error: 'recipeName is required' })
  }

  const supabaseUrl = process.env.SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !supabaseServiceKey) return res.status(500).json({ error: 'Storage not configured' })

  const report = {
    recipeName: clip(recipeName, 300),
    recipeId: clip(recipeId, 100),
    userId: clip(userId, 100),
    comments: clip(comments, 2000),
    userAgent: clip(req.headers['user-agent'] || '', 300),
    reportedAt: new Date().toISOString(),
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const fileName = `${report.reportedAt.replace(/[:.]/g, '-')}-${randomUUID()}.json`
    const body = Buffer.from(JSON.stringify(report, null, 2))
    const opts = { contentType: 'application/json' }

    let { error } = await supabase.storage.from(REPORTS_BUCKET).upload(fileName, body, opts)

    // Self-provision on first ever report: create the bucket and retry once.
    if (error && /not found/i.test(error.message)) {
      await supabase.storage.createBucket(REPORTS_BUCKET, { public: false })
      ;({ error } = await supabase.storage.from(REPORTS_BUCKET).upload(fileName, body, opts))
    }

    if (error) throw new Error(error.message)
    return res.json({ ok: true })
  } catch (err) {
    console.error('Report-recipe error:', err.message)
    return res.status(500).json({ error: 'Could not submit report. Please try again.' })
  }
}
