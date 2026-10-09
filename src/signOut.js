// Sign-out that responds on the first tap.
//
// supabase.auth.signOut() defaults to scope 'global': it first POSTs to the
// auth server to revoke the session and only THEN clears the local session and
// emits SIGNED_OUT. On a phone that round trip can take seconds, during which
// nothing on screen changes, so people tap Sign Out again and again (seen on
// the TestFlight build 7 review device). This does it the other way round:
//   1. sign out locally (instant: clears storage, emits SIGNED_OUT, the app
//      navigates to the splash immediately), then
//   2. revoke the session on the server in the background with the token we
//      captured first, so the refresh token is still invalidated server-side.
// A failed revoke never blocks the user; the local session is already gone.
export async function signOutFast(client) {
  let token = null
  try {
    const { data } = await client.auth.getSession()
    token = data?.session?.access_token || null
  } catch {}
  const { error } = await client.auth.signOut({ scope: 'local' })
  if (error) throw error
  if (token) {
    client.auth.admin.signOut(token, 'global').catch((e) => {
      console.warn('[Old2New] Server-side sign-out revoke failed (local sign-out already done):', e?.message || e)
    })
  }
  return { revoked: !!token }
}
