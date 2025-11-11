import { getPages, getDateRange } from './ga4Api'
import type { ActionablePageRow, ActionableTrafficMetrics } from '@/types/actionables'
import type { PagesResponse } from '@/types/ga4'

export interface FetchActionablesOptions {
  dateRangeLabel?: string
  conversionEvent?: string
  limit?: number
  lowTrafficThreshold?: number
}

export interface ActionablesMetadata {
  ga4: {
    startDate: string
    endDate: string
    conversionEvent: string
    requestedLimit: number
    hasGa4Data: boolean
    lowTrafficThreshold: number
    displayThreshold: number
    highestSessions: number
    baselineThreshold: number
    totalPages: number
  }
}

export interface ActionablesServiceResult {
  rows: ActionablePageRow[]
  warnings: string[]
  metadata: ActionablesMetadata
}

const DEFAULT_DATE_RANGE_DAYS = 30
const DEFAULT_DATE_RANGE_LABEL = '30 days'
const DEFAULT_CONVERSION_EVENT = 'conversions'
const DEFAULT_GA4_LIMIT = 10000 // Increased to match backend max limit to get accurate total pages count
export const DEFAULT_LOW_TRAFFIC_THRESHOLD = 50

export function canonicalizeActionableUrl(rawUrl?: string | null): string {
  if (!rawUrl || typeof rawUrl !== 'string') {
    return ''
  }

  const trimmed = rawUrl.trim()
  if (!trimmed) {
    return ''
  }

  let candidate = trimmed
  if (!candidate.startsWith('http://') && !candidate.startsWith('https://')) {
    candidate = candidate.startsWith('//') ? `https:${candidate}` : `https://${candidate.replace(/^\/*/, '')}`
  }

  try {
    const parsed = new URL(candidate)
    const hostname = parsed.hostname.replace(/^www\./, '').toLowerCase()
    if (!hostname) {
      return ''
    }

    let pathname = decodeURIComponent(parsed.pathname || '/')
    pathname = pathname.replace(/\/+/g, '/')
    if (!pathname.startsWith('/')) {
      pathname = `/${pathname}`
    }
    if (pathname.length > 1 && pathname.endsWith('/')) {
      pathname = pathname.slice(0, -1)
    }

    return `${hostname}${pathname}`
  } catch {
    return ''
  }
}

function parseDateRangeLabel(label?: string): { days: number; label: string } {
  if (!label) {
    return { days: DEFAULT_DATE_RANGE_DAYS, label: DEFAULT_DATE_RANGE_LABEL }
  }

  const parsed = Number.parseInt(label, 10)
  if (Number.isFinite(parsed) && parsed > 0) {
    return { days: parsed, label }
  }

  return { days: DEFAULT_DATE_RANGE_DAYS, label: DEFAULT_DATE_RANGE_LABEL }
}

function mapGa4Metrics(page: PagesResponse['pages'][number]): ActionableTrafficMetrics {
  return {
    sessions: Number(page.sessions) || 0,
    sqs: page.sqs !== undefined ? Number(page.sqs) : undefined,
    conversionRate: page.conversionRate !== undefined ? Number(page.conversionRate) : undefined,
    bounceRate: page.bounce !== undefined ? Number(page.bounce) : undefined,
    timeOnPage: page.timeOnPage !== undefined ? Number(page.timeOnPage) : undefined,
  }
}

export async function fetchActionablePages(options: FetchActionablesOptions = {}): Promise<ActionablesServiceResult> {
  const { days, label: dateRangeLabel } = parseDateRangeLabel(options.dateRangeLabel)
  const conversionEvent = options.conversionEvent || DEFAULT_CONVERSION_EVENT
  const limit = options.limit || DEFAULT_GA4_LIMIT
  const warnings: string[] = []

  const { startDate, endDate } = getDateRange(days)

  let ga4Pages: PagesResponse['pages'] = []
  let ga4Summary: PagesResponse['summary'] | null = null

  try {
    const ga4Response = await getPages(startDate, endDate, limit, dateRangeLabel, conversionEvent)
    if (ga4Response.success && ga4Response.data?.pages) {
      ga4Pages = ga4Response.data.pages
      ga4Summary = ga4Response.data.summary ?? null
    } else if (ga4Response.error) {
      warnings.push(ga4Response.error)
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to fetch GA4 pages'
    warnings.push(message)
  }

  const ga4PageMap = new Map<string, PagesResponse['pages'][number]>()
  ga4Pages.forEach((page) => {
    const canonical = canonicalizeActionableUrl(page.url)
    const candidates = [
      canonical && canonical.length > 0 ? canonical : null,
      page.pagePath && page.pagePath.length > 0 ? page.pagePath : null,
      page.url && page.url.length > 0 ? page.url : null,
      page.pageTitle && page.pageTitle.length > 0 ? page.pageTitle : null,
    ].filter(Boolean) as string[]

    const key = candidates[0]
    if (!key) {
      return
    }

    const existing = ga4PageMap.get(key)
    if (!existing || (Number(page.sessions) || 0) > (Number(existing.sessions) || 0)) {
      ga4PageMap.set(key, page)
    }
  })

  const uniqueGa4Pages = Array.from(ga4PageMap.values())
  const highestSessions = uniqueGa4Pages.reduce(
    (max, page) => Math.max(max, Number(page.sessions) || 0),
    0,
  )

  if (highestSessions <= 0) {
    warnings.push('No GA4 LLM sessions detected for the selected range.')
  }

  const baselineThreshold = highestSessions * 0.1
  const targetThreshold = options.lowTrafficThreshold ?? baselineThreshold
  const displayThreshold = targetThreshold >= 1 ? Number(targetThreshold.toFixed(2)) : targetThreshold

  if (process.env.NODE_ENV !== 'production') {
    const pagesBySessions = uniqueGa4Pages
      .map((page) => ({
        title: page.title || page.pageTitle || page.url || 'Untitled Page',
        url: page.url || page.pagePath || '',
        sessions: Number(page.sessions) || 0,
      }))
      .sort((a, b) => b.sessions - a.sessions)

    console.log('[ActionablesService] GA4 summary', {
      startDate,
      endDate,
      totalPages: ga4Pages.length,
      uniquePages: uniqueGa4Pages.length,
      highestSessions,
      baselineThreshold,
      targetThreshold,
      displayThreshold,
      warnings,
    })
    console.log('[ActionablesService] GA4 sessions (top 15)', pagesBySessions.slice(0, 15))
    console.log('[ActionablesService] GA4 sessions (bottom 15)', pagesBySessions.slice(-15))

    const sampleSessions = uniqueGa4Pages
      .map((page) => Number(page.sessions) || 0)
      .sort((a, b) => a - b)
      .slice(0, 10)
    console.log('[ActionablesService] Lowest session samples', sampleSessions)
  }

  const filteredPages = uniqueGa4Pages.filter((page) => {
    const sessions = Number(page.sessions) || 0
    return highestSessions > 0 && sessions < targetThreshold
  })

  if (process.env.NODE_ENV !== 'production') {
    console.log('[ActionablesService] Filtered pages summary', {
      totalCandidates: uniqueGa4Pages.length,
      filteredCount: filteredPages.length,
      highestSessions,
      targetThreshold,
    })
    console.log(
      '[ActionablesService] Filtered pages detail',
      filteredPages.map((page) => ({
        title: page.title || page.pageTitle || page.url || 'Untitled Page',
        url: page.url || page.pagePath || '',
        sessions: Number(page.sessions) || 0,
        threshold: targetThreshold,
        highestSessions,
      })),
    )
  }

  const enrichedRows: ActionablePageRow[] = filteredPages
    .map((page) => {
      const canonical = canonicalizeActionableUrl(page.url)
      const traffic = mapGa4Metrics(page)

      return {
        id: canonical || page.pagePath || page.pageTitle || page.url || String(Math.random()),
        title: page.title || page.pageTitle || page.url || 'Untitled Page',
        url: page.url || page.pagePath || '',
        normalizedUrl: page.url || page.pagePath || '',
        hostname: canonical ? canonical.split('/')[0] || '' : '',
        sourceUrls: [page.url || page.pagePath || ''].filter(Boolean),
        traffic,
        citations: {
          platforms: [],
          totalCitations: 0,
          details: [],
        },
        platformSessions: page.platformSessions,
        contentGroup: page.contentGroup,
        llmJourney: page.llmJourney,
        provider: page.provider,
        recommendedAction: 'regenerate-content' as const,
        actionableReason: 'low_llm_traffic' as const,
        hasMappingWarning: false,
        mapping: undefined,
      }
    })
    .sort((a, b) => (a.traffic.sessions || 0) - (b.traffic.sessions || 0))

  // Use totalPages from GA4 summary (pages returned for the date range) before deduplication
  // This ensures we're counting all pages in the selected date range (e.g., 30 days)
  const totalPagesFromGa4 = ga4Summary?.totalPages ?? ga4Pages.length

  const metadata: ActionablesMetadata = {
    ga4: {
      startDate,
      endDate,
      conversionEvent,
      requestedLimit: limit,
      hasGa4Data: ga4Pages.length > 0 || Boolean(ga4Summary),
      lowTrafficThreshold: targetThreshold,
      displayThreshold,
      highestSessions,
      baselineThreshold,
      totalPages: totalPagesFromGa4,
    },
  }

  return {
    rows: enrichedRows,
    warnings,
    metadata,
  }
}


