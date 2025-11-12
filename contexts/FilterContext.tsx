'use client'

import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react'

interface FilterContextType {
  selectedTopics: string[]
  selectedPersonas: string[]
  selectedPlatforms: string[]
  selectedAnalysisId: string | null
  setSelectedTopics: React.Dispatch<React.SetStateAction<string[]>>
  setSelectedPersonas: React.Dispatch<React.SetStateAction<string[]>>
  setSelectedPlatforms: React.Dispatch<React.SetStateAction<string[]>>
  setSelectedAnalysisId: React.Dispatch<React.SetStateAction<string | null>>
}

const FilterContext = createContext<FilterContextType | undefined>(undefined)

export function FilterProvider({ children }: { children: ReactNode }) {
  // Initialize selectedAnalysisId from localStorage to persist across page navigations
  const [selectedTopics, setSelectedTopics] = useState<string[]>(['All Topics'])
  const [selectedPersonas, setSelectedPersonas] = useState<string[]>(['All Personas'])
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(['All Platforms'])
  const [selectedAnalysisId, setSelectedAnalysisIdInternal] = useState<string | null>(() => {
    // Try to load from localStorage on initialization
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('selectedAnalysisId')
      if (stored) {
        console.log('📝 [FilterContext] Restoring selectedAnalysisId from localStorage:', stored)
        return stored
      }
    }
    return null
  })

  // Custom setter that also persists to localStorage
  const setSelectedAnalysisId = (value: React.SetStateAction<string | null>) => {
    // Handle both function and direct value updates
    const newValue = typeof value === 'function' ? value(selectedAnalysisId) : value
    setSelectedAnalysisIdInternal(newValue)
    if (typeof window !== 'undefined') {
      if (newValue) {
        console.log('💾 [FilterContext] Saving selectedAnalysisId to localStorage:', newValue)
        localStorage.setItem('selectedAnalysisId', newValue)
      } else {
        console.log('🗑️ [FilterContext] Clearing selectedAnalysisId from localStorage')
        localStorage.removeItem('selectedAnalysisId')
      }
    }
  }

  // Debug logging for selectedAnalysisId changes
  useEffect(() => {
    console.log('🔍 [FilterContext] selectedAnalysisId changed to:', selectedAnalysisId)
  }, [selectedAnalysisId])

  return (
    <FilterContext.Provider value={{
      selectedTopics,
      selectedPersonas,
      selectedPlatforms,
      selectedAnalysisId,
      setSelectedTopics,
      setSelectedPersonas,
      setSelectedPlatforms,
      setSelectedAnalysisId
    }}>
      {children}
    </FilterContext.Provider>
  )
}

export function useFilters() {
  const context = useContext(FilterContext)
  if (context === undefined) {
    throw new Error('useFilters must be used within a FilterProvider')
  }
  return context
}
