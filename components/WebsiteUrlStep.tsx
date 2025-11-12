'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { NavigationArrows } from '@/components/NavigationArrows'
import { ThemeToggleButton } from '@/components/ThemeToggleButton'
import { BackgroundBeams } from '@/components/ui/background-beams'
import Link from 'next/link'
import { cn } from '@/lib/utils'

const loaderSteps = [
  "Scraping your website and understanding brand context",
  "Identifying closest competitors",
  "Analyzing key topics mentioned on your page",
  "Detecting user personas from your brand context"
]

export function WebsiteUrlStep({ onContinue, isLoading, initialUrl, previousPath, nextPath, analysisSuccess, analysisError }: any) {
  const router = useRouter()
  const [url, setUrl] = useState(initialUrl || '')
  const [currentStep, setCurrentStep] = useState(0)
  const [start, setStart] = useState(false)
  const [startSpinning, setStartSpinning] = useState(false)
  const [showAnalyzing, setShowAnalyzing] = useState(false)

  const isValidUrl = (string: string) => {
    try {
      new URL(string)
      return true
    } catch {
      return false
    }
  }

  const runSequentialLoaders = async () => {
    setStart(true)
    // Run through first 3 steps (indices 0, 1, 2)
    for (let i = 0; i < loaderSteps.length - 1; i++) {
      setCurrentStep(i)
      await new Promise((resolve) => setTimeout(resolve, 2500))
    }
    // Stay on last step (index 3) - it will keep rotating until analysisSuccess is true
    // The useEffect will handle marking it complete when analysisSuccess becomes true
    setCurrentStep(loaderSteps.length - 1)
  }
  
  // Update currentStep when analysisSuccess changes
  useEffect(() => {
    if (start && analysisSuccess) {
      // If we're on the last step (index 3), mark it as complete
      // If we haven't reached the last step yet, wait for runSequentialLoaders to reach it first
      if (currentStep === loaderSteps.length - 1) {
        setCurrentStep(loaderSteps.length)
      }
    }
  }, [analysisSuccess, start, currentStep])

  const handleSubmit = (e: any) => {
    e.preventDefault()
    if (isValidUrl(url)) {
      setShowAnalyzing(true)
      setStartSpinning(true)
      onContinue?.(url)
      
      // Hide "Analyzing..." button after primary loader completes (2 seconds)
      setTimeout(() => {
        setShowAnalyzing(false)
        runSequentialLoaders()
      }, 2000)
    }
  }

  const handleNext = () => {
    console.log('🚀 WebsiteUrlStep - Navigating to:', nextPath || '/onboarding/competitors')
    router.push(nextPath || '/onboarding/competitors')
  }

  return (
    <main className="relative flex h-screen w-full items-center justify-center bg-background text-foreground overflow-hidden">
      {/* Background Beams */}
      <BackgroundBeams className="absolute inset-0 z-0" />
      
      {/* Theme Toggle - Top Right */}
      <div className="absolute top-6 right-6 z-10">
        <ThemeToggleButton />
      </div>
      
      {/* Rankly Logo & Sign Out - Top Left */}
      <div className="absolute top-6 left-6 z-10 flex items-center gap-4">
        <Link href="/" className="flex items-center">
          <span className="text-2xl font-logo text-foreground">
            Rankly
          </span>
        </Link>
        <Link 
          href="/logout" 
          className="text-sm text-muted-foreground hover:text-foreground transition-colors underline"
        >
          Sign Out
        </Link>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-sm md:max-w-4xl relative z-10 px-4 py-4"
      >
        <div className={cn("flex flex-col gap-6")}>
          <Card className="overflow-hidden p-0 shadow-lg relative">
            <NavigationArrows previousPath={previousPath} nextPath={analysisSuccess ? nextPath : undefined} showNext={analysisSuccess} />
            <CardContent className="grid p-0 md:grid-cols-2 h-[600px]">
              <form className="p-6 md:p-8 flex flex-col justify-center">
                
                <div className="flex flex-col gap-6 w-full">
                  <div className="flex flex-col items-start gap-2 text-left">
                    <h1 className="text-xl font-semibold text-foreground">Enter any page or website URL</h1>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      Rankly runs a page-level scan to extract brand context, topics, personas and direct competitors.
                    </p>
                  </div>
                  
                  <div className="space-y-1.5">
                    <Label htmlFor="url" className="text-xs text-muted-foreground font-medium">URL</Label>
                    <Input
                      id="url"
                      type="url"
                      placeholder="https://example.com"
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      className="h-10 bg-background border border-border text-sm"
                    />
                  </div>
                  
                  {!start && (
                    <Button
                      type="submit"
                      onClick={handleSubmit}
                      disabled={!isValidUrl(url) || showAnalyzing}
                      className="w-full h-10 font-semibold"
                    >
                      {showAnalyzing ? (
                        <span className="flex items-center gap-1">
                          Analyzing
                          <span className="flex gap-1">
                            <span className="animate-pulse">.</span>
                            <span className="animate-pulse" style={{ animationDelay: '0.2s' }}>.</span>
                            <span className="animate-pulse" style={{ animationDelay: '0.4s' }}>.</span>
                          </span>
                        </span>
                      ) : (
                        "Analyze"
                      )}
                    </Button>
                  )}
                </div>
              </form>
              
              <div className="bg-muted flex-col justify-center items-center text-center p-6 sm:p-8 relative hidden md:flex">
                {/* Primary loader - always visible */}
                {!start && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="relative">
                      <div className="w-20 h-20 mx-auto bg-muted-foreground/10 rounded-full flex items-center justify-center">
                        <svg className="w-10 h-10 text-muted-foreground/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                      </div>
                      {/* Spinning boundary - only when analysis starts */}
                      {startSpinning && (
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
                          className="absolute inset-0 w-20 h-20 border-2 border-foreground border-t-transparent rounded-full"
                        />
                      )}
                    </div>
                  </div>
                )}
                
                <div className="flex flex-col items-center justify-center gap-5 w-full px-4">
                
                {/* Sequential loaders - when analysis starts */}
                {start && (
                  <div className="flex flex-col items-center justify-start gap-5 w-full">
                    {loaderSteps.map((step, index) => {
                      // Only show completed and current loaders
                      if (index > currentStep) return null
                      
                      const isCompleted = index < currentStep || (currentStep === loaderSteps.length && index === loaderSteps.length - 1)
                      const isCurrentAndRotating = index === currentStep && currentStep < loaderSteps.length
                      
                      return (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3 }}
                        className="flex items-center justify-start gap-3 w-full"
                      >
                        <div className="flex-shrink-0 w-5 h-5">
                          {isCompleted ? (
                            <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                              <svg className="w-3 h-3 text-white" viewBox="0 0 20 20" fill="currentColor">
                                <path
                                  fillRule="evenodd"
                                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                  clipRule="evenodd"
                                />
                              </svg>
                            </div>
                          ) : isCurrentAndRotating ? (
                            <motion.div
                              animate={{ rotate: 360 }}
                              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                              className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full"
                            />
                          ) : (
                            <div className="w-5 h-5 border-2 border-muted-foreground/30 rounded-full" />
                          )}
                        </div>
                          <span className="text-sm text-foreground text-left">{step}</span>
                        </motion.div>
                      )
                    })}

                    {/* Button - only when analysis is successful and all steps are complete */}
                    {analysisSuccess && currentStep === loaderSteps.length && (
                      <div className="w-full mt-4">
                        <Button
                          onClick={handleNext}
                          className="w-full h-10 font-semibold flex items-center justify-center gap-2"
                        >
                          <span>Identify your competitors</span>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </Button>
                      </div>
                    )}

                    {/* Error message - when analysis fails */}
                    {!isLoading && analysisError && (
                      <div className="w-full">
                        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                          <div className="flex items-center gap-2">
                            <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <div>
                              <h3 className="text-sm font-semibold text-red-800">Analysis Failed</h3>
                              <p className="text-sm text-red-600 mt-1">{analysisError}</p>
                            </div>
                          </div>
                          <Button
                            onClick={() => window.location.reload()}
                            className="w-full mt-3 h-8 bg-red-600 text-white hover:bg-red-700 text-sm"
                          >
                            Try Again
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </motion.div>
    </main>
  )
}