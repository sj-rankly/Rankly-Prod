// Clusters Tab Components
export { ClusterViewSection } from './ClusterViewSection'

// Clusters Tab Main Component
import { ClusterViewSection } from './ClusterViewSection'

export function ClustersTab() {
  return (
    <div className="space-y-6">
      <ClusterViewSection />
    </div>
  )
}
