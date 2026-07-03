import { createClient } from '@supabase/supabase-js'

const supabaseUrl  = import.meta.env.VITE_SUPABASE_URL
const supabaseAnon = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnon) {
  console.error(
    '[Old2New] Missing Supabase env vars.',
    'Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in Vercel → Settings → Environment Variables, then redeploy.'
  )
}

// Fallback placeholder prevents createClient() from throwing when env vars are
// missing (e.g. cached Vercel build before env vars were added).
// The app will degrade gracefully: auth will fail but won't crash.
// detectSessionInUrl: false — we handle the auth callback URL params
// ourselves in App.jsx so the client doesn't race with our own exchange call.
export const supabase = createClient(
  supabaseUrl  || 'https://placeholder.supabase.co',
  supabaseAnon || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJwbGFjZWhvbGRlciJ9.placeholder',
  { auth: { detectSessionInUrl: false, flowType: 'pkce', skipAutoInitialize: true } }
)

export const isSupabaseReady = Boolean(supabaseUrl && supabaseAnon)
