'use client'

import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

interface EllipsisLoaderProps {
  className?: string
  size?: 'sm' | 'md' | 'lg'
  color?: 'primary' | 'muted' | 'foreground'
}

export function EllipsisLoader({ 
  className, 
  size = 'md', 
  color = 'primary' 
}: EllipsisLoaderProps) {
  const sizeClasses = {
    sm: 'w-1 h-1',
    md: 'w-2 h-2', 
    lg: 'w-3 h-3'
  }

  const colorClasses = {
    primary: 'bg-primary',
    muted: 'bg-muted-foreground',
    foreground: 'bg-foreground'
  }

  return (
    <div className={cn("flex items-center justify-center space-x-1", className)}>
      <motion.div
        className={cn("rounded-full", sizeClasses[size], colorClasses[color])}
        animate={{ 
          scale: [0.8, 1.4, 0.8],
          opacity: [0.3, 1, 0.3]
        }}
        transition={{ 
          duration: 0.8, 
          repeat: Infinity, 
          delay: 0,
          ease: "easeInOut"
        }}
      />
      <motion.div
        className={cn("rounded-full", sizeClasses[size], colorClasses[color])}
        animate={{ 
          scale: [0.8, 1.4, 0.8],
          opacity: [0.3, 1, 0.3]
        }}
        transition={{ 
          duration: 0.8, 
          repeat: Infinity, 
          delay: 0.3,
          ease: "easeInOut"
        }}
      />
      <motion.div
        className={cn("rounded-full", sizeClasses[size], colorClasses[color])}
        animate={{ 
          scale: [0.8, 1.4, 0.8],
          opacity: [0.3, 1, 0.3]
        }}
        transition={{ 
          duration: 0.8, 
          repeat: Infinity, 
          delay: 0.6,
          ease: "easeInOut"
        }}
      />
    </div>
  )
}










