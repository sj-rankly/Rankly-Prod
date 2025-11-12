export interface GA4Connection {
  connected: boolean
  isActive: boolean
  propertyName?: string
  accountName?: string
}

export interface GA4Account {
  accountId: string
  accountName: string
  properties: GA4Property[]
}

export interface GA4Property {
  propertyId: string
  propertyName: string
}

export interface PlatformData {
  platform: string
  sessions: number
  users: number
  percentage: number
}

export interface PageData {
  pagePath?: string
  pageTitle?: string
  title?: string
  url?: string
  sessions: number
  pageViews?: number
  sqs?: number
  conversionRate?: number
  bounce?: number
  timeOnPage?: number
  contentGroup?: string
  llmJourney?: string
  provider?: string
  platformSessions?: Record<string, number>
}

export interface GeoData {
  country: string
  sessions: number
  users: number
}

export interface DeviceData {
  device: string
  os: string
  browser: string
  sessions: number
}

export interface PlatformSplitData {
  platform: string
  sessions: string
  percentage: string
}

export interface LLMPlatformData {
  platform: string
  sessions: string
  users: string
  pageViews: string
}

export interface DateRange {
  startDate: string
  endDate: string
}

export interface GA4ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
}

export interface PagesResponse {
  pages: PageData[]
  summary: {
    totalSessions: number
    totalPages: number
    avgSQS: number
  }
}

