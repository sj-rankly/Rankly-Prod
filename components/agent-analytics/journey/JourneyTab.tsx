'use client'

import { useEffect, useState } from 'react'
import { UnifiedCard, UnifiedCardContent } from '@/components/ui/unified-card'
import { JourneySkeleton } from '@/components/ui/journey-skeleton'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Info } from 'lucide-react'
import { D3SankeyChart } from './D3SankeyChart'
import { getDynamicFaviconUrl } from '@/lib/faviconUtils'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Maximize2, ChevronRight } from 'lucide-react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { getJourney } from '@/services/ga4Api'

interface JourneyTabProps {
  range: { from: Date; to: Date }
  realJourneyData: any
  dateRange?: string
  isLoading?: boolean
}

interface PageData {
  pagePath?: string
  pageTitle?: string
  title?: string
  url?: string
  platform: string
  sessions: number
  provider?: string
}

// Generate slug from page path/URL for grouping
// Returns a clean slug like '/tools', '/blog', '/landing-page', etc.
const generateSlug = (pagePath?: string, pageTitle?: string, pageUrl?: string): string => {
  // Try to extract path from URL if available
  let path = pagePath || ''
  if (pageUrl) {
    try {
      const url = new URL(pageUrl)
      path = url.pathname
    } catch {
      // If URL parsing fails, use as-is
      path = pageUrl
    }
  }

  if (!path && !pageTitle) return '/other'

  // Normalize the path
  const rawPath = (path || '').toLowerCase().split(/[?#]/)[0].trim()
  const normalizedPath = rawPath.replace(/\/+$/, '') || '/' // remove trailing slash, default to "/"
  const title = (pageTitle || '').toLowerCase()

  // Split and extract first directory
  const parts = normalizedPath.split('/').filter(Boolean)
  const firstSegment = parts.length > 0 ? `/${parts[0]}` : '/'

  // 1️⃣ Product / Tools
  if (
    firstSegment === '/tools' ||
    firstSegment.startsWith('/tool') ||
    normalizedPath.includes('feature') ||
    normalizedPath.includes('product') ||
    normalizedPath.includes('solution') ||
    title.includes('tool') ||
    title.includes('generator')
  ) return '/tools'

  // 2️⃣ Blog / Content
  if (
    firstSegment === '/blog' ||
    firstSegment.startsWith('/article') ||
    firstSegment.startsWith('/post') ||
    normalizedPath.includes('/insights') ||
    title.includes('blog') ||
    title.includes('insight')
  ) return '/blog'

  // 3️⃣ Docs / API
  if (
    firstSegment === '/docs' ||
    firstSegment === '/doc' ||
    firstSegment === '/api' ||
    firstSegment === '/support' ||
    normalizedPath.includes('/help') ||
    title.includes('api') ||
    title.includes('docs')
  ) return '/docs'

  // 4️⃣ Pricing / Plans
  if (
    firstSegment === '/pricing' ||
    normalizedPath.includes('/plan') ||
    normalizedPath.includes('/billing') ||
    normalizedPath.includes('/checkout') ||
    title.includes('pricing')
  ) return '/pricing'

  // 5️⃣ About / Team / Company
  if (
    firstSegment === '/about' ||
    firstSegment === '/company' ||
    firstSegment === '/team' ||
    normalizedPath.includes('/career') ||
    title.includes('about') ||
    title.includes('team')
  ) return '/about'

  // 6️⃣ Conversion / Optimization
  if (
    firstSegment.startsWith('/conversion') ||
    normalizedPath.includes('optimiz') ||
    title.includes('conversion') ||
    title.includes('optimiz')
  ) return '/conversion-rate-optimization'

  // 7️⃣ Landing / Home
  if (
    normalizedPath === '/' ||
    normalizedPath === '/index.html' ||
    firstSegment.startsWith('/home') ||
    firstSegment.startsWith('/landing') ||
    title.includes('home') ||
    title.includes('landing')
  ) return '/landing-page'

  // 8️⃣ Default - use first segment or 'other'
  return firstSegment !== '/' ? firstSegment : '/other'
}

// Platform color mapping
const PLATFORM_COLORS: Record<string, string> = {
  'ChatGPT': '#a78bfa', // Purple/lavender
  'Claude': '#f472b6', // Pink
  'Gemini': '#60a5fa', // Light blue
  'Google': '#60a5fa', // Light blue
  'Perplexity': '#fca5a5', // Red/pink
  'Copilot': '#34d399', // Green
  'Grok': '#fb923c', // Orange
  'Poe': '#818cf8', // Indigo
  'Character.ai': '#ec4899', // Magenta
  'Default': '#94a3b8' // Gray
}

// Get color for platform
const getPlatformColor = (platform: string): string => {
  const platformKey = Object.keys(PLATFORM_COLORS).find(key => 
    platform.toLowerCase().includes(key.toLowerCase())
  )
  return platformKey ? PLATFORM_COLORS[platformKey] : PLATFORM_COLORS['Default']
}

// Function to get the domain for each LLM platform for favicon fetching
function getLLMDomain(platform: string): string {
  const platformLower = platform.toLowerCase().trim()
  
  if (platformLower === 'chatgpt' || platformLower.includes('openai') || platformLower.includes('gpt')) {
    return 'chat.openai.com'
  }
  if (platformLower === 'claude' || platformLower.includes('anthropic')) {
    return 'claude.ai'
  }
  if (platformLower === 'gemini' || platformLower === 'bard' || platformLower.includes('bard')) {
    return 'gemini.google.com'
  }
  if (platformLower === 'perplexity') {
    return 'perplexity.ai'
  }
  if (platformLower === 'poe') {
    return 'poe.com'
  }
  if (platformLower === 'copilot' || platformLower.includes('microsoft copilot') || platformLower.includes('bing chat')) {
    return 'copilot.microsoft.com'
  }
  if (platformLower === 'grok' || platformLower.includes('grok')) {
    return 'x.com'
  }
  if (platformLower === 'character' || platformLower.includes('character.ai') || platformLower === 'characterai') {
    return 'character.ai'
  }
  if (platformLower === 'you' || platformLower === 'you.com' || platformLower.includes('youcom')) {
    return 'you.com'
  }
  if (platformLower === 'huggingchat' || platformLower.includes('hugging face') || platformLower === 'huggingface') {
    return 'huggingface.co'
  }
  if (platformLower === 'pi' || platformLower.includes('inflection') || platformLower === 'heypi') {
    return 'heypi.com'
  }
  return 'google.com'
}

export function JourneyTab({ realJourneyData, dateRange = '7 days', isLoading = false }: JourneyTabProps) {
  const [pagesData, setPagesData] = useState<PageData[]>([])
  const [sankeyData, setSankeyData] = useState<any[]>([])
  const [slugToPagesMap, setSlugToPagesMap] = useState<Map<string, Array<{url: string, title: string, sessions: number}>>>(new Map())
  const [hoveredSlug, setHoveredSlug] = useState<string | null>(null)
  const [hoverPosition, setHoverPosition] = useState<{x: number, y: number} | null>(null)
  const [hoveredLink, setHoveredLink] = useState<{ from: string; to: string; value: number } | null>(null)
  const [linkHoverPosition, setLinkHoverPosition] = useState<{x: number, y: number} | null>(null)
  const [showFullPageView, setShowFullPageView] = useState(false)
  const [fullJourneyData, setFullJourneyData] = useState<Array<{from: string, to: string, value: number, color: string}>>([])
  const [isLoadingJourney, setIsLoadingJourney] = useState(false)

  // Smart tooltip positioning to keep within viewport
  const getSmartTooltipPosition = (x: number, y: number, tooltipWidth = 300, tooltipHeight = 200) => {
    const viewportWidth = window.innerWidth
    const viewportHeight = window.innerHeight
    const padding = 20

    let adjustedX = x
    let adjustedY = y

    // Check if tooltip would go off right edge
    if (x + tooltipWidth + padding > viewportWidth) {
      adjustedX = x - tooltipWidth - padding
    }

    // Check if tooltip would go off bottom edge
    if (y + tooltipHeight / 2 > viewportHeight) {
      adjustedY = viewportHeight - tooltipHeight - padding
    }

    // Check if tooltip would go off top edge
    if (y - tooltipHeight / 2 < padding) {
      adjustedY = padding + tooltipHeight / 2
    }

    return { x: adjustedX, y: adjustedY }
  }
  
  // Process pages data for LLM to Page journey
  // Note: Data comes from parent component (realJourneyData), no need to fetch here
  useEffect(() => {
    // ✅ Clear previous data before processing new data to prevent showing stale data
    console.log('🔄 [JourneyTab] Clearing previous data before processing new data')
    setSankeyData([])
    setPagesData([])
    setSlugToPagesMap(new Map())
    
    const processPagesData = async () => {
      console.log('🔍 [JourneyTab] Processing pages data...', {
        hasRealJourneyData: !!realJourneyData,
        realJourneyData: realJourneyData,
        hasSuccess: realJourneyData?.success,
        hasData: !!realJourneyData?.data,
        hasPages: !!realJourneyData?.data?.pages,
        pagesLength: realJourneyData?.data?.pages?.length
      })
      
      // Use realJourneyData if available, otherwise show empty state
      if (realJourneyData && realJourneyData.success && realJourneyData.data?.pages) {
        console.log('📄 [JourneyTab] Using real journey data:', realJourneyData)
        const result = realJourneyData
        
        if (result.success && result.data?.pages) {
          setPagesData(result.data.pages)
          
          // Transform pages data into Sankey format
          const sankeyLinks: any[] = []
          const platformMap = new Map()
          const pageMap = new Map()
          
        // Process each page and create links from LLM platforms to slugs (grouped pages)
        console.log('🤖 [JourneyTab] Starting processing for', result.data.pages.length, 'pages...')
        console.log('🔄 [JourneyTab] Grouping pages by slugs at:', new Date().toISOString())
          
          // Map to store slug -> array of pages
          const slugPagesMap = new Map<string, Array<{url: string, title: string, sessions: number}>>()
          
          // Process each page and create links for each platform → slug
          result.data.pages.forEach((page: PageData, index: number) => {
            // Generate slug for this page
            const slug = generateSlug(page.pagePath, page.pageTitle || page.title, page.url)
            const pageUrl = page.url || page.pagePath || ''
            const pageTitle = page.pageTitle || page.title || pageUrl
            
            // Add page to slug mapping for hover tooltip
            if (!slugPagesMap.has(slug)) {
              slugPagesMap.set(slug, [])
            }
            slugPagesMap.get(slug)!.push({
              url: pageUrl,
              title: pageTitle,
              sessions: page.sessions || 0
            })
            
            // Debug first few items
            if (index < 3) {
              console.log(`📍 [JourneyTab] Page ${index}:`, { 
                pagePath: page.pagePath,
                url: page.url,
                pageTitle: page.pageTitle,
                title: page.title,
                slug,
                sessions: page.sessions,
                provider: page.provider,
                platform: (page as any).platform,
                platformSessions: (page as any).platformSessions,
              })
            }
            
            // Use platformSessions if available (more accurate - matches Pages Tab)
            // Otherwise fall back to provider/platform
            const platformSessions = (page as any).platformSessions || {}
            
            if (platformSessions && typeof platformSessions === 'object' && Object.keys(platformSessions).length > 0) {
              // Create one link per platform for this slug
              Object.entries(platformSessions).forEach(([platform, sessions]) => {
                const sessionCount = typeof sessions === 'number' ? sessions : parseInt(sessions as string) || 0
                
                if (sessionCount > 0) {
                  // Track unique platforms (left side) and slugs (right side)
                  if (!platformMap.has(platform)) {
                    platformMap.set(platform, platform)
                  }
                  if (!pageMap.has(slug)) {
                    pageMap.set(slug, slug)
                  }
                  
                  sankeyLinks.push({
                    from: platform,
                    to: slug, // Slug instead of individual page
                    value: sessionCount
                  })
                }
              })
            } else {
              // Fallback: use provider/platform if platformSessions is not available
              const platform = page.provider || (page as any).platform || 'LLM Traffic'
              
              // Track unique platforms and slugs
              if (!platformMap.has(platform)) {
                platformMap.set(platform, platform)
              }
              if (!pageMap.has(slug)) {
                pageMap.set(slug, slug)
              }
              
              sankeyLinks.push({
                from: platform,
                to: slug, // Slug instead of individual page
                value: page.sessions
              })
            }
          })
          
          // Store slug to pages mapping for hover tooltips
          setSlugToPagesMap(slugPagesMap)
          
          console.log('✅ [JourneyTab] Processing completed for all pages')
          
          // Aggregate duplicate links (same platform → slug) by summing values
          // This groups all pages under the same slug and sums their sessions
          const aggregatedLinks = new Map<string, number>()
          sankeyLinks.forEach(link => {
            const key = `${link.from}|${link.to}`
            const currentValue = aggregatedLinks.get(key) || 0
            aggregatedLinks.set(key, currentValue + link.value)
          })
          
          // Convert back to array format with platform colors
          const finalSankeyLinks = Array.from(aggregatedLinks.entries()).map(([key, value]) => {
            const [from, to] = key.split('|')
            return { 
              from, 
              to, // Slug identifier
              value,
              color: getPlatformColor(from) // Add platform color to each link
            }
          })
          
          console.log('🎨 [JourneyTab] Aggregated links with colors:', finalSankeyLinks.slice(0, 5))
          
          // Create detailed breakdown for debugging (using aggregated links)
          const breakdown = new Map<string, Array<{page: string, sessions: number}>>()
          
          finalSankeyLinks.forEach(link => {
            if (!breakdown.has(link.from)) {
              breakdown.set(link.from, [])
            }
            breakdown.get(link.from)!.push({
              page: link.to,
              sessions: link.value
            })
          })


          console.log('🔗 [JourneyTab] Sankey data before aggregation:', sankeyLinks.length, 'links')
          console.log('🔗 [JourneyTab] Sankey data after aggregation:', finalSankeyLinks.length, 'links')
          
          // Debug: Show unique pages
          const uniquePages = new Set(finalSankeyLinks.map(link => link.to))
          const uniquePlatforms = new Set(finalSankeyLinks.map(link => link.from))
          console.log('🎯 [JourneyTab] Unique platforms (left side):', Array.from(uniquePlatforms))
          console.log('🎯 [JourneyTab] Total unique platforms:', uniquePlatforms.size)
          console.log('🎯 [JourneyTab] Unique pages (right side):', Array.from(uniquePages).slice(0, 10), '... (showing first 10)')
          console.log('🎯 [JourneyTab] Total unique pages:', uniquePages.size)
          
          // Calculate total sessions from aggregated links for verification
          // This should match Pages Tab's sum of page sessions
          const totalSessionsFromLinks = finalSankeyLinks.reduce((sum, link) => sum + link.value, 0)
          const totalSessionsFromPages = result.data.pages.reduce((sum: number, page: PageData) => {
            const platformSessions = (page as any).platformSessions || {}
            if (platformSessions && typeof platformSessions === 'object' && Object.keys(platformSessions).length > 0) {
              const platformSum = Object.values(platformSessions).reduce((pSum: number, pSessions: any) => 
                pSum + (typeof pSessions === 'number' ? pSessions : parseInt(String(pSessions)) || 0), 0) as number
              return sum + platformSum
            }
            return sum + (page.sessions || 0)
          }, 0)
          
          // Also calculate using page.sessions directly (Pages Tab method)
          const totalPageSessions = result.data.pages.reduce((sum: number, p: PageData) => sum + (p.sessions || 0), 0)
          
          // Verify consistency
          const linksMatchPlatformSessions = Math.abs(totalSessionsFromLinks - totalSessionsFromPages) < 0.01
          const platformSessionsMatchPageSessions = Math.abs(totalSessionsFromPages - totalPageSessions) < 0.01
          
          console.log('🔍 [JourneyTab] Session verification (should match Pages Tab):', {
            totalSessionsFromLinks, // Sum of all Sankey link values
            totalSessionsFromPages, // Sum of platformSessions across all pages
            totalPageSessions, // Sum of page.sessions (Pages Tab method)
            linksMatchPlatformSessions,
            platformSessionsMatchPageSessions,
            allMatch: linksMatchPlatformSessions && platformSessionsMatchPageSessions
          })
          
          // Log warning if numbers don't match
          if (!linksMatchPlatformSessions || !platformSessionsMatchPageSessions) {
            console.warn('⚠️ [JourneyTab] Session count mismatch detected!', {
              difference1: Math.abs(totalSessionsFromLinks - totalSessionsFromPages),
              difference2: Math.abs(totalSessionsFromPages - totalPageSessions)
            })
          } else {
            console.log('✅ [JourneyTab] All session counts match correctly!')
          }
          
          setSankeyData(finalSankeyLinks)
          
          // Debug: Show Sankey structure
          const uniquePagesSet = new Set(finalSankeyLinks.map(link => link.to))
          const uniquePlatformsSet = new Set(finalSankeyLinks.map(link => link.from))
          console.log('🎯 [JourneyTab] Sankey data prepared:', {
            totalLinks: finalSankeyLinks.length,
            sampleLinks: finalSankeyLinks.slice(0, 5),
            platforms: Array.from(uniquePlatformsSet),
            totalUniquePlatforms: uniquePlatformsSet.size,
            totalUniquePages: uniquePagesSet.size,
            samplePages: Array.from(uniquePagesSet).slice(0, 5)
          })
          
          // Show sample of the actual data being used
          if (finalSankeyLinks.length > 0) {
            console.log('📊 [JourneyTab] Sample sankey links:', finalSankeyLinks.slice(0, 5))
          } else {
            console.log('⚠️ [JourneyTab] No sankey data generated!')
          }
          
          console.log('📊 [JourneyTab] SANKEY STRUCTURE:')
          console.log('Left side (LLM Platforms):', Array.from(uniquePlatformsSet))
          console.log('Right side (Individual Pages):', Array.from(uniquePagesSet).slice(0, 10), '... (showing first 10)')
          console.log('Total unique platforms:', uniquePlatformsSet.size)
          console.log('Total unique pages:', uniquePagesSet.size)
          
          // Detailed breakdown by platform
          console.log('📊 [JourneyTab] DETAILED PLATFORM → PAGE BREAKDOWN:')
          for (const [platform, pages] of breakdown.entries()) {
            const totalSessions = pages.reduce((sum, p) => sum + p.sessions, 0)
            console.log(`\n🤖 ${platform.toUpperCase()} (${totalSessions} total sessions):`)
            pages
              .sort((a, b) => b.sessions - a.sessions)
              .slice(0, 10) // Show top 10 pages per platform
              .forEach((page, index) => {
                console.log(`  ${index + 1}. ${page.page} - ${page.sessions} sessions`)
              })
            if (pages.length > 10) {
              console.log(`  ... and ${pages.length - 10} more pages`)
            }
          }
        } else {
          console.warn('⚠️ [JourneyTab] No pages data found in response:', result)
        }
      } else {
        // No real data available - parent component should handle fetching
        console.log('🔍 [JourneyTab] No real journey data available, waiting for parent to fetch...')
      }
    }

    processPagesData()
  }, [dateRange, realJourneyData])

  // Fetch full journey data when modal opens
  useEffect(() => {
    const fetchJourneyData = async () => {
      if (!showFullPageView) return
      
      setIsLoadingJourney(true)
      try {
        const result = await getJourney(dateRange)
        
        if (result.success && result.data?.paths) {
          // Add colors to the paths based on platform
          const pathsWithColors = result.data.paths.map((path: any) => ({
            ...path,
            color: getPlatformColor(path.from)
          }))
          
          setFullJourneyData(pathsWithColors)
          console.log('✅ [JourneyTab] Fetched journey data:', {
            paths: pathsWithColors.length,
            totalSessions: result.data.summary?.totalSessions
          })
        } else {
          console.error('❌ [JourneyTab] API returned error:', result.error)
          throw new Error(result.error || 'Failed to fetch journey data')
        }
      } catch (error) {
        console.error('❌ [JourneyTab] Error fetching journey data:', error)
        // Fallback to using pages data if API fails
        const fallbackData = createFallbackJourneyData()
        setFullJourneyData(fallbackData)
      } finally {
        setIsLoadingJourney(false)
      }
    }

    fetchJourneyData()
  }, [showFullPageView, dateRange])

  // Create fallback journey data from pagesData
  const createFallbackJourneyData = () => {
    const fallbackPaths: Array<{from: string, to: string, value: number, color: string}> = []
    
    const platformPages = new Map<string, Array<{title: string, sessions: number}>>()
    
    pagesData.forEach(page => {
      const platformSessions = (page as any).platformSessions || {}
      const pageTitle = page.pageTitle || page.title || page.url || page.pagePath || 'Unknown Page'
      
      if (Object.keys(platformSessions).length > 0) {
        Object.entries(platformSessions).forEach(([platform, sessions]) => {
          if (!platformPages.has(platform)) {
            platformPages.set(platform, [])
          }
          platformPages.get(platform)!.push({
            title: pageTitle,
            sessions: typeof sessions === 'number' ? sessions : parseInt(sessions as string) || 0
          })
        })
                } else {
        const platform = page.provider || (page as any).platform || 'LLM Traffic'
        if (!platformPages.has(platform)) {
          platformPages.set(platform, [])
        }
        platformPages.get(platform)!.push({
          title: pageTitle,
          sessions: page.sessions || 0
        })
      }
    })

    platformPages.forEach((pages, platform) => {
      const platformColor = getPlatformColor(platform)
      const sortedPages = pages.sort((a, b) => b.sessions - a.sessions)
      
      sortedPages.forEach(page => {
        fallbackPaths.push({
          from: platform,
          to: page.title,
          value: page.sessions,
          color: platformColor
        })
      })
    })

    return fallbackPaths
  }

  // Show skeleton when loading
  if (isLoading) {
    return <JourneySkeleton />
  }

  // Show skeleton if no data available (initial state)
  if ((!realJourneyData || !realJourneyData.data || !realJourneyData.data.pages || realJourneyData.data.pages.length === 0) && 
      (!pagesData || pagesData.length === 0)) {
    return <JourneySkeleton />
  }

  return (
    <div className="space-y-4">
      <UnifiedCard>
        <UnifiedCardContent className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-semibold leading-none tracking-tight text-foreground">LLM to Page Journey</h2>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-4 w-4 text-muted-foreground hover:text-primary cursor-help transition-colors" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <div className="max-w-xs space-y-2">
                        <p className="text-sm font-semibold">LLM to Page Journey</p>
                        <p className="text-sm">Visualizes the flow of traffic from LLM platforms to page groups</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          The Sankey diagram shows how users flow from different LLM platforms (left) to page groups/slugs (right). Pages are grouped by their URL structure. Hover over a slug to see the individual pages.
                        </p>
                        <div className="mt-2 pt-2 border-t border-border/50">
                          <p className="text-xs font-semibold mb-1">How it works:</p>
                          <ul className="text-xs text-muted-foreground space-y-0.5">
                            <li>• <strong>Left side:</strong> Individual LLM platforms with distinct colors</li>
                            <li>• <strong>Right side:</strong> Page groups (slugs) - hover to see individual pages</li>
                            <li>• <strong>Links:</strong> Colored by source platform, thickness shows session volume</li>
                            <li>• <strong>Colors:</strong> Each platform has its own color; links match their source</li>
                          </ul>
                        </div>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <p className="text-sm text-muted-foreground">Visualize traffic flow from LLM platforms to page groups</p>
            </div>
            <div className="flex items-center gap-3">
              <Dialog open={showFullPageView} onOpenChange={setShowFullPageView}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2">
                    <Maximize2 className="h-4 w-4" />
                    View Full Page Journey
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-[95vw] max-h-[95vh] flex flex-col">
                  <DialogHeader className="flex-shrink-0">
                    <DialogTitle>Full Page Journey Flow</DialogTitle>
                    <DialogDescription>
                      Sequential page navigation showing Platform → Page 1 → Page 2 → Page 3 journey paths
                    </DialogDescription>
                  </DialogHeader>
                  <ScrollArea className="flex-1 -mx-6 px-6">
                    <div className="min-h-full pb-6">
                      {isLoadingJourney ? (
                        <div className="flex items-center justify-center h-96">
                          <div className="text-center space-y-3">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
                            <p className="text-lg font-semibold text-foreground">Loading Journey Data...</p>
                            <p className="text-sm text-muted-foreground">
                              Fetching sequential page paths from GA4
                            </p>
                          </div>
                        </div>
                      ) : fullJourneyData.length > 0 ? (
                        <div className="w-full">
                          <div className="border rounded-lg bg-muted/5 p-4" style={{ minHeight: `${Math.max(800, fullJourneyData.length * 10)}px` }}>
                            <D3SankeyChart
                              data={fullJourneyData}
                              width={1600}
                              height={Math.max(800, fullJourneyData.length * 10)}
                              onLinkHover={(link, position) => {
                                setHoveredLink(link)
                                if (position) {
                                  const smartPos = getSmartTooltipPosition(position.x + 10, position.y, 300, 80)
                                  setLinkHoverPosition(smartPos)
                                } else {
                                  setLinkHoverPosition(null)
                                }
                              }}
                              onSlugHover={(slug, position) => {
                                // No slug hover in full page view
                              }}
                              getLLMDomain={getLLMDomain}
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center h-96">
                          <div className="text-center space-y-2">
                            <p className="text-lg font-semibold text-muted-foreground">No Journey Data Available</p>
                            <p className="text-sm text-muted-foreground">
                              No page journey data found for the selected period
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </DialogContent>
              </Dialog>
              <div className="text-center">
                <div className="text-xl font-bold text-foreground">{pagesData.length}</div>
                <div className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                  <span>Total Pages</span>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-3 w-3 text-muted-foreground hover:text-primary cursor-help transition-colors" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <div className="max-w-xs space-y-2">
                          <p className="text-sm font-semibold">Total Pages</p>
                          <p className="text-sm">Number of unique pages with LLM traffic</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Each page is counted once, regardless of how many LLM platforms drive traffic to it.
                          </p>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </div>
              <div className="text-center">
                <div className="text-xl font-bold text-primary">
                  {(() => {
                    // Use the same calculation as Pages Tab for consistency
                    // First try to use summary.totalSessions from backend (unique sessions)
                    if (realJourneyData?.data?.summary?.totalSessions !== undefined) {
                      return realJourneyData.data.summary.totalSessions
                    }
                    // Otherwise fall back to summing page.sessions (page-level)
                    return pagesData.reduce((sum: number, p: any) => sum + (p.sessions || 0), 0)
                  })()}
                </div>
                <div className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                  <span>Total Sessions</span>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-3 w-3 text-muted-foreground hover:text-primary cursor-help transition-colors" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <div className="max-w-xs space-y-2">
                          <p className="text-sm font-semibold">Total LLM Sessions</p>
                          <p className="text-sm">Total number of <strong>unique</strong> sessions from LLM providers</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Each session is counted once, regardless of how many pages it visits. This matches the Pages Tab&apos;s &quot;Total Sessions&quot; for consistency.
                          </p>
                          <div className="mt-2 pt-2 border-t border-border/50">
                            <p className="text-xs font-semibold mb-1">Note:</p>
                            <p className="text-xs text-muted-foreground">
                              The sum of page-level sessions may be higher than this total if some sessions visited multiple pages.
                            </p>
                          </div>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </div>
              <div className="text-center">
                <div className="text-xl font-bold text-green-600">{sankeyData.length}</div>
                <div className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                  <span>Sankey Links</span>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-3 w-3 text-muted-foreground hover:text-primary cursor-help transition-colors" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <div className="max-w-xs space-y-2">
                          <p className="text-sm font-semibold">Sankey Links</p>
                          <p className="text-sm">Number of connections in the journey flow diagram</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Each link represents traffic flow from an LLM platform to a page group (slug). Links are colored by their source platform, and thickness represents session volume. Hover over a slug to see individual pages.
                          </p>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </div>
            </div>
          </div>

                      {/* Sankey Chart */}
                      <div className="w-full py-6 relative">
                        <div className="flex justify-center items-center w-full">
                          <D3SankeyChart
                            data={sankeyData}
                            width={1200}
                            height={600}
                            onLinkHover={(link, position) => {
                              setHoveredLink(link)
                              if (position) {
                                const smartPos = getSmartTooltipPosition(position.x + 10, position.y, 250, 80)
                                setLinkHoverPosition(smartPos)
                              } else {
                                setLinkHoverPosition(null)
                              }
                            }}
                            onSlugHover={(slug, position) => {
                              setHoveredSlug(slug)
                              if (position) {
                                const smartPos = getSmartTooltipPosition(position.x, position.y, 400, 300)
                                setHoverPosition(smartPos)
                              } else {
                                setHoverPosition(null)
                              }
                            }}
                            getLLMDomain={getLLMDomain}
                          />
                        </div>
                        
                        {/* Hover tooltip for link (platform → page) */}
                        {hoveredLink && linkHoverPosition && (
                          <div
                            className="fixed z-50 bg-popover border border-border rounded-lg shadow-lg px-3 py-2"
                            style={{ 
                              left: `${linkHoverPosition.x}px`,
                              top: `${linkHoverPosition.y}px`,
                              transform: 'translateY(-50%)',
                              pointerEvents: 'none'
                            }}
                          >
                            <div className="text-sm font-medium text-foreground whitespace-nowrap">
                              {hoveredLink.from} → {hoveredLink.to}
                        </div>
                            <div className="text-xs text-muted-foreground">
                              Visits: {hoveredLink.value}
                            </div>
                          </div>
                        )}
                        
                        {/* Hover tooltip for slug pages */}
                        {hoveredSlug && hoverPosition && slugToPagesMap.has(hoveredSlug) && (
                          <div
                            className="fixed z-50 bg-popover border border-border rounded-lg shadow-lg p-4 max-w-md max-h-96 overflow-y-auto"
                            style={{
                              left: `${hoverPosition.x}px`,
                              top: `${hoverPosition.y}px`,
                              transform: 'translateY(-50%)',
                              pointerEvents: 'auto'
                            }}
                            onMouseEnter={() => {
                              // Keep tooltip visible when hovering over it
                            }}
                            onMouseLeave={() => {
                              setHoveredSlug(null)
                              setHoverPosition(null)
                            }}
                          >
                            <div className="space-y-2">
                              <h4 className="font-semibold text-sm text-foreground mb-2">
                                {hoveredSlug}
                              </h4>
                              <div className="text-xs text-muted-foreground mb-2">
                                {slugToPagesMap.get(hoveredSlug)?.length || 0} page{slugToPagesMap.get(hoveredSlug)?.length !== 1 ? 's' : ''}
                              </div>
                              <div className="space-y-1.5 max-h-64 overflow-y-auto">
                                {slugToPagesMap.get(hoveredSlug)?.map((page, index) => (
                                  <div key={index} className="text-xs border-b border-border/50 pb-1.5 last:border-0">
                                    <div className="font-medium text-foreground break-words" title={page.title || page.url}>
                                      {page.title || page.url}
                                    </div>
                                    <div className="text-muted-foreground break-words text-[10px] mt-0.5" title={page.url}>
                                      {page.url}
                                    </div>
                                    <div className="text-muted-foreground mt-0.5">
                                      {page.sessions} session{page.sessions !== 1 ? 's' : ''}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        )}
                        {sankeyData.length === 0 && !isLoading && (
                          <div className="flex items-center justify-center h-[600px] bg-gray-50 dark:bg-gray-900 rounded-lg">
                            <div className="text-center">
                              <div className="text-lg font-semibold text-gray-600 dark:text-gray-400 mb-2">
                                No Journey Data Available
                              </div>
                              <div className="text-sm text-gray-500 dark:text-gray-500">
                                No LLM platform to page journey data found for the selected period
                              </div>
                            </div>
                          </div>
                        )}
                        {isLoading && (
                          <div className="flex items-center justify-center h-[600px] bg-gray-50 dark:bg-gray-900 rounded-lg">
                            <div className="text-center">
                              <div className="text-lg font-semibold text-gray-600 dark:text-gray-400 mb-2">
                                Loading Journey Data...
                              </div>
                              <div className="text-sm text-gray-500 dark:text-gray-500">
                                Fetching LLM platform to page journey data
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
        </UnifiedCardContent>
      </UnifiedCard>


    </div>
  )
}
