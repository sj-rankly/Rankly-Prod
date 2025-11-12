import React from 'react'
import { UnifiedCard, UnifiedCardContent } from '@/components/ui/unified-card'
import { Badge } from '@/components/ui/badge'
import { ChevronRight } from 'lucide-react'
import { useAnalytics } from '@/contexts/AnalyticsContext'

// Mock data for topic rankings
const topicData = [
  {
    topic: 'Scalable Database Systems',
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
    topic: 'Cloud Infrastructure',
    status: 'Good',
    statusColor: 'bg-yellow-500',
    rankings: [
      { rank: 1, name: 'AWS' },
      { rank: 2, name: 'Google Cloud' },
      { rank: 3, name: 'Microsoft Azure' },
      { rank: 4, name: 'MongoDB Atlas', isOwner: true },
      { rank: 5, name: 'DigitalOcean' },
      { rank: 6, name: 'Heroku' },
      { rank: 7, name: 'Vercel' },
      { rank: 8, name: 'Netlify' },
      { rank: 9, name: 'Railway' },
      { rank: 10, name: 'Render' },
    ]
  },
]

function UnifiedTopicRankingsSection() {
  const { data } = useAnalytics()
  
  // Get real topic data from analytics context
  const topicsData = data.visibility?.topics || []
  
  // Transform topic metrics to display format
  const realTopicData = topicsData
    .filter(topic => topic && topic.brandMetrics && Array.isArray(topic.brandMetrics))
    .map(topic => {
      const userBrand = topic.brandMetrics.find(b => b.brandName === data.userBrandName)
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
      topic: topic.scopeValue,
      status,
      statusColor,
        rankings: topic.brandMetrics.slice(0, 10).map((brand, index) => ({
          rank: brand.visibilityRank || (index + 1),
          name: brand.brandName,
          isOwner: brand.brandName === data.userBrandName
        }))
    }
  })

  // Use real data if available, otherwise fall back to mock data
  const displayTopicData = realTopicData.length > 0 ? realTopicData : topicData

  return (
    <div className="w-full space-y-4">
      {/* Header Section - Outside the box */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold leading-none tracking-tight text-foreground">Visibility Ranking by Topic</h2>
          <p className="text-sm text-muted-foreground mt-2">
            Your brand&apos;s visibility ranking across different topics
          </p>
        </div>
        
      </div>

      {/* Main Content Box */}
      <UnifiedCard className="w-full">
        <UnifiedCardContent className="p-4">
          <div className="space-y-4">
            {/* Table Header */}
            <div className="grid grid-cols-7 gap-4 items-center text-sm font-medium text-muted-foreground border-b border-border/60 pb-3">
              <div className="col-span-2">Topics</div>
              <div className="col-span-1 text-center">#1</div>
              <div className="col-span-1 text-center">#2</div>
              <div className="col-span-1 text-center">#3</div>
              <div className="col-span-1 text-center">#4</div>
              <div className="col-span-1 text-center">#5</div>
            </div>

            {/* Topic Rows */}
            {displayTopicData.map((topic, index) => (
              <div key={`topic-${index}-${topic.topic}`} className="grid grid-cols-7 gap-4 items-center py-3 border-b border-border/30 last:border-b-0">
                {/* Topic Column */}
                <div className="col-span-2 flex items-center gap-3">
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium text-foreground">{topic.topic}</span>
                  <Badge 
                    variant="outline" 
                    className={`text-xs px-2 py-1 text-white ${topic.statusColor} border-0`}
                  >
                    {topic.status}
                  </Badge>
                </div>

                {/* Ranking Columns */}
                {topic.rankings.slice(0, 5).map((ranking) => (
                  <div key={`${topic.topic}-${ranking.rank}`} className="col-span-1 flex justify-center">
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

export { UnifiedTopicRankingsSection }
