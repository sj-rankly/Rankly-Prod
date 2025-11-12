'use client'

import React, { useState, useEffect } from 'react'
import { useTheme } from 'next-themes'
import { Switch } from '@/components/ui/switch'

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  // useEffect only runs on the client, so we can safely show the UI
  useEffect(() => {
    setMounted(true)
  }, [])

  const isDark = theme === 'dark'

  const toggleTheme = () => {
    setTheme(isDark ? 'light' : 'dark')
  }

  // Prevent hydration mismatch by not rendering until mounted
  if (!mounted) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Light</span>
        <Switch checked={false} onCheckedChange={() => {}} disabled />
        <span className="text-sm text-muted-foreground">Dark</span>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-muted-foreground">Light</span>
      <Switch
        checked={isDark}
        onCheckedChange={toggleTheme}
      />
      <span className="text-sm text-muted-foreground">Dark</span>
    </div>
  )
}
