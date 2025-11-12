'use client'

import * as React from 'react'
import { ThemeProvider as NextThemesProvider, type ThemeProviderProps } from 'next-themes'

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  // ✅ FIX: In production, ensure default theme is light and disable system preference
  const isProduction = process.env.NODE_ENV === 'production'
  
  // Override props for production
  const productionProps: Partial<ThemeProviderProps> = isProduction
    ? {
        defaultTheme: 'light',
        enableSystem: false, // Disable system preference in production
        // Don't use forcedTheme - allow users to change theme if needed
      }
    : {}
  
  return (
    <NextThemesProvider 
      {...props} 
      {...productionProps}
    >
      {children}
    </NextThemesProvider>
  )
}
