// Client-side account-deletion request, extracted from the UI so it can be
// unit-tested without a DOM. Apple Guideline 5.1.1(v) requires account deletion
// to work entirely in-app; the UI must not depend on window.confirm/alert
// (unreliable inside the iOS WKWebView), so the confirmation is an in-app modal
// and this module owns only the network call and its result contract.

// Performs the authenticated DELETE request. Returns { ok: true } on success,
// throws an Error with a user-facing message otherwise.
//
//   token       — the caller's Supabase access token (Bearer).
//   endpoint    — resolved URL for /api/delete-account (apiUrl() handles native).
//   fetchImpl   — injectable for tests; defaults to global fetch.
export async function requestAccountDeletion({ token, endpoint, fetchImpl = fetch }) {
  if (!token) {
    throw new Error('Please sign in again and retry.')
  }
  let res
  try {
    res = await fetchImpl(endpoint, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    })
  } catch {
    // Network/transport failure — never a partial delete the user can see.
    throw new Error('Network error. Check your connection and try again.')
  }
  if (!res.ok) {
    let body = {}
    try { body = await res.json() } catch {}
    throw new Error(body.error || `Request failed (${res.status}).`)
  }
  return { ok: true }
}
