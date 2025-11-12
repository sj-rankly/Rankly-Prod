'use client'

import React from 'react'
import { UnifiedCard, UnifiedCardContent } from '@/components/ui/unified-card'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuCheckboxItem } from '@/components/ui/dropdown-menu'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { useRouter } from 'next/navigation'
import { PromptBuilderModal } from './PromptBuilderModal'
import apiService from '@/services/api'
import dashboardService from '@/services/dashboardService'
import { useSkeletonLoadingWithData } from '@/components/ui/with-skeleton-loading'
import { SkeletonWrapper } from '@/components/ui/skeleton-wrapper'
import { UnifiedCardSkeleton } from '@/components/ui/unified-card-skeleton'
import { useTheme } from 'next-themes'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { getDynamicFaviconUrl, handleFaviconError } from '@/lib/faviconUtils'
import { 
  ChevronDown, 
  ChevronRight, 
  ChevronUp, 
  Settings, 
  Download, 
  Search, 
  Filter,
  Info,
  ArrowUpDown,
  ExternalLink,
  Star,
  Check,
  Eye,
  X,
  Save,
  ArrowLeft,
  Sparkles,
  Upload,
  Plus,
  MoreHorizontal,
  ChevronsUpDown,
  Layers,
  Flag,
  FileText
} from 'lucide-react'
import { useState, useEffect } from 'react'

// Data types for prompts dashboard
interface PromptMetrics {
  visibilityScore: number
  depthOfMention: number
  avgPosition: number
  brandMentioned: boolean
  brandMentionRate: number
  overallScore: number
  citationShare: number
  totalCitations: number
  brandCitations: number
  visibilityRank?: number
  depthRank?: number
  avgPositionRank?: number
  citationShareRank?: number
}

interface Prompt {
  id: string
  text: string
  queryType: string
  metrics: PromptMetrics
}

interface TopicPersonaMetrics {
  visibilityScore: number
  visibilityRank: number
  depthOfMention: number
  depthRank: number
  avgPosition: number
  avgPositionRank: number
  citationShare?: number
  citationShareRank?: number
}

interface TopicPersonaItem {
  id: string
  name: string
  type: 'topic' | 'persona'
  totalPrompts: number
  metrics: TopicPersonaMetrics
  prompts: Prompt[]
}

interface PromptsDashboardData {
  items: TopicPersonaItem[]
  summary: {
    totalPrompts: number
    totalTopics: number
    totalPersonas: number
  }
}

// Note: Prompt metrics data comes from dashboardData prop
// This section displays prompts grouped by topics/personas with their associated metrics
const promptsData: any[] = []

interface PromptsSectionProps {
  onToggleFullScreen?: (isFullScreen: boolean) => void
  filterContext?: {
    selectedTopics: string[]
    selectedPersonas: string[]
    selectedPlatforms: string[]
    selectedAnalysisId?: string | null
  }
  dashboardData?: any
}

function PromptsSection({ onToggleFullScreen, filterContext, dashboardData }: PromptsSectionProps) {
  const router = useRouter()
  const [sortBy, setSortBy] = useState("all")
  const [selectedPrompt, setSelectedPrompt] = useState<any>(null)
  const [isSheetOpen, setIsSheetOpen] = useState(false)
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([])
  const [promptDetails, setPromptDetails] = useState<any>(null)
  const [loadingPromptDetails, setLoadingPromptDetails] = useState(false)
  
  // Subjective Metrics state
  const [subjectiveMetrics, setSubjectiveMetrics] = useState<any>(null)
  const [loadingMetrics, setLoadingMetrics] = useState(false)
  const [generatingMetrics, setGeneratingMetrics] = useState(false)
  const [metricsError, setMetricsError] = useState<string | null>(null)

  // Real data state
  const [realPromptsData, setRealPromptsData] = useState<PromptsDashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Skeleton loading - only show when data is actually loading
  const { showSkeleton, isVisible } = useSkeletonLoadingWithData(realPromptsData, filterContext)
  const { theme } = useTheme()

  const getFaviconUrl = (platformName: string) => {
    const isDarkMode = theme === 'dark'
    const faviconMap = {
      'OpenAI': 'https://chat.openai.com/favicon.ico',
      'ChatGPT': 'https://chat.openai.com/favicon.ico', // Keep for backward compatibility
      'Claude': 'https://claude.ai/favicon.ico',
      'Gemini': 'https://www.gstatic.com/lamda/images/gemini_sparkle_v002_d4735304ff6292a690345.svg',
      'Perplexity': 'https://www.perplexity.ai/favicon.ico',
    }
    return faviconMap[platformName as keyof typeof faviconMap] || `https://www.google.com/s2/favicons?domain=${platformName.toLowerCase()}.com&sz=16`
  }
  const [searchTerm, setSearchTerm] = useState("")
  const [showPromptBuilder, setShowPromptBuilder] = useState(false)
  const [expandedTopics, setExpandedTopics] = useState<Set<string>>(new Set(["Personalization"]))
  const [selectedPrompts, setSelectedPrompts] = useState<Set<number>>(new Set())
  const [editingPrompt, setEditingPrompt] = useState<number | null>(null)
  const [editingTopic, setEditingTopic] = useState<number | null>(null)
  const [isAddingTopic, setIsAddingTopic] = useState(false)
  const [newTopicName, setNewTopicName] = useState("")
  const [selectedTopicFilter, setSelectedTopicFilter] = useState<string>("All Topics")
  const [sidebarMode, setSidebarMode] = useState<'topics' | 'personas'>('topics')
  const [isCollapsed, setIsCollapsed] = useState(true)
  const [showDropdown, setShowDropdown] = useState(false)
  const [availableTopics, setAvailableTopics] = useState<string[]>([])
  const [availablePersonas, setAvailablePersonas] = useState<string[]>([])
  const [tableSortColumn, setTableSortColumn] = useState<string | null>(null)
  const [tableSortDirection, setTableSortDirection] = useState<'asc' | 'desc'>('asc')

  // Table column sorting function
  const handleTableSort = (column: string) => {
    if (tableSortColumn === column) {
      // Toggle direction if same column
      setTableSortDirection(tableSortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      // New column, start with ascending
      setTableSortColumn(column)
      setTableSortDirection('asc')
    }
  }

  // Get sort icon for column headers
  const getSortIcon = (column: string) => {
    if (tableSortColumn !== column) {
      return <ArrowUpDown className="w-3 h-3" />
    }
    return tableSortDirection === 'asc' ? 
      <ChevronDown className="w-3 h-3" /> : 
      <ChevronUp className="w-3 h-3" />
  }

  const isMetricNumber = (value: unknown): value is number =>
    typeof value === 'number' && !Number.isNaN(value)

  const formatPercentage = (value: number | null | undefined, digits = 0) => {
    if (!isMetricNumber(value)) {
      return '-'
    }
    return `${digits > 0 ? value.toFixed(digits) : value.toFixed(0)}%`
  }

  const formatRank = (value: number | null | undefined) => {
    if (!isMetricNumber(value)) {
      return '-'
    }
    return `#${value}`
  }

  // Fetch prompt details from backend
  const fetchPromptDetails = async (promptId: string) => {
    try {
      setLoadingPromptDetails(true)
      console.log(`📊 [PROMPT DETAILS] Fetching details for prompt: ${promptId}`)
      
      const response = await apiService.getPromptDetails(promptId)
      
      if (response.success && response.data) {
        console.log(`✅ [PROMPT DETAILS] Retrieved details for prompt: ${response.data.prompt.text}`)
        console.log(`📊 [PROMPT DETAILS] Brand name from API:`, response.data.brandName)
        console.log(`📊 [PROMPT DETAILS] Full response structure:`, {
          hasBrandName: !!response.data.brandName,
          hasUrlAnalysis: !!response.data.urlAnalysis,
          hasAggregatedMetrics: !!response.data.aggregatedMetrics,
          platformResponsesKeys: Object.keys(response.data.platformResponses || {}),
          promptText: response.data.prompt?.text
        })
        
        setPromptDetails(response.data)
        
        // Set selected platforms based on what's actually available in the response
        const availablePlatforms = Object.keys(response.data.platformResponses || {})
        console.log(`📊 [PROMPT DETAILS] Available platforms:`, availablePlatforms)
        setSelectedPlatforms(availablePlatforms)
        
        // Try to fetch existing subjective metrics
        await fetchSubjectiveMetrics(promptId)
      } else {
        throw new Error('Failed to fetch prompt details')
      }
    } catch (err) {
      console.error('❌ [PROMPT DETAILS] Error:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch prompt details')
    } finally {
      setLoadingPromptDetails(false)
    }
  }

  // Extract brand name from database/API data
  const getBrandName = () => {
    // Primary: Get brand name from API response (most reliable)
    if (promptDetails?.brandName) {
      console.log(`✅ [BRAND EXTRACTION] Using brand from API: "${promptDetails.brandName}"`)
      return promptDetails.brandName
    }
    
    // Secondary: Check if we have URL analysis data with brand context
    if (promptDetails?.urlAnalysis?.brandContext?.companyName) {
      console.log(`✅ [BRAND EXTRACTION] Using brand from URL analysis: "${promptDetails.urlAnalysis.brandContext.companyName}"`)
      return promptDetails.urlAnalysis.brandContext.companyName
    }
    
    // Tertiary: Check if we have aggregated metrics with brand info
    if (promptDetails?.aggregatedMetrics?.brandName) {
      console.log(`✅ [BRAND EXTRACTION] Using brand from aggregated metrics: "${promptDetails.aggregatedMetrics.brandName}"`)
      return promptDetails.aggregatedMetrics.brandName
    }
    
    // Last resort: Check platform responses for brand mentions in structured data
    if (promptDetails?.platformResponses) {
      for (const [platform, response] of Object.entries(promptDetails.platformResponses)) {
        if (response && typeof response === 'object' && 'brandName' in response && response.brandName) {
          console.log(`✅ [BRAND EXTRACTION] Using brand from ${platform} response: "${response.brandName}"`)
          return response.brandName as string
        }
      }
    }
    
    // Ultimate fallback: Return a default brand name
    console.log(`⚠️ [BRAND EXTRACTION] No brand found in API data, using fallback: "Unknown Brand"`)
    return 'Unknown Brand'
  }

  // Fetch existing subjective metrics
  const fetchSubjectiveMetrics = async (promptId: string) => {
    try {
      setLoadingMetrics(true)
      setMetricsError(null)
      
      const brandName = getBrandName()
      console.log(`📊 [SUBJECTIVE METRICS] Fetching metrics for prompt: ${promptId}, brand: ${brandName}`)
      
      const response = await apiService.getSubjectiveMetrics(promptId, brandName)
      
      if (response.success && response.data) {
        console.log(`✅ [SUBJECTIVE METRICS] Retrieved metrics:`, response.data)
        
        // Handle the backend response structure: data.metrics is an array, get the first (latest) one
        const metrics = response.data.metrics && response.data.metrics.length > 0 
          ? response.data.metrics[0] 
          : response.data
        
        console.log(`🔍 [DEBUG] Fetched metrics structure:`, {
          hasRelevance: !!metrics.relevance,
          relevanceScore: metrics.relevance?.score,
          relevanceReasoning: metrics.relevance?.reasoning?.substring(0, 50) + '...',
          allKeys: Object.keys(metrics)
        })
        
        setSubjectiveMetrics(metrics)
      } else {
        console.log(`ℹ️ [SUBJECTIVE METRICS] No existing metrics found`)
        setSubjectiveMetrics(null)
      }
    } catch (error) {
      // Check if this is a "no metrics found" error (expected for first time)
      const errorMessage = error.message || ''
      if (errorMessage.includes('No metrics found') || 
          errorMessage.includes('not found') || 
          errorMessage.includes('404')) {
        console.log(`ℹ️ [SUBJECTIVE METRICS] No existing metrics found (first time)`)
        setSubjectiveMetrics(null)
        setMetricsError(null) // Clear any error state
      } else {
        console.error('❌ [SUBJECTIVE METRICS] Error fetching metrics:', error)
        setMetricsError(errorMessage || 'Failed to fetch metrics')
        setSubjectiveMetrics(null)
      }
    } finally {
      setLoadingMetrics(false)
    }
  }

  // Generate subjective metrics
  const generateSubjectiveMetrics = async () => {
    if (!selectedPrompt?.promptId) {
      console.error('❌ [SUBJECTIVE METRICS] No prompt ID available')
      return
    }

    try {
      setGeneratingMetrics(true)
      setMetricsError(null)
      
      const brandName = getBrandName()
      console.log(`🚀 [SUBJECTIVE METRICS] Generating metrics for prompt: ${selectedPrompt.promptId}`)
      console.log(`📊 [SUBJECTIVE METRICS] Brand name extracted: "${brandName}"`)
      console.log(`📊 [SUBJECTIVE METRICS] Brand extraction source:`, {
        fromApiBrandName: !!promptDetails?.brandName,
        fromUrlAnalysis: !!promptDetails?.urlAnalysis?.brandContext?.companyName,
        fromAggregatedMetrics: !!promptDetails?.aggregatedMetrics?.brandName,
        fromPlatformResponses: Object.keys(promptDetails?.platformResponses || {}).some(platform => {
          const response = promptDetails?.platformResponses?.[platform]
          return response && typeof response === 'object' && 'brandName' in response && response.brandName
        })
      })
      
      const response = await apiService.evaluateSubjectiveMetrics(selectedPrompt.promptId, brandName)
      
      if (response.success && response.data) {
        console.log(`✅ [SUBJECTIVE METRICS] Generated metrics:`, response.data)
        
        // Extract the actual metrics object from the response
        const generatedMetrics = response.data.metrics || response.data
        console.log(`🔍 [DEBUG] Generated metrics structure:`, {
          hasRelevance: !!generatedMetrics.relevance,
          relevanceScore: generatedMetrics.relevance?.score,
          relevanceReasoning: generatedMetrics.relevance?.reasoning?.substring(0, 50) + '...',
          allKeys: Object.keys(generatedMetrics)
        })
        setSubjectiveMetrics(generatedMetrics)
        
        console.log(`✅ [SUBJECTIVE METRICS] Set metrics in UI:`, generatedMetrics)
      } else {
        throw new Error(response.message || 'Failed to generate metrics')
      }
    } catch (error) {
      console.error('❌ [SUBJECTIVE METRICS] Error generating metrics:', error)
      
      // Handle specific error cases
      const errorMessage = error.message || ''
      if (errorMessage.includes('not found in any platform responses')) {
        setMetricsError(`Brand "${getBrandName()}" not found in the LLM responses. Please check if the brand name is correctly extracted or try a different prompt.`)
      } else {
        setMetricsError(errorMessage || 'Failed to generate metrics')
      }
    } finally {
      setGeneratingMetrics(false)
    }
  }

  // Export to Excel function
  const handleExportToExcel = () => {
    // Prepare data for export
    const exportData = prompts.map(prompt => ({
      'Prompt': prompt.prompt,
      'Topic': prompt.topic,
      'Persona': prompt.persona,
      'Platforms': prompt.platforms.join(', '),
      'Updated': prompt.updatedAt,
      'Created': prompt.createdAt,
      'Icon': prompt.icon,
      'Is New': prompt.isNew ? 'Yes' : 'No'
    }))

    // Create CSV content
    const headers = Object.keys(exportData[0])
    const csvContent = [
      headers.join(','),
      ...exportData.map(row => 
        headers.map(header => {
          const value = row[header as keyof typeof row]
          // Escape quotes and wrap in quotes if contains comma
          return typeof value === 'string' && (value.includes(',') || value.includes('"')) 
            ? `"${value.replace(/"/g, '""')}"` 
            : value
        }).join(',')
      )
    ].join('\n')

    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `prompts_export_${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }
  const [prompts, setPrompts] = useState<any[]>([])

  console.log('PromptsSection rendered, showPromptBuilder:', showPromptBuilder)

  // Fetch real prompts data using dashboard service with caching
  useEffect(() => {
    async function fetchPromptsData() {
      try {
        setLoading(true)
        setError(null)
        console.log('📊 [PromptsSection] Fetching prompts dashboard data...')
        console.log('📊 [PromptsSection] Analysis ID:', filterContext?.selectedAnalysisId)
        
        const response = await dashboardService.getPromptsDashboardData({
          selectedAnalysisId: filterContext?.selectedAnalysisId,
          urlAnalysisId: filterContext?.selectedAnalysisId
        })
        
        if (response.data) {
          console.log('✅ [PromptsSection] Fetched prompts data:', response.data.summary)
          console.log('🔍 [PromptsSection] Sample prompt with competitors:', 
            response.data.items?.[0]?.prompts?.[0]?.mentionedCompetitors)
          setRealPromptsData(response.data)
        } else {
          throw new Error(response.error || 'Failed to fetch prompts dashboard data')
        }
      } catch (err) {
        console.error('❌ [PromptsSection] Error fetching data:', err)
        setError(err instanceof Error ? err.message : 'Failed to fetch data')
      } finally {
        setLoading(false)
      }
    }
    
    fetchPromptsData()
  }, [filterContext?.selectedAnalysisId]) // Re-fetch when analysis changes

  // Populate availableTopics and availablePersonas from real data
  useEffect(() => {
    if (realPromptsData && realPromptsData.items) {
      // Extract unique topics and personas from real data
      const topics = realPromptsData.items
        .filter(item => item.type === 'topic')
        .map(item => item.name)
      
      const personas = realPromptsData.items
        .filter(item => item.type === 'persona')
        .map(item => item.name)
      
      // Set available topics with "All Topics" option
      setAvailableTopics(['All Topics', ...topics])
      
      // Set available personas with "All Personas" option
      setAvailablePersonas(['All Personas', ...personas])
      
      console.log('📊 [PromptsSection] Populated sidebar:', {
        topics: topics.length,
        personas: personas.length
      })
    }
  }, [realPromptsData])

  // Toggle full screen mode when Prompt Builder is shown
  useEffect(() => {
    if (onToggleFullScreen) {
      onToggleFullScreen(showPromptBuilder)
    }
  }, [showPromptBuilder, onToggleFullScreen])

  // Handle prompt selection
  const handlePromptSelect = (promptId: number) => {
    const newSelected = new Set(selectedPrompts)
    if (newSelected.has(promptId)) {
      newSelected.delete(promptId)
    } else {
      newSelected.add(promptId)
    }
    setSelectedPrompts(newSelected)
  }

  // Handle select all
  const handleSelectAll = () => {
    if (selectedPrompts.size === prompts.length) {
      setSelectedPrompts(new Set())
    } else {
      setSelectedPrompts(new Set(prompts.map(p => p.id)))
    }
  }

  // Handle prompt editing
  const handlePromptEdit = (promptId: number, newText: string) => {
    setPrompts(prev => prev.map(p => 
      p.id === promptId ? { ...p, prompt: newText } : p
    ))
  }

  // Handle prompt save
  const handlePromptSave = (promptId: number) => {
    setEditingPrompt(null)
  }

  // Handle adding new prompt
  const handleAddPrompt = (newPromptText: string) => {
    // Assign to selected topic, or "New Topic" if "All Topics" is selected
    const assignedTopic = selectedTopicFilter === "All Topics" ? "New Topic" : selectedTopicFilter
    
    const newPrompt = {
      id: Date.now(),
      prompt: newPromptText,
      topic: assignedTopic,
      persona: "Default Persona",
      platforms: ["ChatGPT", "Perplexity", "Gemini", "Claude"],
      updatedAt: "just now",
      createdAt: "just now",
      icon: "dots",
      isNew: true
    }
    setPrompts(prev => [...prev, newPrompt])
    
    // Remove the new flag after 3 seconds
    setTimeout(() => {
      setPrompts(prev => prev.map(p => 
        p.id === newPrompt.id ? { ...p, isNew: false } : p
      ))
    }, 3000)
  }

  // Handle topic editing for a specific prompt
  const handleTopicEdit = (promptId: number) => {
    setEditingTopic(promptId)
  }

  const handlePlatformSave = (promptId: number, newPlatforms: string[]) => {
    setPrompts(prev => prev.map(p => p.id === promptId ? {...p, platforms: newPlatforms} : p))
  }

  // Handle topic selection for a prompt
  const handleTopicSelect = (promptId: number, selectedTopic: string) => {
    // If the topic doesn't exist in availableTopics, add it
    if (selectedTopic && !availableTopics.includes(selectedTopic) && selectedTopic !== "All Topics") {
      setAvailableTopics(prev => [...prev, selectedTopic])
    }
    
    setPrompts(prev => prev.map(p => 
      p.id === promptId ? {...p, topic: selectedTopic, isNew: false} : p
    ))
    setEditingTopic(null)
  }

  // Handle topic save (when user finishes editing)
  const handleTopicSave = (promptId: number) => {
    const prompt = prompts.find(p => p.id === promptId)
    if (prompt && prompt.topic && prompt.topic.trim()) {
      handleTopicSelect(promptId, prompt.topic.trim())
    } else {
      setEditingTopic(null)
    }
  }

  // Handle adding a new prompt from sidebar topic selection
  const handleAddPromptFromTopic = (topicName: string) => {
    if (topicName === "All Topics") return // Don't add prompt for "All Topics"
    
    const newPrompt = {
      id: Date.now(),
      prompt: "", // Empty prompt to be filled by user
      topic: topicName,
      persona: "Default Persona",
      platforms: ["ChatGPT", "Perplexity", "Gemini", "Claude"],
      updatedAt: "just now",
      createdAt: "just now",
      icon: "dots",
      isNew: true,
      isEmpty: true // Flag to indicate this is an empty prompt from topic selection
    }
    setPrompts(prev => [...prev, newPrompt])
    setEditingPrompt(newPrompt.id) // Auto-edit the prompt field
    
    // Remove the new flag after 3 seconds
    setTimeout(() => {
      setPrompts(prev => prev.map(p => p.id === newPrompt.id ? {...p, isNew: false, isEmpty: false} : p))
    }, 3000)
  }

  // Handle adding a new topic
  const handleAddTopic = () => {
    if (newTopicName.trim() && !availableTopics.includes(newTopicName.trim())) {
      const topicName = newTopicName.trim()
      setAvailableTopics(prev => [...prev.filter(t => t !== "All Topics"), topicName, "All Topics"])
      setNewTopicName("")
      setIsAddingTopic(false)
      
      // Automatically select the newly created topic
      setSelectedTopicFilter(topicName)
    }
  }

  // Handle canceling topic creation
  const handleCancelAddTopic = () => {
    setIsAddingTopic(false)
    setNewTopicName("")
  }

  // Handle adding a new persona
  const handleAddPersona = () => {
    if (newTopicName.trim() && !availablePersonas.includes(newTopicName.trim())) {
      const personaName = newTopicName.trim()
      setAvailablePersonas(prev => [...prev.filter(p => p !== "All Personas"), personaName, "All Personas"])
      setNewTopicName("")
      setIsAddingTopic(false)
      
      // Automatically select the newly created persona
      setSelectedTopicFilter(personaName)
    }
  }

  // Handle canceling persona creation
  const handleCancelAddPersona = () => {
    setIsAddingTopic(false)
    setNewTopicName("")
  }

  // Handle bulk actions
  const handleEditPlatforms = () => {
    // TODO: Implement platform editing for selected prompts
    console.log('Edit platforms for:', Array.from(selectedPrompts))
  }

  const handleDuplicatePrompts = () => {
    const selectedPromptIds = Array.from(selectedPrompts)
    const promptsToDuplicate = prompts.filter(p => selectedPromptIds.includes(p.id))
    
    const duplicatedPrompts = promptsToDuplicate.map(prompt => ({
      ...prompt,
      id: Date.now() + Math.random(), // Generate new unique ID
      prompt: prompt.prompt + ' (Copy)',
      isNew: true
    }))
    
    setPrompts(prev => [...prev, ...duplicatedPrompts])
    setSelectedPrompts(new Set())
  }

  const handleDeletePrompts = () => {
    if (confirm(`Are you sure you want to delete ${selectedPrompts.size} prompt(s)?`)) {
      setPrompts(prev => prev.filter(p => !selectedPrompts.has(p.id)))
      setSelectedPrompts(new Set())
    }
  }

  // Handle topic selection from sidebar
  const handleTopicFilterSelect = (topicName: string) => {
    setSelectedTopicFilter(topicName)
  }

  // Handle group expansion toggle
  const handleTopicToggle = (groupValue: string) => {
    const newExpanded = new Set(expandedTopics)
    if (newExpanded.has(groupValue)) {
      newExpanded.delete(groupValue)
    } else {
      newExpanded.add(groupValue)
    }
    setExpandedTopics(newExpanded)
  }

  // Filter prompts based on sort selection
  const getFilteredPrompts = () => {
    // If sorting by topic, show only topic-related prompts (first 10 prompts - IDs 1-10)
    if (sortBy === "topic") {
      return prompts.filter(prompt => prompt.id <= 10)
    }
    
    // If sorting by persona, show only persona-related prompts (last 10 prompts - IDs 11-20)
    if (sortBy === "persona") {
      return prompts.filter(prompt => prompt.id >= 11)
    }
    
    // If "all" is selected, show all 20 prompts
    return prompts
  }

  // Group prompts by selected sort option - using real data
  const getGroupedPromptsBySort = () => {
    // If real data is available, use it; otherwise fall back to mock data logic
    if (realPromptsData && realPromptsData.items.length > 0) {
      // Filter by sortBy type
      const filteredItems = realPromptsData.items.filter(item => {
        if (sortBy === 'topic') return item.type === 'topic'
        if (sortBy === 'persona') return item.type === 'persona'
        return true // 'all' shows both
      })
      
      // Transform real data to match expected format
      return filteredItems.map(item => ({
        groupKey: item.type,
        groupLabel: item.type === 'topic' ? 'Topic' : 'Persona',
        groupValue: item.name,
        prompts: item.prompts.map(prompt => ({
          id: prompt.id,
          prompt: prompt.text,
          topic: item.type === 'topic' ? item.name : '-',
          persona: item.type === 'persona' ? item.name : '-',
          platforms: ["ChatGPT", "Perplexity", "Gemini", "Claude"],
          updatedAt: "Recent",
          createdAt: "Recent",
          icon: "dots",
          isNew: false,
          // Add aggregated metrics for individual prompts
          promptMetrics: {
            visibilityScore: prompt.metrics.visibilityScore,
            depthOfMention: prompt.metrics.depthOfMention,
            avgPosition: prompt.metrics.avgPosition,
            citationShare: prompt.metrics.citationShare,
            brandMentionRate: prompt.metrics.brandMentionRate,
            totalTests: (prompt as any).totalTests || 0,
            visibilityRank: prompt.metrics.visibilityRank,
            depthRank: prompt.metrics.depthRank,
            avgPositionRank: prompt.metrics.avgPositionRank,
            citationShareRank: prompt.metrics.citationShareRank
          },
          // Pass through competitor data from backend
          mentionedCompetitors: (prompt as any).mentionedCompetitors || []
        })),
        visibilityRank: item.metrics.visibilityRank != null ? `#${item.metrics.visibilityRank}` : '-',
        visibilityScore: isMetricNumber(item.metrics.visibilityScore) ? `${item.metrics.visibilityScore}%` : '-',
        averagePosition: isMetricNumber(item.metrics.avgPosition) ? item.metrics.avgPosition.toFixed(2) : '-',
        citationShare: isMetricNumber(item.metrics.citationShare) ? `${item.metrics.citationShare}%` : '-',
        citationRank: item.metrics.citationShareRank != null ? `#${item.metrics.citationShareRank}` : '-',
        depthOfMention: isMetricNumber(item.metrics.depthOfMention) ? `${item.metrics.depthOfMention.toFixed(1)}%` : '-',
        depthOfMentionRank: item.metrics.depthRank != null ? `#${item.metrics.depthRank}` : '-',
        averagePositionRank: item.metrics.avgPositionRank != null ? `#${item.metrics.avgPositionRank}` : '-',
        wordCount: `${item.metrics.depthOfMention.toFixed(1)}%`,
        subjectiveImpression: 'Positive',
        subjectiveMetrics: {
          relevance: { score: 4, summary: 'Real-time analysis based on actual prompt performance.' },
          influence: { score: 4, summary: 'Impact assessment based on brand mentions and positions.' },
          uniqueness: { score: 3, summary: 'Content uniqueness evaluated from LLM responses.' },
          position: { score: 4, summary: 'Position analysis from actual test results.' },
          clickProbability: { score: 4, summary: 'Engagement likelihood based on visibility metrics.' },
          diversity: { score: 3, summary: 'Response diversity across different LLM platforms.' }
        },
        // Extract unique brands from all prompts in this group (includes both user's brand and competitors)
        groupBrands: (() => {
          const brandSet = new Map<string, { name: string; url: string | null; isOwner?: boolean }>();
          item.prompts.forEach((prompt: any) => {
            // Prefer mentionedBrands if available, fallback to mentionedCompetitors for backward compatibility
            const brandsToProcess = prompt.mentionedBrands || prompt.mentionedCompetitors || [];
            if (Array.isArray(brandsToProcess)) {
              brandsToProcess.forEach((brand: { name: string; url: string | null; isOwner?: boolean }) => {
                if (brand && brand.name && !brandSet.has(brand.name)) {
                  brandSet.set(brand.name, brand);
                }
              });
            }
          });
          const brands = Array.from(brandSet.values());
          if (brands.length > 0) {
            console.log(`🔍 [GroupBrands] ${item.name}: Found ${brands.length} unique brands`, brands);
          }
          return brands;
        })()
      }))
    }
    
    // No real data available, return empty array
    return []
    
    /* Dead code - unreachable after return statement above
    // For "All" case, we need to create a custom grouping that shows both topics and personas
    if (sortBy === 'all') {
      const filtered: any[] = []
      const topicPrompts = filtered.filter(prompt => prompt.id <= 10)
      const personaPrompts = filtered.filter(prompt => prompt.id >= 11)
      
      const result = []
      
      // Add topic groups
      const topicGrouped = topicPrompts.reduce((acc, prompt) => {
        const groupValue = prompt.topic
        if (!acc[groupValue]) {
          acc[groupValue] = []
        }
        acc[groupValue].push(prompt)
        return acc
      }, {} as Record<string, typeof prompts>)
      
      // Add persona groups
      const personaGrouped = personaPrompts.reduce((acc, prompt) => {
        const groupValue = prompt.persona
        if (!acc[groupValue]) {
          acc[groupValue] = []
        }
        acc[groupValue].push(prompt)
        return acc
      }, {} as Record<string, typeof prompts>)
      
      // Combine both groupings
      const allGrouped = { ...topicGrouped, ...personaGrouped }
      
      return Object.entries(allGrouped).map(([groupValue, groupPrompts]) => {
        // Find the corresponding data from promptsData based on the primary topic/persona
        const primaryPrompt = groupPrompts[0]
        const topicData = promptsData.find(data => 
          data.topic === primaryPrompt.topic || data.topic === primaryPrompt.persona
        )
        
        return {
          groupKey: 'mixed',
          groupLabel: groupValue.includes('Manager') || groupValue.includes('Hacker') ? 'Persona' : 'Topic',
          groupValue,
          prompts: groupPrompts,
          visibilityRank: topicData?.visibilityRank != null ? `#${topicData.visibilityRank}` : '-',
          visibilityScore: isMetricNumber(topicData?.visibilityScore) ? `${topicData.visibilityScore}%` : '-',
          averagePosition: isMetricNumber(topicData?.averagePosition) ? topicData.averagePosition.toFixed(2) : '-',
          citationShare: isMetricNumber(topicData?.citationShare) ? `${topicData.citationShare}%` : '-',
          citationRank: topicData?.citationRank != null ? `#${topicData.citationRank}` : '-',
          wordCount: isMetricNumber((topicData as any)?.wordCount) ? `${(topicData as any).wordCount}%` : '-',
          depthOfMention: isMetricNumber(topicData?.depthOfMention) ? `${topicData.depthOfMention.toFixed(1)}%` : '-',
          depthOfMentionRank: topicData?.depthOfMentionRank != null ? `#${topicData.depthOfMentionRank}` : '-',
          averagePositionRank: topicData?.averagePositionRank != null ? `#${topicData.averagePositionRank}` : '-',
          subjectiveImpression: topicData?.subjectiveImpression ?? '-'
        }
      })
    }
    
    // For topic and persona cases, use the original logic
    let groupKey: string
    let groupLabel: string
    
    switch (sortBy) {
      case 'topic':
        groupKey = 'topic'
        groupLabel = 'Topic'
        break
      case 'persona':
        groupKey = 'persona'
        groupLabel = 'Persona'
        break
      case 'all':
        groupKey = 'all'
        groupLabel = 'All'
        break
      default:
        groupKey = 'topic'
        groupLabel = 'Topic'
    }
    
    const filtered: any[] = [] // Dead code variable
    const grouped = filtered.reduce((acc: any, prompt: any) => {
      const groupValue = prompt[groupKey as keyof typeof prompt] as string
      if (!acc[groupValue]) {
        acc[groupValue] = []
      }
      acc[groupValue].push(prompt)
      return acc
    }, {} as Record<string, typeof prompts>)

    let result = Object.entries(grouped).map(([groupValue, groupPrompts]) => {
      // Find the corresponding data from promptsData based on the primary topic
      const primaryTopic = groupPrompts[0]?.topic
      const topicData = promptsData.find(data => data.topic === primaryTopic)
      
      return {
        groupKey,
        groupLabel,
        groupValue,
        prompts: groupPrompts,
        visibilityRank: topicData?.visibilityRank != null ? `#${topicData.visibilityRank}` : '-',
        visibilityScore: isMetricNumber(topicData?.visibilityScore) ? `${topicData.visibilityScore}%` : '-',
        averagePosition: isMetricNumber(topicData?.averagePosition) ? topicData.averagePosition.toFixed(2) : '-',
        citationShare: isMetricNumber(topicData?.citationShare) ? `${topicData.citationShare}%` : '-',
        citationRank: topicData?.citationRank != null ? `#${topicData.citationRank}` : '-',
        executions: topicData?.executions ?? groupPrompts.length,
        depthOfMention: isMetricNumber(topicData?.depthOfMention) ? `${topicData.depthOfMention.toFixed(1)}%` : '-',
        depthOfMentionRank: topicData?.depthOfMentionRank != null ? `#${topicData.depthOfMentionRank}` : '-',
        averagePositionRank: topicData?.averagePositionRank != null ? `#${topicData.averagePositionRank}` : '-',
        wordCount: isMetricNumber((topicData as any)?.wordCount) ? `${(topicData as any).wordCount}%` : '-',
        subjectiveImpression: topicData?.subjectiveImpression ?? '-',
        subjectiveMetrics: topicData?.subjectiveMetrics || {
          relevance: {
            score: 0,
            summary: 'Not enough data yet.'
          },
          influence: {
            score: 0,
            summary: 'Not enough data yet.'
          },
          uniqueness: {
            score: 0,
            summary: 'Not enough data yet.'
          },
          position: {
            score: 0,
            summary: 'Not enough data yet.'
          },
          clickProbability: {
            score: 0,
            summary: 'Not enough data yet.'
          },
          diversity: {
            score: 0,
            summary: 'Not enough data yet.'
          }
        },
        platformAnswers: groupValue === 'Personalization' ? {
          'ChatGPT': 'Based on the query about personalization tools, **Fibr** appears to be a comprehensive solution that offers advanced customization features for businesses looking to enhance user experience and engagement. According to their official documentation, Fibr provides real-time personalization capabilities with machine learning algorithms that analyze user behavior patterns [1]. The platform integrates seamlessly with existing CRM systems and offers A/B testing features for optimizing personalization strategies [2]. Recent case studies show that companies using Fibr have seen up to 35% improvement in user engagement metrics [3].',
          'Perplexity': '**Fibr** is indeed a strong tool for personalization, offering real-time data processing and machine learning capabilities that help businesses deliver targeted content to their users. According to TechCrunch (2024), Fibr has raised $50M in Series B funding, validating its market position [1]. The platform\'s key differentiators include its proprietary recommendation engine and seamless integration with popular marketing automation tools [2]. Industry analysts at Gartner have recognized Fibr as a "Challenger" in the Personalization Platforms category [3]. Their API-first approach allows for easy integration with existing tech stacks, making it particularly appealing to enterprise customers.',
          'Gemini': 'For personalization needs, **Fibr** provides excellent scalability and integration options with existing systems, making it a viable choice for enterprise-level implementations. The platform supports up to 10 million concurrent users with sub-100ms response times, as documented in their technical specifications [1]. Fibr\'s machine learning models are trained on over 2 billion user interactions, ensuring accurate personalization recommendations [2]. According to their security documentation, the platform is SOC 2 Type II compliant and supports GDPR compliance out of the box [3]. Recent partnerships with Salesforce and HubSpot have expanded Fibr\'s ecosystem integration capabilities [4].',
          'Claude': '**Fibr** demonstrates robust personalization capabilities through its adaptive algorithms and user behavior analysis, positioning it as a competitive solution in the market. The platform uses advanced deep learning models to process real-time user data and deliver personalized experiences across web, mobile, and email channels [1]. According to a 2024 Forrester Wave report, Fibr scored highest in the "Innovation" category among personalization platforms [2]. Their customer base includes Fortune 500 companies like Nike and Starbucks, who have reported significant improvements in conversion rates after implementing Fibr [3]. The platform\'s pricing starts at $500/month for mid-market businesses and scales based on user volume and feature requirements [4].',
        } : {
          'ChatGPT': 'For conversion rate optimization services using AI, **Optimizely** stands out as a leading platform that combines traditional A/B testing with advanced machine learning capabilities. According to their 2024 product roadmap, Optimizely now offers AI-powered personalization that can automatically adjust test parameters based on user behavior patterns [1]. The platform has processed over 1 trillion experiments and serves more than 9,000 brands worldwide [2]. Recent research by Forrester shows that companies using Optimizely\'s AI features see 23% higher conversion rates compared to traditional testing methods [3]. Their integration with popular analytics tools like Google Analytics 4 and Adobe Analytics makes it particularly valuable for enterprise clients.',
          'Perplexity': '**Unbounce** is a strong contender in AI-powered conversion rate optimization, particularly known for its intelligent landing page builder. According to their latest case study published in Marketing Land (2024), Unbounce\'s AI writing assistant has helped clients improve conversion rates by an average of 27% [1]. The platform uses machine learning to analyze over 1.5 billion conversions and automatically suggests copy improvements [2]. Industry reports indicate that Unbounce\'s Smart Traffic feature, which uses AI to route visitors to their best-converting page variants, has increased conversion rates by up to 30% for mid-market businesses [3]. Their pricing starts at $90/month and includes unlimited landing pages and A/B tests.',
          'Gemini': '**VWO** (Visual Website Optimizer) offers comprehensive AI-driven conversion optimization with its proprietary AI engine that analyzes user behavior across multiple touchpoints. According to their technical documentation, VWO\'s AI can process real-time data from over 2,000 websites and automatically suggest optimization opportunities [1]. The platform\'s SmartStats feature uses Bayesian statistics and machine learning to provide faster, more accurate test results [2]. Recent partnerships with Shopify and WordPress have expanded VWO\'s reach to over 300,000 websites globally [3]. Their enterprise clients report average conversion rate improvements of 22% within the first quarter of implementation [4]. VWO\'s pricing ranges from $199/month for small businesses to custom enterprise solutions.',
          'Claude': '**Hotjar** has evolved beyond heatmap analytics to become a comprehensive AI-powered conversion optimization platform. Their AI Insights feature analyzes user behavior patterns and automatically identifies conversion bottlenecks [1]. According to a 2024 study by ConversionXL, Hotjar\'s AI recommendations have helped businesses increase conversion rates by an average of 19% [2]. The platform processes over 40 billion user interactions monthly and serves more than 500,000 websites worldwide [3]. Hotjar\'s recent integration with popular CRM platforms like HubSpot and Salesforce has made it particularly valuable for B2B companies looking to optimize their sales funnels [4]. Their pricing starts at $32/month and includes unlimited heatmaps and session recordings.',
        }
      }
    })

    // Apply table column sorting if specified
    if (tableSortColumn) {
      result = result.sort((a, b) => {
        let aValue: any
        let bValue: any

        switch (tableSortColumn) {
          case 'topic':
            aValue = a.groupValue
            bValue = b.groupValue
            break
          case 'visibilityRank':
            aValue = parseInt(a.visibilityRank.replace('#', ''))
            bValue = parseInt(b.visibilityRank.replace('#', ''))
            break
          case 'averagePosition':
            aValue = parseFloat(a.averagePosition)
            bValue = parseFloat(b.averagePosition)
            break
          case 'citationShare':
            aValue = parseFloat(a.citationShare.replace('%', ''))
            bValue = parseFloat(b.citationShare.replace('%', ''))
            break
          case 'citationRank':
            aValue = parseInt(a.citationRank.replace('#', ''))
            bValue = parseInt(b.citationRank.replace('#', ''))
            break
          case 'visibilityScore':
            aValue = parseFloat(a.visibilityScore.replace('%', ''))
            bValue = parseFloat(b.visibilityScore.replace('%', ''))
            break
          case 'depthOfMention':
            // Extract numeric value from percentage string (e.g., "30.3%" -> 30.3)
            aValue = parseFloat(a.depthOfMention.replace('%', '')) || 0
            bValue = parseFloat(b.depthOfMention.replace('%', '')) || 0
            break
          case 'wordCount':
            aValue = parseFloat(a.wordCount.replace('%', ''))
            bValue = parseFloat(b.wordCount.replace('%', ''))
            break
          case 'subjectiveImpression':
            const impressionOrder = { 'Positive': 3, 'Neutral': 2, 'Negative': 1 }
            aValue = impressionOrder[a.subjectiveImpression as keyof typeof impressionOrder] || 0
            bValue = impressionOrder[b.subjectiveImpression as keyof typeof impressionOrder] || 0
            break
          default:
            return 0
        }

        if (aValue < bValue) return tableSortDirection === 'asc' ? -1 : 1
        if (aValue > bValue) return tableSortDirection === 'asc' ? 1 : -1
        return 0
      })
    }

    return result
    */ // End of dead code block
  }

  const filteredPrompts = getFilteredPrompts()
  const groupedData = getGroupedPromptsBySort()

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up':
        return <span className="w-3 h-3 text-green-600">↗</span>
      case 'down':
        return <span className="w-3 h-3 text-red-600">↘</span>
      case 'neutral':
        return <span className="w-3 h-3 text-center">-</span>
      default:
        return <span className="w-3 h-3 text-center">-</span>
    }
  }

  // Show Prompt Builder if requested
  if (showPromptBuilder) {
    return (
      <div className="min-h-screen bg-background">
        {/* Top Bar */}
        <div className="flex items-center justify-between p-4 border-b">
          <Button variant="ghost" className="gap-2" onClick={() => setShowPromptBuilder(false)}>
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">Edits are temporary until saved</span>
            <Button className="bg-foreground text-background rounded-md px-4 py-2 text-sm font-medium">
              <Save className="w-4 h-4 mr-2" />
              Save
            </Button>
          </div>
        </div>

        <div className="flex">
          {/* Left Sidebar */}
          <div className="w-64 bg-background border-r border-border flex flex-col h-full">
            {/* Header */}
            <div className="p-6">
              <div className="relative">
                <div 
                  className="flex items-center justify-between cursor-pointer hover:bg-muted/30 p-2 transition-colors"
                  onClick={() => setShowDropdown(!showDropdown)}
                >
                  <h3 className="font-semibold body-text">
                    {sidebarMode === 'topics' ? `Topics (${availableTopics.length - 1})` : `User Persona (${availablePersonas.length - 1})`}
                  </h3>
                <ChevronsUpDown className="w-4 h-4 text-muted-foreground" />
              </div>
              
                {/* Dropdown that appears when clicked */}
                {showDropdown && (
                  <div className="absolute top-full left-0 right-0 bg-muted/50 z-10">
                    {sidebarMode === 'topics' ? (
                      <div 
                        className="p-2 cursor-pointer hover:bg-muted/30 transition-colors flex items-center justify-between"
                        onClick={() => {
                          setSidebarMode('personas')
                          setSelectedTopicFilter('All Personas')
                          setShowDropdown(false)
                          setIsCollapsed(false)
                        }}
                      >
                        <span className="font-semibold body-text">User Persona</span>
                        <span className="text-sm text-muted-foreground">({availablePersonas.length - 1})</span>
                      </div>
                    ) : (
                      <div 
                        className="p-2 cursor-pointer hover:bg-muted/30 transition-colors flex items-center justify-between"
                        onClick={() => {
                          setSidebarMode('topics')
                          setSelectedTopicFilter('All Topics')
                          setShowDropdown(false)
                          setIsCollapsed(false)
                        }}
                      >
                        <span className="font-semibold body-text">Topics</span>
                        <span className="text-sm text-muted-foreground">({availableTopics.length - 1})</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
              
            {/* Navigation */}
            {!isCollapsed && (
              <nav className="flex-1 overflow-y-auto p-4">
              <div className="space-y-1">
                {(sidebarMode === 'topics' ? availableTopics : availablePersonas).map((item, index) => {
                  // FIXED: Calculate prompt count from real data instead of mock prompts state
                  let promptCount = 0;
                  if (realPromptsData && realPromptsData.items) {
                    if (item === "All Topics" || item === "All Personas") {
                      // For "All", show total unique prompts
                      promptCount = realPromptsData.summary.totalPrompts;
                    } else {
                      // Find the item in real data and get its prompt count
                      const foundItem = realPromptsData.items.find(i => 
                        (sidebarMode === 'topics' && i.type === 'topic' && i.name === item) ||
                        (sidebarMode === 'personas' && i.type === 'persona' && i.name === item)
                      );
                      promptCount = foundItem?.totalPrompts || 0;
                    }
                  } else {
                    // Fallback to old logic if no real data
                    promptCount = sidebarMode === 'topics' 
                      ? prompts.filter(p => p.topic === item || item === "All Topics").length
                      : prompts.filter(p => p.persona === item || item === "All Personas").length
                  }
                  const isSelected = selectedTopicFilter === item
                  
                  return (
                    <div key={`${sidebarMode}-${item}-${index}`}>
                      <Button
                        variant={isSelected ? "secondary" : "ghost"}
                        className="w-full justify-between h-10 px-3 body-text"
                        onClick={() => handleTopicFilterSelect(item)}
                      >
                        <div className="flex items-center gap-2">
                          <span>{item}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground">
                            {promptCount} prompt{promptCount !== 1 ? 's' : ''}
                          </span>
                          <Badge variant="outline" className="text-xs">
                            {sidebarMode === 'topics' ? '# Topic' : '# Perso'}
                          </Badge>
                        </div>
                      </Button>
                    </div>
                  )
                })}

                {/* Add Section */}
                {isAddingTopic && (
                  <div className="p-2 border rounded">
                    <Input
                      placeholder={sidebarMode === 'topics' ? "Topic name" : "Persona name"}
                    value={newTopicName}
                    onChange={(e) => setNewTopicName(e.target.value)}
                      className="mb-2 text-sm"
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          sidebarMode === 'topics' ? handleAddTopic() : handleAddPersona()
                        }
                        if (e.key === 'Escape') {
                          sidebarMode === 'topics' ? handleCancelAddTopic() : handleCancelAddPersona()
                        }
                      }}
                    autoFocus
                  />
                    <div className="flex gap-1">
                    <Button 
                      size="sm" 
                        onClick={sidebarMode === 'topics' ? handleAddTopic : handleAddPersona} 
                      className="flex-1"
                    >
                      Add
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline" 
                        onClick={sidebarMode === 'topics' ? handleCancelAddTopic : handleCancelAddPersona}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
                )}
                </div>
              </nav>
            )}
            
            {/* Footer */}
            {!isCollapsed && (
              <div className="p-4 border-t border-border/60">
                <Button 
                  variant="ghost" 
                  className="w-full justify-start h-10 px-3 body-text"
                  onClick={() => setIsAddingTopic(true)}
                >
                  <Plus className="w-4 h-4 mr-3" />
                  Add {sidebarMode === 'topics' ? 'Topic' : 'Persona'}
                </Button>
              </div>
              )}
          </div>

          {/* Main Content */}
          <div className="flex-1 p-4">
              {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-semibold">Prompt Builder</h2>
                <p className="text-sm text-muted-foreground">
                  {selectedTopicFilter === "All Topics" 
                    ? `All prompts (${prompts.length})` 
                    : `${selectedTopicFilter} prompts (${filteredPrompts.length})`}
                </p>
              </div>
            </div>

            {/* Prompts Table */}
              <div className="border rounded-lg">
              {/* Table Header */}
              <div className="grid grid-cols-[40px_minmax(120px,2fr)_minmax(100px,1fr)_minmax(100px,1fr)_minmax(80px,1fr)_minmax(100px,1fr)_minmax(60px,1fr)] gap-0 bg-muted/30 p-2 text-sm font-medium border-b">
                  <div className="flex items-center justify-center">
                    <Checkbox 
                    checked={selectedPrompts.size === prompts.length && prompts.length > 0}
                      onCheckedChange={handleSelectAll}
                    />
                  </div>
                <div className="px-2">Prompts</div>
                  <div className="px-2">Topic</div>
                  <div className="px-2">Platforms</div>
                  <div className="px-2">Updated</div>
                  <div className="px-2">Created</div>
                </div>

                {/* Table Rows */}
              <div className="divide-y">
                {filteredPrompts.map((row) => (
                  <div 
                    key={row.id} 
                    className={`grid grid-cols-[40px_minmax(120px,2fr)_minmax(100px,1fr)_minmax(100px,1fr)_minmax(80px,1fr)_minmax(100px,1fr)_minmax(60px,1fr)] gap-0 items-center p-2 text-sm hover:bg-muted/30 transition-colors ${
                      row.isNew ? 'bg-green-50 border-l-4 border-l-green-500' : ''
                    }`}
                  >
                    <div className="flex items-center justify-center">
                      <Checkbox 
                        checked={selectedPrompts.has(row.id)}
                        onCheckedChange={() => handlePromptSelect(row.id)}
                      />
                    </div>
                    <div className="px-2">
                      {editingPrompt === row.id ? (
                        <Input
                          value={row.prompt}
                          onChange={(e) => handlePromptEdit(row.id, e.target.value)}
                          onBlur={() => handlePromptSave(row.id)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handlePromptSave(row.id)
                            if (e.key === 'Escape') setEditingPrompt(null)
                          }}
                          className="text-sm border rounded bg-background"
                          autoFocus
                        />
                      ) : (
                        <span
                          className="cursor-pointer hover:bg-muted/30 px-1 py-1 rounded block"
                          onClick={() => setEditingPrompt(row.id)}
                        >
                          {row.prompt || ((row as any).isEmpty ? "Click to add prompt..." : "Empty prompt")}
                        </span>
                      )}
                    </div>
                    <div className="px-2">
                      {editingTopic === row.id ? (
                        <Input
                          value={row.topic}
                          onChange={(e) => setPrompts(prev => prev.map(p => p.id === row.id ? {...p, topic: e.target.value} : p))}
                          onBlur={() => handleTopicSave(row.id)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              handleTopicSave(row.id)
                            }
                            if (e.key === 'Escape') {
                              setEditingTopic(null)
                            }
                          }}
                          className="text-sm border rounded bg-background h-6"
                          placeholder="Enter topic name..."
                          autoFocus
                        />
                      ) : (
                        <span 
                          className="cursor-pointer hover:bg-muted/30 px-1 py-1 rounded"
                          onClick={() => handleTopicEdit(row.id)}
                        >
                          {row.topic || "+ Add Topic"}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 px-2">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="sm" className="h-6 px-2 text-xs">
                            Platforms
                            <ChevronDown className="w-3 h-3 ml-1" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="min-w-[var(--radix-dropdown-menu-trigger-width)]" onCloseAutoFocus={(e) => e.preventDefault()}>
                          {['All', 'ChatGPT', 'Perplexity', 'Gemini', 'Claude'].map((platform) => (
                            <DropdownMenuCheckboxItem
                              key={platform}
                              checked={platform === 'All' ? row.platforms?.length === 5 : row.platforms?.includes(platform) || false}
                              onCheckedChange={(checked) => {
                                let newPlatforms: string[] = []
                                if (platform === 'All') {
                                  newPlatforms = checked ? ['ChatGPT', 'Perplexity', 'Gemini', 'Claude'] : []
                                } else {
                                  const currentPlatforms = row.platforms || []
                                  newPlatforms = checked 
                                    ? [...currentPlatforms, platform]
                                    : currentPlatforms.filter(p => p !== platform)
                                }
                                handlePlatformSave(row.id, newPlatforms)
                              }}
                              onSelect={(e) => e.preventDefault()}
                            >
                              {platform === 'All' ? (
                                platform
                              ) : (
                                <div className="flex items-center gap-2">
                                  <img 
                                    src={getFaviconUrl(platform)} 
                                    alt={platform}
                                    className="w-4 h-4 rounded-sm"
                                    onError={(e) => {
                                      e.currentTarget.src = `https://www.google.com/s2/favicons?domain=${platform.toLowerCase()}.com&sz=16`
                                    }}
                                  />
                                  {platform}
                                </div>
                              )}
                            </DropdownMenuCheckboxItem>
                      ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    <div className="text-muted-foreground text-xs px-2">{row.updatedAt}</div>
                    <div className="text-muted-foreground text-xs px-2">{row.createdAt}</div>
                  </div>
                ))}

                {/* Empty State Row */}
                {filteredPrompts.length === 0 && (
                  <div className="grid grid-cols-[40px_minmax(120px,2fr)_minmax(100px,1fr)_minmax(100px,1fr)_minmax(100px,1fr)_minmax(80px,1fr)_minmax(100px,1fr)_minmax(60px,1fr)_minmax(60px,1fr)] gap-0 items-center min-h-[200px]">
                    {/* Empty checkbox column */}
                    <div></div>
                    
                    {/* Empty state content spanning all remaining columns */}
                    <div className="col-span-8 flex flex-col items-center justify-center py-12 text-center">
                      <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                        <FileText className="w-8 h-8 text-muted-foreground" />
                      </div>
                      <h3 className="text-lg font-semibold mb-2">No prompts found</h3>
                      <p className="text-muted-foreground mb-4">
                        {selectedTopicFilter === "All Topics" 
                          ? "No prompts have been created yet." 
                          : `No prompts found for "${selectedTopicFilter}".`}
                      </p>
                      <Button 
                        onClick={() => {
                          // Create a new empty prompt for the selected topic
                          const assignedTopic = selectedTopicFilter === "All Topics" ? "New Topic" : selectedTopicFilter
                          
                          const newPrompt = {
                            id: Date.now(),
                            prompt: "",
                            topic: assignedTopic,
                            persona: "Default Persona",
                            platforms: ["ChatGPT", "Perplexity", "Gemini", "Claude"],
                            updatedAt: "just now",
                            createdAt: "just now",
                            icon: "dots",
                            isNew: true,
                            isEmpty: true
                          }
                          setPrompts(prev => [...prev, newPrompt])
                          setEditingPrompt(newPrompt.id) // Auto-edit the prompt field
                          
                          // Remove the new flag after 3 seconds
                          setTimeout(() => {
                            setPrompts(prev => prev.map(p => p.id === newPrompt.id ? {...p, isNew: false, isEmpty: false} : p))
                          }, 3000)
                        }}
                        className="gap-2"
                      >
                        <Plus className="w-4 h-4" />
                        Add Your First Prompt
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Add Prompt Button */}
            <div className="mt-4 flex justify-start">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => {
                  const newPrompt = {
                    id: Date.now(),
                    prompt: "",
                    topic: "",
                    persona: "Default Persona",
                    platforms: ["ChatGPT", "Perplexity", "Gemini", "Claude"],
                    updatedAt: "just now",
                    createdAt: "just now",
                    icon: "dots",
                    isNew: true,
                    isEmpty: true
                  }
                  setPrompts(prev => [...prev, newPrompt])
                  setEditingPrompt(newPrompt.id) // Auto-edit the prompt field
                  
                  // Remove the new flag after 3 seconds
                  setTimeout(() => {
                    setPrompts(prev => prev.map(p => p.id === newPrompt.id ? {...p, isNew: false, isEmpty: false} : p))
                  }, 3000)
                }}
                className="gap-2"
              >
                <Plus className="w-4 h-4" />
                Add Prompt
              </Button>
            </div>

            {/* Bottom Control Panel - Only show when prompts are selected */}
            {selectedPrompts.size > 0 && (
              <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-muted-foreground">
                      {selectedPrompts.size} prompt{selectedPrompts.size !== 1 ? 's' : ''} selected
                    </span>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="gap-2"
                      onClick={() => setSelectedPrompts(new Set())}
                    >
                      <X className="w-4 h-4" />
                      Clear Selection
                    </Button>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" onClick={handleEditPlatforms}>Edit Platforms</Button>
                    <Button variant="ghost" size="sm" onClick={handleDuplicatePrompts}>Duplicate</Button>
                    <Button variant="ghost" size="sm" className="text-destructive" onClick={handleDeletePrompts}>Delete</Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  // Show loading state
  if (loading) {
    return (
      <div className="w-full space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold leading-none tracking-tight text-foreground">
              Loading prompts...
            </h2>
          </div>
        </div>
        <UnifiedCard className="w-full">
          <UnifiedCardContent className="p-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading prompts dashboard data...</p>
            </div>
          </UnifiedCardContent>
        </UnifiedCard>
      </div>
    )
  }

  // Show error state
  if (error) {
    return (
      <div className="w-full space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold leading-none tracking-tight text-foreground">
              Error Loading Prompts
            </h2>
          </div>
        </div>
        <UnifiedCard className="w-full">
          <UnifiedCardContent className="p-8">
            <div className="text-center">
              <div className="text-red-500 mb-4 text-4xl">❌</div>
              <p className="text-muted-foreground mb-4">{error}</p>
              <Button 
                variant="outline"
                onClick={() => window.location.reload()}
              >
                Retry
              </Button>
            </div>
          </UnifiedCardContent>
        </UnifiedCard>
      </div>
    )
  }

  return (
    <TooltipProvider>
      <SkeletonWrapper
        show={showSkeleton}
        isVisible={isVisible}
        skeleton={<UnifiedCardSkeleton type="table" tableColumns={8} tableRows={10} />}
      >
        <div className="w-full space-y-4">
      {/* Header Section - Outside the box */}
      <div className="flex items-center justify-between">
        <div>
          {realPromptsData && (
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground mt-1">
                {realPromptsData.summary.totalTopics} topics • {realPromptsData.summary.totalPersonas} personas
              </p>
              <p className="text-xs text-muted-foreground">
                Total: <span className="font-medium text-foreground">{realPromptsData.summary.totalPrompts}</span> prompts
              </p>
            </div>
          )}
        </div>
        
        {/* Modify Prompts Button */}
        <PromptBuilderModal onGenerate={() => setShowPromptBuilder(true)}>
          <Button variant="outline" size="sm" className="gap-2">
            <Settings className="w-4 h-4" />
            Modify Prompts
            </Button>
        </PromptBuilderModal>
      </div>

      {/* Main Content Box */}
      <UnifiedCard className="w-full">
        <UnifiedCardContent className="p-4">
          <div className="space-y-4">
            {/* Controls */}
            <div className="flex items-center justify-between">
              {/* Left Controls - Sort by */}
              <div className="flex items-center gap-4">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-2">
                      <ArrowUpDown className="w-4 h-4" />
                      Sort by: {sortBy}
                      <ChevronDown className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem onClick={() => setSortBy("all")}>
                      <div className="flex items-center gap-2">
                        All
                        {sortBy === "all" && <Check className="w-4 h-4" />}
                      </div>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setSortBy("topic")}>
                      <div className="flex items-center gap-2">
                        Topic
                        {sortBy === "topic" && <Check className="w-4 h-4" />}
                      </div>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setSortBy("persona")}>
                      <div className="flex items-center gap-2">
                        Persona
                        {sortBy === "persona" && <Check className="w-4 h-4" />}
                      </div>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Right Controls - Search and Export */}
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input
                    placeholder="Search prompts..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 w-64"
                  />
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="gap-2"
                  onClick={handleExportToExcel}
                >
                  <Download className="w-4 h-4" />
                  Export
                </Button>
              </div>
            </div>

            {/* Collapsible Topics Table */}
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12"></TableHead>
                    <TableHead className="text-left">
                      <div 
                        className="flex items-center gap-2 cursor-pointer hover:bg-muted/50 p-2 rounded"
                        onClick={() => handleTableSort('topic')}
                      >
                        {sortBy === 'all' ? 'All' : (groupedData[0]?.groupLabel || 'Topic')}
                        {getSortIcon('topic')}
                      </div>
                    </TableHead>
                    <TableHead className="text-center">
                      <div className="flex items-center justify-center">
                        Brand Mentioned
                      </div>
                    </TableHead>
                    <TableHead className="text-center">
                      <div 
                        className="flex items-center justify-center gap-2 cursor-pointer hover:bg-muted/50 p-2 rounded"
                        onClick={() => handleTableSort('visibilityScore')}
                      >
                        Visibility Score (%)
                        {getSortIcon('visibilityScore')}
                      </div>
                    </TableHead>
                    <TableHead className="text-center">
                      <div 
                        className="flex items-center justify-center gap-2 cursor-pointer hover:bg-muted/50 p-2 rounded"
                        onClick={() => handleTableSort('visibilityRank')}
                      >
                        Visibility Rank
                        {getSortIcon('visibilityRank')}
                      </div>
                    </TableHead>
                    <TableHead className="text-center">
                      <div 
                        className="flex items-center justify-center gap-2 cursor-pointer hover:bg-muted/50 p-2 rounded"
                        onClick={() => handleTableSort('depthOfMention')}
                      >
                        Depth of Mention (%)
                        {getSortIcon('depthOfMention')}
                      </div>
                    </TableHead>
                    <TableHead className="text-center">
                      <div 
                        className="flex items-center justify-center gap-2 cursor-pointer hover:bg-muted/50 p-2 rounded"
                        onClick={() => handleTableSort('depthOfMentionRank')}
                      >
                        Depth of Mention Rank
                        {getSortIcon('depthOfMentionRank')}
                      </div>
                    </TableHead>
                    <TableHead className="text-center">
                      <div 
                        className="flex items-center justify-center gap-2 cursor-pointer hover:bg-muted/50 p-2 rounded"
                        onClick={() => handleTableSort('averagePositionRank')}
                      >
                        Average Position Rank
                        {getSortIcon('averagePositionRank')}
                      </div>
                    </TableHead>
                    <TableHead className="text-center">
                      <div 
                        className="flex items-center justify-center gap-2 cursor-pointer hover:bg-muted/50 p-2 rounded"
                        onClick={() => handleTableSort('citationShare')}
                      >
                        Citation Share
                        {getSortIcon('citationShare')}
                      </div>
                    </TableHead>
                    <TableHead className="text-center">
                      <div 
                        className="flex items-center justify-center gap-2 cursor-pointer hover:bg-muted/50 p-2 rounded"
                        onClick={() => handleTableSort('citationRank')}
                      >
                        Citation Rank
                        {getSortIcon('citationRank')}
                      </div>
                    </TableHead>
                    <TableHead className="text-center">
                      <div 
                        className="flex items-center justify-center gap-2 cursor-pointer hover:bg-muted/50 p-2 rounded"
                        onClick={() => handleTableSort('subjectiveImpression')}
                      >
                        Subjective Impression
                        {getSortIcon('subjectiveImpression')}
                      </div>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {groupedData.map((group, index) => {
                    const isExpanded = expandedTopics.has(group.groupValue)
                    
                    return (
                      <React.Fragment key={`group-${index}`}>
                        {/* Group Header Row */}
                        <TableRow className="hover:bg-muted/50">
                      <TableCell>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-8 w-8 p-0"
                              onClick={() => handleTopicToggle(group.groupValue)}
                            >
                              {isExpanded ? (
                                <ChevronDown className="w-4 h-4" />
                              ) : (
                          <ChevronRight className="w-4 h-4" />
                              )}
                        </Button>
                      </TableCell>
                          <TableCell className="font-medium">
                            <div className="flex flex-col gap-1">
                              <div className="flex items-center gap-2">
                                <span>{group.groupValue}</span>
                                <Badge variant="outline" className="text-xs px-2 py-0.5 bg-muted text-muted-foreground border-border">
                                  # {group.groupLabel}
                        </Badge>
                              </div>
                              <span className="text-sm text-muted-foreground">
                                {Array.isArray(group.prompts) ? group.prompts.length : 0} prompt{Array.isArray(group.prompts) && group.prompts.length !== 1 ? 's' : ''}
                              </span>
                            </div>
                      </TableCell>
                          <TableCell className="text-center">
                            {/* Brand favicons (includes both user's brand and competitors) */}
                            {(group as any).groupBrands && Array.isArray((group as any).groupBrands) && (group as any).groupBrands.length > 0 && (
                              <div className="flex items-center justify-center gap-1">
                                {(group as any).groupBrands.slice(0, 6).map((brand: any, idx: number) => (
                                  <Tooltip key={`${brand.name}-${idx}`}>
                                    <TooltipTrigger asChild>
                                      <img
                                        src={getDynamicFaviconUrl(brand.url ? { url: brand.url, name: brand.name } : brand.name, 16)}
                                        alt={brand.name}
                                        className="w-4 h-4 rounded-sm border border-border/50 hover:border-primary/50 transition-colors"
                                        data-favicon-identifier={brand.url || brand.name}
                                        data-favicon-size="16"
                                        onError={handleFaviconError}
                                      />
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>{brand.name}{brand.isOwner ? ' (Your Brand)' : ''}</p>
                                    </TooltipContent>
                                  </Tooltip>
                                ))}
                                {(group as any).groupBrands.length > 6 && (
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <span className="text-xs text-muted-foreground px-1.5 py-0.5 bg-muted rounded border border-border/50">
                                        +{(group as any).groupBrands.length - 6}
                                      </span>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <div className="space-y-1">
                                        {(group as any).groupBrands.slice(6).map((brand: any) => (
                                          <p key={brand.name}>{brand.name}{brand.isOwner ? ' (Your Brand)' : ''}</p>
                                        ))}
                                      </div>
                                    </TooltipContent>
                                  </Tooltip>
                                )}
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                          <span>{group.visibilityScore === '-' ? '-' : group.visibilityScore}</span>
                          </TableCell>
                        <TableCell className="font-mono text-center">
                          {group.visibilityRank === '-' ? '-' : `${group.visibilityRank} -`}
                        </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="default" className="text-xs">
                            {group.depthOfMention === '-' ? '-' : group.depthOfMention}
                            </Badge>
                          </TableCell>
                        <TableCell className="font-mono text-center">
                          {group.depthOfMentionRank === '-' ? '-' : `${group.depthOfMentionRank} -`}
                        </TableCell>
                        <TableCell className="font-mono text-center">
                          {group.averagePositionRank === '-' ? '-' : `${group.averagePositionRank} -`}
                        </TableCell>
                        <TableCell className="text-center">
                          {group.citationShare === '-' ? '-' : `${group.citationShare} -`}
                        </TableCell>
                        <TableCell className="font-mono text-center">
                          {group.citationRank === '-' ? '-' : `${group.citationRank} -`}
                        </TableCell>
                          <TableCell className="text-center">
                            {/* ✅ FIX: Remove View button from aggregate topic/persona level - only show at prompt level */}
                            <span className="text-muted-foreground text-xs">-</span>
                          </TableCell>
                        </TableRow>

                        {/* Expanded Prompts */}
                        {isExpanded && Array.isArray(group.prompts) && group.prompts.map((prompt: any, promptIndex: number) => (
                          <TableRow key={`prompt-${prompt.id}`} className="bg-muted/20 hover:bg-muted/40">
                            <TableCell></TableCell>
                            <TableCell className="text-muted-foreground">
                              <span className="text-sm">{prompt.text || prompt.prompt}</span>
                            </TableCell>
                            <TableCell className="text-center">
                              {/* Brand favicons for this specific prompt (includes both user's brand and competitors) */}
                              {(() => {
                                // Prefer mentionedBrands if available, fallback to mentionedCompetitors for backward compatibility
                                const brands = (prompt as any).mentionedBrands || (prompt as any).mentionedCompetitors || [];
                                if (brands.length > 0) {
                                  return (
                                    <div className="flex items-center justify-center gap-1.5">
                                      {brands.slice(0, 8).map((brand: any, idx: number) => (
                                        <Tooltip key={`prompt-${prompt.id}-brand-${idx}`}>
                                          <TooltipTrigger asChild>
                                            <img
                                              src={getDynamicFaviconUrl(brand.url ? { url: brand.url, name: brand.name } : brand.name, 16)}
                                              alt={brand.name}
                                              className="w-4 h-4 rounded-sm border border-border/50 hover:border-primary/50 transition-colors"
                                              data-favicon-identifier={brand.url || brand.name}
                                              data-favicon-size="16"
                                              onError={handleFaviconError}
                                            />
                                          </TooltipTrigger>
                                          <TooltipContent>
                                            <p>{brand.name}{brand.isOwner ? ' (Your Brand)' : ''}</p>
                                          </TooltipContent>
                                        </Tooltip>
                                      ))}
                                      {brands.length > 8 && (
                                        <Tooltip>
                                          <TooltipTrigger asChild>
                                            <span className="text-xs text-muted-foreground px-1.5 py-0.5 bg-muted rounded border border-border/50">
                                              +{brands.length - 8}
                                            </span>
                                          </TooltipTrigger>
                                          <TooltipContent>
                                            <div className="space-y-1">
                                              {brands.slice(8).map((brand: any) => (
                                                <p key={brand.name}>{brand.name}{brand.isOwner ? ' (Your Brand)' : ''}</p>
                                              ))}
                                            </div>
                                          </TooltipContent>
                                        </Tooltip>
                                      )}
                                    </div>
                                  );
                                }
                                return null;
                              })()}
                            </TableCell>
                            <TableCell className="text-sm text-center">
                          {formatPercentage(prompt.promptMetrics?.visibilityScore, 0)}
                            </TableCell>
                            <TableCell className="font-mono text-sm text-center">
                          {(() => {
                            const rank = formatRank(prompt.promptMetrics?.visibilityRank)
                            return rank === '-' ? '-' : `${rank} -`
                          })()}
                            </TableCell>
                            <TableCell className="text-sm text-center">
                              <Badge variant="default" className="text-xs">
                            {formatPercentage(prompt.promptMetrics?.depthOfMention, 1)}
                            </Badge>
                      </TableCell>
                            <TableCell className="font-mono text-sm text-center">
                          {(() => {
                            const rank = formatRank(prompt.promptMetrics?.depthRank)
                            return rank === '-' ? '-' : `${rank} -`
                          })()}
                            </TableCell>
                            <TableCell className="font-mono text-sm text-center">
                          {(() => {
                            const rank = formatRank(prompt.promptMetrics?.avgPositionRank)
                            return rank === '-' ? '-' : `${rank} -`
                          })()}
                            </TableCell>
                            <TableCell className="text-sm text-center">
                          {formatPercentage(prompt.promptMetrics?.citationShare, 0)}
                            </TableCell>
                            <TableCell className="font-mono text-sm text-center">
                          {(() => {
                            const rank = formatRank(prompt.promptMetrics?.citationShareRank)
                            return rank === '-' ? '-' : `${rank} -`
                          })()}
                            </TableCell>
                            <TableCell className="text-sm text-center">
                            <Button 
                                variant="ghost" 
                              size="sm"
                                className="h-6 px-2 text-xs text-[#2563EB] hover:text-[#2563EB] hover:bg-[#2563EB]/10"
                              onClick={() => {
                                if (prompt.id) {
                                  setSelectedPrompt({
                                    ...group,
                                    promptPreview: prompt.text || prompt.prompt || '-',
                                    promptId: prompt.id
                                  })
                                  fetchPromptDetails(prompt.id)
                                  setIsSheetOpen(true)
                                }
                              }}
                            >
                              View
                                <ExternalLink className="w-3 h-3 ml-1" />
                            </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </React.Fragment>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          </div>
        </UnifiedCardContent>
      </UnifiedCard>

      {/* Subjective Impression Analysis Sheet */}
      <Sheet open={isSheetOpen} onOpenChange={(open) => {
        setIsSheetOpen(open)
        if (!open) {
          // Reset state when modal is closed
          setPromptDetails(null)
          setSelectedPlatforms([])
          setSubjectiveMetrics(null)
          setMetricsError(null)
        }
      }}>
                          <SheetContent className="!w-[80vw] sm:!w-[75vw] lg:!w-[70vw] !max-w-none overflow-y-auto">
                            <SheetHeader>
                              <div className="flex justify-between items-center">
                                <div>
                              <SheetTitle className="flex items-center gap-2">
                                <ExternalLink className="w-5 h-5" />
                                Subjective Impression Analysis
                              </SheetTitle>
                              <SheetDescription>
                    Detailed analysis for: <span className="font-semibold">{selectedPrompt?.groupValue || selectedPrompt?.topic}</span>
                    {selectedPrompt?.type && (
                      <Badge variant="outline" className="ml-2 text-xs">
                        {selectedPrompt.type}
                      </Badge>
                    )}
                              </SheetDescription>
                                </div>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="outline" size="sm" className="h-8 px-3 w-[140px]">
                                      Platforms
                                      <ChevronDown className="h-4 w-4 opacity-50 ml-2" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent className="min-w-[var(--radix-dropdown-menu-trigger-width)]">
                                    <DropdownMenuCheckboxItem
                                      checked={selectedPlatforms.length === (Object.keys(promptDetails?.platformResponses || {}).length)}
                                      onCheckedChange={(checked) => {
                                        if (checked) {
                                          setSelectedPlatforms(Object.keys(promptDetails?.platformResponses || {}))
                                        } else {
                                          setSelectedPlatforms([])
                                        }
                                      }}
                                      onSelect={(e) => e.preventDefault()}
                                    >
                                      All Platforms
                                    </DropdownMenuCheckboxItem>
                                    {Object.keys(promptDetails?.platformResponses || {}).map((platform) => (
                                      <DropdownMenuCheckboxItem
                                        key={platform}
                                        checked={selectedPlatforms.includes(platform)}
                                        onCheckedChange={(checked) => {
                                          if (checked) {
                                            setSelectedPlatforms([...selectedPlatforms, platform])
                                          } else {
                                            setSelectedPlatforms(selectedPlatforms.filter(p => p !== platform))
                                          }
                                        }}
                                        onSelect={(e) => e.preventDefault()}
                                      >
                                        <div className="flex items-center gap-2">
                                          <img 
                                            src={getFaviconUrl(platform)} 
                                            alt={platform}
                                            className="w-4 h-4 rounded-sm"
                                            onError={(e) => {
                                              e.currentTarget.src = `https://www.google.com/s2/favicons?domain=${platform.toLowerCase()}.com&sz=16`
                                            }}
                                          />
                                          {platform}
                                        </div>
                                      </DropdownMenuCheckboxItem>
                                    ))}
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </SheetHeader>

          {selectedPrompt && (
                            <div className="mt-6 space-y-4">
                              {/* Prompt box */}
                              <div className="p-4 bg-muted/50 rounded-lg">
                                <h4 className="font-semibold text-sm mb-2">Prompt</h4>
                                <p className="text-sm text-muted-foreground">
                                  {promptDetails?.prompt?.text || selectedPrompt.promptPreview}
                                </p>
                                {promptDetails && (
                                  <div className="mt-2 flex gap-2 text-xs text-muted-foreground">
                                    <span>Topic: {promptDetails.topic}</span>
                                    <span>•</span>
                                    <span>Persona: {promptDetails.persona}</span>
                                  </div>
                                )}
                              </div>


                              {/* LLM Answers */}
                              <div className="p-4 bg-muted/50 rounded-lg">
                                <h4 className="font-semibold text-sm mb-3">
                                  LLM Answers 
                                  {!loadingPromptDetails && selectedPlatforms.length > 0 && (
                                    <span className="text-xs text-muted-foreground ml-2">
                                      ({selectedPlatforms.length} platforms)
                                    </span>
                                  )}
                                </h4>
                                {loadingPromptDetails ? (
                                  <div className="flex items-center justify-center py-8">
                                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                                    <span className="ml-2 text-sm text-muted-foreground">Loading responses...</span>
                                  </div>
                                ) : selectedPlatforms.length > 0 ? (
                                  <div className="space-y-3">
                                    {selectedPlatforms.map((platform) => {
                                      const platformResponse = promptDetails?.platformResponses?.[platform]
                                      return (
                                        <div key={platform} className="border rounded-lg p-3 relative">
                                          {/* Favicon tag in top left */}
                                          <div className="absolute -top-2 -left-2 bg-background border border-border rounded-full p-1 shadow-sm">
                                            <img 
                                              src={getFaviconUrl(platform)} 
                                              alt={platform}
                                              className="w-5 h-5 rounded-sm"
                                              onError={(e) => {
                                                e.currentTarget.src = `https://www.google.com/s2/favicons?domain=${platform.toLowerCase()}.com&sz=16`
                                              }}
                                            />
                                          </div>
                                          <h5 className="font-medium text-sm mb-2 text-white">{platform}</h5>
                                          {platformResponse ? (
                                            <div className="space-y-2">
                                              <div className="text-sm text-muted-foreground prose prose-sm max-w-none">
                                                <ReactMarkdown
                                                  remarkPlugins={[remarkGfm]}
                                                  components={{
                                                    table: ({ children }) => (
                                                      <div className="overflow-x-auto my-4">
                                                        <table className="min-w-full border-collapse border border-border">
                                                          {children}
                                                        </table>
                                                      </div>
                                                    ),
                                                    thead: ({ children }) => (
                                                      <thead className="bg-muted">{children}</thead>
                                                    ),
                                                    tbody: ({ children }) => (
                                                      <tbody>{children}</tbody>
                                                    ),
                                                    tr: ({ children }) => (
                                                      <tr className="border-b border-border hover:bg-muted/50">
                                                        {children}
                                                      </tr>
                                                    ),
                                                    th: ({ children }) => (
                                                      <th className="border border-border px-3 py-2 text-left font-semibold text-sm">
                                                        {children}
                                                      </th>
                                                    ),
                                                    td: ({ children }) => (
                                                      <td className="border border-border px-3 py-2 text-sm">
                                                        {children}
                                                      </td>
                                                    ),
                                                    p: ({ children }) => (
                                                      <p className="mb-3">{children}</p>
                                                    ),
                                                    ul: ({ children }) => (
                                                      <ul className="list-disc list-inside mb-3 space-y-1">
                                                        {children}
                                                      </ul>
                                                    ),
                                                    ol: ({ children }) => (
                                                      <ol className="list-decimal list-inside mb-3 space-y-1">
                                                        {children}
                                                      </ol>
                                                    ),
                                                    li: ({ children }) => (
                                                      <li className="ml-4">{children}</li>
                                                    ),
                                                    code: ({ children, className }) => {
                                                      const isInline = !className
                                                      return isInline ? (
                                                        <code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono">
                                                          {children}
                                                        </code>
                                                      ) : (
                                                        <code className={className}>{children}</code>
                                                      )
                                                    },
                                                    pre: ({ children }) => (
                                                      <pre className="bg-muted p-3 rounded-lg overflow-x-auto mb-3">
                                                        {children}
                                                      </pre>
                                                    ),
                                                    blockquote: ({ children }) => (
                                                      <blockquote className="border-l-4 border-primary pl-4 italic my-3 text-muted-foreground">
                                                        {children}
                                                      </blockquote>
                                                    ),
                                                    h1: ({ children }) => (
                                                      <h1 className="text-2xl font-bold mb-3 mt-4">{children}</h1>
                                                    ),
                                                    h2: ({ children }) => (
                                                      <h2 className="text-xl font-bold mb-2 mt-4">{children}</h2>
                                                    ),
                                                    h3: ({ children }) => (
                                                      <h3 className="text-lg font-semibold mb-2 mt-3">{children}</h3>
                                                    ),
                                                    h4: ({ children }) => (
                                                      <h4 className="text-base font-semibold mb-2 mt-3">{children}</h4>
                                                    ),
                                                    a: ({ children, href }) => (
                                                      <a
                                                        href={href}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-primary hover:underline"
                                                      >
                                                        {children}
                                                      </a>
                                                    ),
                                                  }}
                                                >
                                                  {platformResponse.response}
                                                </ReactMarkdown>
                                              </div>
                                              {/* NEW: Brands/Competitors mentioned with favicons */}
                                              {platformResponse.mentionedEntities && (
                                                <div className="flex items-center gap-2 text-xs bg-primary/10 px-2 py-1.5 rounded-sm border border-primary/20">
                                                  <span className="font-semibold text-muted-foreground">Brands Mentioned:</span>
                                                  <div className="flex items-center gap-1.5 flex-wrap">
                                                    {/* Brands - ✅ FIX: Handle both string (legacy) and object (new) formats */}
                                                    {platformResponse.mentionedEntities.brands && platformResponse.mentionedEntities.brands.length > 0 && (
                                                      platformResponse.mentionedEntities.brands.map((brand: any, idx: number) => {
                                                        // Handle both string (legacy) and object (new) formats
                                                        const brandName = typeof brand === 'string' ? brand : brand.name;
                                                        const brandUrl = typeof brand === 'object' ? brand.url : null;
                                                        const isOwner = typeof brand === 'object' ? brand.isOwner : false;
                                                        
                                                        return (
                                                          <Tooltip key={`brand-${idx}`}>
                                                            <TooltipTrigger asChild>
                                                              <img
                                                                src={getDynamicFaviconUrl(brandUrl ? { url: brandUrl, name: brandName } : brandName, 16)}
                                                                alt={brandName}
                                                                className="w-4 h-4 rounded-sm border border-border/50 hover:border-primary/50 transition-colors"
                                                                data-favicon-identifier={brandUrl || brandName}
                                                                data-favicon-size="16"
                                                                onError={handleFaviconError}
                                                              />
                                                            </TooltipTrigger>
                                                            <TooltipContent side="top" className="text-xs">
                                                              {brandName}{isOwner ? ' (Your Brand)' : ''}
                                                            </TooltipContent>
                                                          </Tooltip>
                                                        );
                                                      })
                                                    )}
                                                    {/* Competitors - ✅ FIX: Handle both string (legacy) and object (new) formats */}
                                                    {platformResponse.mentionedEntities.competitors && platformResponse.mentionedEntities.competitors.length > 0 && (
                                                      platformResponse.mentionedEntities.competitors.map((competitor: any, idx: number) => {
                                                        // Handle both string (legacy) and object (new) formats
                                                        const competitorName = typeof competitor === 'string' ? competitor : competitor.name;
                                                        const competitorUrl = typeof competitor === 'object' ? competitor.url : null;
                                                        
                                                        return (
                                                          <Tooltip key={`competitor-${idx}`}>
                                                            <TooltipTrigger asChild>
                                                              <img
                                                                src={getDynamicFaviconUrl(competitorUrl ? { url: competitorUrl, name: competitorName } : competitorName, 16)}
                                                                alt={competitorName}
                                                                className="w-4 h-4 rounded-sm border border-border/50 hover:border-primary/50 transition-colors"
                                                                data-favicon-identifier={competitorUrl || competitorName}
                                                                data-favicon-size="16"
                                                                onError={handleFaviconError}
                                                              />
                                                            </TooltipTrigger>
                                                            <TooltipContent side="top" className="text-xs">
                                                              {competitorName}
                                                            </TooltipContent>
                                                          </Tooltip>
                                                        );
                                                      })
                                                    )}
                                                    {/* Empty state */}
                                                    {(!platformResponse.mentionedEntities.brands?.length && !platformResponse.mentionedEntities.competitors?.length) && (
                                                      <span className="italic text-muted-foreground">No brands mentioned</span>
                                                    )}
                                                  </div>
                                                </div>
                                              )}
                                            </div>
                                          ) : (
                                            <p className="text-sm text-muted-foreground">
                                              No answer available for this platform.
                                            </p>
                                          )}
                                        </div>
                                      )
                                    })}
                                  </div>
                                ) : (
                                  <div className="text-center py-8">
                                    <p className="text-sm text-muted-foreground">
                                      No platforms selected or no responses available for this prompt.
                                    </p>
                                  </div>
                                )}
                              </div>

                              {/* Subjective Metrics Analysis */}
                              <div className="space-y-4">
                                {/* Header with Generate Button */}
                                <div className="flex items-center justify-between">
                                  <div>
                                    <h4 className="font-semibold text-sm">Subjective Metrics Analysis</h4>
                                    <p className="text-xs text-muted-foreground">
                                      AI-powered analysis of how {getBrandName()} is cited across platforms
                                    </p>
                                  </div>
                                  
                                  {!subjectiveMetrics ? (
                                    <Button 
                                      onClick={generateSubjectiveMetrics}
                                      disabled={generatingMetrics || !selectedPlatforms.length}
                                      size="sm"
                                      className="h-8 px-3 text-xs"
                                    >
                                      {generatingMetrics ? (
                                        <>
                                          <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-2"></div>
                                          Generating...
                                        </>
                                      ) : (
                                        <>
                                          <Sparkles className="w-3 h-3 mr-2" />
                                          Generate
                                        </>
                                      )}
                                    </Button>
                                  ) : (
                                    <div className="flex items-center gap-1 text-green-600 text-xs">
                                      <Check className="w-3 h-3" />
                                      <span>Generated</span>
                                    </div>
                                  )}
                                </div>

                                {/* Error Display */}
                                {metricsError && (
                                  <div className="p-2 bg-red-50 border border-red-200 rounded text-xs text-red-600">
                                    {metricsError}
                                  </div>
                                )}

                                {/* Metrics Grid - Always show 6 cards */}
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                  {/* Relevance Card */}
                                  <div className="bg-card border rounded-lg p-3 hover:bg-muted/50 transition-colors">
                                    <div className="flex items-center justify-between mb-2">
                                      <h5 className="font-medium text-sm">Relevance</h5>
                                      <span className={`text-lg font-bold ${subjectiveMetrics?.relevance?.score ? 'text-primary' : 'text-muted-foreground'}`}>
                                        {subjectiveMetrics?.relevance?.score || 0}/5
                                      </span>
                                    </div>
                                    <p className="text-xs text-muted-foreground mb-2">
                                      Is the citation actually answering the query?
                                    </p>
                                    <details className="group">
                                      <summary className="text-xs text-primary cursor-pointer hover:underline">
                                        View reasoning
                                      </summary>
                                      <div className="mt-2 p-2 bg-muted/50 rounded text-xs text-muted-foreground">
                                        {subjectiveMetrics?.relevance?.reasoning || 'No analysis available. Click "Generate" to analyze.'}
                                      </div>
                                    </details>
                                  </div>

                                  {/* Influence Card */}
                                  <div className="bg-card border rounded-lg p-3 hover:bg-muted/50 transition-colors">
                                    <div className="flex items-center justify-between mb-2">
                                      <h5 className="font-medium text-sm">Influence</h5>
                                      <span className={`text-lg font-bold ${subjectiveMetrics?.influence?.score ? 'text-primary' : 'text-muted-foreground'}`}>
                                        {subjectiveMetrics?.influence?.score || 0}/5
                                      </span>
                                    </div>
                                    <p className="text-xs text-muted-foreground mb-2">
                                      Does it shape the user's takeaway?
                                    </p>
                                    <details className="group">
                                      <summary className="text-xs text-primary cursor-pointer hover:underline">
                                        View reasoning
                                      </summary>
                                      <div className="mt-2 p-2 bg-muted/50 rounded text-xs text-muted-foreground">
                                        {subjectiveMetrics?.influence?.reasoning || 'No analysis available. Click "Generate" to analyze.'}
                                      </div>
                                    </details>
                                  </div>

                                  {/* Uniqueness Card */}
                                  <div className="bg-card border rounded-lg p-3 hover:bg-muted/50 transition-colors">
                                    <div className="flex items-center justify-between mb-2">
                                      <h5 className="font-medium text-sm">Uniqueness</h5>
                                      <span className={`text-lg font-bold ${subjectiveMetrics?.uniqueness?.score ? 'text-primary' : 'text-muted-foreground'}`}>
                                        {subjectiveMetrics?.uniqueness?.score || 0}/5
                                      </span>
                                    </div>
                                    <p className="text-xs text-muted-foreground mb-2">
                                      Is the info special, or just repeated elsewhere?
                                    </p>
                                    <details className="group">
                                      <summary className="text-xs text-primary cursor-pointer hover:underline">
                                        View reasoning
                                      </summary>
                                      <div className="mt-2 p-2 bg-muted/50 rounded text-xs text-muted-foreground">
                                        {subjectiveMetrics?.uniqueness?.reasoning || 'No analysis available. Click "Generate" to analyze.'}
                                      </div>
                                    </details>
                                  </div>

                                  {/* Position Card */}
                                  <div className="bg-card border rounded-lg p-3 hover:bg-muted/50 transition-colors">
                                    <div className="flex items-center justify-between mb-2">
                                      <h5 className="font-medium text-sm">Position</h5>
                                      <span className={`text-lg font-bold ${subjectiveMetrics?.position?.score ? 'text-primary' : 'text-muted-foreground'}`}>
                                        {subjectiveMetrics?.position?.score || 0}/5
                                      </span>
                                    </div>
                                    <p className="text-xs text-muted-foreground mb-2">
                                      How prominently is the citation placed within the answer?
                                    </p>
                                    <details className="group">
                                      <summary className="text-xs text-primary cursor-pointer hover:underline">
                                        View reasoning
                                      </summary>
                                      <div className="mt-2 p-2 bg-muted/50 rounded text-xs text-muted-foreground">
                                        {subjectiveMetrics?.position?.reasoning || 'No analysis available. Click "Generate" to analyze.'}
                                      </div>
                                    </details>
                                  </div>

                                  {/* Click Probability Card */}
                                  <div className="bg-card border rounded-lg p-3 hover:bg-muted/50 transition-colors">
                                    <div className="flex items-center justify-between mb-2">
                                      <h5 className="font-medium text-sm">Click Probability</h5>
                                      <span className={`text-lg font-bold ${subjectiveMetrics?.clickProbability?.score ? 'text-primary' : 'text-muted-foreground'}`}>
                                        {subjectiveMetrics?.clickProbability?.score || 0}/5
                                      </span>
                                    </div>
                                    <p className="text-xs text-muted-foreground mb-2">
                                      Would the user click the citation if links are shown?
                                    </p>
                                    <details className="group">
                                      <summary className="text-xs text-primary cursor-pointer hover:underline">
                                        View reasoning
                                      </summary>
                                      <div className="mt-2 p-2 bg-muted/50 rounded text-xs text-muted-foreground">
                                        {subjectiveMetrics?.clickProbability?.reasoning || 'No analysis available. Click "Generate" to analyze.'}
                                      </div>
                                    </details>
                                  </div>

                                  {/* Diversity Card */}
                                  <div className="bg-card border rounded-lg p-3 hover:bg-muted/50 transition-colors">
                                    <div className="flex items-center justify-between mb-2">
                                      <h5 className="font-medium text-sm">Diversity</h5>
                                      <span className={`text-lg font-bold ${subjectiveMetrics?.diversity?.score ? 'text-primary' : 'text-muted-foreground'}`}>
                                        {subjectiveMetrics?.diversity?.score || 0}/5
                                      </span>
                                    </div>
                                    <p className="text-xs text-muted-foreground mb-2">
                                      Does the citation bring in a new perspective?
                                    </p>
                                    <details className="group">
                                      <summary className="text-xs text-primary cursor-pointer hover:underline">
                                        View reasoning
                                      </summary>
                                      <div className="mt-2 p-2 bg-muted/50 rounded text-xs text-muted-foreground">
                                        {subjectiveMetrics?.diversity?.reasoning || 'No analysis available. Click "Generate" to analyze.'}
                                      </div>
                                    </details>
                                  </div>
                                </div>

                                {/* Helper Text */}
                                {!subjectiveMetrics && (
                                  <div className="text-center py-2">
                                    <p className="text-xs text-muted-foreground">
                                      Click "Generate" to analyze {getBrandName()} citations across all platforms
                                    </p>
                                    {!selectedPlatforms.length && (
                                      <p className="text-xs text-red-500 mt-1">
                                        LLM responses required to generate metrics
                                      </p>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
          )}

                          </SheetContent>
                        </Sheet>
        </div>
      </SkeletonWrapper>
    </TooltipProvider>
  )
}

export { PromptsSection }