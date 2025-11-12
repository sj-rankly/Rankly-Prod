'use client'

import { useState, useEffect } from 'react'
import { UnifiedCard, UnifiedCardContent } from '@/components/ui/unified-card'
import { SkeletonShimmer, TableRowSkeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Info, TrendingUp, TrendingDown } from 'lucide-react'
import { ModernTrendUp, ModernTrendDown } from '@/components/ui/modern-arrows'
import { getDynamicFaviconUrl, handleFaviconError } from '@/lib/faviconUtils'
import { getConversionEvents } from '@/services/ga4Api'
import { calculateEngagementScore, calculateSessionQualityScore } from '@/lib/analytics/trafficMetrics'

// Function to get the domain for each LLM platform for favicon fetching
// Uses Google favicon service which automatically resolves domains for new platforms
function getLLMDomain(platform: string): string {
  const platformLower = platform.toLowerCase().trim()
  
  // Comprehensive LLM platform mappings
  // ChatGPT/OpenAI
  if (platformLower === 'chatgpt' || platformLower.includes('openai') || platformLower.includes('gpt')) {
    return 'chatgpt.com'
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

interface UnifiedLLMPlatformPerformanceSectionProps {
  realLLMData?: any
  dateRange?: string
  isLoading?: boolean
  selectedConversionEvent?: string
  onConversionEventChange?: (event: string) => void
}

function UnifiedLLMPlatformPerformanceSection({ 
  realLLMData, 
  dateRange = '30 days', 
  isLoading = false,
  selectedConversionEvent = 'conversions',
  onConversionEventChange
}: UnifiedLLMPlatformPerformanceSectionProps) {
  const [conversionEvents, setConversionEvents] = useState<any[]>([])
  
  // Fetch conversion events on mount
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
  // Use real LLM platform performance data from GA4
  console.log('🔍 UnifiedLLMPlatformPerformanceSection received realLLMData:', realLLMData)
  const performanceDataRaw = realLLMData?.data?.llmPerformanceData || []
  console.log('🔍 LLM Performance data structure:', performanceDataRaw)
  console.log('🔍 LLM Performance data length:', performanceDataRaw.length)
  console.log('🔍 First LLM platform performance data:', performanceDataRaw[0])
  console.log('🔍 All LLM platform names:', performanceDataRaw.map(p => p.name))
  
  // Transform real GA4 LLM performance data into component format
  const performanceData = performanceDataRaw.map((platform: any, index: number) => ({
    id: index,
    name: platform.name,
    sessions: platform.sessions || 0,
    share: platform.percentage || 0,
    sessionQualityScore: calculateSessionQualityScore({
      engagementRate: platform.engagementRate,
      conversionRate: platform.conversionRate,
      pagesPerSession: platform.pagesPerSession,
      avgSessionDurationSeconds: platform.avgSessionDuration,
    }),
    engagementScore: calculateEngagementScore(platform.engagementRate),
    conversionRate: platform.conversionRate || 0,
    bounceRate: platform.bounceRate || 0,
    avgSessionDuration: platform.avgSessionDuration || 0,
    pagesPerSession: platform.pagesPerSession || 0,
    newUsers: platform.newUsers || 0,
    returningUsers: platform.returningUsers || 0,
    goalCompletions: platform.goalCompletions || 0,
    color: getLLMPlatformColor(platform.name),
    // Include comparison data from backend
    absoluteChange: platform.absoluteChange || 0,
    shareChange: platform.shareChange || 0,
    change: platform.change || 0,
    trend: platform.trend || 'neutral'
  }))
  
  // Validation: Verify data consistency
  const calculatedTotalSessions = performanceData.reduce((sum: number, item: any) => sum + item.sessions, 0)
  const totalPercentage = performanceData.reduce((sum: number, item: any) => sum + (item.share || 0), 0)
  const percentageDifference = Math.abs(totalPercentage - 100)
  
  console.log('🔍 Final transformed LLM performance data:', performanceData)
  console.log('🔍 LLM Performance data count:', performanceData.length)
  console.log('🔍 [LLMPlatformPerformance] Data validation:', {
    calculatedTotalSessions,
    totalPercentage: totalPercentage.toFixed(2),
    percentageDifference: percentageDifference.toFixed(2),
    validation: {
      percentagesMatch: percentageDifference <= 0.1
    },
    samplePlatforms: performanceData.slice(0, 3).map(p => ({
      name: p.name,
      sessions: p.sessions,
      share: p.share,
      sqs: p.sessionQualityScore.toFixed(2)
    }))
  })
  
  // Log warning if data inconsistency detected
  if (percentageDifference > 0.1) {
    console.warn('⚠️ [LLMPlatformPerformance] Percentages don\'t sum to 100%:', {
      totalPercentage: totalPercentage.toFixed(2),
      difference: percentageDifference.toFixed(2)
    })
  }

  // Calculate totals for comparison
  const totalSessions = calculatedTotalSessions
  
  // Calculate weighted average SQS
  const totalSessionsForAvg = performanceData.reduce((sum: number, item: any) => sum + item.sessions, 0)
  const weightedSQS = performanceData.reduce((sum: number, item: any) => 
    sum + (item.sessionQualityScore * item.sessions), 0)
  const calculatedAvgSQS = totalSessionsForAvg > 0 ? (weightedSQS / totalSessionsForAvg) : 0
  
  // Log validation for debugging
  console.log('🔍 [LLMPlatformPerformance] SQS Validation:', {
    platformSQS: performanceData.map(p => ({
      name: p.name,
      sessions: p.sessions,
      sqs: p.sessionQualityScore.toFixed(2),
      weightedSQS: (p.sessionQualityScore * p.sessions).toFixed(2)
    })),
    totalSessions: totalSessionsForAvg,
    sumWeightedSQS: weightedSQS.toFixed(2),
    calculatedAvgSQS: calculatedAvgSQS.toFixed(2)
  })

  // Helper functions
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

  function formatDuration(seconds: number): string {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = Math.floor(seconds % 60)
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }


  // Show loading skeleton if loading
  if (isLoading) {
    return (
      <div className="w-full space-y-4">
        <UnifiedCard className="w-full">
          <UnifiedCardContent className="p-6">
            <div className="space-y-6">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <SkeletonShimmer className="h-7 w-56" />
                  <SkeletonShimmer className="h-4 w-96" />
                </div>
                <div className="flex items-center gap-3">
                  <SkeletonShimmer className="h-9 w-44" />
                </div>
              </div>
              
              {/* Summary Stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="space-y-2 p-4 border rounded-lg">
                    <SkeletonShimmer className="h-4 w-32" />
                    <SkeletonShimmer className="h-8 w-24" />
                  </div>
                ))}
              </div>
              
              {/* Performance Table */}
              <div className="space-y-2">
                {/* Table Header */}
                <div className="grid grid-cols-9 gap-4 p-4 bg-muted/30 rounded-lg border">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => (
                    <SkeletonShimmer key={i} className="h-4 w-full" />
                  ))}
                </div>
                
                {/* Table Rows */}
                {[1, 2, 3, 4, 5, 6].map((row) => (
                  <TableRowSkeleton key={row} columns={9} className="p-4 border rounded-lg" />
                ))}
              </div>
            </div>
          </UnifiedCardContent>
        </UnifiedCard>
      </div>
    )
  }

  // Show message if no data available
  if (performanceData.length === 0) {
    return (
      <div className="w-full space-y-4">
        <UnifiedCard className="w-full">
          <UnifiedCardContent className="p-6">
            <div className="space-y-1 mb-6">
              <h2 className="text-xl font-semibold leading-none tracking-tight text-foreground">LLM Platform Performance</h2>
              <p className="text-sm text-muted-foreground">Comprehensive performance metrics for all LLM platforms</p>
            </div>
            
            <div className="flex items-center justify-center h-64">
              <div className="text-center space-y-2">
                <p className="text-muted-foreground">No LLM platform performance data available. Please connect your Google Analytics account and sync data.</p>
              </div>
            </div>
          </UnifiedCardContent>
        </UnifiedCard>
      </div>
    )
  }

  return (
    <div className="w-full space-y-4">
      <UnifiedCard className="w-full">
        <UnifiedCardContent className="p-6">
          {/* Header Section */}
          <div className="flex items-start justify-between mb-6">
            <div className="space-y-1">
              <h2 className="text-xl font-semibold leading-none tracking-tight text-foreground">LLM Platform Performance</h2>
              <p className="text-sm text-muted-foreground">Comprehensive performance metrics for all LLM platforms</p>
            </div>
            
            {/* Summary Stats and Conversion Event Selector */}
            <div className="flex items-center gap-6 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Total Sessions:</span>
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
                          Calculated by aggregating sessions grouped by <strong>(sessionSource, sessionMedium, pageReferrer)</strong>. Each unique session is counted once, regardless of how many pages it visits.
                        </p>
                        <div className="mt-2 pt-2 border-t border-border/50">
                          <p className="text-xs font-semibold mb-1">Calculation:</p>
                          <p className="text-xs text-muted-foreground">
                            Sessions are grouped by source/medium/referrer combination, then summed. This ensures each unique user session is counted only once.
                          </p>
                        </div>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <span className="font-semibold text-foreground">{totalSessions.toLocaleString()}</span>
              </div>
              <div className="w-px h-4 bg-border/50"></div>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Avg Session Quality:</span>
                <span className="font-semibold text-foreground">
                  {calculatedAvgSQS.toFixed(2)}
                </span>
              </div>
              <div className="w-px h-4 bg-border/50"></div>
              {/* Conversion Event Dropdown */}
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Conversion Event:</span>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-4 w-4 text-muted-foreground hover:text-primary cursor-help transition-colors" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-[300px]">
                      <p className="text-sm">
                        <strong>What does this filter do?</strong><br />
                        By default, metrics show overall "conversions". Select a specific conversion event (like "purchases" or "sign_up") to see metrics filtered by that specific event. This helps you identify which LLM platforms drive specific actions.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                {onConversionEventChange && (
                  <Select value={selectedConversionEvent} onValueChange={onConversionEventChange}>
                    <SelectTrigger className="w-[180px] h-8 text-xs">
                      <SelectValue placeholder="Select conversion event" />
                    </SelectTrigger>
                    <SelectContent>
                      {conversionEvents.map((event) => (
                        <SelectItem key={event.name} value={event.name}>
                          <div className="flex items-center gap-2">
                            <span>{event.displayName}</span>
                            {event.category && (
                              <span className="text-xs text-muted-foreground">({event.category})</span>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>
          </div>

          {/* Performance Table */}
          <div className="overflow-x-auto border border-border/20 rounded-lg">
            <Table className="w-full min-w-[1200px]">
              <TableHeader>
                <TableRow className="border-border/40 bg-muted/20">
                  <TableHead className="sticky left-0 bg-muted/20 z-10 py-2 px-3 min-w-[140px] text-left font-normal text-foreground text-xs">
                    LLM Platform
                  </TableHead>
                  <TableHead className="text-center py-2 px-3 min-w-[120px] font-normal text-foreground text-xs">
                    <div className="flex items-center justify-center gap-2">
                      Sessions
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="h-3 w-3 text-muted-foreground" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="text-sm">Total number of sessions from this LLM platform</p>
                            <p className="text-xs text-muted-foreground mt-1">A session is a period of user activity on your site</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </TableHead>
                  <TableHead className="text-center py-3 px-4 min-w-[100px] font-normal text-foreground text-xs">
                    <div className="flex items-center justify-center gap-2">
                      Share
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="h-3 w-3 text-muted-foreground" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="text-sm">Percentage share of total LLM sessions from this platform</p>
                            <p className="text-xs text-muted-foreground mt-1">Calculated as: (Platform Sessions / Total LLM Sessions) × 100%</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </TableHead>
                  <TableHead className="text-center py-2 px-3 min-w-[120px] font-normal text-foreground text-xs">
                    <div className="flex items-center justify-center gap-2">
                      Session Quality Score
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="h-3 w-3 text-muted-foreground" />
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
                                Higher scores indicate better-performing LLM platforms
                              </p>
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </TableHead>
                  <TableHead className="text-center py-2 px-3 min-w-[120px] font-normal text-foreground text-xs">
                    <div className="flex items-center justify-center gap-2">
                      Engagement
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="h-3 w-3 text-muted-foreground" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <div className="max-w-xs space-y-2">
                              <p className="text-sm font-semibold">Engagement Rate</p>
                              <p className="text-sm">Percentage of sessions that were engaged (0-100%)</p>
                              <p className="text-xs text-muted-foreground mt-1">A session is considered engaged if it meets at least one of:</p>
                              <ul className="text-xs space-y-0.5 ml-4 list-disc">
                                <li>Lasts longer than 10 seconds</li>
                                <li>Includes a conversion event</li>
                                <li>Has two or more page/screen views</li>
                              </ul>
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </TableHead>
                  <TableHead className="text-center py-3 px-4 min-w-[100px] font-normal text-foreground text-xs">
                    <div className="flex items-center justify-center gap-2">
                      Conversion Rate
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="h-3 w-3 text-muted-foreground" />
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
                  <TableHead className="text-center py-3 px-4 min-w-[100px] font-normal text-foreground text-xs">
                    <div className="flex items-center justify-center gap-2">
                      Bounce Rate
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="h-3 w-3 text-muted-foreground" />
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
                  <TableHead className="text-center py-3 px-4 min-w-[100px] font-normal text-foreground text-xs">
                    <div className="flex items-center justify-center gap-2">
                      Average Session Duration
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="h-3 w-3 text-muted-foreground" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="text-sm">Average time spent per session</p>
                            <p className="text-xs text-muted-foreground mt-1">Calculated as: Total Session Duration / Total Sessions</p>
                            <p className="text-xs text-muted-foreground mt-1">Displayed in minutes:seconds (MM:SS) format</p>
                            <p className="text-xs text-muted-foreground mt-1">Higher values indicate users are spending more time on your site</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </TableHead>
                  <TableHead className="text-center py-3 px-4 min-w-[100px] font-normal text-foreground text-xs">
                    <div className="flex items-center justify-center gap-2">
                      Pages per Session
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="h-3 w-3 text-muted-foreground" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="text-sm">Average number of pages viewed per session</p>
                            <p className="text-xs text-muted-foreground mt-1">Calculated as: Total Page Views / Total Sessions</p>
                            <p className="text-xs text-muted-foreground mt-1">Higher values indicate users are exploring more pages</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </TableHead>
                  <TableHead className="text-center py-3 px-4 min-w-[100px] font-normal text-foreground text-xs">
                    <div className="flex items-center justify-center gap-2">
                      New Users
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="h-3 w-3 text-muted-foreground" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="text-sm">Number of new users from this LLM platform</p>
                            <p className="text-xs text-muted-foreground mt-1">Users visiting your site for the first time (first-time visitors)</p>
                            <p className="text-xs text-muted-foreground mt-1">Returning users = Total Users - New Users</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {performanceData.map((item: any, index: number) => {
                  // Debug logging for first few platforms
                  if (index < 3) {
                    console.log('🔍 [LLMPlatformPerformance] Platform data:', {
                      name: item.name,
                      sessions: item.sessions,
                      share: item.share,
                      sqs: item.sessionQualityScore,
                      absoluteChange: item.absoluteChange,
                      shareChange: item.shareChange,
                      change: item.change,
                      trend: item.trend
                    })
                  }
                  
                  return (
                    <TableRow 
                      key={item.id} 
                      className="border-border/30 hover:bg-muted/20 transition-colors duration-200"
                    >
                      {/* LLM Platform */}
                      <TableCell className="sticky left-0 bg-background z-10 py-2 px-3">
                        <div className="flex items-center gap-2">
                          <img
                            src={getDynamicFaviconUrl(getLLMDomain(item.name), 64)}
                            alt={`${item.name} favicon`}
                            className="w-6 h-6 rounded-sm"
                            data-favicon-identifier={item.name}
                            data-favicon-size="64"
                            onError={(e) => {
                              handleFaviconError(e as any)
                              // Also apply custom fallback for visual consistency
                              const target = e.target as HTMLImageElement
                              if (!target.src.includes('fetchfavicon') && !target.src.includes('google.com')) {
                                target.style.display = 'none'
                                const fallback = document.createElement('div')
                                fallback.className = 'w-4 h-4 rounded-full'
                                fallback.style.backgroundColor = item.color
                                target.parentNode?.insertBefore(fallback, target)
                              }
                            }}
                          />
                          <span className="font-normal text-foreground text-xs">{item.name}</span>
                        </div>
                      </TableCell>

                      {/* Sessions */}
                      <TableCell className="text-center py-2 px-3">
                        <span className="font-normal text-foreground text-xs">
                          {item.sessions.toLocaleString()}
                        </span>
                      </TableCell>

                      {/* Share */}
                      <TableCell className="text-center py-2 px-3">
                        <span className="font-normal text-foreground text-xs">
                          {item.share.toFixed(2)}%
                        </span>
                      </TableCell>

                      {/* Session Quality Score */}
                      <TableCell className="text-center py-2 px-3">
                        <div className="flex items-center justify-center gap-2">
                          <span className="font-normal text-foreground text-xs">
                            {item.sessionQualityScore.toFixed(2)}
                          </span>
                          <div className={`w-2 h-2 rounded-full ${
                            item.sessionQualityScore >= 70 ? 'bg-green-500' :
                            item.sessionQualityScore >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                          }`} />
                        </div>
                      </TableCell>

                      {/* Engagement Score */}
                      <TableCell className="text-center py-2 px-3">
                        <span className="font-normal text-foreground text-xs">
                          {item.engagementScore.toFixed(2)}%
                        </span>
                      </TableCell>

                      {/* Conversion Rate */}
                      <TableCell className="text-center py-2 px-3">
                        <span className="font-normal text-foreground text-xs">
                          {item.conversionRate.toFixed(2)}%
                        </span>
                      </TableCell>

                      {/* Bounce Rate */}
                      <TableCell className="text-center py-2 px-3">
                        <span className="font-normal text-foreground text-xs">
                          {item.bounceRate.toFixed(2)}%
                        </span>
                      </TableCell>

                      {/* Avg Session Duration */}
                      <TableCell className="text-center py-2 px-3">
                        <span className="font-normal text-foreground text-xs">
                          {formatDuration(item.avgSessionDuration)}
                        </span>
                      </TableCell>

                      {/* Pages per Session */}
                      <TableCell className="text-center py-2 px-3">
                        <span className="font-normal text-foreground text-xs">
                          {item.pagesPerSession.toFixed(2)}
                        </span>
                      </TableCell>

                      {/* New Users */}
                      <TableCell className="text-center py-2 px-3">
                        <span className="font-normal text-foreground text-xs">
                          {item.newUsers.toLocaleString()}
                        </span>
                      </TableCell>

                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        </UnifiedCardContent>
      </UnifiedCard>
    </div>
  )
}

export { UnifiedLLMPlatformPerformanceSection }
