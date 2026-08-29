import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

export const config = {maxDuration: 10}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'GET') return res.status(405).json({error: 'Method not allowed'})

  const sessionId = req.query?.sessionId
  if (!sessionId) return res.status(400).json({error: 'sessionId query parameter required'})

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId)

    // Apply the entitlement here with the service role (same as the webhook,
    // idempotent) so the client never has to — and cannot — write `plan`.
    const plan = session.metadata?.plan
    const userId = session.client_reference_id
    if (session.payment_status === 'paid' && userId && ['wellness', 'family'].includes(plan)
        && process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
      const admin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
      const { error } = await admin.from('profiles').update({ plan, swaps_used: 0 }).eq('id', userId)
      if (error) console.error('verify-session plan update error:', error.message)
    }

    return res.json({
      plan: session.metadata?.plan || 'wellness',
      status: session.payment_status,
      email: session.customer_details?.email || null,
    })
  } catch (err) {
    console.error('verify-session error:', err.message)
    return res.status(500).json({error: err.message})
  }
}
