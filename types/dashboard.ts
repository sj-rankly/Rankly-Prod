// Dashboard TypeScript interfaces

export interface Competitor {
  id: string
  name: string
  logo: string
  score: number
  rank: number
  change: number // percentage change
  trend: 'up' | 'down' | 'stable'
  isOwner?: boolean // Whether this is the user's brand
  // ✅ Sentiment data for sentiment analysis
  sentimentScore?: number
  sentimentBreakdown?: {
    positive: number
    neutral: number
    negative: number
    mixed: number
  }
  // ✅ Citation data for citation analysis
  citationShare?: number
  citationRank?: number
  brandCitationsTotal?: number
  earnedCitationsTotal?: number
  socialCitationsTotal?: number
  totalCitations?: number
}

export interface Metric {
  id: string
  title: string
  description: string
  value: number
  unit: string
  change: number
  trend: 'up' | 'down' | 'stable'
  data: ChartDataPoint[]
}

export interface ChartDataPoint {
  name: string
  value: number
  fill?: string
  [key: string]: any // Allow additional properties for recharts compatibility
}

export interface TopicRanking {
  id: string
  topic: string
  competitors: Competitor[]
}

export interface PersonaRanking {
  id: string
  persona: string
  competitors: Competitor[]
}

export interface Platform {
  id: string
  name: string
  enabled: boolean
}

export interface Topic {
  id: string
  name: string
  enabled: boolean
}

export interface Persona {
  id: string
  name: string
  enabled: boolean
}

export interface FilterState {
  dateRange: {
    from: Date
    to: Date
  }
  platforms: string[]
  topics: string[]
  personas: string[]
}

export interface VisibilityMetrics {
  competitorsByDepth?: Competitor[]
  competitorsByPosition?: Competitor[]
  competitorsBySov?: Competitor[]
  competitorsByCitation?: Competitor[]
  visibilityScore: Metric
  shareOfVoice: Metric
  averagePosition: Metric
  depthOfMention: Metric
  sentiment: Metric
  citationShare: Metric
  topicRankings: TopicRanking[]
  personaRankings: PersonaRanking[]
  competitors: Competitor[]
  // ✅ Add platform-specific metrics for detailed citation analysis
  platformMetrics?: any[]
  topics?: any[]
  personas?: any[]
}

export interface DashboardData {
  metrics: VisibilityMetrics
  filters: {
    platforms: Platform[]
    topics: Topic[]
    personas: Persona[]
  }
  lastUpdated: Date
  // ✅ Add missing properties
  aiInsights?: any
}
