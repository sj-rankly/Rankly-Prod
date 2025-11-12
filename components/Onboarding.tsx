'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useOnboarding } from '@/contexts/OnboardingContext'
import { useAuth } from '@/contexts/AuthContext'
import { ThemeToggle } from '@/components/ThemeToggle'
import { LoginForm } from '@/components/LoginForm'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { BackgroundBeams } from '@/components/ui/background-beams'
import apiService from '@/services/api'
import { frontendConfig, validateCompetitorCount, validateTopicCount, validatePersonaCount, getValidationMessage } from '@/lib/config'


function Onboarding() {
  const router = useRouter()
  const { data, updateData } = useOnboarding()
  const { isAuthenticated } = useAuth()
  const [currentStep, setCurrentStep] = useState(4) // Start at step 4 (website URL) instead of step 1 (personal info)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysisComplete, setAnalysisComplete] = useState(false)

  // Handle step parameter from OAuth callback
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const step = urlParams.get('step')

    if (step) {
      const stepNumber = parseInt(step)
      if (stepNumber >= 4 && stepNumber <= 8) {
        console.log(`📍 Setting current step to: ${stepNumber}`)
        setCurrentStep(stepNumber)
      }
    }
  }, [])

  // Local state for forms
  const [showAddCompForm, setShowAddCompForm] = useState(false)
  const [newCompetitorName, setNewCompetitorName] = useState('')
  const [newCompetitorUrl, setNewCompetitorUrl] = useState('')

  const [showAddPersonaForm, setShowAddPersonaForm] = useState(false)
  const [newPersonaType, setNewPersonaType] = useState('')
  const [newPersonaDescription, setNewPersonaDescription] = useState('')

  const [showAddTopicForm, setShowAddTopicForm] = useState(false)
  const [newTopicName, setNewTopicName] = useState('')

  const [isGeneratingPrompts, setIsGeneratingPrompts] = useState(false)

  // Validation helpers
  const isValidEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  }

  const isValidURL = (url: string) => {
    try {
      new URL(url)
      return true
    } catch {
      return false
    }
  }

  // Competitor management
  const updateCompetitorUrl = (id: string, newUrl: string) => {
    const updatedCompetitors = data.competitors.map(comp =>
      comp.id === id ? { ...comp, url: newUrl } : comp
    )
    updateData({ competitors: updatedCompetitors })
  }

  const toggleCompetitorSelection = (id: string) => {
    const newSet = new Set(data.selectedCompetitors)
    if (newSet.has(id)) {
      newSet.delete(id)
    } else {
      // Limit to 4 competitors
      if (newSet.size >= 4) {
        alert('You can select up to 4 competitors')
        return
      }
      newSet.add(id)
    }
    updateData({ selectedCompetitors: newSet })
  }

  const removeCompetitor = (id: string) => {
    const newSelected = new Set(data.selectedCompetitors)
    newSelected.delete(id)
    updateData({
      competitors: data.competitors.filter(comp => comp.id !== id),
      selectedCompetitors: newSelected
    })
  }

  const addCompetitor = () => {
    if (newCompetitorName.trim() && newCompetitorUrl.trim()) {
      if (!isValidURL(newCompetitorUrl)) {
        alert('Please enter a valid URL')
        return
      }
      const newCompetitor = {
        id: Date.now().toString(),
        name: newCompetitorName.trim(),
        url: newCompetitorUrl.trim()
      }
      updateData({ competitors: [...data.competitors, newCompetitor] })
      setNewCompetitorName('')
      setNewCompetitorUrl('')
      setShowAddCompForm(false)
    }
  }

  // Persona management
  const updatePersonaDescription = (id: string, newDescription: string) => {
    const updatedPersonas = data.personas.map(persona =>
      persona.id === id ? { ...persona, description: newDescription } : persona
    )
    updateData({ personas: updatedPersonas })
  }

  const togglePersonaSelection = (id: string) => {
    const newSet = new Set(data.selectedPersonas)
    if (newSet.has(id)) {
      newSet.delete(id)
    } else {
      // Limit to 2 personas
      if (newSet.size >= 2) {
        alert('You can select up to 2 personas')
        return
      }
      newSet.add(id)
    }
    updateData({ selectedPersonas: newSet })
  }

  const removePersona = (id: string) => {
    const newSelected = new Set(data.selectedPersonas)
    newSelected.delete(id)
    updateData({
      personas: data.personas.filter(persona => persona.id !== id),
      selectedPersonas: newSelected
    })
  }

  const addPersona = () => {
    if (newPersonaType.trim() && newPersonaDescription.trim()) {
      const newPersona = {
        id: Date.now().toString(),
        type: newPersonaType.trim(),
        description: newPersonaDescription.trim()
      }
      updateData({ personas: [...data.personas, newPersona] })
      setNewPersonaType('')
      setNewPersonaDescription('')
      setShowAddPersonaForm(false)
    }
  }

  // Topic management
  const toggleTopicSelection = (id: string) => {
    const newSet = new Set(data.selectedTopics)
    if (newSet.has(id)) {
      newSet.delete(id)
    } else {
      // Limit to 2 topics
      if (newSet.size >= 2) {
        alert('You can select up to 2 topics')
        return
      }
      newSet.add(id)
    }
    updateData({ selectedTopics: newSet })
  }

  const removeTopic = (id: string) => {
    const newSelected = new Set(data.selectedTopics)
    newSelected.delete(id)
    updateData({
      topics: data.topics.filter(topic => topic.id !== id),
      selectedTopics: newSelected
    })
  }

  const addTopic = () => {
    if (newTopicName.trim()) {
      const newTopic = {
        id: Date.now().toString(),
        name: newTopicName.trim()
      }
      updateData({ topics: [...data.topics, newTopic] })
      setNewTopicName('')
      setShowAddTopicForm(false)
    }
  }

  // Loading Cards Component with proper cleanup
  const LoadingCards = () => {
    const [card1Visible, setCard1Visible] = useState(false)
    const [card2Visible, setCard2Visible] = useState(false)
    const [card3Visible, setCard3Visible] = useState(false)
    const [card4Visible, setCard4Visible] = useState(false)

    const [card1Loaded, setCard1Loaded] = useState(false)
    const [card2Loaded, setCard2Loaded] = useState(false)
    const [card3Loaded, setCard3Loaded] = useState(false)
    const [card4Loaded, setCard4Loaded] = useState(false)

    useEffect(() => {
      if (!isAnalyzing) {
        // Reset everything when analysis stops
        setCard1Visible(false)
        setCard2Visible(false)
        setCard3Visible(false)
        setCard4Visible(false)
        setCard1Loaded(false)
        setCard2Loaded(false)
        setCard3Loaded(false)
        setCard4Loaded(false)
        return
      }

      // Start animation only once
      const timers: NodeJS.Timeout[] = []

      // Card 1: Show after configured delay, complete after 2.5s
      timers.push(setTimeout(() => {
        setCard1Visible(true)
        timers.push(setTimeout(() => setCard1Loaded(true), 2500))
      }, frontendConfig.animations.cardDelays.card1))

      // Card 2: Show after configured delay, complete after 2.5s
      timers.push(setTimeout(() => {
        setCard2Visible(true)
        timers.push(setTimeout(() => setCard2Loaded(true), 2500))
      }, frontendConfig.animations.cardDelays.card2))

      // Card 3: Show after configured delay, complete after 2.5s
      timers.push(setTimeout(() => {
        setCard3Visible(true)
        timers.push(setTimeout(() => setCard3Loaded(true), 2500))
      }, frontendConfig.animations.cardDelays.card3))

      // Card 4: Show after configured delay, but WAIT for actual API completion (don't auto-complete)
      timers.push(setTimeout(() => {
        setCard4Visible(true)
        // Don't auto-complete card 4 - wait for analysisComplete signal
      }, frontendConfig.animations.cardDelays.card4))

      // Cleanup function
      return () => {
        timers.forEach(timer => clearTimeout(timer))
      }
    }, [isAnalyzing])

    // ✅ FIX: Card 4 only completes when API actually finishes
    useEffect(() => {
      if (analysisComplete && card4Visible) {
        // Enable the button immediately when backend finishes
        setCard4Loaded(true)
      }
    }, [analysisComplete, card4Visible])

    // Button will be visible immediately; enable only when processing completes.

    const steps = [
      { text: "Scraping URL and fetching brand context", visible: card1Visible, loaded: card1Loaded },
      { text: "Finding your closest competitors", visible: card2Visible, loaded: card2Loaded },
      { text: "Analyzing topics from your page", visible: card3Visible, loaded: card3Loaded },
      { text: "Finding user personas from your brand context", visible: card4Visible, loaded: card4Loaded }
    ]

    return (
      <div className="flex flex-col items-center justify-center h-full px-8">
        <div className="space-y-4 w-full max-w-lg">
          {steps.map((step, index) => (
            <div
              key={index}
              className={`
                transition-all duration-700 ease-out
                ${step.visible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-6 scale-95'}
              `}
            >
              <Card className="border-2 hover:border-foreground/20 transition-all duration-300 hover:shadow-lg">
                <CardContent className="flex items-center gap-6 p-6">
                  <div className="flex-shrink-0">
                    {step.loaded ? (
                      <div className="w-8 h-8 rounded-full bg-foreground flex items-center justify-center animate-in zoom-in-50 duration-300">
                        <svg className="w-5 h-5 text-background" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                    ) : (
                      <div
                        className="animate-spin rounded-full border-4 border-transparent"
                        style={{
                          width: '32px',
                          height: '32px',
                          borderTopColor: 'hsl(var(--primary))',
                          borderRightColor: 'hsl(var(--primary))',
                          borderWidth: '3px'
                        }}
                      />
                    )}
                  </div>

                  <div className="flex-1">
                    <p className="text-lg font-medium leading-relaxed text-foreground">
                      {step.text}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          ))}
        </div>

        {/* Progress feedback */}
        {card4Visible && !card4Loaded && (
          <div className="mt-8 animate-in fade-in-0 duration-500">
            <div className="flex items-center justify-center gap-3 text-muted-foreground">
              <div className="animate-pulse">⏳</div>
              <p className="text-sm">
                AI is analyzing your website... This may take 20-60 seconds.
              </p>
            </div>
          </div>
        )}

        <div className="mt-12 animate-in fade-in-0 slide-in-from-bottom-4 duration-0">
          <Button
            size="lg"
            className="h-12 px-8 text-lg font-semibold bg-foreground text-background hover:bg-foreground/90 disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={() => {
              setIsAnalyzing(false)
              setAnalysisComplete(false)
              setCurrentStep(5)
            }}
            disabled={!card4Loaded}
          >
            {card4Loaded ? 'Continue to Next Step →' : 'Processing...'}
          </Button>
        </div>
      </div>
    )
  }

  // Prompt Generation Animation Component
  const PromptGenerationAnimation = () => {
    const [step1Done, setStep1Done] = useState(false)
    const [step2Done, setStep2Done] = useState(false)
    const [step3Done, setStep3Done] = useState(false)

    useEffect(() => {
      const timers: NodeJS.Timeout[] = []

      // Step 1: Complete after configured delay
      timers.push(setTimeout(() => setStep1Done(true), frontendConfig.animations.stepDelays.step1))

      // Step 2: Complete after configured delay
      timers.push(setTimeout(() => setStep2Done(true), frontendConfig.animations.stepDelays.step2))

      // Step 3: Complete after configured delay
      timers.push(setTimeout(() => setStep3Done(true), frontendConfig.animations.stepDelays.step3))

      return () => {
        timers.forEach(timer => clearTimeout(timer))
      }
    }, [])

    const steps = [
      { text: "Analyzing selected topics and personas", done: step1Done },
      { text: "Generating AEO-optimized prompts", done: step2Done },
      { text: "Preparing prompts for LLM testing", done: step3Done }
    ]

    return (
      <div className="flex flex-col items-center justify-center h-full px-8">
        <div className="space-y-4 w-full max-w-lg">
          {steps.map((step, index) => (
            <div
              key={index}
              className="animate-in fade-in-0 slide-in-from-bottom-4 duration-500"
              style={{ animationDelay: `${index * 150}ms` }}
            >
              <Card className="border-2 hover:border-foreground/20 transition-all duration-300">
                <CardContent className="flex items-center gap-6 p-6">
                  <div className="flex-shrink-0">
                    {step.done ? (
                      <div className="w-8 h-8 rounded-full bg-foreground flex items-center justify-center animate-in zoom-in-50 duration-300">
                        <svg className="w-5 h-5 text-background" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                    ) : (
                      <div
                        className="animate-spin rounded-full border-4 border-transparent"
                        style={{
                          width: '32px',
                          height: '32px',
                          borderTopColor: 'hsl(var(--primary))',
                          borderRightColor: 'hsl(var(--primary))',
                          borderWidth: '3px'
                        }}
                      />
                    )}
                  </div>

                  <div className="flex-1">
                    <p className="text-lg font-medium leading-relaxed text-foreground">
                      {step.text}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          ))}
        </div>

        <div className="mt-8 text-center">
          <p className="text-sm text-muted-foreground">
            Generating prompts across 5 AEO query types...
          </p>
        </div>
      </div>
    )
  }

  // Competitors List Component
  const CompetitorsList = () => {
    // Get AI-generated competitors from analysis results
    const aiCompetitors = data.analysisResults?.competitors || []

    // Create a map to avoid duplicates based on URL
    const competitorMap = new Map()

    // Add AI competitors first (from API response)
    aiCompetitors.forEach((comp: any, index: number) => {
      competitorMap.set(comp.url, {
        id: `ai-${index}`,
        name: comp.name,
        url: comp.url,
        reason: comp.reason,
        similarity: comp.similarity,
        isAI: true
      })
    })

    // Add user-added competitors (from data.competitors)
    data.competitors.forEach(comp => {
      if (!competitorMap.has(comp.url)) {
        competitorMap.set(comp.url, {
          ...comp,
          isAI: false
        })
      }
    })

    // Convert back to array
    const allCompetitors = Array.from(competitorMap.values())

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-h3 font-heading">Competitors</h2>
            <p className="text-body text-muted-foreground">
              {aiCompetitors.length > 0
                ? `AI found ${aiCompetitors.length} competitors. Select up to 4 to continue.`
                : 'Manage your competitor list for analysis'
              }
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentStep(4)}
          >
            ← Back
          </Button>
        </div>

        <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
          {allCompetitors.map((competitor: any) => {
            const isSelected = data.selectedCompetitors.has(competitor.id)
            return (
              <div
                key={competitor.id}
                className={`
                  rounded-lg p-3 flex justify-between items-center transition-all duration-300 cursor-pointer
                  ${isSelected
                    ? 'bg-muted border-2 border-foreground'
                    : 'bg-card border border-border hover:border-muted-foreground'
                  }
                `}
                onClick={() => toggleCompetitorSelection(competitor.id)}
              >
                <div className="flex flex-col flex-1">
                  <div className="font-medium text-foreground">
                    {competitor.name}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {competitor.url}
                  </div>
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation()
                    removeCompetitor(competitor.id)
                  }}
                  className="flex-shrink-0 text-foreground hover:bg-muted"
                >
                  ×
                </Button>
              </div>
            )
          })}

          {showAddCompForm ? (
            <div className="bg-card border border-border rounded-lg p-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <Input
                  placeholder="Competitor Name"
                  value={newCompetitorName}
                  onChange={(e) => setNewCompetitorName(e.target.value)}
                  autoFocus
                />
                <Input
                  placeholder="https://example.com"
                  value={newCompetitorUrl}
                  onChange={(e) => setNewCompetitorUrl(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={addCompetitor}
                  disabled={!newCompetitorName.trim() || !newCompetitorUrl.trim()}
                >
                  Save
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowAddCompForm(false)
                    setNewCompetitorName('')
                    setNewCompetitorUrl('')
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                setShowAddCompForm(true)
                setNewCompetitorName('')
                setNewCompetitorUrl('')
              }}
            >
              + Add Competitor
            </Button>
          )}
        </div>
      </div>
    )
  }

  // Topics Component
  const Topics = () => {
    // Get AI-generated topics from analysis results
    const aiTopics = data.analysisResults?.topics || []

    // Create a map to avoid duplicates based on name
    const topicMap = new Map()

    // Add AI topics first (from API response)
    aiTopics.forEach((topic: any, index: number) => {
      topicMap.set(topic.name, {
        id: `ai-${index}`,
        name: topic.name,
        description: topic.description,
        keywords: topic.keywords,
        priority: topic.priority,
        isAI: true
      })
    })

    // Add user-added topics (from data.topics)
    data.topics.forEach(topic => {
      if (!topicMap.has(topic.name)) {
        topicMap.set(topic.name, {
          ...topic,
          isAI: false
        })
      }
    })

    // Convert back to array
    const allTopics = Array.from(topicMap.values())

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-h3 font-heading">Topics</h2>
            <p className="text-body text-muted-foreground">
              {aiTopics.length > 0
                ? `AI found ${aiTopics.length} topics. Select up to 2 to continue.`
                : 'Select topics to generate prompts'
              }
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentStep(5)}
          >
            ← Back
          </Button>
        </div>

        <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
          {allTopics.map((topic: any) => {
            const isSelected = data.selectedTopics.has(topic.id)
            return (
              <div
                key={topic.id}
                className={`
                  rounded-lg p-3 flex justify-between items-center transition-all duration-300 cursor-pointer
                  ${isSelected
                    ? 'bg-muted border-2 border-foreground'
                    : 'bg-card border border-border hover:border-muted-foreground'
                  }
                `}
                onClick={() => toggleTopicSelection(topic.id)}
              >
                <div className="flex flex-col flex-1">
                  <div className="font-medium text-foreground">
                    {topic.name}
                  </div>
                  {topic.description && (
                    <div className="text-xs text-muted-foreground mt-1">
                      {topic.description}
                    </div>
                  )}
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation()
                    removeTopic(topic.id)
                  }}
                  className="flex-shrink-0 text-foreground hover:bg-muted"
                >
                  ×
                </Button>
              </div>
            )
          })}

          {showAddTopicForm ? (
            <div className="bg-card border border-border rounded-lg p-4 space-y-3">
              <Input
                placeholder="Topic Name"
                value={newTopicName}
                onChange={(e) => setNewTopicName(e.target.value)}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    addTopic()
                  } else if (e.key === 'Escape') {
                    e.preventDefault()
                    setShowAddTopicForm(false)
                    setNewTopicName('')
                  }
                }}
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={addTopic}
                  disabled={!newTopicName.trim()}
                >
                  Save
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowAddTopicForm(false)
                    setNewTopicName('')
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                setShowAddTopicForm(true)
                setNewTopicName('')
              }}
            >
              + Add Topic
            </Button>
          )}
        </div>
      </div>
    )
  }

  // Region & Language Component
  const RegionLanguage = () => {
    const [validationError, setValidationError] = useState('')

    const handleGeneratePrompts = async () => {
      // ✅ Validation before generation
      setValidationError('')
      
      if (data.selectedCompetitors.size === 0) {
        setValidationError('Please select at least 1 competitor to continue')
        return
      }
      
      if (data.selectedTopics.size === 0) {
        setValidationError('Please select at least 1 topic to continue')
        return
      }
      
      if (data.selectedPersonas.size === 0) {
        setValidationError('Please select at least 1 persona to continue')
        return
      }

      setIsGeneratingPrompts(true)

      try {
        console.log('🎯 Starting prompt generation...')
        console.log(`✅ Validation passed: ${data.selectedCompetitors.size} competitors, ${data.selectedTopics.size} topics, ${data.selectedPersonas.size} personas`)

        // First, update selections in the backend database
        console.log('📝 Saving selections to database...')

        // Get all competitors, topics, and personas (AI + user-added)
        const aiCompetitors = data.analysisResults?.competitors || []
        const aiTopics = data.analysisResults?.topics || []
        const aiPersonas = data.analysisResults?.personas || []

        // Create maps for quick lookup
        const competitorMap = new Map()
        aiCompetitors.forEach((comp: any, index: number) => {
          competitorMap.set(`ai-${index}`, comp)
        })
        data.competitors.forEach(comp => {
          competitorMap.set(comp.id, comp)
        })

        const topicMap = new Map()
        aiTopics.forEach((topic: any, index: number) => {
          topicMap.set(`ai-${index}`, topic)
        })
        data.topics.forEach(topic => {
          topicMap.set(topic.id, topic)
        })

        const personaMap = new Map()
        aiPersonas.forEach((persona: any, index: number) => {
          personaMap.set(`ai-${index}`, persona)
        })
        data.personas.forEach(persona => {
          personaMap.set(persona.id, persona)
        })

        // Extract URLs, names, and types for selected items
        const selectedCompetitorUrls = Array.from(data.selectedCompetitors)
          .map(id => competitorMap.get(id)?.url)
          .filter(Boolean)

        const selectedTopicNames = Array.from(data.selectedTopics)
          .map(id => topicMap.get(id)?.name)
          .filter(Boolean)

        const selectedPersonaTypes = Array.from(data.selectedPersonas)
          .map(id => personaMap.get(id)?.type)
          .filter(Boolean)

        console.log('Selected competitors:', selectedCompetitorUrls)
        console.log('Selected topics:', selectedTopicNames)
        console.log('Selected personas:', selectedPersonaTypes)

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

          // Backend automatically completed:
          // ✅ Prompt generation (50 TOFU-focused prompts)
          // ✅ Multi-LLM testing across 4 platforms  
          // ✅ Metrics calculation and aggregation
          // ✅ AI insights generation
          
          console.log('🎉 All processing complete! Backend handled everything automatically.')
          console.log('📊 Redirecting to dashboard to view results...')
          router.push('/dashboard')
        } else {
          console.error('❌ Processing failed:', response.message)
          alert(`Processing failed: ${response.message || 'Unknown error'}. Please try again.`)
          setIsGeneratingPrompts(false)
        }

      } catch (error: any) {
        console.error('❌ Prompt generation error:', error)
        
        // Better error handling with specific messages
        let errorMessage = 'Failed to generate prompts. '
        
        if (error.message?.includes('selections')) {
          errorMessage += 'Your selections were saved, but prompt generation failed. '
        } else if (error.message?.includes('network') || error.message?.includes('timeout')) {
          errorMessage += 'Network error. Please check your connection. '
        } else {
          errorMessage += error.message || 'Unknown error occurred. '
        }
        
        errorMessage += 'Click "Generate Prompts" to retry.'
        
        setValidationError(errorMessage)
        setIsGeneratingPrompts(false)
      }
    }

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-h3 font-heading">Region & Language</h2>
            <p className="text-body text-muted-foreground">Select your target region and language</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentStep(7)}
          >
            ← Back
          </Button>
        </div>

        <div className="bg-card border border-border rounded-lg p-6 flex flex-col gap-4">
          <div className="space-y-4">
            <div>
              <label className="block text-caption text-foreground mb-2">Region</label>
              <div className="flex items-center justify-between p-3 rounded-md border border-input bg-background text-foreground">
                <span>Global</span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
              </div>
            </div>

            <div>
              <label className="block text-caption text-foreground mb-2">Language</label>
              <div className="flex items-center justify-between p-3 rounded-md border border-input bg-background text-foreground">
                <span>English</span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
              </div>
            </div>
          </div>

          {validationError && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md space-y-2">
              <p className="text-sm text-red-600 dark:text-red-400 text-center">
                {validationError}
              </p>
              {validationError.includes('retry') && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full text-xs"
                  onClick={() => router.push('/dashboard')}
                >
                  Skip to Dashboard →
                </Button>
              )}
            </div>
          )}

          <Button
            size="lg"
            className="w-full mt-4"
            onClick={handleGeneratePrompts}
            disabled={isGeneratingPrompts}
          >
            {isGeneratingPrompts ? 'Generating...' : validationError.includes('retry') ? 'Retry Generation' : 'Generate Prompts'}
          </Button>

          <p className="text-label text-muted-foreground text-center mt-3">
            More languages and regions soon…
          </p>
        </div>
      </div>
    )
  }

  // User Personas Component
  const UserPersonas = () => {
    // Get AI-generated personas from analysis results
    const aiPersonas = data.analysisResults?.personas || []

    // Create a map to avoid duplicates based on type
    const personaMap = new Map()

    // Add AI personas first (from API response)
    aiPersonas.forEach((persona: any, index: number) => {
      personaMap.set(persona.type, {
        id: `ai-${index}`,
        type: persona.type,
        description: persona.description,
        painPoints: persona.painPoints,
        goals: persona.goals,
        relevance: persona.relevance,
        isAI: true
      })
    })

    // Add user-added personas (from data.personas)
    data.personas.forEach(persona => {
      if (!personaMap.has(persona.type)) {
        personaMap.set(persona.type, {
          ...persona,
          isAI: false
        })
      }
    })

    // Convert back to array
    const allPersonas = Array.from(personaMap.values())

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-h3 font-heading">User Personas</h2>
            <p className="text-body text-muted-foreground">
              {aiPersonas.length > 0
                ? `AI found ${aiPersonas.length} personas. Select up to 2 to continue.`
                : 'Select personas to generate prompts'
              }
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentStep(6)}
          >
            ← Back
          </Button>
        </div>

        <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
          {allPersonas.map((persona: any) => {
            const isSelected = data.selectedPersonas.has(persona.id)
            return (
              <div
                key={persona.id}
                className={`
                  rounded-lg p-3 flex justify-between items-center transition-all duration-300 cursor-pointer
                  ${isSelected
                    ? 'bg-muted border-2 border-foreground'
                    : 'bg-card border border-border hover:border-muted-foreground'
                  }
                `}
                onClick={() => togglePersonaSelection(persona.id)}
              >
                <div className="flex flex-col flex-1">
                  <div className="font-medium text-foreground">
                    {persona.type}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {persona.description}
                  </div>
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation()
                    removePersona(persona.id)
                  }}
                  className="flex-shrink-0 text-foreground hover:bg-muted"
                >
                  ×
                </Button>
              </div>
            )
          })}

          {showAddPersonaForm ? (
            <div className="bg-card border border-border rounded-lg p-4 space-y-3">
              <Input
                placeholder="Persona Type (e.g., Marketer, Developer)"
                value={newPersonaType}
                onChange={(e) => setNewPersonaType(e.target.value)}
                autoFocus
              />
              <textarea
                placeholder="Describe this persona..."
                value={newPersonaDescription}
                onChange={(e) => setNewPersonaDescription(e.target.value)}
                className="w-full min-h-[80px] p-3 rounded-md border border-input bg-background text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={addPersona}
                  disabled={!newPersonaType.trim() || !newPersonaDescription.trim()}
                >
                  Save
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowAddPersonaForm(false)
                    setNewPersonaType('')
                    setNewPersonaDescription('')
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                setShowAddPersonaForm(true)
                setNewPersonaType('')
                setNewPersonaDescription('')
              }}
            >
              + Add Persona
            </Button>
          )}
        </div>
      </div>
    )
  }

  // Step 1: Email Input (UNUSED - removed from flow)
  const EmailStep = () => {
    const [email, setEmail] = useState(data.email)
    const [emailError, setEmailError] = useState('')

    const handleContinue = () => {
      if (!isValidEmail(email)) {
        setEmailError('Please enter a valid email address')
        return
      }
      updateData({ email })
      setCurrentStep(2)
    }

    const handleGoogleLogin = () => {
      setCurrentStep(4)
    }

    return (
      <div className="space-y-6">
        <div className="text-center space-y-2">
          <h2 className="text-h2 font-heading text-foreground">
            Create an account
          </h2>
          <p className="text-body text-muted-foreground">Enter your work email below to create your account</p>
        </div>

        <div className="space-y-4">
          <Button
            variant="outline"
            className="w-full h-12"
            onClick={handleGoogleLogin}
          >
            <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Google
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">OR CONTINUE WITH</span>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-caption text-foreground">Email</label>
            <Input
              type="email"
              placeholder="name@company.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value)
                setEmailError('')
              }}
              className={`h-12 ${emailError ? 'border-red-500' : ''}`}
            />
            {emailError && (
              <p className="text-sm text-red-500">{emailError}</p>
            )}
          </div>

          <Button
            className="w-full h-12 bg-foreground text-background hover:bg-foreground/90"
            onClick={handleContinue}
          >
            Continue
          </Button>
        </div>
      </div>
    )
  }

  // Step 2: Email Verification (UNUSED - removed from flow)
  const VerificationStep = () => {
    const [codes, setCodes] = useState(['', '', '', '', '', ''])

    const handleCodeChange = (index: number, value: string) => {
      if (value && !/^\d$/.test(value)) return

      const newCodes = [...codes]
      newCodes[index] = value
      setCodes(newCodes)

      if (value && index < 5) {
        setTimeout(() => {
          const nextInput = document.querySelector(`input[data-code-index="${index + 1}"]`) as HTMLInputElement
          if (nextInput) {
            nextInput.focus()
          }
        }, 10)
      }
    }

    const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
      if (e.key === 'Backspace' && !codes[index] && index > 0) {
        const prevInput = document.querySelector(`input[data-code-index="${index - 1}"]`) as HTMLInputElement
        if (prevInput) {
          prevInput.focus()
        }
      }
    }

    const handleContinue = () => {
      const allFilled = codes.every(code => code !== '')
      if (allFilled) {
        setCurrentStep(3)
      }
    }

    return (
      <div className="space-y-6">
        <div className="text-center">
          <h2 className="text-h3 font-heading">Verify your email</h2>
          <p className="text-body text-muted-foreground">Enter the 6-digit code we sent you</p>
        </div>

        <div className="flex gap-2 justify-center">
          {codes.map((code, index) => (
            <Input
              key={index}
              type="text"
              maxLength={1}
              value={code}
              onChange={(e) => handleCodeChange(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              data-code-index={index}
              autoComplete="off"
              className="w-12 text-center"
            />
          ))}
        </div>

        <div className="flex justify-center gap-3">
          <Button
            variant="outline"
            className="w-fit px-8"
            size="lg"
            onClick={() => setCurrentStep(1)}
          >
            ← Back
          </Button>
          <Button
            className="w-fit px-8"
            size="lg"
            onClick={handleContinue}
            disabled={codes.some(code => !code)}
          >
            Continue
          </Button>
        </div>
      </div>
    )
  }

  // Step 3: User Information
  // UNUSED - removed from flow
  const UserInfoStep = () => {
    const [firstName, setFirstName] = useState(data.firstName)
    const [lastName, setLastName] = useState(data.lastName)
    const [companyName, setCompanyName] = useState(data.companyName)

    const handleContinue = () => {
      if (firstName && lastName && companyName) {
        updateData({ firstName, lastName, companyName })
        setCurrentStep(4)
      }
    }

    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-h3 font-heading">Tell us about yourself</h2>
          <p className="text-body text-muted-foreground">We'll personalize your experience</p>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              placeholder="First Name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
            />
            <Input
              placeholder="Last Name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
            />
          </div>
          <Input
            placeholder="Company Name"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
          />
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="w-fit px-8"
              size="lg"
              onClick={() => setCurrentStep(2)}
            >
              ← Back
            </Button>
            <Button
              className="flex-1"
              size="lg"
              onClick={handleContinue}
              disabled={!firstName || !lastName || !companyName}
            >
              Continue
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // Step 4: Campaign Setup
  const CampaignStep = () => {
    const [url, setUrl] = useState('')
    const [urlError, setUrlError] = useState('')

    const handleAnalyze = async () => {
      if (!url) return

      if (!isValidURL(url)) {
        setUrlError('Please enter a valid URL (e.g., https://example.com)')
        return
      }

      setIsAnalyzing(true)
      setAnalysisComplete(false)
      setUrlError('')

      try {
        console.log('🔍 Starting website analysis for:', url)

        // Clear previous data before starting new analysis
        updateData({
          websiteUrl: url,
          competitors: [],
          topics: [],
          personas: [],
          selectedCompetitors: new Set(),
          selectedTopics: new Set(),
          selectedPersonas: new Set(),
          analysisResults: null
        })

        // Call the backend API to analyze the website
        const response = await apiService.analyzeWebsite(url)

        if (response.success) {
          console.log('✅ Website analysis completed:', response.data)

          // Update local data with the analysis results
          updateData({
            websiteUrl: url,
            urlAnalysisId: response.data.urlAnalysisId, // Save the ID for dashboard navigation
            // Store analysis results for use in later steps
            analysisResults: response.data.analysis
          })

          // Mark analysis as complete (this will trigger the final animation step)
          setAnalysisComplete(true)

        } else {
          setUrlError(response.message || 'Analysis failed. Please try again.')
          setIsAnalyzing(false)
          setAnalysisComplete(false)
        }

      } catch (error: any) {
        console.error('❌ Website analysis failed:', error)
        setUrlError(error.message || 'Analysis failed. Please check your connection and try again.')
        setIsAnalyzing(false)
        setAnalysisComplete(false)
      }
    }

    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-h3 font-heading">Enter your website URL</h2>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Input
              type="url"
              placeholder="https://example.com"
              value={url}
              onChange={(e) => {
                setUrl(e.target.value)
                setUrlError('')
              }}
              className={urlError ? 'border-red-500' : ''}
            />
            {urlError && (
              <p className="text-sm text-red-500">{urlError}</p>
            )}
          </div>
          <div className="flex gap-3">
            <Button
              className="flex-1"
              size="lg"
              onClick={handleAnalyze}
              disabled={!url || isAnalyzing}
            >
              {isAnalyzing ? 'Analyzing...' : 'Analyze →'}
            </Button>
          </div>
        </div>
      </div>
    )
  }

  const renderStep = () => {
    switch (currentStep) {
      case 4: return <CampaignStep /> // Website URL step
      case 5: return <CompetitorsList />
      case 6: return <Topics />
      case 7: return <UserPersonas />
      case 8: return <RegionLanguage />
      default: return <CampaignStep /> // Default to website URL step
    }
  }

  // Right Panel Component
  const RightPanel = () => {
    if (isAnalyzing) {
      return <LoadingCards />
    }

    if (currentStep === 5) {
      const selectedCount = data.selectedCompetitors.size
      const canContinue = selectedCount > 0 && selectedCount <= 4

      return (
        <div className="flex flex-col items-center justify-center h-full gap-3">
          <div className="text-center mb-4">
            <p className="text-muted-foreground">
              {selectedCount === 0
                ? 'Select your competitors to continue'
                : `Selected ${selectedCount} of ${frontendConfig.limits.maxCompetitors} competitors`
              }
            </p>
            {!validateCompetitorCount(selectedCount) && (
              <p className="text-sm text-red-500 mt-2">
                {getValidationMessage('competitors')}
              </p>
            )}
          </div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              size="lg"
              className="px-8 py-4 text-lg"
              onClick={() => setCurrentStep(4)}
            >
              ← Back
            </Button>
            <Button
              size="lg"
              className="px-8 py-4 text-lg"
              onClick={() => setCurrentStep(6)}
              disabled={!canContinue}
            >
              Next →
            </Button>
          </div>
        </div>
      )
    }

    if (currentStep === 6) {
      const selectedCount = data.selectedTopics.size
      const canContinue = selectedCount > 0 && selectedCount <= 2

      return (
        <div className="flex flex-col items-center justify-center h-full gap-3">
          <div className="text-center mb-4">
            <p className="text-muted-foreground">
              {selectedCount === 0
                ? 'Select your topics to continue'
                : `Selected ${selectedCount} of ${frontendConfig.limits.maxTopics} topics`
              }
            </p>
            {!validateTopicCount(selectedCount) && (
              <p className="text-sm text-red-500 mt-2">
                {getValidationMessage('topics')}
              </p>
            )}
          </div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              size="lg"
              className="px-8 py-4 text-lg"
              onClick={() => setCurrentStep(5)}
            >
              ← Back
            </Button>
            <Button
              size="lg"
              className="px-8 py-4 text-lg"
              onClick={() => setCurrentStep(7)}
              disabled={!canContinue}
            >
              Next →
            </Button>
          </div>
        </div>
      )
    }

    if (currentStep === 7) {
      const selectedCount = data.selectedPersonas.size
      const canContinue = selectedCount > 0 && selectedCount <= 2

      return (
        <div className="flex flex-col items-center justify-center h-full gap-3">
          <div className="text-center mb-4">
            <p className="text-muted-foreground">
              {selectedCount === 0
                ? 'Select your personas to continue'
                : `Selected ${selectedCount} of ${frontendConfig.limits.maxPersonas} personas`
              }
            </p>
            {!validatePersonaCount(selectedCount) && (
              <p className="text-sm text-red-500 mt-2">
                {getValidationMessage('personas')}
              </p>
            )}
          </div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              size="lg"
              className="px-8 py-4 text-lg"
              onClick={() => setCurrentStep(6)}
            >
              ← Back
            </Button>
            <Button
              size="lg"
              className="px-8 py-4 text-lg"
              onClick={() => setCurrentStep(8)}
              disabled={!canContinue}
            >
              Next →
            </Button>
          </div>
        </div>
      )
    }

    if (currentStep === 8) {
      if (isGeneratingPrompts) {
        return <PromptGenerationAnimation />
      }

      return (
        <div className="flex flex-col items-center justify-center h-full text-center px-8">
          <div className="mb-8">
            <h3 className="text-xl font-semibold text-foreground mb-2">Ready to generate prompts</h3>
            <p className="text-muted-foreground mb-6">
              Topics × User Personas × Region × Language
            </p>

            <div className="flex flex-row items-center justify-center gap-6">
              <div className="flex flex-col items-center gap-2">
                <Avatar className="w-16 h-16 border-2 border-border">
                  <AvatarImage src="https://upload.wikimedia.org/wikipedia/commons/0/04/ChatGPT_logo.svg" alt="OpenAI" />
                  <AvatarFallback className="bg-foreground text-background font-bold text-lg">AI</AvatarFallback>
                </Avatar>
                <span className="text-xs text-muted-foreground">OpenAI</span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <Avatar className="w-16 h-16 border-2 border-border">
                  <AvatarImage src="https://seeklogo.com/images/G/google-gemini-logo-A5787B2662-seeklogo.com.png" alt="Gemini" />
                  <AvatarFallback className="bg-foreground text-background font-bold text-lg">G</AvatarFallback>
                </Avatar>
                <span className="text-xs text-muted-foreground">Gemini</span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <Avatar className="w-16 h-16 border-2 border-border">
                  <AvatarImage src="https://seeklogo.com/images/A/anthropic-claude-logo-3D4A2A3B6A-seeklogo.com.png" alt="Claude" />
                  <AvatarFallback className="bg-foreground text-background font-bold text-lg">C</AvatarFallback>
                </Avatar>
                <span className="text-xs text-muted-foreground">Claude</span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <Avatar className="w-16 h-16 border-2 border-border">
                  <AvatarImage src="https://seeklogo.com/images/P/perplexity-ai-logo-7F4B3B3B3B-seeklogo.com.png" alt="Perplexity" />
                  <AvatarFallback className="bg-foreground text-background font-bold text-lg">P</AvatarFallback>
                </Avatar>
                <span className="text-xs text-muted-foreground">Perplexity</span>
              </div>
            </div>
          </div>
        </div>
      )
    }

    return (
      <div className="text-center space-y-6">
        <div className="relative">
        <h2 className="text-h1 font-heading text-foreground">
          Get more traffic from LLMs
        </h2>
        </div>
        <p className="text-lg text-muted-foreground max-w-md mx-auto">

        </p>
        <div className="flex justify-center space-x-2 mt-8">
          {[1, 2, 3].map((dot) => (
            <div
              key={dot}
              className="w-2 h-2 rounded-full bg-muted-foreground/30 animate-pulse"
              style={{ animationDelay: `${dot * 0.2}s` }}
            />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex">
      {/* Left Half - Dynamic Content */}
      <div className="flex-1 relative bg-background">
        {/* Background Beams */}
        <BackgroundBeams className="absolute inset-0 z-0" />
        
        {/* Brand Logo - Top Left */}
        <div className="absolute top-6 left-6 z-10">
          <h1 className="text-3xl font-logo text-foreground">
            Rankly
          </h1>
        </div>

        {/* Theme Toggle & Contact - Bottom Left */}
        <div className="absolute bottom-6 left-6 z-10">
          <div className="flex flex-col gap-3">
            <a
              href="mailto:sj@tryrankly.com"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-200 flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              Contact us
            </a>
            <ThemeToggle />
          </div>
        </div>

        {/* Main Content - Centered */}
        <div className="p-8 flex items-center justify-center h-full">
          <div className="w-full max-w-md">
            <div className="space-y-6 animate-in fade-in-0 slide-in-from-bottom-4 duration-500">
              {!isAuthenticated ? (
                <LoginForm />
              ) : (
                renderStep()
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Right Half - Visual/Headline */}
      <div className="flex-1 relative flex items-center justify-center bg-dot-pattern overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-1/4 left-1/4 w-32 h-32 bg-muted/5 rounded-full blur-2xl animate-pulse"></div>
          <div className="absolute bottom-1/4 right-1/4 w-24 h-24 bg-muted/5 rounded-full blur-xl animate-pulse" style={{ animationDelay: '1s' }}></div>
          <div className="absolute top-1/2 right-1/3 w-16 h-16 bg-muted/3 rounded-full blur-lg animate-pulse" style={{ animationDelay: '2s' }}></div>
        </div>
        <div className="relative z-10">
          <RightPanel />
        </div>
      </div>
    </div>
  )
}

export { Onboarding }
