import React from 'react'
import { UnifiedCard, UnifiedCardContent } from '@/components/ui/unified-card'
import { Badge } from '@/components/ui/badge'
import { ChevronRight } from 'lucide-react'
import { useAnalytics } from '@/contexts/AnalyticsContext'

// Mock data for persona rankings
const personaData = [
  {
    persona: 'Software Developer',
    status: 'Leader',
    statusColor: 'bg-green-500',
    rankings: [
      { rank: 1, name: 'MongoDB', isOwner: true },
      { rank: 2, name: 'PostgreSQL' },
      { rank: 3, name: 'MySQL' },
      { rank: 4, name: 'MariaDB' },
      { rank: 5, name: 'Apache Cassandra' },
      { rank: 6, name: 'Redis' },
      { rank: 7, name: 'Elasticsearch' },
      { rank: 8, name: 'Neo4j' },
      { rank: 9, name: 'CouchDB' },
      { rank: 10, name: 'RethinkDB' },
    ]
  },
  {
    persona: 'DevOps Engineer',
    status: 'Good',
    statusColor: 'bg-yellow-500',
    rankings: [
      { rank: 1, name: 'Docker' },
      { rank: 2, name: 'Kubernetes' },
      { rank: 3, name: 'Jenkins' },
      { rank: 4, name: 'MongoDB Atlas', isOwner: true },
      { rank: 5, name: 'Terraform' },
      { rank: 6, name: 'Ansible' },
      { rank: 7, name: 'Prometheus' },
      { rank: 8, name: 'Grafana' },
      { rank: 9, name: 'ELK Stack' },
      { rank: 10, name: 'GitLab CI' },
    ]
  },
]

function UnifiedPersonaRankingsSection() {
  const { data } = useAnalytics()
  
  // Get real persona data from analytics context
  const personasData = data.visibility?.personas || []
  
  // Transform persona metrics to display format
  const realPersonaData = personasData
    .filter(persona => persona && persona.brandMetrics && Array.isArray(persona.brandMetrics))
    .map(persona => {
      const userBrand = persona.brandMetrics.find(b => b.brandName === data.userBrandName)
      const userRank = userBrand?.visibilityRank || 0
    
    // Determine status based on user's rank
    let status = 'Needs work'
    let statusColor = 'bg-red-500'
    
    if (userRank === 1) {
      status = 'Leader'
      statusColor = 'bg-green-500'
    } else if (userRank <= 3) {
      status = 'Good'
      statusColor = 'bg-yellow-500'
    }
    
    return {
      persona: persona.scopeValue,
      status,
      statusColor,
        rankings: persona.brandMetrics.slice(0, 10).map((brand, index) => ({
          rank: brand.visibilityRank || (index + 1),
          name: brand.brandName,
          isOwner: brand.brandName === data.userBrandName
        }))
    }
  })

  // Use real data if available, otherwise fall back to mock data
  const displayPersonaData = realPersonaData.length > 0 ? realPersonaData : personaData

  return (
    <div className="w-full space-y-4">
      {/* Header Section - Outside the box */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold leading-none tracking-tight text-foreground">Visibility Ranking by User Personas</h2>
          <p className="text-sm text-muted-foreground mt-2">
            Your brand&apos;s visibility ranking across different user personas
          </p>
        </div>
        
      </div>

      {/* Main Content Box */}
      <UnifiedCard className="w-full">
        <UnifiedCardContent className="p-4">
          <div className="space-y-4">
            {/* Table Header */}
            <div className="grid grid-cols-7 gap-4 items-center text-sm font-medium text-muted-foreground border-b border-border/60 pb-3">
              <div className="col-span-2">User Personas</div>
              <div className="col-span-1 text-center">#1</div>
              <div className="col-span-1 text-center">#2</div>
              <div className="col-span-1 text-center">#3</div>
              <div className="col-span-1 text-center">#4</div>
              <div className="col-span-1 text-center">#5</div>
            </div>

            {/* Persona Rows */}
            {displayPersonaData.map((persona, index) => (
              <div key={`persona-${index}-${persona.persona}`} className="grid grid-cols-7 gap-4 items-center py-3 border-b border-border/30 last:border-b-0">
                {/* Persona Column */}
                <div className="col-span-2 flex items-center gap-3">
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium text-foreground">{persona.persona}</span>
                  <Badge 
                    variant="outline" 
                    className={`text-xs px-2 py-1 text-white ${persona.statusColor} border-0`}
                  >
                    {persona.status}
                  </Badge>
                </div>

                {/* Ranking Columns */}
                {persona.rankings.slice(0, 5).map((ranking) => (
                  <div key={`${persona.persona}-${ranking.rank}`} className="col-span-1 flex justify-center">
                    <div className="w-20 h-8 flex items-center justify-center rounded-full px-2">
                      <span 
                        className="text-xs font-medium truncate" 
                        style={{color: ranking.isOwner ? '#2563EB' : 'inherit'}}
                      >
                        {ranking.name}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </UnifiedCardContent>
      </UnifiedCard>
    </div>
  )
}

export { UnifiedPersonaRankingsSection }

