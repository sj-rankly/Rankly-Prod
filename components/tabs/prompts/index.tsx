// Prompts Tab Components
export { PromptsSection } from './PromptsSection'
export { PromptBuilderModal } from './PromptBuilderModal'
export { PromptDesignerPage } from './PromptDesignerPage'
export { UnifiedPerformanceInsightsSection } from '../visibility/UnifiedPerformanceInsightsSection'

// Prompts Tab Main Component
import { PromptsSection } from './PromptsSection'
import { UnifiedPerformanceInsightsSection } from '../visibility/UnifiedPerformanceInsightsSection'

interface PromptsTabProps {
  onToggleFullScreen?: (isFullScreen: boolean) => void
  filterContext?: {
    selectedTopics: string[]
    selectedPersonas: string[]
    selectedPlatforms: string[]
  }
  dashboardData?: any
}

export function PromptsTab({ onToggleFullScreen, filterContext, dashboardData }: PromptsTabProps) {
  return (
    <div className="space-y-6">
      <PromptsSection onToggleFullScreen={onToggleFullScreen} filterContext={filterContext} dashboardData={dashboardData} />
      
      {/* Performance Insights Section */}
      <UnifiedPerformanceInsightsSection filterContext={filterContext} dashboardData={dashboardData} tabType="prompts" />
    </div>
  )
}
