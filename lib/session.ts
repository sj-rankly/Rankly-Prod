import { cookies } from 'next/headers'

export type RanklySession = {
  userId: string
  email?: string
  name?: string
  picture?: string
  accessToken: string
  refreshToken: string
  expiresAt: number       // epoch ms
  propertyId?: string     // GA4 property selected by user
  propertyName?: string   // GA4 property name
  accountName?: string    // GA4 account name
  accountId?: string      // GA4 account ID
}

const COOKIE_NAME = 'rk_session'

export async function getRawSessionCookie(): Promise<string | null> {
  try {
    const cookieStore = await cookies()
    return cookieStore.get(COOKIE_NAME)?.value ?? null
  } catch {
    return null
  }
}

export async function parseSession(): Promise<RanklySession | null> {
  const raw = await getRawSessionCookie()
  if (!raw) return null
  try {
    const json = Buffer.from(raw, 'base64').toString('utf8')
    return JSON.parse(json) as RanklySession
  } catch {
    return null
  }
}

export async function writeSession(sess: RanklySession) {
  const payload = Buffer.from(JSON.stringify(sess), 'utf8').toString('base64')
  const cookieStore = await cookies()
  cookieStore.set(COOKIE_NAME, payload, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 30, // 30 days
  })
}

export async function clearSession() {
  try {
    const cookieStore = await cookies()
    // Try to delete the cookie first
    cookieStore.delete(COOKIE_NAME)

    // Also set it to expire immediately as a fallback
    cookieStore.set(COOKIE_NAME, '', {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 0, // Expire immediately
    })

    console.log('✅ Session cookie cleared successfully')
  } catch (error) {
    console.error('❌ Error clearing session cookie:', error)
    throw error
  }
}


