'use client'

import { useState, useEffect } from 'react'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuCheckboxItem } from '@/components/ui/dropdown-menu'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Filter, Globe, ChevronDown, Users, RefreshCw, Settings, Calendar } from 'lucide-react'
import { useFilters } from '@/contexts/FilterContext'
import { useAuth } from '@/contexts/AuthContext'
import { useTheme } from 'next-themes'
import { useRouter } from 'next/navigation'
import apiService from '@/services/api'

interface TopNavProps {
  activeTab: string
  onTabChange: (tab: string) => void
  dashboardData?: any
  isAgentAnalytics?: boolean
  onSyncNow?: () => void
  onSettings?: () => void
  isSyncing?: boolean
  lastSyncTime?: string
  selectedDateRange?: string
  onDateRangeChange?: (range: string) => void
}

export function TopNav({ 
  activeTab, 
  onTabChange, 
  dashboardData,
  isAgentAnalytics = false,
  onSyncNow,
  onSettings,
  isSyncing = false,
  lastSyncTime,
  selectedDateRange = '7 days',
  onDateRangeChange
}: TopNavProps) {
  const { 
    selectedPlatforms, 
    selectedTopics, 
    selectedPersonas, 
    selectedAnalysisId,
    setSelectedPlatforms, 
    setSelectedTopics, 
    setSelectedPersonas 
  } = useFilters()
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth()
  const { theme } = useTheme()
  const router = useRouter()
  const [topicOptions, setTopicOptions] = useState<Array<{value: string, label: string}>>([
    { value: 'All Topics', label: 'All Topics' }
  ])
  const [personaOptions, setPersonaOptions] = useState<Array<{value: string, label: string}>>([
    { value: 'All Personas', label: 'All Personas' }
  ])

  // Fetch topics and personas from database
  useEffect(() => {
    const fetchFilterOptions = async () => {
      try {
        console.log('🔄 [TopNav] Fetching topics and personas from database...', { selectedAnalysisId })
        
        const [topicsResponse, personasResponse] = await Promise.all([
          apiService.getTopics(selectedAnalysisId),
          apiService.getPersonas(selectedAnalysisId)
        ])

        if (topicsResponse.success && topicsResponse.data) {
          const dbTopics = topicsResponse.data
            .filter((t: any) => t.selected) // Only show selected topics
            .map((t: any) => ({
              value: t.name,
              label: t.name
            }))
          setTopicOptions([
            { value: 'All Topics', label: 'All Topics' },
            ...dbTopics
          ])
          console.log(`✅ [TopNav] Loaded ${dbTopics.length} topics from database`)
        }

        if (personasResponse.success && personasResponse.data) {
          const dbPersonas = personasResponse.data
            .filter((p: any) => p.selected) // Only show selected personas
            .map((p: any) => ({
              value: p.type,
              label: p.type
            }))
          setPersonaOptions([
            { value: 'All Personas', label: 'All Personas' },
            ...dbPersonas
          ])
          console.log(`✅ [TopNav] Loaded ${dbPersonas.length} personas from database`)
        }
      } catch (error) {
        console.error('❌ [TopNav] Error fetching filter options:', error)
        // Keep default options on error
      }
    }

    if (isAuthLoading) {
      console.log('⏳ [TopNav] Waiting for auth initialization before fetching filters')
      return
    }

    if (!isAuthenticated) {
      console.log('⚠️ [TopNav] Skipping filter fetch because user is not authenticated')
      return
    }

    fetchFilterOptions()
  }, [selectedAnalysisId, isAuthenticated, isAuthLoading]) // Re-run when selectedAnalysisId or auth state changes

  
  const tabs = isAgentAnalytics ? [
    { id: 'platform', label: 'Platform' },
    { id: 'pages', label: 'Page' },
    { id: 'journey', label: 'Journey' },
    { id: 'geo-device', label: 'Geo & Device' },
  ] : [
    { id: 'visibility', label: 'Visibility' },
    { id: 'prompts', label: 'Prompts' },
    { id: 'sentiment', label: 'Sentiment' },
    { id: 'citations', label: 'Citations' },
  ]

  const getFaviconUrl = (platformName: string) => {
    const isDarkMode = theme === 'dark'
    const faviconMap = {
      'ChatGPT': 'https://chat.openai.com/favicon.ico',
      'Claude': 'https://claude.ai/favicon.ico',
      'Gemini': 'https://www.gstatic.com/lamda/images/gemini_sparkle_v002_d4735304ff6292a690345.svg',
      'Perplexity': 'https://www.perplexity.ai/favicon.ico',
    }
    return faviconMap[platformName as keyof typeof faviconMap] || `https://www.google.com/s2/favicons?domain=${platformName.toLowerCase()}.com&sz=16`
  }

  const platformOptions = [
    { value: 'All Platforms', label: 'All Platforms' },
    { value: 'ChatGPT', label: 'ChatGPT' },
    { value: 'Claude', label: 'Claude' },
    { value: 'Gemini', label: 'Gemini' },
    { value: 'Perplexity', label: 'Perplexity' },
  ]

  const handleTopicChange = (topic: string, checked: boolean) => {
    if (topic === 'All Topics') {
      setSelectedTopics(checked ? ['All Topics'] : [])
    } else {
      setSelectedTopics(prev => {
        if (checked) {
          // If 'All Topics' was selected, deselect it when another topic is chosen
          const newSelection = prev.filter(p => p !== 'All Topics')
          return [...newSelection, topic]
        } else {
          const newSelection = prev.filter(p => p !== topic)
          // If no other topics are selected, default to 'All Topics'
          return newSelection.length === 0 ? ['All Topics'] : newSelection
        }
      })
    }
  }

  const handlePersonaChange = (persona: string, checked: boolean) => {
    if (persona === 'All Personas') {
      setSelectedPersonas(checked ? ['All Personas'] : [])
    } else {
      setSelectedPersonas(prev => {
        if (checked) {
          // If 'All Personas' was selected, deselect it when another persona is chosen
          const newSelection = prev.filter(p => p !== 'All Personas')
          return [...newSelection, persona]
        } else {
          const newSelection = prev.filter(p => p !== persona)
          // If no other personas are selected, default to 'All Personas'
          return newSelection.length === 0 ? ['All Personas'] : newSelection
        }
      })
    }
  }

  const handlePlatformChange = (platform: string, checked: boolean) => {
    if (platform === 'All Platforms') {
      setSelectedPlatforms(checked ? ['All Platforms'] : [])
    } else {
      setSelectedPlatforms(prev => {
        if (checked) {
          // If 'All Platforms' was selected, deselect it when another platform is chosen
          const newSelection = prev.filter(p => p !== 'All Platforms')
          return [...newSelection, platform]
        } else {
          const newSelection = prev.filter(p => p !== platform)
          // If no other platforms are selected, default to 'All Platforms'
          return newSelection.length === 0 ? ['All Platforms'] : newSelection
        }
      })
    }
  }

  const getTopicButtonText = () => {
    if (selectedTopics.includes('All Topics') || selectedTopics.length === 0) {
      return '# Topics'
    }
    
    // Check if all individual topics are selected (excluding 'All Topics' itself)
    const allIndividualTopicsSelected = topicOptions
      .filter(option => option.value !== 'All Topics')
      .every(option => selectedTopics.includes(option.value));

    if (allIndividualTopicsSelected) {
      return '# Topics';
    }
    
    return `${selectedTopics.length} selected`
  }

  const getPersonaButtonText = () => {
    if (selectedPersonas.includes('All Personas') || selectedPersonas.length === 0) {
      return 'User Personas'
    }
    
    // Check if all individual personas are selected (excluding 'All Personas' itself)
    const allIndividualPersonasSelected = personaOptions
      .filter(option => option.value !== 'All Personas')
      .every(option => selectedPersonas.includes(option.value));

    if (allIndividualPersonasSelected) {
      return 'User Personas';
    }
    
    return `${selectedPersonas.length} selected`
  }

  const getPlatformButtonText = () => {
    if (selectedPlatforms.includes('All Platforms') || selectedPlatforms.length === 0) {
      return 'All Platforms'
    }
    
    // Check if all individual platforms are selected (excluding 'All Platforms' itself)
    const allIndividualPlatformsSelected = platformOptions
      .filter(option => option.value !== 'All Platforms')
      .every(option => selectedPlatforms.includes(option.value));

    if (allIndividualPlatformsSelected) {
      return 'All Platforms';
    }
    
    return `${selectedPlatforms.length} selected`
  }

  return (
    <div className="relative">
      {/* Navigation Tabs and Filter Controls - Same row */}
      <div className="pl-4 pt-4 flex justify-between items-center">
        <Tabs value={activeTab} onValueChange={onTabChange}>
          <TabsList className="bg-transparent p-0 h-auto border-0 flex space-x-0">
          {tabs.map((tab) => (
            <TabsTrigger 
              key={tab.id} 
              value={tab.id} 
                className="relative px-4 py-2 body-text rounded-none border-0 bg-transparent hover:text-foreground text-muted-foreground data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-foreground transition-colors"
            >
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
        </Tabs>

        {/* Action controls - Top right */}
        {isAgentAnalytics ? (
          <div className="flex items-center space-x-3 pr-4">
            {/* Last sync info */}
            {lastSyncTime && (
              <div className="text-xs text-muted-foreground">
                <span className="font-medium">Last sync:</span> {lastSyncTime}
              </div>
            )}
            
            <Button 
              variant="outline" 
              size="sm" 
              className="body-text"
              onClick={onSyncNow}
              disabled={isSyncing}
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
              {isSyncing ? 'Syncing...' : 'Sync Now'}
            </Button>

            {/* Date Range Selector */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="body-text">
                  <Calendar className="mr-2 h-4 w-4" />
                  {selectedDateRange}
                  <ChevronDown className="ml-2 h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-full" onCloseAutoFocus={(e) => e.preventDefault()}>
                <DropdownMenuItem onClick={() => onDateRangeChange?.('7 days')}>
                  7 days
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onDateRangeChange?.('14 days')}>
                  14 days
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onDateRangeChange?.('30 days')}>
                  30 days
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            
            <Button 
              variant="outline" 
              size="sm" 
              className="body-text"
              onClick={onSettings}
            >
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </Button>
          </div>
        ) : (
          activeTab !== 'prompts' && (
            <div className="flex space-x-3 pr-4">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="body-text">
                <Filter className="mr-2 h-4 w-4" />
                {getTopicButtonText()}
                <ChevronDown className="ml-2 h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-full" onCloseAutoFocus={(e) => e.preventDefault()}>
              {topicOptions.map((option) => (
                <DropdownMenuCheckboxItem
                  key={option.value}
                  checked={selectedTopics.includes(option.value)}
                  onCheckedChange={(checked) => handleTopicChange(option.value, checked)}
                  onSelect={(e) => e.preventDefault()}
                >
                  {option.label}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="body-text">
                <Users className="mr-2 h-4 w-4" />
                {getPersonaButtonText()}
                <ChevronDown className="ml-2 h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-full" onCloseAutoFocus={(e) => e.preventDefault()}>
              {personaOptions.map((option) => (
                <DropdownMenuCheckboxItem
                  key={option.value}
                  checked={selectedPersonas.includes(option.value)}
                  onCheckedChange={(checked) => handlePersonaChange(option.value, checked)}
                  onSelect={(e) => e.preventDefault()}
                >
                  {option.label}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="body-text">
                <Globe className="mr-2 h-4 w-4" />
                {getPlatformButtonText()}
                <ChevronDown className="ml-2 h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-full" onCloseAutoFocus={(e) => e.preventDefault()}>
              {platformOptions.map((option) => (
                <DropdownMenuCheckboxItem
                  key={option.value}
                  checked={selectedPlatforms.includes(option.value)}
                  onCheckedChange={(checked) => handlePlatformChange(option.value, checked)}
                  onSelect={(e) => e.preventDefault()}
                >
                  {option.value === 'All Platforms' ? (
                    option.label
                  ) : (
                    <div className="flex items-center gap-2">
                      <img
                        src={getFaviconUrl(option.value)}
                        alt={option.value}
                        className="w-4 h-4 rounded-sm"
                        onError={(e) => {
                          e.currentTarget.src = `https://www.google.com/s2/favicons?domain=${option.value.toLowerCase()}.com&sz=16`
                        }}
                      />
                      {option.label}
                    </div>
                  )}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
            </div>
          )
        )}
      </div>

      {/* Section Divider - Moved up */}
      <div className="border-b border-border/60 mt-2"></div>
    </div>
  )
}