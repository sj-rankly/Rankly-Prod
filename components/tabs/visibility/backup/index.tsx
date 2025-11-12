// Visibility Tab Components
export { UnifiedVisibilitySection } from './UnifiedVisibilitySection'
export { UnifiedWordCountSection } from './UnifiedWordCountSection'
export { UnifiedDepthOfMentionSection } from './UnifiedDepthOfMentionSection'
export { UnifiedAveragePositionSection } from './UnifiedAveragePositionSection'
export { UnifiedTopicRankingsSection } from './UnifiedTopicRankingsSection'
export { UnifiedPersonaRankingsSection } from './UnifiedPersonaRankingsSection'
export { ShareOfVoiceCard } from './ShareOfVoiceCard'
export { UnifiedPositionSection } from './UnifiedPositionSection'

// Visibility Tab Main Component
import { UnifiedVisibilitySection } from './UnifiedVisibilitySection'
import { UnifiedWordCountSection } from './UnifiedWordCountSection'
import { UnifiedDepthOfMentionSection } from './UnifiedDepthOfMentionSection'
import { UnifiedAveragePositionSection } from './UnifiedAveragePositionSection'
import { UnifiedTopicRankingsSection } from './UnifiedTopicRankingsSection'
import { UnifiedPersonaRankingsSection } from './UnifiedPersonaRankingsSection'
import { ShareOfVoiceCard } from './ShareOfVoiceCard'
import { UnifiedPositionSection } from './UnifiedPositionSection'
import { useAnalytics } from '@/contexts/AnalyticsContext'
import { Card, CardContent } from '@/components/ui/card'
import { useState, useEffect } from 'react'

export function VisibilityTab() {
  const { data } = useAnalytics()
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  // Prevent hydration mismatch
  if (!isMounted) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="w-full max-w-md">
          <CardContent className="p-8">
            <div className="flex flex-col items-center gap-4">
              <div className="animate-spin rounded-full border-4 border-transparent w-12 h-12 border-t-blue-500 border-r-blue-500"></div>
              <div className="text-center">
                <h3 className="text-lg font-semibold mb-2">Loading visibility metrics...</h3>
                <p className="text-sm text-gray-500">Initializing components</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Loading state
  if (data.isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="w-full max-w-md">
          <CardContent className="p-8">
            <div className="flex flex-col items-center gap-4">
              <div
                className="animate-spin rounded-full border-4 border-transparent"
                style={{
                  width: '48px',
                  height: '48px',
                  borderTopColor: 'hsl(var(--primary))',
                  borderRightColor: 'hsl(var(--primary))',
                  borderWidth: '4px'
                }}
              />
              <div className="text-center">
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  Loading visibility metrics...
                </h3>
                <p className="text-sm text-muted-foreground">
                  Fetching your brand performance data
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Error state
  if (data.error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="w-full max-w-md border-destructive">
          <CardContent className="p-8">
            <div className="text-center">
              <h3 className="text-lg font-semibold text-destructive mb-2">
                Error Loading Data
              </h3>
              <p className="text-sm text-muted-foreground">
                {data.error}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // No data state
  if (!data.visibility) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="w-full max-w-md">
          <CardContent className="p-8">
            <div className="text-center">
              <h3 className="text-lg font-semibold text-foreground mb-2">
                No Visibility Data Available
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                Complete the onboarding process and generate prompts to see your visibility metrics.
              </p>
              <a
                href="/onboarding"
                className="inline-flex items-center justify-center rounded-md text-sm font-medium bg-foreground text-background h-10 px-4 py-2 hover:bg-foreground/90"
              >
                Start Analysis
              </a>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Data available - render all sections
  return (
    <div className="space-y-6">
      {/* Unified Visibility Score Section */}
      <UnifiedVisibilitySection />

      {/* Unified Word Count Section */}
      <UnifiedWordCountSection />

      {/* Unified Depth of Mention Section */}
      <UnifiedDepthOfMentionSection />

      {/* Share of Voice Section - Full Width */}
      <ShareOfVoiceCard />

      {/* Unified Position Section */}
      <UnifiedPositionSection />

      {/* Unified Average Position Section */}
      <UnifiedAveragePositionSection />

      {/* Unified Topic Rankings Section */}
      <UnifiedTopicRankingsSection />

      {/* Unified Persona Rankings Section */}
      <UnifiedPersonaRankingsSection />
    </div>
  )
}
