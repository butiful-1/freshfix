import { createClient } from '@supabase/supabase-js'
import Stripe from 'stripe'

const ALLOWED_ORIGINS = [
  'capacitor://localhost', // iOS app (Capacitor WebView origin)
  'https://old2new.app',
  'https://www.old2new.app',
  'http://localhost:5174',
  'http://localhost:5173',
]

// Deletes the calling user's account. Auth: the user's own Supabase access
// token (Bearer). profiles / saved_recipes cascade from auth.users. Any
// active Stripe subscription for the user's email is cancelled first so a
// deleted user is never billed again.
export default async function handler(req, res) {
  const origin = req.headers.origin
  if (ALLOWED_ORIGINS.includes(origin)) res.setHeader('Access-Control-Allow-Origin', origin)
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  res.setHeader('Vary', 'Origin')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '')
  if (!token) return res.status(401).json({ error: 'Not signed in' })

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceKey) return res.status(500).json({ error: 'Server not configured' })

  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } })
  const { data: userData, error: userErr } = await admin.auth.getUser(token)
  const user = userData?.user
  if (userErr || !user) return res.status(401).json({ error: 'Invalid session' })

  try {
    if (process.env.STRIPE_SECRET_KEY && user.email) {
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
      const customers = await stripe.customers.list({ email: user.email, limit: 10 })
      for (const c of customers.data) {
        const subs = await stripe.subscriptions.list({ customer: c.id, status: 'active', limit: 10 })
        for (const s of subs.data) await stripe.subscriptions.cancel(s.id)
      }
    }
  } catch (e) {
    console.error('[delete-account] Stripe cleanup failed:', e.message)
    return res.status(500).json({ error: 'Could not cancel subscription. Please contact support.' })
  }

  const { error: delErr } = await admin.auth.admin.deleteUser(user.id)
  if (delErr) {
    console.error('[delete-account] deleteUser failed:', delErr.message)
    return res.status(500).json({ error: 'Deletion failed. Please contact support.' })
  }
  return res.status(200).json({ ok: true })
}
