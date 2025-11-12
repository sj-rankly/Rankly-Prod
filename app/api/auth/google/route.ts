import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const returnUrl = searchParams.get('returnUrl') || '/dashboard'

    // Redirect to backend OAuth instead of handling it in frontend
    const backendOAuthUrl = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/auth/google?returnUrl=${encodeURIComponent(returnUrl)}`
    
    console.log('🔄 [OAuth] Redirecting to backend OAuth:', backendOAuthUrl)
    
    return NextResponse.redirect(backendOAuthUrl)
  } catch (error) {
    console.error('Error initiating Google OAuth:', error)
    return NextResponse.json(
      { error: 'Failed to initiate Google authentication' },
      { status: 500 }
    )
  }
}

function buildGoogleAuthUrl(codeChallenge: string): string {
  const clientId = process.env.GOOGLE_CLIENT_ID
  const redirectUri = process.env.GOOGLE_REDIRECT_URI

  if (!clientId) {
    throw new Error('GOOGLE_CLIENT_ID is not set in environment variables')
  }

  if (!redirectUri) {
    throw new Error('GOOGLE_REDIRECT_URI is not set in environment variables')
  }

  console.log('OAuth Debug:', {
    client_id: clientId,
    redirect_uri: redirectUri,
    code_challenge: codeChallenge
  })

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'https://www.googleapis.com/auth/analytics.readonly https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email',
    access_type: 'offline',
    prompt: 'consent',
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
    state: 'google_oauth'
  })

  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
  console.log('Generated OAuth URL:', authUrl)

  return authUrl
}

function generateCodeVerifier(): string {
  return crypto.randomBytes(32).toString('base64url')
}

function generateCodeChallenge(codeVerifier: string): string {
  return crypto.createHash('sha256').update(codeVerifier).digest('base64url')
}
