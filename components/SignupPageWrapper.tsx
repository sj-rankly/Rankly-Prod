'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { AuthCard } from './AuthCard'

export function SignupPageWrapper() {
  const { isAuthenticated, isLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      console.log('🔍 [SignupPageWrapper] User already authenticated, checking for existing analysis...')
      
      // For authenticated users visiting signup page, redirect to dashboard or onboarding
      router.push('/dashboard')
    }
  }, [isAuthenticated, isLoading, router])

  // Show loading while checking authentication
  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-foreground"></div>
      </main>
    )
  }

  // Don't render signup form if user is already authenticated (will redirect)
  if (isAuthenticated) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-foreground mx-auto mb-4"></div>
          <div className="text-gray-600">Redirecting...</div>
        </div>
      </main>
    )
  }

  return <AuthCard mode="signup" />
}






