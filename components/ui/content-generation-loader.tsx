'use client'

import { motion } from 'framer-motion'
import { Loader2 } from 'lucide-react'
import { useState, useEffect } from 'react'

const loaderSteps = {
  create: [
    "Identifying semantic gaps in your domain",
    "Analyzing LLM citation graph for missing topics",
    "Mapping relevant personas and user intents",
    "Researching trending keywords and entities",
    "Generating a new outline using Rankly's 9 Optimization Framework",
    "Applying writing strategies — Authority, Fluency, and Technical Depth",
    "Finalizing draft with schema, FAQs, and structured data",
  ],
  regenerate: [
    "Summarizing existing content",
    "Inferring initial intent from creator's perspective",
    "Applying 4W multi-role deep reflection",
    "Planning content enhancement steps",
    "Rewriting content with Rankly's 9 strategies",
    "Measuring semantic drift and quality",
    "Finalizing regenerated content",
  ]
}

// Icons removed - using single Loader2 spinner for all steps

interface ContentGenerationLoaderProps {
  type: 'create' | 'regenerate'
  onComplete?: () => void
  duration?: number // Total duration in milliseconds (default: calculated from steps)
}

export function ContentGenerationLoader({ type = "create", onComplete, duration }: ContentGenerationLoaderProps) {
  const steps = loaderSteps[type]
  const [currentStep, setCurrentStep] = useState(0)
  const [progress, setProgress] = useState(0) // Track progress for step transitions

  // Calculate duration: if not provided, use step-based timing (1.8s per step)
  const totalDuration = duration || (steps.length * 1800)
  const stepDuration = totalDuration / steps.length

  useEffect(() => {
    const startTime = Date.now()
    
    // Update progress continuously - but cap at 95% to keep it spinning until content arrives
    const progressInterval = setInterval(() => {
      const elapsed = Date.now() - startTime
      // ✅ FIX: Cap progress at 95% so it keeps spinning until content actually arrives
      const newProgress = Math.min(95, (elapsed / totalDuration) * 100)
      setProgress(newProgress)
    }, 50) // Update every 50ms for smooth animation

    // Update steps - show each step only once, progressing sequentially, then stop
    let stepCount = 0
    
    const stepInterval = setInterval(() => {
      stepCount++
      if (stepCount < steps.length) {
        setCurrentStep(stepCount)
      } else {
        // ✅ FIX: Stop interval when we reach the last step
        clearInterval(stepInterval)
        // Stay on last step
        setCurrentStep(steps.length - 1)
      }
    }, stepDuration)

    return () => {
      clearInterval(stepInterval)
      clearInterval(progressInterval)
    }
  }, [steps.length, stepDuration, totalDuration, onComplete])

  // Progress tracking is still used for step transitions, but visual loader is simplified

  return (
    <div className="flex flex-col items-center justify-center min-h-[500px] text-center space-y-6 p-8 bg-muted/30 rounded-lg border">
      {/* Single Clean Spinner */}
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        className="w-16 h-16"
      >
        <Loader2 className="w-16 h-16 text-primary" />
      </motion.div>

      {/* Current Step Text */}
      <motion.p
        key={currentStep}
        initial={{ opacity: 0, y: 8 }}
        animate={{ 
          opacity: 1, 
          y: 0
        }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ 
          duration: 0.4,
          ease: "easeOut"
        }}
        className="text-sm font-medium text-foreground text-center"
      >
        {steps[currentStep]}
      </motion.p>



    </div>
  )
}










