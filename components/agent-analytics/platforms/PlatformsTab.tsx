/**
* Platforms Tab - Rankly Design System
*
* Shows LLM platform performance with Rankly's design patterns
*/

'use client'

import type { Range } from '@/types/traffic'
import { UnifiedPlatformSplitSection } from './UnifiedPlatformSplitSection'
import { UnifiedTrafficPerformanceSection } from './UnifiedTrafficPerformanceSection'
import { UnifiedPlatformsSplitSection } from './UnifiedPlatformsSplitSection'
import { UnifiedLLMPlatformPerformanceSection } from './UnifiedLLMPlatformPerformanceSection'
import { PlatformSkeleton } from '@/components/ui/platform-skeleton'

interface PlatformsTabProps {
  range: Range
  realLLMData?: any
  realPlatformData?: any
  dateRange?: string
  isLoading?: boolean
  selectedConversionEvent?: string
  onConversionEventChange?: (event: string) => void
}

export function PlatformsTab({ range, realLLMData, realPlatformData, dateRange = '30 days', isLoading = false, selectedConversionEvent = 'conversions', onConversionEventChange }: PlatformsTabProps) {
  // Show skeleton if no data and not loading
  if ((!realLLMData || !realLLMData.data || !realLLMData.data.platforms || realLLMData.data.platforms.length === 0) && 
      (!realPlatformData || !realPlatformData.data || !realPlatformData.data.platforms || realPlatformData.data.platforms.length === 0) && 
      !isLoading) {
    return <PlatformSkeleton />
  }

  return (
    <div className="space-y-6">
      {/* Traffic Split Section */}
      <UnifiedPlatformSplitSection realLLMData={realPlatformData} dateRange={dateRange} isLoading={isLoading} />

      {/* Traffic Performance Section */}
      <UnifiedTrafficPerformanceSection 
        realPlatformData={realPlatformData} 
        dateRange={dateRange} 
        isLoading={isLoading}
        selectedConversionEvent={selectedConversionEvent}
        onConversionEventChange={onConversionEventChange}
      />

      {/* Platforms Split Section */}
      <UnifiedPlatformsSplitSection realLLMData={realLLMData} dateRange={dateRange} isLoading={isLoading} />

      {/* LLM Platform Performance Section */}
      <UnifiedLLMPlatformPerformanceSection 
        realLLMData={realLLMData} 
        dateRange={dateRange} 
        isLoading={isLoading}
        selectedConversionEvent={selectedConversionEvent}
        onConversionEventChange={onConversionEventChange}
      />
    </div>
  )
}