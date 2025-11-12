import { writeSession, RanklySession } from '@/lib/session'

const TOKEN_URL = 'https://oauth2.googleapis.com/token'

export async function ensureAccessToken(session: RanklySession): Promise<RanklySession | null> {
  const now = Date.now()
  if (session.expiresAt && session.expiresAt - now > 60_000) {
    return session // still valid (>60s buffer)
  }

  // needs refresh
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    client_secret: process.env.GOOGLE_CLIENT_SECRET!,
    grant_type: 'refresh_token',
    refresh_token: session.refreshToken,
  })

  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
    cache: 'no-store',
  })

  if (!res.ok) return null
  const data = await res.json() // { access_token, expires_in, ... }

  const updated: RanklySession = {
    ...session,
    accessToken: data.access_token,
    expiresAt: session.expiresAt, // Keep original session expiration (30 days)
  }

  await writeSession(updated)
  return updated
}


