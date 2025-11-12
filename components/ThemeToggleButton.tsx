'use client'

import React, { useState, useEffect } from 'react'
import { useTheme } from 'next-themes'
import { Button } from '@/components/ui/button'
import { Sun, Moon } from 'lucide-react'

export function ThemeToggleButton() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  // useEffect only runs on the client, so we can safely show the UI
  useEffect(() => {
    setMounted(true)
  }, [])

  // Prevent hydration mismatch by not rendering until mounted
  if (!mounted) {
    return (
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 rounded-full bg-muted/50 hover:bg-muted transition-all"
        suppressHydrationWarning
      >
        <Moon className="h-4 w-4" />
      </Button>
    )
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      className="h-8 w-8 rounded-full bg-muted/50 hover:bg-muted transition-all"
      suppressHydrationWarning
    >
      {theme === 'dark' ? (
        <Sun className="h-4 w-4" />
      ) : (
        <Moon className="h-4 w-4" />
      )}
    </Button>
  )
}
