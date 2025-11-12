'use client'

import { Button } from '@/components/ui/button'
import { Sun, Moon, BarChart3, MessageSquare, Globe, HelpCircle, LogOut } from 'lucide-react'
import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'

export function Sidebar() {
  const { theme, setTheme } = useTheme()
  const router = useRouter()
  const { logout } = useAuth()
  const [mounted, setMounted] = useState(false)
  const pathname = usePathname()

  useEffect(() => {
    setMounted(true)
  }, [])

  const handleLogout = () => {
    logout()
    router.push('/')
  }


  const navItems = [
    {
      title: 'Answer Engine Analytics',
      icon: BarChart3,
      link: '/dashboard',
      isActive: pathname === '/dashboard' || pathname.startsWith('/dashboard'),
    },
    {
      title: 'Traffic Analytics',
      icon: MessageSquare,
      link: '/agent-analytics',
      isActive: pathname === '/agent-analytics',
    },
    {
      title: 'Actionables',
      icon: Globe,
      link: '/actionables',
      isActive: pathname === '/actionables' || pathname.startsWith('/actionables'),
    },
  ]

  return (
    <aside className="w-64 bg-background border-r border-border flex flex-col h-full">
      {/* Header */}
      <div className="p-6">
        <h1 className="brand text-2xl tracking-tight">Rankly</h1>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-4">
        <div className="space-y-1">
          {navItems.map((item, index) => (
            <Link key={index} href={item.link}>
              <Button 
                variant="ghost"
                className={`w-full justify-start h-10 px-3 body-text hover:bg-accent hover:text-accent-foreground ${
                  item.isActive ? 'bg-accent text-accent-foreground' : ''
                }`}
              >
                <item.icon className="mr-3 h-4 w-4" />
                {item.title}
              </Button>
            </Link>
          ))}
        </div>
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-border/60 space-y-4">
        <Button variant="ghost" className="w-full justify-start h-10 px-3 body-text">
          <HelpCircle className="mr-3 h-4 w-4" />
          Contact us
        </Button>
        
        <Button 
          variant="ghost" 
          onClick={handleLogout}
          className="w-full justify-start h-10 px-3 body-text text-red-600 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
        >
          <LogOut className="mr-3 h-4 w-4" />
          Log out
        </Button>
        
        {/* Theme Toggle */}
        <div className="flex items-center justify-center">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(mounted && theme === 'dark' ? 'light' : 'dark')}
            className="h-8 w-8 rounded-full bg-muted/50 hover:bg-muted transition-all"
            suppressHydrationWarning
          >
            {mounted && theme === 'dark' ? (
              <Sun className="h-4 w-4" />
            ) : (
              <Moon className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </aside>
  )
}
