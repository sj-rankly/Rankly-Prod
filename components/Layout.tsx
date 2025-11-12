'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { ThemeToggle } from './ThemeToggle'
import { useAuth } from '@/contexts/AuthContext'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { LogOut, User } from 'lucide-react'

interface LayoutProps {
  children: React.ReactNode
  showNav?: boolean
}

function Layout({ children, showNav = true }: LayoutProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { user, logout } = useAuth()
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)

  const isOnboarding = pathname === '/' || pathname === '/onboarding'

  const handleLogout = () => {
    logout()
    router.push('/')
  }

  const getUserInitials = () => {
    if (!user) return 'U'
    const firstInitial = user.profile?.firstName?.charAt(0).toUpperCase() || ''
    const lastInitial = user.profile?.lastName?.charAt(0).toUpperCase() || ''
    return firstInitial + lastInitial || user.email?.charAt(0).toUpperCase() || 'U'
  }

  // For onboarding page, don't show the layout header
  if (isOnboarding) {
    return <>{children}</>
  }

  return (
    <div className="min-h-screen flex relative">
      {/* Mobile sidebar backdrop */}
      {showNav && !isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(true)}
        />
      )}

      {/* Left Sidebar */}
      {showNav && (
        <div className={`
          w-64 border-r border-border bg-background p-6 flex flex-col
          fixed lg:static inset-y-0 left-0 z-50 transform transition-transform duration-300
          ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}>
          <div className="space-y-2 flex-1">
            <Link
              href="/dashboard"
              className={`
                flex items-center px-4 py-3 rounded-md text-sm font-medium transition-all
                ${pathname === '/dashboard'
                  ? 'text-foreground bg-muted underline underline-offset-4'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                }
              `}
            >
              <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              Visibility
            </Link>

            <div className="flex items-center px-4 py-3 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-all cursor-pointer">
              <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              Traffic Analytics
            </div>

            <div className="flex items-center px-4 py-3 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-all cursor-pointer">
              <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Content Regeneration
            </div>
          </div>

          {/* Bottom Section */}
          <div className="mt-auto pt-6 space-y-4">
            <div className="py-4">
              <ThemeToggle />
            </div>
            <a
              href="mailto:sj@tryrankly.com"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              Contact us
            </a>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="border-b border-border bg-background px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {/* Hamburger menu for mobile */}
              {showNav && (
                <button
                  onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                  className="lg:hidden p-2 hover:bg-muted rounded-md transition-colors"
                  aria-label="Toggle sidebar"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>
              )}
              <Link href="/" className="text-2xl font-black tracking-tight text-foreground font-logo">
                Rankly
              </Link>
            </div>

            <div className="flex items-center gap-4">
              {!showNav && <ThemeToggle />}
              
              {/* User Profile Dropdown */}
              {user && (
                <DropdownMenu>
                  <DropdownMenuTrigger className="focus:outline-none">
                    <Avatar className="h-9 w-9 cursor-pointer hover:ring-2 hover:ring-primary transition-all">
                      <AvatarFallback className="bg-primary text-primary-foreground text-sm font-medium">
                        {getUserInitials()}
                      </AvatarFallback>
                    </Avatar>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <div className="flex items-center justify-start gap-2 p-2">
                      <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium leading-none">
                          {user.profile?.firstName && user.profile?.lastName 
                            ? `${user.profile.firstName} ${user.profile.lastName}`
                            : user.email}
                        </p>
                        {user.profile?.firstName && user.profile?.lastName && (
                          <p className="text-xs leading-none text-muted-foreground">
                            {user.email}
                          </p>
                        )}
                      </div>
                    </div>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-950">
                      <LogOut className="mr-2 h-4 w-4" />
                      <span>Log out</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 bg-background overflow-x-hidden">
          {children}
        </main>
      </div>
    </div>
  )
}

export default Layout
