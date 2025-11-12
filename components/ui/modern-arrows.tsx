'use client'

import React from 'react'

interface ModernArrowProps {
  direction: 'up' | 'down'
  className?: string
}

// Phosphor Icons - Regular style for main arrows
export function ModernArrowUp({ className = "w-3 h-3" }: Omit<ModernArrowProps, 'direction'>) {
  return (
    <svg 
      className={className}
      viewBox="0 0 256 256" 
      fill="none"
      stroke="currentColor"
      strokeWidth="16"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="128" y1="216" x2="128" y2="40"/>
      <polyline points="56 112 128 40 200 112"/>
    </svg>
  )
}

export function ModernArrowDown({ className = "w-3 h-3" }: Omit<ModernArrowProps, 'direction'>) {
  return (
    <svg 
      className={className}
      viewBox="0 0 256 256" 
      fill="none"
      stroke="currentColor"
      strokeWidth="16"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="128" y1="40" x2="128" y2="216"/>
      <polyline points="200 144 128 216 56 144"/>
    </svg>
  )
}

// Phosphor Icons - Small arrows for badges
export function ModernArrowUpSmall({ className = "w-2 h-2" }: Omit<ModernArrowProps, 'direction'>) {
  return (
    <svg 
      className={className}
      viewBox="0 0 256 256" 
      fill="none"
      stroke="currentColor"
      strokeWidth="12"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="128" y1="216" x2="128" y2="40"/>
      <polyline points="56 112 128 40 200 112"/>
    </svg>
  )
}

export function ModernArrowDownSmall({ className = "w-2 h-2" }: Omit<ModernArrowProps, 'direction'>) {
  return (
    <svg 
      className={className}
      viewBox="0 0 256 256" 
      fill="none"
      stroke="currentColor"
      strokeWidth="12"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="128" y1="40" x2="128" y2="216"/>
      <polyline points="200 144 128 216 56 144"/>
    </svg>
  )
}

// Phosphor Icons - Trend arrows for charts
export function TrendArrowUp({ className = "w-4 h-4" }: Omit<ModernArrowProps, 'direction'>) {
  return (
    <svg 
      className={className}
      viewBox="0 0 256 256" 
      fill="none"
      stroke="currentColor"
      strokeWidth="16"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="232 56 136 152 96 112 24 184"/>
      <polyline points="232 120 232 56 168 56"/>
    </svg>
  )
}

export function TrendArrowDown({ className = "w-4 h-4" }: Omit<ModernArrowProps, 'direction'>) {
  return (
    <svg 
      className={className}
      viewBox="0 0 256 256" 
      fill="none"
      stroke="currentColor"
      strokeWidth="16"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="24 200 120 104 160 144 232 72"/>
      <polyline points="24 136 24 200 88 200"/>
    </svg>
  )
}

// Phosphor Icons - Modern trend arrows for performance
export function ModernTrendUp({ className = "w-3 h-3" }: Omit<ModernArrowProps, 'direction'>) {
  return (
    <svg 
      className={className}
      viewBox="0 0 256 256" 
      fill="none"
      stroke="currentColor"
      strokeWidth="14"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="232 56 136 152 96 112 24 184"/>
      <polyline points="232 120 232 56 168 56"/>
    </svg>
  )
}

export function ModernTrendDown({ className = "w-3 h-3" }: Omit<ModernArrowProps, 'direction'>) {
  return (
    <svg 
      className={className}
      viewBox="0 0 256 256" 
      fill="none"
      stroke="currentColor"
      strokeWidth="14"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="24 200 120 104 160 144 232 72"/>
      <polyline points="24 136 24 200 88 200"/>
    </svg>
  )
}

// Phosphor Icons - Ultra modern arrows for small badges
export function UltraModernUp({ className = "w-2 h-2" }: Omit<ModernArrowProps, 'direction'>) {
  return (
    <svg 
      className={className}
      viewBox="0 0 256 256" 
      fill="none"
      stroke="currentColor"
      strokeWidth="10"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="128" y1="216" x2="128" y2="40"/>
      <polyline points="56 112 128 40 200 112"/>
    </svg>
  )
}

export function UltraModernDown({ className = "w-2 h-2" }: Omit<ModernArrowProps, 'direction'>) {
  return (
    <svg 
      className={className}
      viewBox="0 0 256 256" 
      fill="none"
      stroke="currentColor"
      strokeWidth="10"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="128" y1="40" x2="128" y2="216"/>
      <polyline points="200 144 128 216 56 144"/>
    </svg>
  )
}
