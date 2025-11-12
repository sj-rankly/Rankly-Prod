/**
 * Pages Tab - LLM Traffic Module (Inspired by Fibr's Design)
 *
 * Shows page-level LLM traffic performance with comprehensive analytics
 */

'use client'

import type { Range } from '@/types/traffic'
import { UnifiedCard, UnifiedCardContent } from '@/components/ui/unified-card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Info } from 'lucide-react'
import { useState, useEffect } from 'react'
import { getPages, getConversionEvents, getDateRange } from '@/services/ga4Api'
import { PagesSkeleton } from '@/components/ui/pages-skeleton'
import { getDynamicFaviconUrl, handleFaviconError } from '@/lib/faviconUtils'


// Function to get the domain for each LLM platform for favicon fetching
// Uses Google favicon service which automatically resolves domains for new platforms
function getLLMDomain(platform: string): string {
  const platformLower = platform.toLowerCase().trim()
  
  // Comprehensive LLM platform mappings (matching Platform Tab)
  // ChatGPT/OpenAI - Use official ChatGPT favicon
  if (platformLower === 'chatgpt' || platformLower.includes('openai') || platformLower.includes('gpt')) {
    return 'chat.openai.com' // Use chat.openai.com for ChatGPT logo
  }
  // Claude/Anthropic
  if (platformLower === 'claude' || platformLower.includes('anthropic')) {
    return 'claude.ai'
  }
  // Gemini/Bard
  if (platformLower === 'gemini' || platformLower === 'bard' || platformLower.includes('bard')) {
    return 'gemini.google.com'
  }
  // Perplexity
  if (platformLower === 'perplexity') {
    return 'perplexity.ai'
  }
  // Poe
  if (platformLower === 'poe') {
    return 'poe.com'
  }
  // Microsoft Copilot
  if (platformLower === 'copilot' || platformLower.includes('microsoft copilot') || platformLower.includes('bing chat')) {
    return 'copilot.microsoft.com'
  }
  // Grok (X/Twitter)
  if (platformLower === 'grok' || platformLower.includes('grok')) {
    return 'x.com'
  }
  // Character.ai
  if (platformLower === 'character' || platformLower.includes('character.ai') || platformLower === 'characterai') {
    return 'character.ai'
  }
  // You.com
  if (platformLower === 'you' || platformLower === 'you.com' || platformLower.includes('youcom')) {
    return 'you.com'
  }
  // HuggingChat
  if (platformLower === 'huggingchat' || platformLower.includes('hugging face') || platformLower === 'huggingface') {
    return 'huggingface.co'
  }
  // Pi (Inflection)
  if (platformLower === 'pi' || platformLower.includes('inflection') || platformLower === 'heypi') {
    return 'heypi.com'
  }
  // Llama/Meta AI
  if (platformLower === 'llama' || platformLower.includes('meta ai') || platformLower === 'metaai') {
    return 'meta.ai'
  }
  // Mistral
  if (platformLower === 'mistral') {
    return 'mistral.ai'
  }
  // Cohere
  if (platformLower === 'cohere') {
    return 'cohere.com'
  }
  // Google/Direct
  if (platformLower === 'google' || platformLower === 'direct') {
    return 'google.com'
  }
  
  // For unknown platforms, construct domain from platform name
  // Google favicon service will automatically resolve the correct favicon
  // Format: platformname.com (remove spaces, special chars, lowercase)
  const cleanPlatform = platformLower
    .replace(/\s+/g, '') // Remove spaces
    .replace(/[^a-z0-9]/g, '') // Remove special characters
  
  // Try common domain extensions for LLM platforms
  if (cleanPlatform) {
    return `${cleanPlatform}.com` // Google favicon service will handle resolution
  }
  
  // Final fallback
  return 'google.com'
}

// Function to get platform color for fallback (matching Platform Tab)
function getLLMPlatformColor(platformName: string): string {
  const colors: Record<string, string> = {
    'ChatGPT': '#00a67e',
    'Claude': '#ff6b35',
    'Gemini': '#4285f4',
    'Perplexity': '#6366f1',
    'Other LLM': '#6b7280'
  }
  return colors[platformName] || '#6b7280'
}

interface PagesTabProps {
  range: Range
  realPagesData?: any
  dateRange?: string
  isLoading?: boolean
  selectedConversionEvent?: string
  onConversionEventChange?: (event: string) => void
}

export function PagesTab({ 
  range, 
  realPagesData, 
  dateRange = '30 days', 
  isLoading = false,
  selectedConversionEvent: propSelectedConversionEvent,
  onConversionEventChange
}: PagesTabProps) {
  const [conversionEvents, setConversionEvents] = useState<any[]>([])
  const [selectedConversionEvent, setSelectedConversionEvent] = useState(propSelectedConversionEvent || 'conversions')
  const [pagesData, setPagesData] = useState(realPagesData?.data?.pages || [])
  const [isFetchingData, setIsFetchingData] = useState(false)

  // Sync with prop if provided
  useEffect(() => {
    if (propSelectedConversionEvent && propSelectedConversionEvent !== selectedConversionEvent) {
      setSelectedConversionEvent(propSelectedConversionEvent)
    }
  }, [propSelectedConversionEvent])

  // Handle conversion event change
  const handleConversionEventChange = (event: string) => {
    setSelectedConversionEvent(event)
    onConversionEventChange?.(event)
  }
  
  // Debug: Log the data structure
  useEffect(() => {
    if (realPagesData?.data?.pages) {
      console.log('🔍 [PagesTab] Real pages data structure:', realPagesData.data)
      console.log('🔍 [PagesTab] First page data:', realPagesData.data.pages[0])
      console.log('🔍 [PagesTab] First page platformSessions:', realPagesData.data.pages[0]?.platformSessions)
    }
  }, [realPagesData])

  // Sync pagesData with realPagesData prop
  useEffect(() => {
    if (realPagesData?.data?.pages) {
      setPagesData(realPagesData.data.pages)
    }
  }, [realPagesData])

  // Fetch conversion events on component mount
  useEffect(() => {
    const fetchConversionEvents = async () => {
      try {
        const response = await getConversionEvents()
        if (response.success) {
          setConversionEvents(response.data.events || [])
        }
      } catch (error) {
        console.error('Failed to fetch conversion events:', error)
      }
    }
    fetchConversionEvents()
  }, [])

  // Only fetch pages data when conversion event changes AND realPagesData doesn't match
  // Don't refetch if we already have data from parent (realPagesData)
  useEffect(() => {
    // If we have realPagesData from parent, use it and don't fetch
    if (realPagesData?.data?.pages && realPagesData.data.pages.length > 0) {
      console.log('✅ [PagesTab] Using realPagesData from parent, skipping fetch')
      return
    }

    const fetchPagesData = async () => {
      if (!dateRange) return
      
      setIsFetchingData(true)
      console.log('🔄 [PagesTab] Fetching pages data with conversion event:', selectedConversionEvent)
      
      try {
        const days = parseInt(dateRange.split(' ')[0])
        const { startDate, endDate } = getDateRange(days)
        const response = await getPages(startDate, endDate, 100, dateRange, selectedConversionEvent)
        
        console.log('📊 [PagesTab] Pages API response:', {
          success: response.success,
          hasData: !!response.data,
          pagesCount: response.data?.pages?.length || 0,
          conversionEvent: selectedConversionEvent
        })
        
        if (response.success && response.data && response.data.pages) {
          setPagesData(response.data.pages)
          console.log('✅ [PagesTab] Updated pages data:', response.data.pages.slice(0, 2))
        } else {
          console.error('❌ [PagesTab] API error:', response.error)
        }
      } catch (error) {
        console.error('❌ [PagesTab] Failed to fetch pages data:', error)
      } finally {
        setIsFetchingData(false)
      }
    }
    
    // Only fetch if we don't have data from parent
    fetchPagesData()
  }, [dateRange, selectedConversionEvent, realPagesData])

  // Show skeleton when loading (prop or local state)
  if (isLoading || isFetchingData) {
    return <PagesSkeleton />
  }

  // Show skeleton if no data available (initial state before any data is fetched)
  if ((!realPagesData || !realPagesData.data || !realPagesData.data.pages || realPagesData.data.pages.length === 0) && 
      (!pagesData || pagesData.length === 0)) {
    return <PagesSkeleton />
  }

  console.log('[PagesTab] Received data:', {
    hasRealPagesData: !!realPagesData,
    dataStructure: realPagesData ? Object.keys(realPagesData) : null,
    dataDataStructure: realPagesData?.data ? Object.keys(realPagesData.data) : null,
    hasPages: realPagesData?.data?.pages ? realPagesData.data.pages.length : 0,
    pagesDataLength: pagesData?.length || 0,
    pagesData: realPagesData?.data?.pages ? realPagesData.data.pages.slice(0, 2) : null
  })

  // Use pagesData (from internal fetch or prop) - prefer realPagesData if available
  const pages = (realPagesData?.data?.pages || pagesData || [])

  // If no data available after loading, show empty state
  if (!pages || pages.length === 0) {
    return (
      <div>
        <UnifiedCard className="w-full">
          <UnifiedCardContent className="p-6">
            <div className="space-y-4">
              <div>
                <h2 className="text-foreground">Page Performance</h2>
                <p className="body-text text-muted-foreground mt-1">
                  No real data available. Please connect to GA4 and sync data.
                </p>
              </div>
            </div>
          </UnifiedCardContent>
        </UnifiedCard>
      </div>
    )
  }

  return (
    <div>
      <UnifiedCard className="w-full">
        <UnifiedCardContent className="p-6">
          <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="space-y-1">
                <h2 className="text-xl font-semibold leading-none tracking-tight text-foreground">Page Performance</h2>
                <p className="text-sm text-muted-foreground">LLM traffic metrics by page</p>
              </div>
              
              <div className="flex items-center gap-6">
                {/* Conversion Events Dropdown */}
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Conversion Event:</span>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-4 w-4 text-muted-foreground hover:text-primary cursor-help transition-colors" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-[300px]">
                        <p className="text-sm">
                          <strong>What does this filter do?</strong><br />
                          By default, pages show overall "conversions". Select a specific conversion event (like "purchases" or "sign_up") to see pages filtered by that specific event. This helps you identify which pages drive specific actions.
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <Select value={selectedConversionEvent} onValueChange={handleConversionEventChange}>
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder="Select conversion event" />
                    </SelectTrigger>
                    <SelectContent>
                      {conversionEvents.map((event) => (
                        <SelectItem key={event.name} value={event.name}>
                          <div className="flex items-center gap-2">
                            <span>{event.displayName}</span>
                            {event.category && (
                              <Badge variant="outline" className="text-xs">
                                {event.category}
                              </Badge>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                {/* Summary Metrics - Single Line */}
                <div className="flex items-center gap-4">
                  <div className="text-sm text-muted-foreground flex items-center gap-2">
                    <span>Total Sessions</span>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="h-3.5 w-3.5 text-muted-foreground hover:text-primary cursor-help transition-colors" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <div className="max-w-xs space-y-2">
                            <p className="text-sm font-semibold">Total LLM Sessions</p>
                            <p className="text-sm">Total number of <strong>unique</strong> sessions from LLM providers</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              Each session is counted once, regardless of how many pages it visits. This matches the Platform Tab's "Total LLM Sessions" for consistency.
                            </p>
                            <div className="mt-2 pt-2 border-t border-border/50">
                              <p className="text-xs font-semibold mb-1">Note:</p>
                              <p className="text-xs text-muted-foreground">
                                The sum of page-level sessions in the table below may be higher than this total if some sessions visited multiple pages.
                              </p>
                            </div>
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    <span className="text-lg font-semibold text-foreground ml-1">
                      {realPagesData?.data?.summary?.totalSessions ?? 
                        pages.reduce((sum: number, page: any) => sum + (page.sessions || 0), 0)}
                    </span>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Avg Session Quality <span className="text-lg font-semibold text-foreground ml-1">
                      {(() => {
                        // Use summary.avgSQS from backend if available (matches Platform Tab calculation)
                        // Otherwise calculate weighted average SQS
                        const totalSessions = realPagesData?.data?.summary?.totalSessions ?? 
                          pages.reduce((sum: number, page: any) => sum + (page.sessions || 0), 0);
                        const avgSQS = realPagesData?.data?.summary?.avgSQS ?? 
                          (() => {
                            const weightedSQS = pages.reduce((sum: number, page: any) => 
                              sum + (parseFloat(page.sqs || 0) * (page.sessions || 0)), 0);
                            return totalSessions > 0 ? (weightedSQS / totalSessions) : 0;
                          })();
                        return avgSQS.toFixed(2);
                      })()}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Table */}
                <div className="border rounded-lg overflow-x-auto">
                  <TooltipProvider>
                    <Table className="min-w-[1710px] table-fixed">
                  {/* Table Header */}
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[320px] text-left">
                        <div className="cursor-pointer hover:bg-muted/50 p-1 rounded text-left">
                          <span className="text-xs font-medium text-muted-foreground">Page</span>
                        </div>
                      </TableHead>

                      <TableHead className="w-[150px] text-center">
                        <div className="flex items-center justify-center gap-2 cursor-pointer hover:bg-muted/50 p-1 rounded">
                          <span className="text-xs font-medium text-muted-foreground">LLM Sessions</span>
                          <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Info className="h-4 w-4 text-muted-foreground hover:text-primary cursor-help transition-colors" />
                            </TooltipTrigger>
                              <TooltipContent>
                                <div className="max-w-xs space-y-2">
                                  <p className="text-sm font-semibold">LLM Sessions (Page-Level)</p>
                                  <p className="text-sm">Number of sessions from LLM providers to this specific page</p>
                                  <p className="text-xs text-muted-foreground mt-1">
                                    This is a <strong>page-level count</strong>. If a session visits multiple pages, it will be counted once for each page it visits.
                                  </p>
                                  <div className="mt-2 pt-2 border-t border-border/50">
                                    <p className="text-xs font-semibold mb-1">Note:</p>
                                    <p className="text-xs text-muted-foreground">
                                      The sum of all page-level sessions may be higher than the "Total Sessions" shown in the summary, which counts each unique session only once.
                                    </p>
                                  </div>
                                </div>
                            </TooltipContent>
                          </Tooltip>
                          </TooltipProvider>
                        </div>
                      </TableHead>

                      <TableHead className="w-[140px] text-center">
                        <div className="flex items-center justify-center gap-2 cursor-pointer hover:bg-muted/50 p-1 rounded">
                          <span className="text-xs font-medium text-muted-foreground">Platform</span>
                          <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Info className="h-4 w-4 text-muted-foreground hover:text-primary cursor-help transition-colors" />
                            </TooltipTrigger>
                            <TooltipContent>
                                <p className="text-sm">LLM platforms driving traffic to this page</p>
                                <p className="text-xs text-muted-foreground mt-1">Shows platforms by session count with favicons</p>
                            </TooltipContent>
                          </Tooltip>
                          </TooltipProvider>
                        </div>
                      </TableHead>

                      <TableHead className="w-[200px] text-center">
                        <div className="flex items-center justify-center gap-2 cursor-pointer hover:bg-muted/50 p-1 rounded">
                          <span className="text-xs font-medium text-muted-foreground">Session Quality Score</span>
                          <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Info className="h-4 w-4 text-muted-foreground hover:text-primary cursor-help transition-colors" />
                            </TooltipTrigger>
                              <TooltipContent>
                                <div className="max-w-xs space-y-2">
                                  <p className="text-sm font-semibold">Session Quality Score (SQS)</p>
                                  <p className="text-sm">
                                    A composite metric (0-100) that evaluates session quality based on:
                                  </p>
                                  <ul className="text-xs space-y-1 ml-4 list-disc">
                                    <li><strong>Engagement Rate</strong> × 0.4 (40% weight, max 40 points)</li>
                                    <li><strong>Conversion Rate</strong> × 0.3 (30% weight, max 30 points)</li>
                                    <li><strong>Pages per Session</strong> × 4, capped at 5 pages (20% weight, max 20 points)</li>
                                    <li><strong>Session Duration</strong> (minutes) × 2, capped at 5 minutes (10% weight, max 10 points)</li>
                                  </ul>
                                  <p className="text-xs text-muted-foreground mt-2 pt-2 border-t border-border/50">
                                    <strong>Formula:</strong> SQS = (Engagement Rate × 0.4) + (Conversion Rate × 0.3) + (min(Pages, 5) × 4) + (min(Duration in min, 5) × 2)
                                  </p>
                                  <div className="mt-2 pt-2 border-t border-border/50">
                                    <p className="text-xs font-semibold mb-1">Quality Levels:</p>
                                    <ul className="text-xs space-y-0.5">
                                      <li>• <span className="text-green-500">●</span> <strong>Good:</strong> 70-100</li>
                                      <li>• <span className="text-yellow-500">●</span> <strong>Average:</strong> 50-69</li>
                                      <li>• <span className="text-red-500">●</span> <strong>Poor:</strong> 0-49</li>
                                    </ul>
                                  </div>
                                  <p className="text-xs text-muted-foreground mt-1">
                                    Higher scores indicate better-performing pages
                                  </p>
                                </div>
                            </TooltipContent>
                          </Tooltip>
                          </TooltipProvider>
                        </div>
                      </TableHead>

                      <TableHead className="w-[160px] text-center">
                        <div className="flex items-center justify-center gap-2 cursor-pointer hover:bg-muted/50 p-1 rounded">
                          <span className="text-xs font-medium text-muted-foreground">Content Group</span>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Info className="h-4 w-4 text-muted-foreground hover:text-primary cursor-help transition-colors" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Category like Blog, Product, Pricing, Docs</p>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                      </TableHead>

                      <TableHead className="w-[160px] text-center">
                        <div className="flex items-center justify-center gap-2 cursor-pointer hover:bg-muted/50 p-1 rounded">
                          <span className="text-xs font-medium text-muted-foreground">Conversion Rate</span>
                          <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Info className="h-4 w-4 text-muted-foreground hover:text-primary cursor-help transition-colors" />
                            </TooltipTrigger>
                            <TooltipContent>
                                <p className="text-sm">Percentage of sessions that resulted in conversions (0-100%)</p>
                                <p className="text-xs text-muted-foreground mt-1">Calculated as: (Conversions / Sessions) × 100%</p>
                                <p className="text-xs text-muted-foreground mt-1">Based on the selected conversion event</p>
                            </TooltipContent>
                          </Tooltip>
                          </TooltipProvider>
                        </div>
                      </TableHead>

                      <TableHead className="w-[140px] text-center">
                        <div className="flex items-center justify-center gap-2 cursor-pointer hover:bg-muted/50 p-1 rounded">
                          <span className="text-xs font-medium text-muted-foreground">Bounce Rate</span>
                          <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Info className="h-4 w-4 text-muted-foreground hover:text-primary cursor-help transition-colors" />
                            </TooltipTrigger>
                            <TooltipContent>
                                <div className="max-w-xs space-y-2">
                                  <p className="text-sm font-semibold">Bounce Rate (GA4)</p>
                                  <p className="text-sm">Percentage of sessions that were not engaged (0-100%)</p>
                                  <p className="text-xs text-muted-foreground mt-1">In GA4, a session is considered bounced (not engaged) if it:</p>
                                  <ul className="text-xs space-y-0.5 ml-4 list-disc">
                                    <li>Did NOT last longer than 10 seconds, AND</li>
                                    <li>Did NOT include a conversion event, AND</li>
                                    <li>Did NOT have two or more page/screen views</li>
                                  </ul>
                                  <p className="text-xs text-muted-foreground mt-1 pt-1 border-t border-border/50">
                                    Formula: Bounce Rate = 1 - Engagement Rate
                                  </p>
                                </div>
                            </TooltipContent>
                          </Tooltip>
                          </TooltipProvider>
                        </div>
                      </TableHead>

                      <TableHead className="w-[150px] text-center">
                        <div className="flex items-center justify-center gap-2 cursor-pointer hover:bg-muted/50 p-1 rounded">
                          <span className="text-xs font-medium text-muted-foreground">Time on Page</span>
                          <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Info className="h-4 w-4 text-muted-foreground hover:text-primary cursor-help transition-colors" />
                            </TooltipTrigger>
                            <TooltipContent>
                                <p className="text-sm">Average time spent per session on this page</p>
                                <p className="text-xs text-muted-foreground mt-1">Calculated as: Total Session Duration / Total Sessions</p>
                                <p className="text-xs text-muted-foreground mt-1">Displayed in seconds</p>
                                <p className="text-xs text-muted-foreground mt-1">Higher values indicate users are spending more time on this page</p>
                            </TooltipContent>
                          </Tooltip>
                          </TooltipProvider>
                        </div>
                      </TableHead>

                      <TableHead className="w-[160px] text-center">
                        <div className="flex items-center justify-center gap-2 cursor-pointer hover:bg-muted/50 p-1 rounded">
                          <span className="text-xs font-medium text-muted-foreground">LLM Journey</span>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Info className="h-4 w-4 text-muted-foreground hover:text-primary cursor-help transition-colors" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Entry, Middle, or Exit point in LLM flow</p>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                      </TableHead>

                    </TableRow>
                  </TableHeader>

                  {/* Table Body */}
                      <TableBody>
                        {pages.map((page: any, index: number) => (
                      <TableRow key={index} className="hover:bg-muted/50 transition-colors">
                        <TableCell className="w-[320px] text-left align-middle">
                          <div className="space-y-0.5">
                            <div className="text-sm font-medium text-foreground truncate">
                              {page.title || 'Untitled Page'}
                            </div>
                            <div className="text-xs text-muted-foreground truncate">
                              {page.url ? (
                                <a
                                  href={page.url.startsWith('http') ? page.url : page.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="hover:text-blue-500 transition-colors"
                                >
                                  {page.url}
                                </a>
                              ) : (
                                <span className="text-muted-foreground">N/A</span>
                              )}
                            </div>
                          </div>
                        </TableCell>

                        {/* Each cell below is a visual metric */}
                        <TableCell className="text-center align-middle">
                          <span className="text-sm font-medium text-foreground">{Math.round(page.sessions || 0)}</span>
                        </TableCell>
                        <TableCell className="text-center align-middle">
                          <div className="flex items-center justify-center gap-2 flex-wrap">
                            {page.platformSessions && Object.keys(page.platformSessions).length > 0 ? (
                              Object.entries(page.platformSessions).map(([platform, sessions]) => {
                                const platformColor = getLLMPlatformColor(platform);
                                // Use official ChatGPT favicon URL for ChatGPT
                                const platformLower = platform.toLowerCase();
                                const faviconUrl = (platformLower === 'chatgpt' || platformLower.includes('openai') || platformLower.includes('gpt'))
                                  ? 'https://chat.openai.com/favicon.ico'
                                  : getDynamicFaviconUrl(getLLMDomain(platform), 32);
                                
                                return (
                                <div key={platform} className="flex items-center gap-1" title={`${platform}: ${sessions} sessions`}>
                                  <img
                                      src={faviconUrl}
                                    alt={`${platform} favicon`}
                                      className="w-5 h-5 rounded-sm"
                                    data-favicon-identifier={platform}
                                    data-favicon-size="32"
                                    onError={(e) => {
                                      handleFaviconError(e as any)
                                        // Also apply custom fallback for visual consistency (matching Platform Tab)
                                      const target = e.target as HTMLImageElement;
                                        if (!target.src.includes('fetchfavicon') && !target.src.includes('google.com') && !target.src.includes('openai.com')) {
                                        target.style.display = 'none';
                                        const fallback = document.createElement('div');
                                        fallback.className = 'w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold';
                                          fallback.style.backgroundColor = platformColor;
                                        fallback.style.color = 'white';
                                        fallback.textContent = platform.charAt(0).toUpperCase();
                                        target.parentNode?.insertBefore(fallback, target);
                                      }
                                    }}
                                  />
                                  <span className="text-xs text-muted-foreground">{sessions as number}</span>
                                </div>
                                );
                              })
                            ) : (
                              // Fallback to show provider if platformSessions is not available
                              page.provider && (
                                <div className="flex items-center gap-1" title={`${page.provider}: ${page.sessions} sessions`}>
                                  {(() => {
                                    const providerLower = page.provider.toLowerCase();
                                    const faviconUrl = (providerLower.includes('chatgpt') || providerLower.includes('openai') || providerLower.includes('gpt'))
                                      ? 'https://chat.openai.com/favicon.ico'
                                      : getDynamicFaviconUrl(getLLMDomain(page.provider), 32);
                                    return (
                                      <img
                                        src={faviconUrl}
                                    alt={`${page.provider} favicon`}
                                        className="w-5 h-5 rounded-sm"
                                        data-favicon-identifier={page.provider}
                                        data-favicon-size="32"
                                    onError={(e) => {
                                          handleFaviconError(e as any)
                                          // Fallback to colored circle if favicon fails to load (matching Platform Tab)
                                      const target = e.target as HTMLImageElement;
                                          if (!target.src.includes('fetchfavicon') && !target.src.includes('google.com') && !target.src.includes('openai.com')) {
                                      target.style.display = 'none';
                                      const fallback = document.createElement('div');
                                      fallback.className = 'w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold';
                                            const providerColor = getLLMPlatformColor(page.provider);
                                            fallback.style.backgroundColor = providerColor;
                                      fallback.style.color = 'white';
                                      fallback.textContent = page.provider.charAt(0).toUpperCase();
                                      target.parentNode?.insertBefore(fallback, target);
                                          }
                                    }}
                                  />
                                    );
                                  })()}
                                  <span className="text-xs text-muted-foreground">{page.sessions}</span>
                                </div>
                              )
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-center align-middle">
                          <span className="text-sm font-semibold text-primary">{Math.round(parseFloat(page.sqs || 0))}</span>
                        </TableCell>
                        <TableCell className="text-center align-middle">
                          <Badge variant="outline" className="text-xs font-medium">
                            {page.contentGroup}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center align-middle">
                          <span className="text-sm font-medium text-foreground">{Math.round(parseFloat(page.conversionRate || 0))}%</span>
                        </TableCell>
                        <TableCell className="text-center align-middle">
                          <span className="text-sm font-medium text-destructive">{Math.round(parseFloat(page.bounce || 0))}%</span>
                        </TableCell>
                        <TableCell className="text-center align-middle">
                          <span className="text-sm font-medium text-foreground">{Math.round(parseFloat(page.timeOnPage || 0))}s</span>
                        </TableCell>
                        <TableCell className="text-center align-middle">
                          <span className="text-xs font-medium text-muted-foreground">{page.llmJourney}</span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TooltipProvider>
            </div>
          </div>
        </UnifiedCardContent>
      </UnifiedCard>
    </div>
  )
}