'use client'

import React, { useState, useEffect } from 'react'
import { UnifiedCard, UnifiedCardContent } from '@/components/ui/unified-card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { ChevronDown, ChevronRight, ArrowUpDown, Info } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { useSkeletonLoading } from '@/components/ui/with-skeleton-loading'
import { SkeletonWrapper } from '@/components/ui/skeleton-wrapper'
import { UnifiedCardSkeleton } from '@/components/ui/unified-card-skeleton'
import apiService from '@/services/api'

interface SentimentBreakdownSectionProps {
  filterContext?: {
    selectedTopics: string[]
    selectedPersonas: string[]
    selectedPlatforms: string[]
    selectedAnalysisId?: string
  }
  dashboardData?: any
}

interface SentimentPrompt {
  id: string
  text: string
  queryType: string
  sentimentSplit: {
    positive: number
    negative: number
    neutral: number
    mixed?: number
  }
  totalTests: number
}

interface SentimentTopicPersonaItem {
  id: string
  name: string
  type: 'topic' | 'persona'
  sentimentSplit: {
    positive: number
    negative: number
    neutral: number
    mixed?: number
  }
  totalSentiment: number
  prompts: SentimentPrompt[]
}

interface SentimentData {
  items: SentimentTopicPersonaItem[]
  summary: {
    totalPrompts: number
    totalTopics: number
    totalPersonas: number
  }
}

export function SentimentBreakdownSection({ filterContext, dashboardData }: SentimentBreakdownSectionProps) {
  const [sortBy, setSortBy] = useState<'topics' | 'personas'>('topics')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [sentimentData, setSentimentData] = useState<SentimentData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [expandedTopics, setExpandedTopics] = useState<Set<string>>(new Set())

  // Skeleton loading
  const { showSkeleton, isVisible } = useSkeletonLoading(filterContext)

  // Fetch real sentiment data from the database when sortBy or selectedAnalysisId changes
  useEffect(() => {
    const fetchRealSentimentData = async () => {
      try {
        setIsLoading(true)
        setError(null)
        
        console.log('🔍 [SentimentBreakdownSection] Fetching real sentiment data from database...')
        console.log('🔍 [SentimentBreakdownSection] Sort by:', sortBy)
        console.log('🔍 [SentimentBreakdownSection] Analysis ID:', filterContext?.selectedAnalysisId)
        
        // Use the existing sentiment breakdown API that we created earlier
        const response = await apiService.getPromptSentimentBreakdown(
          filterContext?.selectedAnalysisId,
          sortBy
        )
        
        if (response.success && response.data && Array.isArray(response.data)) {
          // Transform the API response to match our component's expected format
          const processedItems = response.data.map((item: any, index: number) => {
            // Fix the "[object Object]" issue by properly extracting the name
            let itemName = 'Unknown'
            if (typeof item.topic === 'string') {
              itemName = item.topic
            } else if (item.topic && typeof item.topic === 'object') {
              itemName = item.topic.name || item.topic.type || 'Unknown'
            }
            
            return {
              id: `${sortBy}-${index}`,
              name: itemName,
              type: sortBy as 'topic' | 'persona',
              sentimentSplit: item.sentimentSplit || {
                positive: 0,
                neutral: 0,
                negative: 0,
                mixed: 0
              },
              totalSentiment: item.totalSentiment || 0,
              prompts: (item.prompts || []).map((prompt: any, promptIndex: number) => ({
                id: prompt.id || `prompt-${index}-${promptIndex}`,
                text: prompt.text || 'Unknown prompt',
                queryType: prompt.queryType || 'Unknown',
                sentimentSplit: prompt.sentimentSplit || {
                  positive: 0,
                  neutral: 0,
                  negative: 0,
                  mixed: 0
                },
                totalTests: prompt.totalTests || 0
              }))
            }
          })
          
          const processedData = {
            items: processedItems,
            summary: {
              totalPrompts: processedItems.reduce((sum, item) => sum + item.prompts.length, 0),
              totalTopics: sortBy === 'topics' ? processedItems.length : 0,
              totalPersonas: sortBy === 'personas' ? processedItems.length : 0
            }
          }
          
          setSentimentData(processedData)
          console.log('✅ [SentimentBreakdownSection] Real sentiment data loaded from database:', processedData)
        } else {
          setSentimentData(null)
          console.log('⚠️ [SentimentBreakdownSection] No sentiment data received from database')
        }
      } catch (err) {
        console.error('❌ [SentimentBreakdownSection] Error fetching real sentiment data:', err)
        setError(err instanceof Error ? err.message : 'Failed to fetch sentiment data')
        setSentimentData(null)
      } finally {
        setIsLoading(false)
      }
    }

    // Only fetch if we have a selectedAnalysisId
    if (filterContext?.selectedAnalysisId) {
      fetchRealSentimentData()
    }
  }, [sortBy, filterContext?.selectedAnalysisId])

  const handleSortChange = (newSortBy: 'topics' | 'personas') => {
    setSortBy(newSortBy)
  }

  const handleColumnSort = () => {
    setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
  }

  const handleTopicToggle = (topicId: string) => {
    const newExpanded = new Set(expandedTopics)
    if (newExpanded.has(topicId)) {
      newExpanded.delete(topicId)
    } else {
      newExpanded.add(topicId)
    }
    setExpandedTopics(newExpanded)
  }

  const SentimentBar = ({ sentimentSplit, totalResponses }: { 
    sentimentSplit: { positive: number; negative: number; neutral: number }
    totalResponses?: number 
  }) => {
    const total = sentimentSplit.positive + sentimentSplit.negative + sentimentSplit.neutral
    const positiveWidth = (sentimentSplit.positive / total) * 100
    const negativeWidth = (sentimentSplit.negative / total) * 100
    const neutralWidth = (sentimentSplit.neutral / total) * 100

    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="relative flex h-3 bg-gray-200 rounded-full overflow-hidden cursor-pointer">
              <div 
                className="bg-green-500 h-full flex items-center justify-center hover:bg-green-600 transition-colors" 
                style={{ width: `${positiveWidth}%` }}
              >
                {sentimentSplit.positive > 10 && (
                  <span className="text-xs font-medium text-white">
                    {sentimentSplit.positive}%
                  </span>
                )}
              </div>
              <div 
                className="bg-red-500 h-full flex items-center justify-center hover:bg-red-600 transition-colors" 
                style={{ width: `${negativeWidth}%` }}
              >
                {sentimentSplit.negative > 10 && (
                  <span className="text-xs font-medium text-white">
                    {sentimentSplit.negative}%
                  </span>
                )}
              </div>
              <div 
                className="bg-blue-500 h-full flex items-center justify-center hover:bg-blue-600 transition-colors" 
                style={{ width: `${neutralWidth}%` }}
              >
                {sentimentSplit.neutral > 10 && (
                  <span className="text-xs font-medium text-white">
                    {sentimentSplit.neutral}%
                  </span>
                )}
              </div>
            </div>
          </TooltipTrigger>
          <TooltipContent side="top" className="bg-neutral-900 dark:bg-neutral-800 border border-neutral-700 rounded-md px-3 py-2 shadow-lg max-w-xs">
            <div className="space-y-1">
              <div className="text-white font-semibold text-sm">Sentiment Breakdown</div>
              
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-300">Positive:</span>
                <span className="text-gray-300 font-medium">{sentimentSplit.positive}%</span>
              </div>
              
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-300">Neutral:</span>
                <span className="text-gray-300 font-medium">{sentimentSplit.neutral}%</span>
              </div>
              
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-300">Negative:</span>
                <span className="text-gray-300 font-medium">{sentimentSplit.negative}%</span>
              </div>
              
              {totalResponses && (
                <div className="pt-1 border-t border-neutral-600">
                  <div className="text-xs text-gray-400">
                    Total: {totalResponses} responses analyzed
                  </div>
                </div>
              )}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  const sortData = (data: SentimentTopicPersonaItem[]) => {
    return [...data].sort((a, b) => {
      const aValue = String(a.name || '').toLowerCase()
      const bValue = String(b.name || '').toLowerCase()
      
      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1
      } else {
        return aValue < bValue ? 1 : -1
      }
    })
  }

  if (error) {
    return (
      <UnifiedCard className="w-full">
        <UnifiedCardContent className="p-6">
          <div className="text-center text-red-500">
            <p>Error loading sentiment data: {error}</p>
            <Button 
              variant="outline" 
              onClick={() => window.location.reload()} 
              className="mt-2"
            >
              Retry
            </Button>
          </div>
        </UnifiedCardContent>
      </UnifiedCard>
    )
  }

  return (
    <SkeletonWrapper
      show={showSkeleton || isLoading}
      isVisible={isVisible}
      skeleton={<UnifiedCardSkeleton type="table" tableColumns={4} tableRows={6} />}
    >
      <UnifiedCard className="w-full">
        <UnifiedCardContent className="p-6">
          <div className="space-y-4 mb-6">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-foreground">Sentiment Breakdown</h2>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="w-4 h-4 text-muted-foreground cursor-help hover:text-foreground transition-colors" />
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-xs">
                      <p className="text-sm leading-relaxed">
                        Sentiment Breakdown provides detailed sentiment distribution across topics and personas. This helps identify which conversation themes and user types generate positive or negative sentiment for your brand.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <p className="body-text text-muted-foreground mt-1">Detailed analysis of sentiment drivers across different topics and user personas</p>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-muted-foreground">Sort by:</span>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="body-text">
                    {sortBy === 'topics' ? 'Topics' : 'User Persona'}
                    <ChevronDown className="ml-2 h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-full">
                  <DropdownMenuItem onClick={() => handleSortChange('topics')}>Topics</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleSortChange('personas')}>User Persona</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {sentimentData && sentimentData.items && sentimentData.items.length > 0 ? (
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12"></TableHead>
                    <TableHead className="text-left">
                      <div className="flex items-center gap-2 cursor-pointer hover:bg-muted/50 p-2 rounded">
                        {sortBy === 'topics' ? 'Topic' : 'User Persona'}
                      </div>
                    </TableHead>
                    <TableHead className="text-center">
                      <div className="flex items-center justify-center gap-2 cursor-pointer hover:bg-muted/50 p-2 rounded">
                        Sentiment Breakdown
                      </div>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortData(sentimentData.items).map((item, index) => {
                    const isExpanded = expandedTopics.has(item.id)
                    
                    return (
                      <React.Fragment key={`group-${index}`}>
                        {/* Group Header Row */}
                        <TableRow className="hover:bg-muted/50">
                          <TableCell>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-8 w-8 p-0"
                              onClick={() => handleTopicToggle(item.id)}
                            >
                              {isExpanded ? (
                                <ChevronDown className="w-4 h-4" />
                              ) : (
                                <ChevronRight className="w-4 h-4" />
                              )}
                            </Button>
                          </TableCell>
                          <TableCell className="font-medium text-left">
                            <div className="flex flex-col gap-1">
                              <div className="flex items-center justify-between">
                                <span>{item.name}</span>
                                <Badge variant="outline" className="text-xs px-2 py-0.5 bg-muted text-muted-foreground border-border">
                                  # {sortBy === 'topics' ? 'Topic' : 'Persona'}
                                </Badge>
                              </div>
                              <span className="text-sm text-muted-foreground">
                                {item.prompts.length} prompt{item.prompts.length !== 1 ? 's' : ''}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex items-center justify-center gap-4">
                              <div className="w-48">
                                <SentimentBar sentimentSplit={item.sentimentSplit} totalResponses={item.totalSentiment} />
                              </div>
                              <div className="flex items-center space-x-3 text-xs text-muted-foreground">
                                <div className="flex items-center space-x-1">
                                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                  <span>Positive</span>
                                </div>
                                <div className="flex items-center space-x-1">
                                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                  <span>Neutral</span>
                                </div>
                                <div className="flex items-center space-x-1">
                                  <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                                  <span>Negative</span>
                                </div>
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>

                        {/* Expanded Prompts */}
                        {isExpanded && item.prompts.map((prompt) => (
                          <TableRow key={prompt.id} className="bg-muted/20 hover:bg-muted/40">
                            <TableCell></TableCell>
                            <TableCell className="text-muted-foreground text-left">
                              <span className="text-sm">{prompt.text}</span>
                            </TableCell>
                            <TableCell className="text-center">
                              <div className="flex items-center justify-center">
                                <div className="w-48">
                                  <SentimentBar sentimentSplit={prompt.sentimentSplit} totalResponses={prompt.totalTests} />
                                </div>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </React.Fragment>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="py-8 text-center text-muted-foreground">
              {isLoading ? 'Loading sentiment data...' : `No sentiment data available for ${sortBy === 'topics' ? 'topics' : 'personas'}`}
            </div>
          )}
        </UnifiedCardContent>
      </UnifiedCard>
    </SkeletonWrapper>
  )
}
