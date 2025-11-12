// Citations Tab Components
export { CitationShareSection } from './CitationShareSection'
export { CitationTypesSection } from './CitationTypesSection'
export { CitationTypesDetailSection } from './CitationTypesDetailSection'
export { UnifiedPerformanceInsightsSection } from '../visibility/UnifiedPerformanceInsightsSection'

// Citations Tab Main Component
import { CitationShareSection } from './CitationShareSection'
import { CitationTypesSection } from './CitationTypesSection'
import { CitationTypesDetailSection } from './CitationTypesDetailSection'
import { UnifiedPerformanceInsightsSection } from '../visibility/UnifiedPerformanceInsightsSection'

interface CitationsTabProps {
  filterContext?: {
    selectedTopics: string[]
    selectedPersonas: string[]
    selectedPlatforms: string[]
  }
  dashboardData?: any
}

export function CitationsTab({ filterContext, dashboardData }: CitationsTabProps) {
  return (
    <div className="space-y-6">
      <CitationShareSection filterContext={filterContext} dashboardData={dashboardData} />
      <CitationTypesSection filterContext={filterContext} dashboardData={dashboardData} />
      <CitationTypesDetailSection filterContext={filterContext} dashboardData={dashboardData} />
      
      {/* Performance Insights Section */}
      <UnifiedPerformanceInsightsSection filterContext={filterContext} dashboardData={dashboardData} tabType="citations" />
    </div>
  )
}
