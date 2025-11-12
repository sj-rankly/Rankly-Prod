'use client'

import React, { createContext, useContext, useState, ReactNode } from 'react'
import apiService from '@/services/api'

// Types
export interface Competitor {
  id: string
  name: string
  url: string
}

export interface Persona {
  id: string
  type: string
  description: string
}

export interface Topic {
  id: string
  name: string
}

export interface OnboardingData {
  email: string
  firstName: string
  lastName: string
  companyName: string
  websiteUrl: string
  competitors: Competitor[]
  selectedCompetitors: Set<string>
  personas: Persona[]
  selectedPersonas: Set<string>
  topics: Topic[]
  selectedTopics: Set<string>
  region: string
  language: string
  urlAnalysisId?: string // Store URL analysis ID
  analysisResults?: any // Store AI analysis results
  generatedPrompts?: any[] // Store generated prompts
  totalPrompts?: number // Store total number of prompts
  analysisCompleted?: boolean // Flag to indicate analysis is complete
}

interface OnboardingContextType {
  data: OnboardingData
  updateData: (updates: Partial<OnboardingData>) => void
  resetData: () => void
  saveToBackend: () => Promise<void>
  loadFromBackend: () => Promise<void>
  isLoading: boolean
  error: string | null
}

const defaultData: OnboardingData = {
  email: '',
  firstName: '',
  lastName: '',
  companyName: '',
  websiteUrl: '',
  competitors: [],
  selectedCompetitors: new Set(),
  personas: [],
  selectedPersonas: new Set(),
  topics: [],
  selectedTopics: new Set(),
  region: 'Global',
  language: 'English'
}

const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined)

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<OnboardingData>(() => {
    // Try to load from localStorage (only on client)
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('onboarding-data')
      console.log('🔍 OnboardingContext - Loading from localStorage:', saved)
      if (saved) {
        try {
          const parsed = JSON.parse(saved)
          console.log('📝 OnboardingContext - Parsed data:', parsed)
          // Convert Set arrays back to Sets
          const restored = {
            ...parsed,
            selectedCompetitors: new Set(parsed.selectedCompetitors || []),
            selectedPersonas: new Set(parsed.selectedPersonas || []),
            selectedTopics: new Set(parsed.selectedTopics || [])
          }
          console.log('✅ OnboardingContext - Restored data:', restored)
          return restored
        } catch (e) {
          console.log('❌ OnboardingContext - Error parsing localStorage, using defaults')
          return defaultData
        }
      }
    }
    console.log('ℹ️ OnboardingContext - No saved data, using defaults')
    return defaultData
  })

  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const updateData = (updates: Partial<OnboardingData>) => {
    console.log('🔄 OnboardingContext - Updating data:', updates)
    setData(prev => {
      const newData = { ...prev, ...updates }
      console.log('📝 OnboardingContext - New data state:', newData)
      // Save to localStorage (convert Sets to arrays)
      if (typeof window !== 'undefined') {
        const toSave = {
          ...newData,
          selectedCompetitors: Array.from(newData.selectedCompetitors),
          selectedPersonas: Array.from(newData.selectedPersonas),
          selectedTopics: Array.from(newData.selectedTopics)
        }
        console.log('💾 OnboardingContext - Saving to localStorage:', toSave)
        localStorage.setItem('onboarding-data', JSON.stringify(toSave))
        console.log('✅ OnboardingContext - Data saved to localStorage')
      }
      return newData
    })
  }

  const resetData = () => {
    setData(defaultData)
    if (typeof window !== 'undefined') {
      localStorage.removeItem('onboarding-data')
    }
  }

  const saveToBackend = async () => {
    if (!apiService.token) {
      setError('Not authenticated. Please login first.')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      // Convert frontend data to backend format
      const backendData = {
        profile: {
          firstName: data.firstName,
          lastName: data.lastName,
          company: data.companyName,
          website: data.websiteUrl
        },
        websiteUrl: data.websiteUrl,
        competitors: Array.from(data.selectedCompetitors).map(id =>
          data.competitors.find(c => c.id === id)?.url
        ).filter(Boolean),
        topics: Array.from(data.selectedTopics).map(id =>
          data.topics.find(t => t.id === id)?.name
        ).filter(Boolean),
        personas: Array.from(data.selectedPersonas).map(id =>
          data.personas.find(p => p.id === id)?.description
        ).filter(Boolean),
        regions: [data.region],
        languages: [data.language],
        preferences: {
          industry: data.companyName,
          targetAudience: Array.from(data.selectedPersonas).map(id =>
            data.personas.find(p => p.id === id)?.type
          ).filter(Boolean).join(', '),
          goals: ['Improve SEO', 'Increase visibility', 'Content optimization']
        },
        currentStep: 8,
        isCompleted: true
      }

      await apiService.updateOnboardingBulk(backendData)
      console.log('✅ Onboarding data saved to backend')
    } catch (err) {
      console.error('❌ Failed to save onboarding data:', err)
      setError(err instanceof Error ? err.message : 'Failed to save data')
    } finally {
      setIsLoading(false)
    }
  }

  const loadFromBackend = async () => {
    if (!apiService.token) {
      setError('Not authenticated. Please login first.')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await apiService.getOnboardingData()
      const backendData = response.data.onboarding

      // Convert backend data to frontend format
      const frontendData: Partial<OnboardingData> = {
        firstName: backendData.profile?.firstName || '',
        lastName: backendData.profile?.lastName || '',
        companyName: backendData.profile?.company || '',
        websiteUrl: backendData.websiteUrl || '',
        region: backendData.regions?.[0] || 'Global',
        language: backendData.languages?.[0] || 'English'
      }

      // Update competitors selection
      if (backendData.competitors) {
        const selectedCompetitors = new Set<string>()
        backendData.competitors.forEach((url: string) => {
          const competitor = data.competitors.find(c => c.url === url)
          if (competitor) {
            selectedCompetitors.add(competitor.id)
          }
        })
        frontendData.selectedCompetitors = selectedCompetitors
      }

      // Update topics selection
      if (backendData.topics) {
        const selectedTopics = new Set<string>()
        backendData.topics.forEach((topicName: string) => {
          const topic = data.topics.find(t => t.name === topicName)
          if (topic) {
            selectedTopics.add(topic.id)
          }
        })
        frontendData.selectedTopics = selectedTopics
      }

      // Update personas selection
      if (backendData.personas) {
        const selectedPersonas = new Set<string>()
        backendData.personas.forEach((description: string) => {
          const persona = data.personas.find(p => p.description === description)
          if (persona) {
            selectedPersonas.add(persona.id)
          }
        })
        frontendData.selectedPersonas = selectedPersonas
      }

      updateData(frontendData)
      console.log('✅ Onboarding data loaded from backend')
    } catch (err) {
      console.error('❌ Failed to load onboarding data:', err)
      setError(err instanceof Error ? err.message : 'Failed to load data')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <OnboardingContext.Provider value={{
      data,
      updateData,
      resetData,
      saveToBackend,
      loadFromBackend,
      isLoading,
      error
    }}>
      {children}
    </OnboardingContext.Provider>
  )
}

export function useOnboarding() {
  const context = useContext(OnboardingContext)
  if (context === undefined) {
    throw new Error('useOnboarding must be used within an OnboardingProvider')
  }
  return context
}
