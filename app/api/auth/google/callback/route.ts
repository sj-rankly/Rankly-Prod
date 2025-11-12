import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    const error = searchParams.get('error')
    const returnUrl = searchParams.get('returnUrl') || '/dashboard'

    if (error) {
      console.error('OAuth error:', error)
      return NextResponse.redirect(
        new URL(`/onboarding/signin?error=oauth_failed`, request.url)
      )
    }

    if (!code) {
      console.error('No authorization code received')
      return NextResponse.redirect(
        new URL(`/onboarding/signin?error=no_code`, request.url)
      )
    }

    console.log('🔄 [OAuth Callback] Received code, redirecting to backend...')

    // Redirect to backend OAuth callback with the code
    const backendCallbackUrl = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/auth/google/callback?code=${code}&returnUrl=${encodeURIComponent(returnUrl)}`
    
    return NextResponse.redirect(backendCallbackUrl)
  } catch (error) {
    console.error('OAuth callback error:', error)
    return NextResponse.redirect(
      new URL('/onboarding/signin?error=callback_error', request.url)
    )
  }
}
