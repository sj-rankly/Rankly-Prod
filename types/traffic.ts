export type Range = {
  from: Date
  to: Date
}

export interface PageMetrics {
  url: string
  title: string
  sessions: number
  sqs: number // Session Quality Score
  contentGroup: string
  conversionRate: number
  bounce: number // Bounce rate (0-1)
  pageType: string
  timeOnPage: number // in seconds
  llmJourney: 'entry' | 'middle' | 'exit'
  provider: string
  pagePath?: string
}

export interface LLMTrafficData {
  data: {
    pages: PageMetrics[]
    summary: {
      totalSessions: number
      totalPages: number
      averageSQS: number
      topProvider: string
    }
  }
}
