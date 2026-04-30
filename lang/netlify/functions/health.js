// Minimal reachability probe used by the mobile and web clients to tell
// "API is up" from "actually offline". Returns in a few ms, no auth.

export async function handler() {
  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
    },
    body: JSON.stringify({ ok: true, ts: Date.now() }),
  }
}
