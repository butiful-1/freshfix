import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

export const config = {maxDuration: 10}

async function getRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    req.on('data', (c) => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)))
    req.on('end', () => resolve(Buffer.concat(chunks)))
    req.on('error', reject)
  })
}

function getSupabase() {
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

  let event
  try {
    if (webhookSecret) {
      const rawBody = await getRawBody(req)
      const sig = req.headers['stripe-signature']
      event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret)
    } else {
      event = req.body
    }
  } catch (err) {
    console.error('Webhook signature error:', err.message)
    return res.status(400).json({error: `Webhook Error: ${err.message}`})
  }

  console.log('Stripe event:', event?.type)

  switch (event?.type) {
    case 'checkout.session.completed': {
      const session = event.data.object
      const plan = session.metadata?.plan
      const userId = session.client_reference_id
      if (userId && plan && ['wellness', 'family'].includes(plan)) {
        try {
          const { error } = await getSupabase()
            .from('profiles')
            .update({ plan, swaps_used: 0 })
            .eq('id', userId)
          if (error) throw error
          console.log(`Plan upgraded — userId: ${userId}, plan: ${plan}`)
        } catch (err) {
          console.error('Webhook plan upgrade error:', err.message)
        }
      } else {
        console.log(`checkout.session.completed — plan: ${plan}, userId: ${userId || 'none'}`)
      }
      break
    }
    case 'customer.subscription.updated': {
      const sub = event.data.object
      console.log(`Subscription updated — id: ${sub.id}, status: ${sub.status}`)
      break
    }
    case 'customer.subscription.deleted': {
      const sub = event.data.object
      // Retrieve customer email from Stripe, look up user, downgrade to free
      try {
        const customer = await stripe.customers.retrieve(sub.customer)
        const email = customer.email
        if (email) {
          const supabase = getSupabase()
          const { data: { users }, error } = await supabase.auth.admin.listUsers()
          if (error) throw error
          const user = users.find(u => u.email === email)
          if (user) {
            await supabase.from('profiles').update({ plan: 'free' }).eq('id', user.id)
            console.log(`Plan downgraded — email: ${email}, plan: free`)
          } else {
            console.log(`Subscription deleted but no user found for email: ${email}`)
          }
        }
      } catch (err) {
        console.error('Webhook plan downgrade error:', err.message)
      }
      break
    }
    case 'invoice.payment_failed': {
      const inv = event.data.object
      console.log(`Payment failed — customer: ${inv.customer}`)
      break
    }
    default:
      console.log(`Unhandled event type: ${event?.type}`)
  }

  return res.json({received: true})
}
