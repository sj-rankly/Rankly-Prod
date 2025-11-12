'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { UnifiedCard, UnifiedCardContent } from '@/components/ui/unified-card'
import { JourneySkeleton } from '@/components/ui/journey-skeleton'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Info } from 'lucide-react'

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

// Declare window types for Google Charts
declare global {
  interface Window {
    google: any
  }
}

export function JourneyTab({ realJourneyData, dateRange = '7 days', isLoading = false }: JourneyTabProps) {
  const chartRef = useRef<HTMLDivElement>(null)
  const [pagesData, setPagesData] = useState<PageData[]>([])
  const [sankeyData, setSankeyData] = useState<any[]>([])
  const [slugToPagesMap, setSlugToPagesMap] = useState<Map<string, Array<{url: string, title: string, sessions: number}>>>(new Map())
  const [hoveredSlug, setHoveredSlug] = useState<string | null>(null)
  const [hoverPosition, setHoverPosition] = useState<{x: number, y: number} | null>(null)
  
  // Process pages data for LLM to Page journey
  // Note: Data comes from parent component (realJourneyData), no need to fetch here
  useEffect(() => {
    // Clear previous data before processing new data
    setSankeyData([])
    setPagesData([])
    
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

  // Define chart initialization functions outside useEffect
  // Use a ref to access the latest slugToPagesMap without stale closures
  const slugToPagesMapRef = useRef<Map<string, Array<{url: string, title: string, sessions: number}>>>(new Map())
  
  // Update ref when slugToPagesMap changes
  useEffect(() => {
    slugToPagesMapRef.current = slugToPagesMap
  }, [slugToPagesMap])
  
  const initChart = useCallback(() => {
    console.log('🎨 [JourneyTab] Initializing Google Charts Sankey...', { 
      hasRef: !!chartRef.current, 
      hasGoogle: !!window.google,
      hasVisualization: !!window.google?.visualization,
      sankeyDataLength: sankeyData.length,
      slugMapSize: slugToPagesMapRef.current.size
    })
    
    if (!chartRef.current || !window.google || !window.google.visualization || !window.google.visualization.Sankey) {
      console.warn('⚠️ [JourneyTab] Missing chart ref or Google Charts:', { 
        hasRef: !!chartRef.current, 
        hasGoogle: !!window.google,
        hasVisualization: !!window.google?.visualization,
        hasSankey: !!window.google?.visualization?.Sankey
      })
        return
      }

    try {
      // Create Google Charts DataTable
      const data = new window.google.visualization.DataTable()
      data.addColumn('string', 'From')
      data.addColumn('string', 'To')
      data.addColumn('number', 'Weight')

      // Add data rows - use real data if available
      const dataToUse = sankeyData.length > 0 ? sankeyData : []
      
      // If we have real data, use it
      if (sankeyData.length > 0) {
        console.log('✅ [JourneyTab] Using real sankey data with', sankeyData.length, 'links')
        console.log('📊 [JourneyTab] Sample sankey data:', sankeyData.slice(0, 3))
      } else {
        console.log('⚠️ [JourneyTab] No sankey data available - chart will be empty')
        console.log('🔍 [JourneyTab] Sankey data state:', sankeyData)
        // Don't draw chart if no data
        return
      }

      console.log('📊 [JourneyTab] Setting chart data:', dataToUse)
      console.log('📊 [JourneyTab] Sankey data length:', sankeyData.length)
      console.log('📊 [JourneyTab] Raw sankey data:', sankeyData)
      
      // Add data rows to the chart
      sankeyData.forEach(link => {
        data.addRow([link.from, link.to, link.value])
      })


      // Chart options with platform-specific colors
      const isDarkMode = document.documentElement.classList.contains('dark')
      
      // Get unique platforms in order (left to right)
      const uniquePlatforms = Array.from(new Set(sankeyData.map(link => link.from)))
      
      // Create color arrays - need enough colors for all unique source platforms
      // Google Charts will map colors based on source node order when colorMode is 'source'
      const platformColors = uniquePlatforms.map(platform => getPlatformColor(platform))
      
      const options = {
        width: '100%',
        height: 550,
        chartArea: {
          left: 200,  // extra space for left-side labels (increased)
          right: 200, // extra space for right-side labels (increased)
          top: 20,
          bottom: 20,
          width: '100%',
          height: '100%'
        },
        sankey: {
          node: {
            width: 10,
            nodePadding: 20,
            interactivity: false, // Disable interactivity on nodes - we handle hover on labels
            label: {
              fontName: 'Inter',
              fontSize: 14,
              bold: true,
              color: isDarkMode ? '#ffffff' : '#111827',
            },
            // Don't set node colors - nodes should be neutral/default colored, only links have platform colors
          },
          link: {
            colorMode: 'source', // Color links based on source (platform) - this is key!
            colors: platformColors.length > 0 ? platformColors : ['#a78bfa', '#60a5fa', '#f472b6'], // Platform colors in order
            color: { fillOpacity: 0.5 }, // Slightly more opaque for better visibility
          },
          // Disable tooltips on links (sankey lines)
          tooltip: {
            trigger: 'none', // Disable tooltips
          },
        },
        // Remove tooltip config from main options - handled separately
      }

      // Debug data before drawing
      console.log('🔍 [JourneyTab] Data before drawing:', {
        dataLength: data.getNumberOfRows(),
        columns: data.getNumberOfColumns(),
        firstRow: data.getNumberOfRows() > 0 ? data.getValue(0, 0) + ' -> ' + data.getValue(0, 1) + ' (' + data.getValue(0, 2) + ')' : 'No data',
        chartArea: options.chartArea
      });

      // Clear any existing chart content before creating new one
      if (chartRef.current) {
        chartRef.current.innerHTML = ''
      }

      // Create and draw chart
      const chart = new window.google.visualization.Sankey(chartRef.current)
      
      // Don't add selection listener - we're handling hover manually via SVG events
      // This prevents default tooltips on sankey lines
      
      // Draw chart
      chart.draw(data, options);

      // Fix label positions and add hover tooltips once chart finishes rendering
      window.google.visualization.events.addListener(chart, 'ready', () => {
        console.log('🎯 [JourneyTab] Chart ready event fired');
        // Small delay ensures SVG labels exist
        setTimeout(() => {
          const svg = chartRef.current?.querySelector('svg')
          if (!svg) {
            console.log('❌ [JourneyTab] No SVG found after ready event');
            return;
          }

          // Center the SVG
          svg.setAttribute('style', 'margin: 0 auto; display: block;')

          const labels = svg.querySelectorAll('text')
          const rects = svg.querySelectorAll('rect') // Nodes (platforms and slugs)
          console.log('🔍 [JourneyTab] Found', labels.length, 'text labels and', rects.length, 'rects');
          
          // Check if dark mode
          const isDarkMode = document.documentElement.classList.contains('dark')
          
          // Disable hover on sankey links (paths) - remove tooltips completely
          const paths = svg.querySelectorAll('path')
          paths.forEach(path => {
            // Completely disable pointer events on sankey paths to prevent hover tooltips
            path.setAttribute('style', 'cursor: default; pointer-events: none !important;')
            path.setAttribute('pointer-events', 'none')
            path.removeAttribute('onmouseover')
            path.removeAttribute('onmouseout')
            path.removeAttribute('onmousemove')
            path.removeAttribute('onclick')
            // Remove any event listeners by cloning the node
            const newPath = path.cloneNode(true)
            path.parentNode?.replaceChild(newPath, path)
          })
          
          // Also disable hover on any groups that contain paths
          const groups = svg.querySelectorAll('g')
          groups.forEach(group => {
            const hasPaths = group.querySelector('path')
            if (hasPaths) {
              // Don't disable pointer events on the group itself, just ensure paths inside can't be hovered
              const groupPaths = group.querySelectorAll('path')
              groupPaths.forEach(path => {
                path.setAttribute('style', 'cursor: default; pointer-events: none !important;')
                path.setAttribute('pointer-events', 'none')
              })
            }
          })
          
          // Force all rect nodes to be neutral gray (both left and right side)
          // We only want links to have platform colors, not nodes
          // Do this multiple times with intervals because Google Charts may re-render
          const forceNodeColors = () => {
            const allRects = svg.querySelectorAll('rect')
            let coloredCount = 0
            allRects.forEach(rect => {
              // Remove any hover events from rect nodes
              rect.setAttribute('pointer-events', 'none')
              
              // Force all nodes to neutral gray color - check fill
              const currentFill = rect.getAttribute('fill') || ''
              
              // Check if it's a node (not a background element) - nodes usually have non-transparent fills
              if (currentFill && currentFill !== 'none' && currentFill !== 'transparent' && currentFill !== '#ffffff') {
                // Check if it's already gray - if not, force it
                if (!currentFill.includes('94a3b8') && !currentFill.includes('gray')) {
                  rect.setAttribute('fill', '#94a3b8') // Neutral gray for all nodes
                  rect.setAttribute('opacity', '0.8')
                  rect.setAttribute('stroke', '#94a3b8')
                  rect.setAttribute('stroke-width', '1')
                  coloredCount++
                }
              }
            })
            if (coloredCount > 0) {
              console.log('🎨 [JourneyTab] Forced', coloredCount, 'nodes to neutral gray')
            }
          }
          
          // Apply immediately
          forceNodeColors()
          
          // Re-apply after a short delay (Google Charts might re-render)
          setTimeout(forceNodeColors, 100)
          setTimeout(forceNodeColors, 500)
          
          console.log('🎨 [JourneyTab] Set all nodes to neutral gray, only links have platform colors')
          
          // Process labels: style, position outside, and add hover for slugs
          const labelColor = isDarkMode ? '#ffffff' : '#000000'
          const strokeColor = isDarkMode ? '#000000' : '#ffffff'
          
          // Process each label individually
          labels.forEach((label) => {
            const text = label.textContent?.trim() || ''
            if (!text) return

            // Enhanced styling for all labels - better visibility
            label.setAttribute('font-weight', '700')
            label.setAttribute('font-size', '16')
            label.setAttribute('fill', labelColor)
            label.setAttribute('stroke', strokeColor)
            label.setAttribute('stroke-width', '2')
            label.setAttribute('stroke-linejoin', 'round')
            label.setAttribute('stroke-linecap', 'round')
            label.setAttribute('paint-order', 'stroke fill')
            
            // Add text shadow effect using filter (if supported)
            if (!isDarkMode) {
              label.setAttribute('filter', 'drop-shadow(0px 0px 2px rgba(255,255,255,0.9))')
            }

            // Get original transform from Google Charts
            const originalTransform = label.getAttribute('transform') || ''
            let baseX = 0
            let baseY = 0
            
            // Parse translate(x, y) format
            const transformMatch = originalTransform.match(/translate\(([^,]+),\s*([^)]+)\)/)
            if (transformMatch) {
              baseX = parseFloat(transformMatch[1]) || 0
              baseY = parseFloat(transformMatch[2]) || 0
            }

            // Determine if this is a platform (left side) or slug (right side)
            const platformText = text.toLowerCase()
            const isPlatform = (platformText.includes('chatgpt') || platformText.includes('gemini') || 
                platformText.includes('perplexity') || platformText.includes('claude') || 
                platformText.includes('google') || platformText.includes('copilot') ||
                platformText.includes('grok') || platformText.includes('poe') ||
                platformText.includes('character') || platformText.includes('llm')) && !text.startsWith('/')
            const isSlug = text.startsWith('/')

            // Move platform labels to the left (outside sankey) - no hover needed
            if (isPlatform) {
              const newX = baseX - 220
              label.setAttribute('transform', `translate(${newX}, ${baseY})`)
              label.setAttribute('text-anchor', 'end')
              label.setAttribute('pointer-events', 'none') // No hover on platform labels
              console.log('📍 [JourneyTab] Moved platform label left:', text, 'x:', baseX, '->', newX)
            }

            // Move slug labels to the right (outside sankey) and add hover
            if (isSlug) {
              const newX = baseX + 220
              const slugText = text // Capture in closure
              
              // Set position and styling
              label.setAttribute('transform', `translate(${newX}, ${baseY})`)
              label.setAttribute('text-anchor', 'start')
              
              // Ensure slug labels can receive mouse events
              label.setAttribute('style', 'cursor: pointer; pointer-events: all;')
              label.setAttribute('pointer-events', 'all')
              
              // Add hover events to slug labels
              const handleMouseEnter = (e: MouseEvent) => {
                e.stopPropagation()
                // Use ref to get latest map data (avoids stale closure issues)
                const currentMap = slugToPagesMapRef.current
                const pages = currentMap.get(slugText)
                console.log('🔍 [JourneyTab] Mouse entered slug label:', slugText, 'pages found:', pages?.length || 0, 'map size:', currentMap.size)
                
                if (pages && pages.length > 0) {
                  const bbox = (e.currentTarget as Element).getBoundingClientRect()
                  setHoveredSlug(slugText)
                  setHoverPosition({
                    x: bbox.right + 15,
                    y: bbox.top + (bbox.height / 2)
                  })
                  console.log('✅ [JourneyTab] Hover tooltip shown for:', slugText, 'with', pages.length, 'pages')
                } else {
                  console.warn('⚠️ [JourneyTab] No pages found for slug:', slugText, 'Available slugs:', Array.from(currentMap.keys()))
                }
              }
              
              const handleMouseLeave = (e: MouseEvent) => {
                e.stopPropagation()
                setHoveredSlug(null)
                setHoverPosition(null)
              }
              
              // Remove any existing listeners first by removing and re-adding
              const newLabel = label.cloneNode(false) as SVGTextElement
              // Copy all attributes
              Array.from(label.attributes).forEach(attr => {
                newLabel.setAttribute(attr.name, attr.value)
              })
              newLabel.textContent = label.textContent
              label.parentNode?.replaceChild(newLabel, label)
              
              // Re-apply styling after cloning
              newLabel.setAttribute('transform', `translate(${newX}, ${baseY})`)
              newLabel.setAttribute('text-anchor', 'start')
              newLabel.setAttribute('style', 'cursor: pointer; pointer-events: all;')
              newLabel.setAttribute('pointer-events', 'all')
              newLabel.setAttribute('font-weight', '700')
              newLabel.setAttribute('font-size', '16')
              newLabel.setAttribute('fill', labelColor)
              newLabel.setAttribute('stroke', strokeColor)
              newLabel.setAttribute('stroke-width', '2')
              newLabel.setAttribute('stroke-linejoin', 'round')
              newLabel.setAttribute('stroke-linecap', 'round')
              newLabel.setAttribute('paint-order', 'stroke fill')
              
              // Add event listeners to the new label
              newLabel.addEventListener('mouseenter', handleMouseEnter, { capture: true })
              newLabel.addEventListener('mouseleave', handleMouseLeave, { capture: true })
              newLabel.addEventListener('mouseover', handleMouseEnter, { capture: true })
              
              console.log('✅ [JourneyTab] Set up slug label with hover:', slugText, 'x:', baseX, '->', newX)
            }
          })
        }, 400) // wait 400 ms to ensure nodes are ready
      })

      // Add error listener
      window.google.visualization.events.addListener(chart, 'error', (error) => {
        console.error('❌ [JourneyTab] Chart error:', error);
      });
      
      console.log('✅ [JourneyTab] Google Charts Sankey initialized successfully')
      } catch (error) {
      console.error('❌ [JourneyTab] Error initializing Google Charts Sankey:', error)
      console.error('❌ [JourneyTab] Error details:', {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        sankeyData: sankeyData,
        hasGoogle: !!window.google,
        hasVisualization: !!window.google?.visualization,
        hasSankey: !!window.google?.visualization?.Sankey
      })
      }
      }, [sankeyData])

  const loadGoogleCharts = (): Promise<void> => {
      return new Promise((resolve, reject) => {
      // Check if Google Charts is already loaded and Sankey is ready
      if (window.google && window.google.charts && window.google.visualization && window.google.visualization.Sankey) {
        console.log('Google Charts already loaded with Sankey package')
        resolve()
        return
      }

      // Check if Google Charts is loaded but Sankey package isn't ready yet
      if (window.google && window.google.charts && window.google.visualization) {
        console.log('Google Charts loaded, loading Sankey package...')
        window.google.charts.load('current', { packages: ['sankey'] })
        window.google.charts.setOnLoadCallback(() => {
          console.log('Google Charts Sankey package ready')
          resolve()
        })
        return
      }

      console.log('Loading Google Charts...')
        const script = document.createElement('script')
      script.src = 'https://www.gstatic.com/charts/loader.js'
        script.onload = () => {
        console.log('Google Charts script loaded')
        window.google.charts.load('current', { packages: ['sankey'] })
        window.google.charts.setOnLoadCallback(() => {
          console.log('Google Charts Sankey package loaded')
          resolve()
        })
        }
        script.onerror = (error) => {
        console.error('Failed to load Google Charts:', error)
          reject(error)
        }
        document.head.appendChild(script)
      })
    }



  // Load Google Charts library once
  useEffect(() => {
    const loadCharts = async () => {
      console.log('🚀 [JourneyTab] Starting Google Charts loading...')
      try {
        await loadGoogleCharts()
        console.log('✅ [JourneyTab] Google Charts loaded')
      } catch (error) {
        console.error('❌ [JourneyTab] Failed to load Google Charts:', error)
      }
    }

    loadCharts()
  }, []) // Run only once on mount

  // Initialize chart when we have: loaded Google Charts, ref, and data
  useEffect(() => {
    if (!isLoading && 
        !(!realJourneyData || !realJourneyData.data || !realJourneyData.data.pages || realJourneyData.data.pages.length === 0) &&
        !(!pagesData || pagesData.length === 0)) {
      // Component is mounted and not showing skeleton
      console.log('📊 [JourneyTab] Component ready for chart initialization')
      
      const initializeWhenReady = async () => {
        // Wait for Google Charts to be ready
        if (!window.google?.visualization?.Sankey) {
          console.log('⏳ [JourneyTab] Waiting for Google Charts Sankey...')
          await loadGoogleCharts()
        }
        
        // Now wait a tick for ref to be attached
        setTimeout(() => {
          if (sankeyData.length > 0 && chartRef.current && window.google?.visualization?.Sankey) {
            console.log('✅ [JourneyTab] Initializing chart with data:', sankeyData.length)
            initChart()
          } else {
            console.log('⏳ [JourneyTab] Not ready yet:', {
              hasData: sankeyData.length > 0,
              hasRef: !!chartRef.current,
              hasSankey: !!window.google?.visualization?.Sankey
            })
          }
        }, 200)
      }
      
      initializeWhenReady()
    }
  }, [isLoading, realJourneyData, pagesData, sankeyData, initChart])

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
                          <div 
                            ref={chartRef}
                            id="chartdiv" 
                            style={{ 
                              width: '100%', 
                              maxWidth: '1200px',
                              height: '600px',
                              background: 'transparent',
                              padding: '0 120px', // wider padding for outside labels
                              overflow: 'visible',
                              margin: '0 auto'
                            }}
                          />
                        </div>
                        
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
