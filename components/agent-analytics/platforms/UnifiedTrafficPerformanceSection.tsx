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
import { getConversionEvents } from '@/services/ga4Api'
import { calculateEngagementScore, calculateSessionQualityScore } from '@/lib/analytics/trafficMetrics'

interface UnifiedTrafficPerformanceSectionProps {
  realPlatformData?: any
  dateRange?: string
  isLoading?: boolean
  selectedConversionEvent?: string
  onConversionEventChange?: (event: string) => void
}

function UnifiedTrafficPerformanceSection({ 
  realPlatformData, 
  dateRange = '30 days', 
  isLoading = false,
  selectedConversionEvent = 'conversions',
  onConversionEventChange
}: UnifiedTrafficPerformanceSectionProps) {
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
  // Use real traffic performance data from GA4
  console.log('🔍 UnifiedTrafficPerformanceSection received realPlatformData:', realPlatformData)
  const performanceDataRaw = realPlatformData?.data?.performanceData || []
  console.log('🔍 Performance data structure:', performanceDataRaw)
  console.log('🔍 Performance data length:', performanceDataRaw.length)
  console.log('🔍 First platform performance data:', performanceDataRaw[0])
  console.log('🔍 All platform names:', performanceDataRaw.map(p => p.name))
  
  // Transform real GA4 performance data into component format
  const performanceData = performanceDataRaw.map((platform: any, index: number) => ({
    id: index,
    name: platform.name,
    sessions: platform.sessions || 0,
    share: platform.percentage || 0,
    sessionChange: platform.sessionChange || 0, // Session percentage change
    shareChange: platform.shareChange || 0, // Share percentage change
    absoluteChange: platform.absoluteChange || 0, // Absolute change in sessions
    trend: platform.trend || 'neutral', // Trend based on share change
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
    color: getPlatformColor(platform.name)
  }))
  
  console.log('🔍 Final transformed performance data:', performanceData)
  console.log('🔍 Performance data count:', performanceData.length)

  // Use backend totalSessions, with fallback to calculated total
  const totalSessions = realPlatformData?.data?.totalSessions || 
    performanceData.reduce((sum: number, item: any) => sum + item.sessions, 0)
  
  // Validate sessions add up
  const calculatedTotal = performanceData.reduce((sum: number, item: any) => sum + item.sessions, 0)
  if (Math.abs(calculatedTotal - totalSessions) > 1) {
    console.warn('⚠️ [TrafficPerformance] Sessions mismatch:', {
      calculatedTotal,
      backendTotal: totalSessions,
      difference: Math.abs(calculatedTotal - totalSessions)
    })
  }
  
  // Validate shares add up to 100%
  const totalShare = performanceData.reduce((sum: number, item: any) => sum + item.share, 0)
  if (Math.abs(totalShare - 100) > 0.1) {
    console.warn('⚠️ [TrafficPerformance] Shares don\'t add up to 100%:', {
      totalShare: totalShare.toFixed(2),
      difference: Math.abs(totalShare - 100).toFixed(2)
    })
  }
  
  // Calculate and validate Avg Session Quality
  const totalSessionsForAvg = performanceData.reduce((sum: number, item: any) => sum + item.sessions, 0)
  const weightedSQS = performanceData.reduce((sum: number, item: any) => 
    sum + (item.sessionQualityScore * item.sessions), 0)
  const calculatedAvgSQS = totalSessionsForAvg > 0 ? (weightedSQS / totalSessionsForAvg) : 0
  
  // Log validation for debugging
  console.log('🔍 [TrafficPerformance] SQS Validation:', {
    platformSQS: performanceData.map(p => ({
      name: p.name,
      sessions: p.sessions,
      sqs: p.sessionQualityScore.toFixed(2),
      weightedSQS: (p.sessionQualityScore * p.sessions).toFixed(2)
    })),
    totalSessions: totalSessionsForAvg,
    sumWeightedSQS: weightedSQS.toFixed(2),
    calculatedAvgSQS: calculatedAvgSQS.toFixed(2),
    displayedAvgSQS: (totalSessionsForAvg > 0 ? (weightedSQS / totalSessionsForAvg).toFixed(2) : '0.00')
  })

  function getPlatformColor(platformName: string): string {
    const colors: Record<string, string> = {
      'Organic': '#10b981',
      'Direct': '#3b82f6',
      'Referral': '#8b5cf6',
      'LLMs': '#6b7280',
      'Social': '#f59e0b',
      'Email': '#ef4444',
      'Paid': '#ec4899',
      'Other': '#64748b'
    }
    return colors[platformName] || '#64748b'
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
              <h2 className="text-xl font-semibold leading-none tracking-tight text-foreground">Traffic Performance</h2>
              <p className="text-sm text-muted-foreground">Comprehensive performance metrics for all traffic sources</p>
            </div>
            
            <div className="flex items-center justify-center h-64">
              <div className="text-center space-y-2">
                <p className="text-muted-foreground">No traffic performance data available. Please connect your Google Analytics account and sync data.</p>
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
              <h2 className="text-xl font-semibold leading-none tracking-tight text-foreground">Traffic Performance</h2>
              <p className="text-sm text-muted-foreground">Comprehensive performance metrics for all traffic sources</p>
            </div>
            
            {/* Summary Stats and Conversion Event Selector */}
            <div className="flex items-center gap-6 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Total Sessions:</span>
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
                        By default, metrics show overall "conversions". Select a specific conversion event (like "purchases" or "sign_up") to see metrics filtered by that specific event. This helps you identify which traffic sources drive specific actions.
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
                    Traffic Source
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
                            <p className="text-sm">Total number of sessions from this traffic source</p>
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
                            <p className="text-sm">Percentage share of total sessions from this traffic source</p>
                            <p className="text-xs text-muted-foreground mt-1">Calculated as: (Platform Sessions / Total Sessions) × 100%</p>
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
                                Higher scores indicate better-performing traffic sources
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
                            <p className="text-sm">Number of new users from this traffic source</p>
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
                  return (
                    <TableRow 
                      key={item.id} 
                      className="border-border/30 hover:bg-muted/20 transition-colors duration-200"
                    >
                      {/* Traffic Source */}
                      <TableCell className="sticky left-0 bg-background z-10 py-2 px-3">
                        <span className="font-normal text-foreground text-xs">{item.name}</span>
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

export { UnifiedTrafficPerformanceSection }
