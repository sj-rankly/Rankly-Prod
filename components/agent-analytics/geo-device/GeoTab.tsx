/**
 * Geo Tab - Geographic Analytics Module
 *
 * Shows country-level traffic performance with choropleth map
 */

'use client'

import React, { useState } from 'react'
import type { Range } from '@/types/traffic'
import { UnifiedCard, UnifiedCardContent } from '@/components/ui/unified-card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Info, Expand, X } from 'lucide-react'
import { ChoroplethMap } from '@/components/charts/ChoroplethMap'
import { GeoDeviceSkeleton } from '@/components/ui/geo-device-skeleton'
import { getDynamicFaviconUrl, handleFaviconError } from '@/lib/faviconUtils'

interface GeoTabProps {
  range: Range
  realGeoData?: any
  dateRange?: string
  isLoading?: boolean
}

// Function to get the domain for each LLM platform for favicon fetching
function getLLMDomain(platform: string): string {
  const platformLower = platform.toLowerCase().trim()
  
  // Comprehensive LLM platform mappings
  if (platformLower === 'chatgpt' || platformLower.includes('openai') || platformLower.includes('gpt')) {
    return 'chatgpt.com'
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
  
  // For unknown platforms, construct domain from platform name
  const cleanPlatform = platformLower
    .replace(/\s+/g, '')
    .replace(/[^a-z0-9]/g, '')
  
  if (cleanPlatform) {
    return `${cleanPlatform}.com`
  }
  
  return 'google.com'
}

export function GeoTab({ range, realGeoData, dateRange = '30 days', isLoading = false }: GeoTabProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)

  // Show skeleton if loading
  if (isLoading) {
    return <GeoDeviceSkeleton />
  }

  // If no real data, show skeleton loading state
  if (!realGeoData || !realGeoData.data?.countries || realGeoData.data.countries.length === 0) {
    return <GeoDeviceSkeleton />
  }

  const countries = realGeoData.data?.countries || []
  const totalSessions = realGeoData.data?.totalSessions || 0
  const topCountries = countries.slice(0, 10)

  // Calculate LLM platform breakdown from country data
  const platformBreakdown = realGeoData.data?.platformBreakdown || []

  return (
    <div>
      <UnifiedCard className="w-full">
        <UnifiedCardContent className="p-4">
          <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-foreground">LLM Geographic Performance</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  LLM traffic metrics by country
                </p>
              </div>
              
              {/* Spacer */}
              <div className="flex-1"></div>
              
              <div className="flex items-center gap-4">
                {/* Platform Breakdown */}
                {platformBreakdown.length > 0 && (
                  <div className="flex items-center gap-3">
                    {platformBreakdown.map((platform: any, index: number) => (
                      <div key={index} className="flex items-center gap-2">
                        <img 
                          src={getDynamicFaviconUrl(getLLMDomain(platform.name), 64)} 
                          alt={`${platform.name} favicon`}
                          className="w-6 h-6 rounded-sm"
                          title={platform.name}
                          data-favicon-identifier={platform.name}
                          data-favicon-size="64"
                          onError={(e) => {
                            handleFaviconError(e as any)
                            const target = e.target as HTMLImageElement
                            if (!target.src.includes('fetchfavicon') && !target.src.includes('google.com')) {
                              target.style.display = 'none'
                              const fallback = document.createElement('div')
                              fallback.className = 'w-6 h-6 rounded-full bg-muted flex items-center justify-center'
                              const text = document.createElement('span')
                              text.className = 'text-xs font-bold text-foreground'
                              text.textContent = platform.name[0]
                              fallback.appendChild(text)
                              target.parentNode?.insertBefore(fallback, target)
                            }
                          }}
                        />
                        <span className="text-sm font-semibold text-foreground">{platform.sessions}</span>
                      </div>
                    ))}
                  </div>
                )}
                
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="text-sm text-muted-foreground cursor-help">
                        Total Sessions <span className="text-lg font-semibold text-foreground ml-1">{totalSessions}</span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-sm">
                      <p className="font-semibold mb-1">Total LLM Sessions</p>
                      <p className="text-sm">
                        Total number of sessions originating from LLM platforms (ChatGPT, Claude, Gemini, Perplexity, etc.) for the selected date range.
                      </p>
                      <p className="text-xs mt-2 text-muted-foreground">
                        Note: Session counts may vary slightly between Geo and Device tabs due to how GA4 aggregates data across different dimension combinations. This is expected behavior.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <div className="text-sm text-muted-foreground">
                  Countries <span className="text-lg font-semibold text-foreground ml-1">{countries.length}</span>
                </div>
              </div>
            </div>

            {/* Main Content - 3/4 Choropleth + 1/4 Countries List */}
            <div className="grid grid-cols-4 gap-2">
              {/* Choropleth Map - 3/4 width */}
              <div className="col-span-3">
                <div className="border rounded-lg overflow-hidden">
                  <ChoroplethMap countries={countries} totalSessions={totalSessions} />
                </div>
              </div>

              {/* Countries List - 1/4 width */}
              <div className="col-span-1">
                <div className="border rounded-lg p-4 h-[500px] flex flex-col">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-base font-semibold text-foreground">Top Countries</h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsModalOpen(true)}
                      className="h-8 px-2"
                    >
                      <Expand className="h-3 w-3 mr-1" />
                      Expand
                    </Button>
                  </div>

                  <div className="space-y-2 flex-1 overflow-y-auto">
                    {topCountries.map((country: any, index: number) => (
                      <div key={index} className="flex items-center justify-between p-2 rounded hover:bg-muted/50 transition-colors">
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-foreground truncate">
                            {country.country}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {country.sessions} sessions ({country.percentage.toFixed(1)}%)
                          </div>
                        </div>
                        <div className="w-16 h-2 bg-muted rounded-full ml-2">
                          <div 
                            className="h-2 bg-blue-500 rounded-full transition-all duration-300"
                            style={{ width: `${(country.sessions / topCountries[0]?.sessions) * 100}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </UnifiedCardContent>
      </UnifiedCard>

      {/* Modal for All Countries - Only shows table, no map */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                  <DialogContent className="max-w-lg max-h-[90vh] overflow-hidden flex flex-col border-2 shadow-2xl z-[9999]">
                    <DialogHeader className="border-b pb-4">
                      <DialogTitle className="text-xl font-semibold">All Countries - LLM Geographic Performance</DialogTitle>
                    </DialogHeader>
                    
                    <div className="flex-1 overflow-y-auto p-4">
                      <div className="space-y-2">
                        {countries.map((country: any, index: number) => (
                          <div 
                            key={index} 
                            className="flex items-center justify-between p-2 rounded hover:bg-muted/50 transition-colors"
                          >
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-3 mb-1">
                                <div className="flex items-center justify-center w-5 h-5 rounded-full bg-blue-100 text-blue-600 font-semibold text-xs">
                                  {index + 1}
                                </div>
                                <div className="text-sm font-medium">
                                  {country.country}
                                </div>
                              </div>
                              <div className="text-xs text-muted-foreground ml-8">
                                {country.sessions} sessions ({country.percentage.toFixed(1)}%)
                              </div>
                            </div>
                            <div className="w-16 h-2 bg-muted rounded-full ml-2">
                              <div
                                className="h-2 bg-blue-500 rounded-full transition-all duration-300"
                                style={{ width: `${(country.sessions / countries[0]?.sessions) * 100}%` }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
