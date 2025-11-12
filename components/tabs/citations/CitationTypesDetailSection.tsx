'use client'

import { UnifiedCard, UnifiedCardContent } from '@/components/ui/unified-card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Calendar as CalendarIcon, ExternalLink, ChevronRight, Sparkles, Check } from 'lucide-react'
import { useState } from 'react'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { getDynamicFaviconUrl, handleFaviconError } from '../../../lib/faviconUtils'
import { useSkeletonLoading } from '@/components/ui/with-skeleton-loading'
import { SkeletonWrapper } from '@/components/ui/skeleton-wrapper'
import { UnifiedCardSkeleton } from '@/components/ui/unified-card-skeleton'
import apiService from '@/services/api'

interface CitationTypesDetailSectionProps {
  filterContext?: {
    selectedTopics: string[]
    selectedPersonas: string[]
    selectedPlatforms: string[]
  }
  dashboardData?: any
}


// Transform dashboard data to detailed citation types format
const getDetailedCitationData = (dashboardData: any) => {
  if (!dashboardData?.metrics?.competitorsByCitation || dashboardData.metrics.competitorsByCitation.length === 0) {
    console.log('⚠️ [CitationTypesDetailSection] No citation data available')
    return { brand: [], earned: [], social: [] }
  }

  console.log('✅ [CitationTypesDetailSection] Using real citation data:', dashboardData.metrics.competitorsByCitation)

  const competitors = dashboardData.metrics.competitorsByCitation
  const brandData: any[] = []
  const earnedData: any[] = []
  const socialData: any[] = []

  // Get platform-specific data from aggregated metrics
  const platformData = dashboardData.metrics?.platformMetrics || []
  
  competitors.forEach((competitor: any, index: number) => {
    const brandCitations = competitor.brandCitationsTotal || 0
    const earnedCitations = competitor.earnedCitationsTotal || 0
    const socialCitations = competitor.socialCitationsTotal || 0

    // Brand citations data
    if (brandCitations > 0) {
      const brandPlatforms = []
      const brandShares = []
      const brandRanks = []

      // ✅ Fix: Handle the raw platform data structure from database
      // Platform data now comes as raw database documents with scopeValue and brandMetrics
      platformData.forEach((platformDoc: any) => {
        const platformName = platformDoc.scopeValue
        
        // Get platform-specific citation data
        if (platformDoc.brandMetrics && platformDoc.brandMetrics.length > 0) {
          const brandMetric = platformDoc.brandMetrics.find((bm: any) => bm.brandName === competitor.name)
          if (brandMetric && brandMetric.brandCitationsTotal > 0) {
            brandPlatforms.push(platformName)
            brandShares.push({
              platform: platformName,
              percentage: Math.round((brandMetric.brandCitationsTotal / brandCitations) * 100 * 10) / 10
            })
            brandRanks.push({
              platform: platformName,
              rank: brandMetric.citationShareRank || 1
            })
          }
        }
      })

      brandData.push({
        name: competitor.name,
        type: 'Website',
        platforms: brandPlatforms,
        citationShares: brandShares,
        citationRanks: brandRanks,
        totalCitations: brandCitations,
        isOwner: competitor.isOwner || false, // ✅ Use isOwner from backend data, not index
        favicon: getDynamicFaviconUrl((competitor as any).url ? { url: (competitor as any).url, name: competitor.name } : competitor.name, 16)
      })
    }

    // Earned citations data with platform-specific breakdown
    if (earnedCitations > 0) {
      const earnedPlatforms = []
      const earnedShares = []
      const earnedRanks = []

      // Process platform-specific earned citation data
      platformData.forEach((platformDoc: any) => {
        const platformName = platformDoc.scopeValue
        
        if (platformDoc.brandMetrics && platformDoc.brandMetrics.length > 0) {
          const brandMetric = platformDoc.brandMetrics.find((bm: any) => bm.brandName === competitor.name)
          if (brandMetric && brandMetric.earnedCitationsTotal > 0) {
            earnedPlatforms.push(platformName)
            earnedShares.push({
              platform: platformName,
              percentage: Math.round((brandMetric.earnedCitationsTotal / earnedCitations) * 100 * 10) / 10
            })
            earnedRanks.push({
              platform: platformName,
              rank: brandMetric.citationShareRank || 1
            })
          }
        }
      })

      earnedData.push({
        name: competitor.name,
        type: 'Blog',
        platforms: earnedPlatforms,
        citationShares: earnedShares,
        citationRanks: earnedRanks,
        totalCitations: earnedCitations,
        isOwner: competitor.isOwner || false, // ✅ Use isOwner from backend data, not index
        favicon: getDynamicFaviconUrl(competitor.name)
      })
    }

    // Social citations data with platform-specific breakdown
    if (socialCitations > 0) {
      const socialPlatforms = []
      const socialShares = []
      const socialRanks = []

      // Process platform-specific social citation data
      platformData.forEach((platformDoc: any) => {
        const platformName = platformDoc.scopeValue
        
        if (platformDoc.brandMetrics && platformDoc.brandMetrics.length > 0) {
          const brandMetric = platformDoc.brandMetrics.find((bm: any) => bm.brandName === competitor.name)
          if (brandMetric && brandMetric.socialCitationsTotal > 0) {
            socialPlatforms.push(platformName)
            socialShares.push({
              platform: platformName,
              percentage: Math.round((brandMetric.socialCitationsTotal / socialCitations) * 100 * 10) / 10
            })
            socialRanks.push({
              platform: platformName,
              rank: brandMetric.citationShareRank || 1
            })
          }
        }
      })

      socialData.push({
        name: competitor.name,
        type: 'Social',
        platforms: socialPlatforms,
        citationShares: socialShares,
        citationRanks: socialRanks,
        totalCitations: socialCitations,
        isOwner: competitor.isOwner || false, // ✅ Use isOwner from backend data, not index
        favicon: getDynamicFaviconUrl(competitor.name)
      })
    }
  })

  return { brand: brandData, earned: earnedData, social: socialData }
}

export function CitationTypesDetailSection({ filterContext, dashboardData }: CitationTypesDetailSectionProps) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date())
  const [expandedSections, setExpandedSections] = useState<{ [key: string]: boolean }>({
    brand: true,
    earned: false,
    social: false
  })
  const [isSheetOpen, setIsSheetOpen] = useState(false)
  const [selectedCitation, setSelectedCitation] = useState<any>(null)
  
  // Subjective Metrics state
  const [subjectiveMetrics, setSubjectiveMetrics] = useState<{ [promptId: string]: any }>({})
  const [loadingMetrics] = useState<{ [promptId: string]: boolean }>({})
  const [generatingMetrics, setGeneratingMetrics] = useState<{ [promptId: string]: boolean }>({})
  const [metricsError, setMetricsError] = useState<{ [promptId: string]: string | null }>({})
  const [availablePromptIds, setAvailablePromptIds] = useState<string[]>([])
  const [loadingPromptIds, setLoadingPromptIds] = useState(false)

  // Platform favicon mapping - matching onboarding llm-platforms page exactly
  const getPlatformFavicon = (platform: string) => {
    const faviconMap: { [key: string]: string } = {
      'openai': 'https://chat.openai.com/favicon.ico',
      'claude': 'https://www.google.com/s2/favicons?domain=claude.ai&sz=32',
      'perplexity': 'https://www.google.com/s2/favicons?domain=perplexity.ai&sz=32',
      'gemini': 'https://www.gstatic.com/lamda/images/gemini_sparkle_v002_d4735304ff6292a690345.svg',
      // Also support capitalized versions for consistency
      'OpenAI': 'https://chat.openai.com/favicon.ico',
      'Claude': 'https://www.google.com/s2/favicons?domain=claude.ai&sz=32',
      'Perplexity': 'https://www.google.com/s2/favicons?domain=perplexity.ai&sz=32',
      'Gemini': 'https://www.gstatic.com/lamda/images/gemini_sparkle_v002_d4735304ff6292a690345.svg',
      'ChatGPT': 'https://chat.openai.com/favicon.ico'
    };
    return faviconMap[platform] || `https://www.google.com/s2/favicons?domain=${platform.toLowerCase()}.com&sz=16`;
  };

  // Platform name mapping - convert database values to display names
  const getPlatformDisplayName = (platform: string) => {
    const nameMap: { [key: string]: string } = {
      'openai': 'ChatGPT',
      'claude': 'Claude',
      'perplexity': 'Perplexity',
      'gemini': 'Gemini'
    };
    return nameMap[platform] || platform;
  };

  // Skeleton loading
  const { showSkeleton, isVisible } = useSkeletonLoading(filterContext)

  // Get detailed citation data
  const citationData = getDetailedCitationData(dashboardData)

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
    })
  }

  const getDateLabel = () => {
    if (!selectedDate) return 'Select Date'
    return formatDate(selectedDate)
  }

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }))
  }

  // Get brand name from dashboard data
  const getBrandName = () => {
    if (dashboardData?.urlAnalysis?.brandContext?.companyName) {
      return dashboardData.urlAnalysis.brandContext.companyName
    }
    if (dashboardData?.metrics?.competitorsByCitation?.length > 0) {
      return dashboardData.metrics.competitorsByCitation[0].name
    }
    return 'Unknown Brand'
  }

  const toggleCitationDetails = async (brandName: string, type: string) => {
    // Fetch real citation details from the API
    try {
      console.log(`📊 [CITATION DETAILS] Fetching real citations for ${brandName} - ${type}`)
      
      const result = await apiService.getCitationDetails(brandName, type)
      
      if (result.success) {
        console.log(`✅ [CITATION DETAILS] Found ${result.data.details.length} real citations`)
        setSelectedCitation({
          brandName,
          type,
          details: result.data.details
        })
        setIsSheetOpen(true)
        
        // Reset subjective metrics when opening new citation details
        setSubjectiveMetrics({})
        setMetricsError({})
        setAvailablePromptIds([])
        
        // Load prompt IDs for this citation
        loadPromptIdsForCitation(result.data.details, brandName)
      } else {
        console.error('❌ [CITATION DETAILS] Failed to fetch:', result.message)
        // Fallback to empty state
        setSelectedCitation({
          brandName,
          type,
          details: []
        })
        setIsSheetOpen(true)
      }
    } catch (error) {
      console.error('❌ [CITATION DETAILS] Error fetching real citations:', error)
      // Fallback to empty state
      setSelectedCitation({
        brandName,
        type,
        details: []
      })
      setIsSheetOpen(true)
    }
  }


  // Generate subjective metrics for a prompt
  const generateSubjectiveMetrics = async (promptId: string) => {
    if (!promptId) {
      console.error('❌ [SUBJECTIVE METRICS] No prompt ID available')
      return
    }

    try {
      setGeneratingMetrics(prev => ({ ...prev, [promptId]: true }))
      setMetricsError(prev => ({ ...prev, [promptId]: null }))
      
      const brandName = getBrandName()
      console.log(`🚀 [SUBJECTIVE METRICS] Generating metrics for prompt: ${promptId}`)
      console.log(`📊 [SUBJECTIVE METRICS] Brand name extracted: "${brandName}"`)
      
      const response = await apiService.evaluateSubjectiveMetrics(promptId, brandName)
      
      if (response.success && response.data) {
        console.log(`✅ [SUBJECTIVE METRICS] Generated metrics:`, response.data)
        
        const generatedMetrics = response.data.metrics || response.data
        setSubjectiveMetrics(prev => ({ ...prev, [promptId]: generatedMetrics }))
      } else {
        throw new Error(response.message || 'Failed to generate metrics')
      }
    } catch (error: any) {
      console.error('❌ [SUBJECTIVE METRICS] Error generating metrics:', error)
      
      const errorMessage = error.message || ''
      if (errorMessage.includes('not found in any platform responses')) {
        setMetricsError(prev => ({ ...prev, [promptId]: `Brand "${getBrandName()}" not found in the LLM responses.` }))
      } else {
        setMetricsError(prev => ({ ...prev, [promptId]: errorMessage || 'Failed to generate metrics' }))
      }
    } finally {
      setGeneratingMetrics(prev => ({ ...prev, [promptId]: false }))
    }
  }

  // Load prompt IDs for citation details using citation URLs
  const loadPromptIdsForCitation = async (citationDetails: any[], brandName: string) => {
    if (!citationDetails || citationDetails.length === 0) {
      setAvailablePromptIds([])
      setLoadingPromptIds(false)
      return
    }
    
    setLoadingPromptIds(true)
    
    try {
      // First, try to extract promptIds directly from citation data
      const promptIdsFromData = new Set<string>()
      citationDetails.forEach((citationGroup: any) => {
        if (citationGroup.prompts && Array.isArray(citationGroup.prompts)) {
          citationGroup.prompts.forEach((prompt: any) => {
            if (prompt.promptId) {
              promptIdsFromData.add(prompt.promptId.toString())
            }
          })
        }
      })
      
      // If we found promptIds in the data, use them
      if (promptIdsFromData.size > 0) {
        const uniquePromptIds = Array.from(promptIdsFromData)
        setAvailablePromptIds(uniquePromptIds)
        setLoadingPromptIds(false)
        console.log(`✅ [CITATION METRICS] Found ${uniquePromptIds.length} prompt IDs from citation data`)
        return
      }
      
      // Otherwise, find promptIds by citation URLs
      console.log(`🔍 [CITATION METRICS] No promptIds in citation data, searching by URLs...`)
      const citationUrls = citationDetails.map((cg: any) => cg.url).filter(Boolean)
      
      if (citationUrls.length === 0) {
        console.warn('⚠️ [CITATION METRICS] No URLs found in citation data')
        setAvailablePromptIds([])
        setLoadingPromptIds(false)
        return
      }
      
      // Call API to find promptIds by URLs
      const result = await apiService.getPromptIdsForCitations(citationUrls, brandName)
      
      if (result.success && result.data && result.data.promptIds) {
        const uniquePromptIds = result.data.promptIds
        setAvailablePromptIds(uniquePromptIds)
        console.log(`✅ [CITATION METRICS] Found ${uniquePromptIds.length} prompt IDs via URL search`)
      } else {
        console.warn('⚠️ [CITATION METRICS] No prompt IDs found via URL search')
        setAvailablePromptIds([])
      }
    } catch (error) {
      console.error('❌ [CITATION METRICS] Error loading prompt IDs:', error)
      setAvailablePromptIds([])
    } finally {
      setLoadingPromptIds(false)
    }
  }

  // Mock data generation function removed - now using real data from API

  // Mock URL generation function removed - now using real URLs from database

  // Mock context generation function removed - now using real contexts from database


  const renderCitationRow = (item: any, index: number) => (
    <TableRow key={`${item.name}-${index}`} className="border-border/60 hover:bg-muted/30 transition-colors">
      <TableCell className="py-3 px-3 text-left">
        <div className="flex items-center gap-3">
          <img 
            src={item.favicon} 
            alt={item.name}
            className="w-4 h-4 rounded-sm"
            onError={handleFaviconError}
          />
          <div className="flex items-center gap-2">
            <span className="font-medium text-foreground">{item.name}</span>
            <span className="text-xs text-muted-foreground bg-muted/50 px-2 py-0.5 rounded">
              {item.type}
            </span>
          </div>
        </div>
      </TableCell>
      
      <TableCell className="py-3 px-3 text-center">
        <TooltipProvider>
          <div className="flex items-center justify-center gap-2">
            {item.platforms.map((platform: string, idx: number) => (
              <Tooltip key={idx}>
                <TooltipTrigger asChild>
                  <img 
                    src={getPlatformFavicon(platform)} 
                    alt={getPlatformDisplayName(platform)}
                    className="w-4 h-4"
                    onError={handleFaviconError}
                  />
                </TooltipTrigger>
                <TooltipContent>
                  <p>{getPlatformDisplayName(platform)}</p>
                </TooltipContent>
              </Tooltip>
            ))}
            {item.platforms.length === 0 && (
              <span className="text-muted-foreground">-</span>
            )}
          </div>
        </TooltipProvider>
      </TableCell>
      
      <TableCell className="py-3 px-3 text-center">
        <div className="flex items-center justify-center gap-3">
          {item.citationShares.map((share: any, idx: number) => (
            <div key={idx} className="flex items-center gap-1">
              <img 
                src={getPlatformFavicon(share.platform)} 
                alt={getPlatformDisplayName(share.platform)}
                className="w-4 h-4"
                onError={handleFaviconError}
              />
              <span className="text-xs font-medium">{share.percentage}%</span>
            </div>
          ))}
          {item.citationShares.length === 0 && (
            <span className="text-muted-foreground">-</span>
          )}
        </div>
      </TableCell>
      
      <TableCell className="py-3 px-3 text-center">
        <div className="flex items-center justify-center gap-3">
          {item.citationRanks.map((rank: any, idx: number) => (
            <div key={idx} className="flex items-center gap-1">
              <img 
                src={getPlatformFavicon(rank.platform)} 
                alt={getPlatformDisplayName(rank.platform)}
                className="w-4 h-4"
                onError={handleFaviconError}
              />
              <span className="text-xs font-medium">#{rank.rank}</span>
            </div>
          ))}
          {item.citationRanks.length === 0 && (
            <span className="text-muted-foreground">-</span>
          )}
        </div>
      </TableCell>
      
      <TableCell className="py-3 px-3 text-center">
        <Button 
          variant="ghost" 
          size="sm" 
          className="h-6 px-2 text-xs text-[#2563EB] hover:text-[#2563EB] hover:bg-[#2563EB]/10"
          onClick={() => toggleCitationDetails(item.name, item.type)}
        >
          View
          <ExternalLink className="w-3 h-3 ml-1" />
        </Button>
      </TableCell>
    </TableRow>
  )


  if (showSkeleton) {
    return (
      <SkeletonWrapper show={showSkeleton} isVisible={isVisible} skeleton={<UnifiedCardSkeleton type="table" tableColumns={5} />}>
        <UnifiedCardSkeleton type="table" tableColumns={5} />
      </SkeletonWrapper>
    )
  }

  return (
    <>
    <UnifiedCard className="h-full">
      <UnifiedCardContent className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-semibold text-foreground">All Citation Types</h2>
            <Badge variant="secondary" className="text-xs">
              3 citation types
            </Badge>
          </div>
          
          <div className="flex items-center gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 px-3">
                  <CalendarIcon className="w-4 h-4 mr-2" />
                  {getDateLabel()}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  className="rounded-md border"
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {/* Table */}
        <div className="rounded-lg border border-border/60 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead className="py-3 px-3 font-semibold text-left">Citation Type</TableHead>
                <TableHead className="py-3 px-3 font-semibold text-center">Platform(s)</TableHead>
                <TableHead className="py-3 px-3 font-semibold text-center">Citation Share</TableHead>
                <TableHead className="py-3 px-3 font-semibold text-center">Citation Rank</TableHead>
                <TableHead className="py-3 px-3 font-semibold text-center">Subjective Impression</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {/* Brand Section */}
              <TableRow className="border-b-2 border-border/60">
                <TableCell colSpan={5} className="p-0">
                  <Button
                    variant="ghost"
                    className="w-full justify-start p-3 h-auto font-semibold hover:bg-muted/50"
                    onClick={() => toggleSection('brand')}
                  >
                    <span className="flex items-center gap-2">
                      <ChevronRight className={`w-4 h-4 transition-transform ${expandedSections.brand ? 'rotate-90' : ''}`} />
                      Brand
                    </span>
                  </Button>
                </TableCell>
              </TableRow>
              
              {expandedSections.brand && citationData.brand.map((item, index) => renderCitationRow(item, index))}
              {expandedSections.brand && citationData.brand.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                    No brand citations found
                  </TableCell>
                </TableRow>
              )}

              {/* Earned Section */}
              <TableRow className="border-b-2 border-border/60">
                <TableCell colSpan={5} className="p-0">
                  <Button
                    variant="ghost"
                    className="w-full justify-start p-3 h-auto font-semibold hover:bg-muted/50"
                    onClick={() => toggleSection('earned')}
                  >
                    <span className="flex items-center gap-2">
                      <ChevronRight className={`w-4 h-4 transition-transform ${expandedSections.earned ? 'rotate-90' : ''}`} />
                      Earned
                    </span>
                  </Button>
                </TableCell>
              </TableRow>
              
              {expandedSections.earned && citationData.earned.map((item, index) => renderCitationRow(item, index))}
              {expandedSections.earned && citationData.earned.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                    No earned citations found
                  </TableCell>
                </TableRow>
              )}

              {/* Social Section */}
              <TableRow>
                <TableCell colSpan={5} className="p-0">
                  <Button
                    variant="ghost"
                    className="w-full justify-start p-3 h-auto font-semibold hover:bg-muted/50"
                    onClick={() => toggleSection('social')}
                  >
                    <span className="flex items-center gap-2">
                      <ChevronRight className={`w-4 h-4 transition-transform ${expandedSections.social ? 'rotate-90' : ''}`} />
                      Social
                    </span>
                  </Button>
                </TableCell>
              </TableRow>
              
              {expandedSections.social && citationData.social.map((item, index) => renderCitationRow(item, index))}
              {expandedSections.social && citationData.social.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                    No social citations found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </UnifiedCardContent>
    </UnifiedCard>

    {/* Citation Details Sheet */}
    <Sheet open={isSheetOpen} onOpenChange={(open) => {
      setIsSheetOpen(open)
      if (!open) {
        // Reset state when modal is closed
        setSelectedCitation(null)
        setSubjectiveMetrics({})
        setMetricsError({})
        setAvailablePromptIds([])
      }
    }}>
      <SheetContent className="!w-[80vw] sm:!w-[75vw] lg:!w-[70vw] !max-w-none overflow-y-auto">
        <SheetHeader>
          <div className="flex justify-between items-center">
            <div>
              <SheetTitle className="flex items-center gap-2">
                <ExternalLink className="w-5 h-5" />
                Citation Details
              </SheetTitle>
              <SheetDescription>
                Detailed citations for: <span className="font-semibold">{selectedCitation?.brandName}</span>
                {selectedCitation?.type && (
                  <Badge variant="outline" className="ml-2 text-xs">
                    {selectedCitation.type}
                  </Badge>
                )}
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        {selectedCitation && (() => {
          console.log('🔍 [DEBUG] Citation data structure:', selectedCitation);
          return (
          <div className="mt-4 space-y-3">
            {/* Citation overview - more compact */}
            <div className="p-3 bg-muted/50 rounded-lg">
              <h4 className="font-semibold text-sm mb-1">Citation Overview</h4>
              <p className="text-xs text-muted-foreground">
                {selectedCitation.details.length} citation{selectedCitation.details.length !== 1 ? 's' : ''} found across {new Set(selectedCitation.details.flatMap((d: any) => d.platforms || [])).size} platform{new Set(selectedCitation.details.flatMap((d: any) => d.platforms || [])).size !== 1 ? 's' : ''}
              </p>
            </div>

            {/* Citations list - grouped by URL */}
            <div className="space-y-3">
              <h4 className="font-semibold text-sm">Citations by URL</h4>
              {selectedCitation.details.map((citationGroup: any) => (
                <div key={citationGroup.url} className="p-3 bg-background/50 rounded-lg border border-border/40 hover:bg-background/80 transition-colors">
                  {/* URL and platforms in one compact header */}
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <a 
                        href={citationGroup.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 hover:underline truncate"
                        onClick={(e) => {
                          e.preventDefault()
                          window.open(citationGroup.url, '_blank')
                        }}
                      >
                        <span className="truncate">{citationGroup.url}</span>
                      </a>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {citationGroup.platforms && Array.isArray(citationGroup.platforms) ? 
                        citationGroup.platforms.map((platform: string, idx: number) => (
                          <div key={idx} className="flex items-center gap-1">
                            <img 
                              src={getPlatformFavicon(platform)} 
                              alt={getPlatformDisplayName(platform)}
                              className="w-3 h-3"
                              onError={handleFaviconError}
                            />
                            <span className="text-xs">{getPlatformDisplayName(platform)}</span>
                          </div>
                        )) : (
                          <span className="text-xs text-muted-foreground">Unknown</span>
                        )
                      }
                    </div>
                  </div>
                  
                  {/* Prompts - compact list */}
                  <div className="space-y-2">
                    {citationGroup.prompts && Array.isArray(citationGroup.prompts) ? 
                      citationGroup.prompts.map((prompt: any, promptIndex: number) => (
                      <div key={promptIndex} className="text-sm leading-relaxed pl-2 border-l-2 border-border/30">
                        {prompt.promptText}
                      </div>
                    )) : (
                      <div className="text-xs text-muted-foreground">No prompts found</div>
                    )}
                  </div>
                </div>
              ))}
              {selectedCitation.details.length === 0 && (
                <div className="text-center py-6 text-muted-foreground text-sm">
                  No citation details available
                </div>
              )}
            </div>

            {/* Subjective Impression Analysis Section */}
            <div className="mt-8 pt-6 border-t border-border/60">
              <div className="space-y-4">
                {/* Header */}
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-semibold text-sm">Subjective Impression Analysis</h4>
                    <p className="text-xs text-muted-foreground">
                      AI-powered analysis of how {getBrandName()} is cited across platforms
                    </p>
                  </div>
                </div>

                {/* Show loading state while fetching prompt IDs */}
                {loadingPromptIds ? (
                  <div className="text-center py-6 text-muted-foreground text-sm">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto mb-2"></div>
                    Loading prompt data for subjective metrics...
                  </div>
                ) : availablePromptIds.length === 0 ? (
                  <div className="text-center py-6 text-muted-foreground text-sm">
                    No prompts found in citations. Subjective metrics require prompts with LLM responses.
                  </div>
                ) : (
                  (() => {
                    const uniquePromptIds = availablePromptIds

                  return (
                    <div className="space-y-4">
                      {/* Metrics Grid - Show for all prompts */}
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {/* Relevance Card */}
                        <div className="bg-card border rounded-lg p-3 hover:bg-muted/50 transition-colors">
                          <div className="flex items-center justify-between mb-2">
                            <h5 className="font-medium text-sm">Relevance</h5>
                            <span className="text-lg font-bold text-primary">
                              {(() => {
                                const scores = uniquePromptIds
                                  .map(id => subjectiveMetrics[id]?.relevance?.score)
                                  .filter(s => s !== undefined && s !== null)
                                if (scores.length === 0) return '0/5'
                                const avg = scores.reduce((a, b) => a + b, 0) / scores.length
                                return `${avg.toFixed(1)}/5`
                              })()}
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
                              {(() => {
                                const allReasonings = uniquePromptIds
                                  .map(id => subjectiveMetrics[id]?.relevance?.reasoning)
                                  .filter(r => r && r.trim())
                                
                                if (allReasonings.length === 0) {
                                  return <div>No analysis available. Click "Generate" to analyze.</div>
                                }
                                
                                // Return the first available reasoning (consolidated view)
                                return <div>{allReasonings[0]}</div>
                              })()}
                            </div>
                          </details>
                        </div>

                        {/* Influence Card */}
                        <div className="bg-card border rounded-lg p-3 hover:bg-muted/50 transition-colors">
                          <div className="flex items-center justify-between mb-2">
                            <h5 className="font-medium text-sm">Influence</h5>
                            <span className="text-lg font-bold text-primary">
                              {(() => {
                                const scores = uniquePromptIds
                                  .map(id => subjectiveMetrics[id]?.influence?.score)
                                  .filter(s => s !== undefined && s !== null)
                                if (scores.length === 0) return '0/5'
                                const avg = scores.reduce((a, b) => a + b, 0) / scores.length
                                return `${avg.toFixed(1)}/5`
                              })()}
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
                              {(() => {
                                const allReasonings = uniquePromptIds
                                  .map(id => subjectiveMetrics[id]?.influence?.reasoning)
                                  .filter(r => r && r.trim())
                                
                                if (allReasonings.length === 0) {
                                  return <div>No analysis available. Click "Generate" to analyze.</div>
                                }
                                
                                // Return the first available reasoning (consolidated view)
                                return <div>{allReasonings[0]}</div>
                              })()}
                            </div>
                          </details>
                        </div>

                        {/* Uniqueness Card */}
                        <div className="bg-card border rounded-lg p-3 hover:bg-muted/50 transition-colors">
                          <div className="flex items-center justify-between mb-2">
                            <h5 className="font-medium text-sm">Uniqueness</h5>
                            <span className="text-lg font-bold text-primary">
                              {(() => {
                                const scores = uniquePromptIds
                                  .map(id => subjectiveMetrics[id]?.uniqueness?.score)
                                  .filter(s => s !== undefined && s !== null)
                                if (scores.length === 0) return '0/5'
                                const avg = scores.reduce((a, b) => a + b, 0) / scores.length
                                return `${avg.toFixed(1)}/5`
                              })()}
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
                              {(() => {
                                const allReasonings = uniquePromptIds
                                  .map(id => subjectiveMetrics[id]?.uniqueness?.reasoning)
                                  .filter(r => r && r.trim())
                                
                                if (allReasonings.length === 0) {
                                  return <div>No analysis available. Click "Generate" to analyze.</div>
                                }
                                
                                // Return the first available reasoning (consolidated view)
                                return <div>{allReasonings[0]}</div>
                              })()}
                            </div>
                          </details>
                        </div>

                        {/* Position Card */}
                        <div className="bg-card border rounded-lg p-3 hover:bg-muted/50 transition-colors">
                          <div className="flex items-center justify-between mb-2">
                            <h5 className="font-medium text-sm">Position</h5>
                            <span className="text-lg font-bold text-primary">
                              {(() => {
                                const scores = uniquePromptIds
                                  .map(id => subjectiveMetrics[id]?.position?.score)
                                  .filter(s => s !== undefined && s !== null)
                                if (scores.length === 0) return '0/5'
                                const avg = scores.reduce((a, b) => a + b, 0) / scores.length
                                return `${avg.toFixed(1)}/5`
                              })()}
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
                              {(() => {
                                const allReasonings = uniquePromptIds
                                  .map(id => subjectiveMetrics[id]?.position?.reasoning)
                                  .filter(r => r && r.trim())
                                
                                if (allReasonings.length === 0) {
                                  return <div>No analysis available. Click "Generate" to analyze.</div>
                                }
                                
                                // Return the first available reasoning (consolidated view)
                                return <div>{allReasonings[0]}</div>
                              })()}
                            </div>
                          </details>
                        </div>

                        {/* Click Probability Card */}
                        <div className="bg-card border rounded-lg p-3 hover:bg-muted/50 transition-colors">
                          <div className="flex items-center justify-between mb-2">
                            <h5 className="font-medium text-sm">Click Probability</h5>
                            <span className="text-lg font-bold text-primary">
                              {(() => {
                                const scores = uniquePromptIds
                                  .map(id => subjectiveMetrics[id]?.clickProbability?.score)
                                  .filter(s => s !== undefined && s !== null)
                                if (scores.length === 0) return '0/5'
                                const avg = scores.reduce((a, b) => a + b, 0) / scores.length
                                return `${avg.toFixed(1)}/5`
                              })()}
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
                              {(() => {
                                const allReasonings = uniquePromptIds
                                  .map(id => subjectiveMetrics[id]?.clickProbability?.reasoning)
                                  .filter(r => r && r.trim())
                                
                                if (allReasonings.length === 0) {
                                  return <div>No analysis available. Click "Generate" to analyze.</div>
                                }
                                
                                // Return the first available reasoning (consolidated view)
                                return <div>{allReasonings[0]}</div>
                              })()}
                            </div>
                          </details>
                        </div>

                        {/* Diversity Card */}
                        <div className="bg-card border rounded-lg p-3 hover:bg-muted/50 transition-colors">
                          <div className="flex items-center justify-between mb-2">
                            <h5 className="font-medium text-sm">Diversity</h5>
                            <span className="text-lg font-bold text-primary">
                              {(() => {
                                const scores = uniquePromptIds
                                  .map(id => subjectiveMetrics[id]?.diversity?.score)
                                  .filter(s => s !== undefined && s !== null)
                                if (scores.length === 0) return '0/5'
                                const avg = scores.reduce((a, b) => a + b, 0) / scores.length
                                return `${avg.toFixed(1)}/5`
                              })()}
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
                              {(() => {
                                const allReasonings = uniquePromptIds
                                  .map(id => subjectiveMetrics[id]?.diversity?.reasoning)
                                  .filter(r => r && r.trim())
                                
                                if (allReasonings.length === 0) {
                                  return <div>No analysis available. Click "Generate" to analyze.</div>
                                }
                                
                                // Return the first available reasoning (consolidated view)
                                return <div>{allReasonings[0]}</div>
                              })()}
                            </div>
                          </details>
                        </div>
                      </div>

                      {/* Generate Button - Generate for all prompts */}
                      <div className="flex items-center justify-between pt-2">
                        <div className="flex items-center gap-2">
                          {uniquePromptIds.some(id => subjectiveMetrics[id]) ? (
                            <div className="flex items-center gap-1 text-green-600 text-xs">
                              <Check className="w-3 h-3" />
                              <span>Metrics generated for {uniquePromptIds.filter(id => subjectiveMetrics[id]).length} of {uniquePromptIds.length} prompts</span>
                            </div>
                          ) : (
                            <div className="text-xs text-muted-foreground">
                              Click "Generate" to analyze {getBrandName()} citations across all prompts
                            </div>
                          )}
                        </div>
                        <Button
                          onClick={() => {
                            uniquePromptIds.forEach(promptId => {
                              if (!subjectiveMetrics[promptId]) {
                                generateSubjectiveMetrics(promptId)
                              }
                            })
                          }}
                          disabled={uniquePromptIds.some(id => generatingMetrics[id] || loadingMetrics[id])}
                          size="sm"
                          className="h-8 px-3 text-xs"
                        >
                          {uniquePromptIds.some(id => generatingMetrics[id] || loadingMetrics[id]) ? (
                            <>
                              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-2"></div>
                              Generating...
                            </>
                          ) : (
                            <>
                              <Sparkles className="w-3 h-3 mr-2" />
                              Generate All
                            </>
                          )}
                        </Button>
                      </div>

                      {/* Error Display */}
                      {uniquePromptIds.some(id => metricsError[id]) && (
                        <div className="p-2 bg-red-50 border border-red-200 rounded text-xs text-red-600">
                          {uniquePromptIds.map(id => metricsError[id] && (
                            <div key={id}>Prompt {id.substring(0, 8)}...: {metricsError[id]}</div>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                  })()
                )}
              </div>
            </div>
          </div>
          );
        })()}
      </SheetContent>
    </Sheet>
    </>
  )
}