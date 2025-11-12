'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { BackgroundBeams } from '@/components/ui/background-beams'
import { NavigationArrows } from '@/components/NavigationArrows'
import { ThemeToggleButton } from '@/components/ThemeToggleButton'
import Link from 'next/link'
import { useOnboarding } from '@/contexts/OnboardingContext'
import { useAuth } from '@/contexts/AuthContext'
import { useEffect } from 'react'
import apiService from '@/services/api'
import { cn } from '@/lib/utils'
import { useTheme } from 'next-themes'

const llmPlatforms = [
  {
    name: 'ChatGPT',
    description: 'OpenAI\'s conversational AI'
  },
  {
    name: 'Perplexity',
    description: 'AI-powered search engine'
  },
  {
    name: 'Gemini',
    description: 'Google\'s AI assistant'
  },
  {
    name: 'Claude',
    description: 'Anthropic\'s AI assistant'
  },
]

export default function LLMPlatformsPage() {
  const router = useRouter()
  const { data, updateData } = useOnboarding()
  const { isAuthenticated, isLoading } = useAuth()
  const { theme } = useTheme()
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(['ChatGPT', 'Gemini'])
  const [isGenerating, setIsGenerating] = useState(false)
  const [buttonText, setButtonText] = useState('Generate Prompts')
  const [showResults, setShowResults] = useState(false)
  const [dotCount, setDotCount] = useState(1)

  // Use the same favicon function as TopNav to ensure consistency
  const getFaviconUrl = (platformName: string) => {
    const isDarkMode = theme === 'dark'
    const faviconMap = {
      'ChatGPT': 'https://chat.openai.com/favicon.ico',
      'Claude': 'https://claude.ai/favicon.ico',
      'Gemini': 'https://www.gstatic.com/lamda/images/gemini_sparkle_v002_d4735304ff6292a690345.svg',
      'Perplexity': 'https://www.perplexity.ai/favicon.ico',
    }
    return faviconMap[platformName as keyof typeof faviconMap] || `https://www.google.com/s2/favicons?domain=${platformName.toLowerCase()}.com&sz=32`
  }
  
  // Redirect to signin if not authenticated or if analysis not completed
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/onboarding/signin')
      return
    }
    
    // Redirect to website analysis if analysis not completed
    if (!isLoading && isAuthenticated && !data.analysisCompleted) {
      console.log('⚠️ Analysis not completed, redirecting to website page')
      router.push('/onboarding/website')
      return
    }
  }, [isAuthenticated, isLoading, router, data.analysisCompleted])

  // Animate dots from 1 to 3 when generating
  useEffect(() => {
    if (!isGenerating) {
      setDotCount(1)
      return
    }

    const interval = setInterval(() => {
      setDotCount((prev) => (prev >= 3 ? 1 : prev + 1))
    }, 500) // Change dot count every 500ms

    return () => clearInterval(interval)
  }, [isGenerating])

  const togglePlatform = (platformName: string) => {
    setSelectedPlatforms(prev => 
      prev.includes(platformName) 
        ? prev.filter(p => p !== platformName)
        : [...prev, platformName]
    )
  }

  const handleContinue = async () => {
    if (showResults) {
      // Navigate to results page
      router.push('/onboarding/results')
      return
    }

    setIsGenerating(true)
    
    try {
      // Get selected data for prompt generation
      // The selectedCompetitors, selectedTopics, selectedPersonas are already arrays/sets of the actual values
      const selectedCompetitorUrls = Array.from(data.selectedCompetitors)
      const selectedTopicNames = Array.from(data.selectedTopics)
      const selectedPersonaTypes = Array.from(data.selectedPersonas)

      console.log('🎯 Starting prompt generation...')
      console.log('Selected competitors:', selectedCompetitorUrls)
      console.log('Selected topics:', selectedTopicNames)
      console.log('Selected personas:', selectedPersonaTypes)
      console.log('🔍 Current onboarding data:', data)

      // First, update selections in the backend database
      const selectionResponse = await apiService.updateSelections(
        selectedCompetitorUrls,
        selectedTopicNames,
        selectedPersonaTypes,
        data.urlAnalysisId // ✅ Pass the analysis ID for proper data isolation
      )

      console.log('✅ Selections saved:', selectionResponse)

      // Generate prompts - backend automatically handles testing and metrics calculation
      console.log('🎯 Starting prompt generation with automatic testing and metrics calculation...')
      
      const response = await apiService.generatePrompts(data.urlAnalysisId) // ✅ Pass urlAnalysisId

      if (response.success) {
        console.log('✅ Complete processing finished successfully:', response.data)
        console.log(`📊 Total prompts: ${response.data.totalPrompts}`)
        console.log('📝 Generated prompts:', response.data.prompts)

        // Update onboarding data with generated prompts
        console.log('📝 Updating OnboardingContext with generated prompts:', {
          prompts: response.data.prompts,
          totalPrompts: response.data.totalPrompts
        })
        
        updateData({
          region: 'Global',
          language: 'English',
          generatedPrompts: response.data.prompts,
          totalPrompts: response.data.totalPrompts
        })

        // Backend automatically completed:
        // ✅ Prompt generation (50 TOFU-focused prompts)
        // ✅ Multi-LLM testing across 4 platforms
        // ✅ Metrics calculation and aggregation
        // ✅ AI insights generation
        
        console.log('🎉 All processing complete! Backend handled everything automatically.')
        console.log('📊 Ready to view results in dashboard.')
        
        // Show "See Results" button only after complete processing
        setIsGenerating(false)
        setButtonText('See Results')
        setShowResults(true)
        
      } else {
        console.error('❌ Processing failed:', response.message)
        setIsGenerating(false)
        setButtonText('Generate Prompts')
        // Show error to user
        alert(`Processing failed: ${response.message || 'Unknown error'}. Please try again.`)
      }
    } catch (error: any) {
      console.error('❌ Prompt generation error:', error)
      setIsGenerating(false)
      setButtonText('Generate Prompts')
    }
  }

  // Show loading while checking authentication
  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-foreground"></div>
      </main>
    )
  }

  // Don't render anything if not authenticated (will redirect)
  if (!isAuthenticated) {
    return null
  }

  return (
    <main className="relative flex h-screen w-full items-center justify-center bg-background text-foreground overflow-hidden">
      <BackgroundBeams className="absolute inset-0 z-0" />
      
      {/* Theme Toggle - Top Right */}
      <div className="absolute top-6 right-6 z-10">
        <ThemeToggleButton />
      </div>
      
      {/* Rankly Logo - Top Left */}
      <div className="absolute top-6 left-6 z-10">
        <Link href="/" className="flex items-center">
          <span className="text-2xl font-logo text-foreground">
            Rankly
          </span>
        </Link>
      </div>
      
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-4xl relative z-10 px-4 py-4"
      >
        <div className={cn("flex flex-col gap-6")}>
          <Card className="overflow-hidden p-0 shadow-lg relative">
            <NavigationArrows 
              previousPath="/onboarding/personas"
              nextPath="/onboarding/results"
            />
            <CardContent className="grid p-0 md:grid-cols-2 h-[600px]">
            {/* Left Section - Region & Language Selection (Light Background) */}
            <div className="bg-background  p-6 sm:p-8 flex flex-col justify-center">
              <div className="space-y-6 w-full">
                <div className="text-left">
                  <h1 className="text-xl font-semibold tracking-tight text-foreground mb-1">
                    Region & Language
                  </h1>
                  <p className="text-sm font-normal leading-[1.4] text-muted-foreground">
                    Select target region and language for prompt generation
                  </p>
                </div>
                
                <div className="space-y-4">
                  {/* Region Section */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium tracking-wide text-muted-foreground">Region</label>
                    <div className="flex items-center justify-between w-full h-10 bg-muted border border-border text-foreground rounded-md px-3">
                      <span className="flex items-center space-x-2 text-sm">
                        <span>🌍</span>
                        <span>Global</span>
                      </span>
                      <svg className="w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                    </div>
                  </div>

                  {/* Language Section */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium tracking-wide text-muted-foreground">Language</label>
                    <div className="flex items-center justify-between w-full h-10 bg-muted border border-border text-foreground rounded-md px-3">
                      <span className="flex items-center space-x-2 text-sm">
                        <span>🇺🇸</span>
                        <span>English</span>
                      </span>
                      <svg className="w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                    </div>
                  </div>
                </div>
                
                <Button
                  onClick={handleContinue}
                  disabled={isGenerating && !showResults}
                  className="w-full h-10 bg-primary text-primary-foreground hover:bg-primary/90 font-semibold"
                >
                  {isGenerating ? (
                    <>
                      Generating Prompts
                      <span className="inline-block w-6 text-left">
                        {'.'.repeat(dotCount)}
                      </span>
                    </>
                  ) : (
                    buttonText
                  )}
                </Button>
                
                <p className="text-center text-xs font-normal text-muted-foreground">
                  More regions and languages soon…
                </p>
              </div>
            </div>

            {/* Right Section - LLM Platform Display (Dark Background) */}
            <div className="bg-muted p-6 sm:p-8 flex flex-col justify-center">
              <div className="space-y-8 w-full">
                <div className="text-center">
                  <h2 className="text-xl font-semibold tracking-tight text-foreground mb-1">
                    Generating prompts based on
                  </h2>
                  <p className="text-sm font-normal leading-[1.4] text-muted-foreground">
                    Topics × User Personas × Region × Language
                  </p>
                </div>

                <div className="flex flex-col items-center space-y-6 w-full">
                  {/* First row - 3 icons */}
                  <div className="flex items-center justify-center gap-8">
                    {llmPlatforms.slice(0, 3).map((platform) => (
                      <motion.div
                        key={platform.name}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.3, delay: llmPlatforms.indexOf(platform) * 0.1 }}
                        className="flex flex-col items-center space-y-2"
                      >
                        <div className="relative">
                          <div className="w-12 h-12 rounded-full bg-card flex items-center justify-center shadow-lg">
                            <img
                              src={getFaviconUrl(platform.name)}
                              alt={`${platform.name} favicon`}
                              className="w-7 h-7"
                              onError={(e) => {
                                e.currentTarget.src = `https://www.google.com/s2/favicons?domain=${platform.name.toLowerCase()}.com&sz=32`
                              }}
                            />
                          </div>
                        </div>
                        <span className="text-foreground font-medium text-xs text-center">{platform.name}</span>
                      </motion.div>
                    ))}
                  </div>
                  
                  {/* Second row - 2 icons */}
                  <div className="flex items-center justify-center gap-8">
                    {llmPlatforms.slice(3, 5).map((platform) => (
                      <motion.div
                        key={platform.name}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.3, delay: llmPlatforms.indexOf(platform) * 0.1 }}
                        className="flex flex-col items-center space-y-2"
                      >
                        <div className="relative">
                          <div className="w-12 h-12 rounded-full bg-card flex items-center justify-center shadow-lg">
                            <img
                              src={getFaviconUrl(platform.name)}
                              alt={`${platform.name} favicon`}
                              className="w-7 h-7"
                              onError={(e) => {
                                e.currentTarget.src = `https://www.google.com/s2/favicons?domain=${platform.name.toLowerCase()}.com&sz=32`
                              }}
                            />
                          </div>
                        </div>
                        <span className="text-foreground font-medium text-xs text-center">{platform.name}</span>
                      </motion.div>
                    ))}
                  </div>
                </div>

                <div className="text-center pt-4">
                  <p className="text-xs font-normal text-muted-foreground">
                    More LLMs coming soon…
                  </p>
                </div>
              </div>
            </div>
            </CardContent>
          </Card>
        </div>
      </motion.div>
    </main>
  )
}
