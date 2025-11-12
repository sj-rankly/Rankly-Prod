'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { BackgroundBeams } from '@/components/ui/background-beams'
import { NavigationArrows } from '@/components/NavigationArrows'
import { ThemeToggleButton } from '@/components/ThemeToggleButton'
import { useOnboarding } from '@/contexts/OnboardingContext'
import { useAuth } from '@/contexts/AuthContext'
import apiService from '@/services/api'

interface Competitor {
  id: string
  name: string
  url: string
  selected: boolean
}

export default function CompetitorsPage() {
  const router = useRouter()
  const { data, updateData } = useOnboarding()
  const { isAuthenticated, isLoading } = useAuth()
  const [competitors, setCompetitors] = useState<Competitor[]>([])
  const [selectedCount, setSelectedCount] = useState(0)
  const [isSaving, setIsSaving] = useState(false)
  const [isAddingCustom, setIsAddingCustom] = useState(false)
  const [customCompetitorName, setCustomCompetitorName] = useState('')
  const [customCompetitorUrl, setCustomCompetitorUrl] = useState('')
  
  // Redirect to signin if not authenticated or if analysis not completed
  useEffect(() => {
    console.log('🔍 CompetitorsPage - Navigation check:', {
      isLoading,
      isAuthenticated,
      analysisCompleted: data.analysisCompleted,
      websiteUrl: data.websiteUrl,
      hasAnalysisResults: !!data.analysisResults
    })
    
    if (!isLoading && !isAuthenticated) {
      console.log('❌ Not authenticated, redirecting to signin')
      router.push('/onboarding/signin')
      return
    }
    
    // Redirect to website analysis if analysis not completed
    if (!isLoading && isAuthenticated && !data.analysisCompleted) {
      console.log('⚠️ Analysis not completed, redirecting to website page')
      router.push('/onboarding/website')
      return
    }
    
    console.log('✅ CompetitorsPage - Navigation check passed, staying on page')
  }, [isAuthenticated, isLoading, router, data.analysisCompleted])

  // Load competitors from analysis results or default values
  useEffect(() => {
    console.log('🔍 CompetitorsPage - Data from OnboardingContext:', data)
    console.log('🔍 CompetitorsPage - Analysis Results:', data.analysisResults)
    console.log('🔍 CompetitorsPage - Competitors from analysis:', data.analysisResults?.competitors)
    
    if (data.analysisResults?.competitors) {
      // Use ALL AI-generated competitors from analysis
      const aiCompetitors = data.analysisResults.competitors.map((comp: any, index: number) => ({
        id: `competitor-${index}`,
        name: comp.name,
        url: comp.url,
        selected: false
      }))
      console.log('✅ CompetitorsPage - Using ALL AI competitors:', aiCompetitors)
      setCompetitors(aiCompetitors)
    } else {
      // Default competitors
      console.log('⚠️ CompetitorsPage - No analysis results, using defaults')
      const defaultCompetitors = [
        'https://competitor1.com',
        'https://competitor2.com', 
        'https://competitor3.com',
        'https://competitor4.com'
      ].map((url, index) => ({
        id: `competitor-${index}`,
        name: `Competitor ${index + 1}`,
        url,
        selected: false
      }))
      setCompetitors(defaultCompetitors)
    }
  }, [data.analysisResults])
  
  const MAX_COMPETITORS = 4

  const toggleCompetitor = (id: string) => {
    const competitor = competitors.find(c => c.id === id)
    if (!competitor) return

    // Check if we can select this competitor
    if (!competitor.selected && selectedCount >= MAX_COMPETITORS) {
      alert(`You can only select up to ${MAX_COMPETITORS} competitors`)
      return
    }

    setCompetitors(prev => prev.map(c => 
      c.id === id ? { ...c, selected: !c.selected } : c
    ))

    // Update selected count
    setSelectedCount(prev => competitor.selected ? prev - 1 : prev + 1)
  }

  const handleAddCustomCompetitor = () => {
    if (!customCompetitorName.trim() || !customCompetitorUrl.trim()) {
      alert('Please enter both competitor name and URL')
      return
    }

    // Validate URL format
    try {
      new URL(customCompetitorUrl)
    } catch {
      alert('Please enter a valid URL')
      return
    }

    // Check if we can add more (total selected including this new one)
    if (selectedCount >= MAX_COMPETITORS) {
      alert(`You can only select up to ${MAX_COMPETITORS} competitors. Please deselect one before adding a custom competitor.`)
      return
    }

    // Add custom competitor and automatically select it
    const newCompetitor: Competitor = {
      id: `custom-competitor-${Date.now()}`,
      name: customCompetitorName.trim(),
      url: customCompetitorUrl.trim(),
      selected: true // Auto-select custom additions
    }

    setCompetitors(prev => [...prev, newCompetitor])
    setSelectedCount(prev => prev + 1)
    
    // Reset form
    setCustomCompetitorName('')
    setCustomCompetitorUrl('')
    setIsAddingCustom(false)
  }

  const removeCompetitor = (id: string) => {
    const competitor = competitors.find(c => c.id === id)
    if (!competitor) return

    setCompetitors(prev => prev.filter(c => c.id !== id))
    
    // Update selected count if it was selected
    if (competitor.selected) {
      setSelectedCount(prev => prev - 1)
    }
  }

  const handleContinue = async () => {
    setIsSaving(true)
    
    try {
      // Get only selected competitors
      const selectedCompetitors = competitors.filter(c => c.selected)
      
      if (selectedCompetitors.length === 0) {
        alert('Please select at least one competitor')
        setIsSaving(false)
        return
      }

      if (selectedCompetitors.length > MAX_COMPETITORS) {
        alert(`You can only select up to ${MAX_COMPETITORS} competitors`)
        setIsSaving(false)
        return
      }

      // Update onboarding data with selected competitors
      const selectedUrls = selectedCompetitors.map(c => c.url)
      updateData({
        competitors: selectedCompetitors,
        selectedCompetitors: new Set(selectedUrls)
      })

      // Just save to frontend context and navigate - backend saving will happen in LLM platforms page
      console.log('✅ Competitors saved to context successfully')
      router.push('/onboarding/topics')
    } catch (error) {
      console.error('❌ Error saving competitors:', error)
      alert('Failed to save competitors. Please try again.')
    } finally {
      setIsSaving(false)
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
    <main className="relative flex h-screen w-full max-h-screen overflow-hidden items-center justify-center bg-background text-foreground">
      {/* Background Beams */}
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
        className="w-full max-w-[400px] relative z-10 px-4 py-4"
      >
        <Card className="w-full rounded-lg p-6 sm:p-8 relative shadow-lg">
          {/* Navigation Arrows */}
          <NavigationArrows 
            previousPath="/onboarding/website"
            nextPath="/onboarding/topics"
          />
          <CardContent className="space-y-6">
            {/* Header */}
            <div className="text-center space-y-1">
              <h1 className="text-xl font-semibold tracking-tight text-foreground mb-1">
                Select Your Competitors
              </h1>
              <p className="text-sm font-normal leading-[1.4] text-muted-foreground">
                Click to select up to {MAX_COMPETITORS} competitors for analysis
              </p>
              <p className="text-xs text-muted-foreground">
                Selected: {selectedCount}/{MAX_COMPETITORS}
              </p>
            </div>

            {/* Competitor Selection Grid */}
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {competitors.map((competitor) => (
                <div
                  key={competitor.id}
                  className={`flex items-center space-x-3 rounded-md p-3 border-2 border-muted/50 transition-colors duration-200 transform-gpu ${
                    competitor.selected
                      ? 'bg-primary/20 shadow-[0_0_0_2px_hsl(var(--primary))]'
                      : 'bg-muted/50 hover:bg-muted/70'
                  }`}
                  style={{ willChange: 'background-color', transform: 'translateZ(0)' }}
                >
                  {/* Selection Checkbox - Clickable */}
                  <div 
                    onClick={() => toggleCompetitor(competitor.id)}
                    className={`w-5 h-5 rounded border-2 flex items-center justify-center cursor-pointer ${
                      competitor.selected
                        ? 'bg-primary border-primary'
                        : 'border-muted-foreground/50'
                    }`}
                  >
                    {competitor.selected && (
                      <svg className="w-3 h-3 text-primary-foreground" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                  
                  {/* Competitor Info - Clickable */}
                  <div 
                    onClick={() => toggleCompetitor(competitor.id)}
                    className="flex-1 min-w-0 cursor-pointer"
                  >
                    <p className="text-sm font-medium text-foreground truncate">
                      {competitor.name}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {competitor.url}
                    </p>
                  </div>
                  
                  {/* Delete button for custom competitors */}
                  {competitor.id.startsWith('custom-') && (
                    <button
                      type="button"
                      onClick={() => removeCompetitor(competitor.id)}
                      className="flex-shrink-0 w-6 h-6 rounded-full bg-destructive/10 hover:bg-destructive/20 flex items-center justify-center text-destructive transition-colors"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                  
                  {/* Selection Status */}
                  {competitor.selected && !competitor.id.startsWith('custom-') && (
                    <div className="text-primary">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Add Custom Competitor Section */}
            {!isAddingCustom ? (
              <Button
                type="button"
                onClick={() => setIsAddingCustom(true)}
                variant="outline"
                className="w-full h-10 font-medium"
                disabled={isSaving}
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Custom Competitor
              </Button>
            ) : (
              <div className="space-y-3 p-4 bg-muted/30 rounded-md border-2 border-dashed border-muted-foreground/30">
                <Input
                  type="text"
                  value={customCompetitorName}
                  onChange={(e) => setCustomCompetitorName(e.target.value)}
                  placeholder="Competitor name (e.g., Google)"
                  className="h-9 text-sm"
                />
                <Input
                  type="url"
                  value={customCompetitorUrl}
                  onChange={(e) => setCustomCompetitorUrl(e.target.value)}
                  placeholder="https://competitor.com"
                  className="h-9 text-sm"
                />
                <div className="flex space-x-2">
                  <Button
                    type="button"
                    onClick={handleAddCustomCompetitor}
                    className="flex-1 h-9 text-sm"
                  >
                    Add
                  </Button>
                  <Button
                    type="button"
                    onClick={() => {
                      setIsAddingCustom(false)
                      setCustomCompetitorName('')
                      setCustomCompetitorUrl('')
                    }}
                    variant="outline"
                    className="flex-1 h-9 text-sm"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            {/* Continue Button */}
            <Button
              onClick={handleContinue}
              className="w-full h-10 font-semibold"
              disabled={isSaving || selectedCount === 0}
            >
              {isSaving ? 'Saving...' : `Continue with ${selectedCount} Competitor${selectedCount !== 1 ? 's' : ''}`}
            </Button>

            {/* Selection Status */}
            {selectedCount > 0 && (
              <p className="text-center text-xs font-normal text-muted-foreground">
                {selectedCount} competitor{selectedCount !== 1 ? 's' : ''} selected
              </p>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </main>
  )
}
