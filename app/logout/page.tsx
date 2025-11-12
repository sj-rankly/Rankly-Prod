'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'

export default function LogoutPage() {
  const { logout } = useAuth()
  const router = useRouter()

  useEffect(() => {
    console.log('🔴 [Logout] Logging out user...')
    
    // Clear all auth data
    logout()
    
    // Clear all localStorage and sessionStorage
    if (typeof window !== 'undefined') {
      localStorage.clear()
      sessionStorage.clear()
      console.log('✅ [Logout] All data cleared')
    }
    
    // Redirect to signin page after a brief delay
    setTimeout(() => {
      console.log('🔄 [Logout] Redirecting to signin...')
      router.push('/onboarding/signin')
    }, 500)
  }, [logout, router])

  return (
    <main className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-foreground mx-auto mb-4"></div>
        <h2 className="text-xl font-semibold mb-2">Signing out...</h2>
        <p className="text-gray-600">Please wait while we log you out</p>
      </div>
    </main>
  )
}

