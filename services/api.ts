import { classifyError, isRetryableError, getUserFriendlyMessage, sleep, getRetryDelay, type ApiError } from '@/lib/utils/errorUtils'
import type {
  ActionablePageContentRequest,
  ActionablePageContentResponse,
  ActionableRegenerateContentRequest,
  ActionableRegenerateContentResponse,
} from '@/types/actionables'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'
const DEFAULT_TIMEOUT = 120000 // 120 seconds (2 minutes) - increased for long-running operations
const MAX_RETRIES = 3
const RETRYABLE_STATUS_CODES = [408, 429, 500, 502, 503, 504]

class ApiService {
  token: string | null = null

  constructor() {
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('authToken')
    }

    // Validate API_BASE_URL
    if (!API_BASE_URL || API_BASE_URL.trim() === '') {
      console.error('⚠️ NEXT_PUBLIC_API_URL is not configured')
    }
  }

  setToken(token: string) {
    this.token = token
    if (typeof window !== 'undefined') {
      localStorage.setItem('authToken', token)
    }
  }

  clearToken() {
    this.token = null
    if (typeof window !== 'undefined') {
      localStorage.removeItem('authToken')
    }
  }

  getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }

    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`
    }

    return headers
  }

  /**
   * Create abort controller for timeout
   */
  private createTimeoutController(timeout: number): AbortController {
    const controller = new AbortController()
    setTimeout(() => controller.abort(), timeout)
    return controller
  }

  /**
   * Parse JSON response safely
   */
  private async parseJsonResponse(response: Response): Promise<any> {
    const contentType = response.headers.get('content-type')
    
    // Check if response is JSON
    if (!contentType || !contentType.includes('application/json')) {
      const text = await response.text()
      throw new Error(`Expected JSON response but got ${contentType}. Response: ${text.substring(0, 200)}`)
    }

    try {
      const text = await response.text()
      if (!text) {
        return {}
      }
      return JSON.parse(text)
    } catch (parseError) {
      console.error('❌ [API] Failed to parse JSON response:', parseError)
      throw new Error('Invalid response format from server')
    }
  }

  /**
   * Make request with retry logic
   */
  async request(
    endpoint: string, 
    options: RequestInit & { timeout?: number } = {}, 
    retryCount: number = 0
  ): Promise<any> {
    // Validate endpoint
    if (!endpoint || typeof endpoint !== 'string') {
      throw new Error('Invalid endpoint provided')
    }

    // Validate API_BASE_URL
    if (!API_BASE_URL || API_BASE_URL.trim() === '') {
      throw new Error('API base URL is not configured')
    }

    // Add cache-busting parameter to ensure fresh data
    const separator = endpoint.includes('?') ? '&' : '?'
    const url = `${API_BASE_URL}${endpoint}${separator}_t=${Date.now()}`
    
    // Extract timeout from options before spreading
    const { timeout, ...restOptions } = options as any
    
    // Create timeout controller
    const timeoutValue = timeout || DEFAULT_TIMEOUT
    const timeoutController = this.createTimeoutController(timeoutValue)
    
    const config: RequestInit = {
      headers: this.getHeaders(),
      credentials: 'include', // Include cookies for session-based auth (OAuth)
      signal: timeoutController.signal,
      ...restOptions,
    }

    console.log(`🌐 [API] ${options.method || 'GET'} ${endpoint}${retryCount > 0 ? ` (retry ${retryCount}/${MAX_RETRIES})` : ''}`)
    console.log(`📍 [API] Full URL: ${url}`)

    if (options.body) {
      try {
        console.log(`📦 [API] Request body:`, JSON.parse(options.body as string))
      } catch (e) {
        // Body might not be JSON, that's okay
      }
    }

    try {
      const startTime = Date.now()
      const response = await fetch(url, config)
      const duration = Date.now() - startTime

      console.log(`✅ [API] Response received in ${duration}ms (status: ${response.status})`)

      // Parse JSON safely
      let data: any
      try {
        data = await this.parseJsonResponse(response)
      } catch (parseError) {
        // If parsing fails, check if it's an expected error scenario
        if (!response.ok) {
          const errorText = await response.text().catch(() => 'Unknown error')
          throw new Error(`Server error (${response.status}): ${errorText.substring(0, 100)}`)
        }
        throw parseError
      }

      if (!response.ok) {
        // Check if this is an expected error that shouldn't be logged as red error
        const isExpectedError =
          response.status === 404 ||
          response.status === 401 || // Unauthorized (invalid token)
          data.message?.includes('No metrics') ||
          data.message?.includes('not found') ||
          data.message?.includes('Please run prompt tests first') ||
          data.message?.includes('No insights found') ||
          data.message?.includes('Generate insights first') ||
          data.message?.includes('Invalid token') ||
          data.message?.includes('Token expired') ||
          data.message?.includes('Unauthorized')

        // Enhanced debug logging
        console.log(`🔍 [API] DEBUG - Response not OK:`, {
          status: response.status,
          statusText: response.statusText,
          endpoint: endpoint,
          message: data.message,
          fullData: data,
          isExpectedError
        })

        // ✅ FIX: Backend returns 'error' field, not 'message' for ValidationError
        const errorMessage = data.message || data.error || 'API request failed'
        
        // Check if error is retryable
        const errorInfo: ApiError = {
          message: errorMessage,
          code: data.code,
          status: response.status,
          isRetryable: RETRYABLE_STATUS_CODES.includes(response.status),
        }

        // Retry if appropriate
        if (isRetryableError(errorInfo) && retryCount < MAX_RETRIES) {
          const delay = getRetryDelay(retryCount)
          console.log(`⏳ [API] Retrying in ${delay}ms... (attempt ${retryCount + 1}/${MAX_RETRIES})`)
          await sleep(delay)
          return this.request(endpoint, options, retryCount + 1)
        }

        if (isExpectedError) {
          // Don't log error for expected scenarios (no data, invalid token, etc.)
          console.log(`ℹ️ [API] Expected response (${response.status}): ${errorMessage}`)
        } else {
          // Log actual errors
          console.error(`❌ [API] Request failed:`, errorMessage, {
            code: data.code,
            errors: data.errors,
            status: response.status,
          })
        }

        // ✅ FIX: Include validation errors in the error message if available
        let fullErrorMessage = errorMessage
        if (data.errors && Array.isArray(data.errors) && data.errors.length > 0) {
          const errorDetails = data.errors.map((e: any) => e.message || e.field).join(', ')
          fullErrorMessage = `${errorMessage} (${errorDetails})`
        }

        throw new Error(fullErrorMessage)
      }

      console.log(`📦 [API] Response data:`, data)
      return data

    } catch (error: any) {
      // Handle AbortError (timeout)
      if (error.name === 'AbortError') {
        const timeoutError: ApiError = {
          message: getUserFriendlyMessage({ isTimeout: true } as ApiError),
          code: 'TIMEOUT',
          isTimeout: true,
          isRetryable: true,
        }

        // Retry on timeout if we haven't exceeded max retries
        if (retryCount < MAX_RETRIES) {
          const delay = getRetryDelay(retryCount)
          console.log(`⏳ [API] Request timed out, retrying in ${delay}ms... (attempt ${retryCount + 1}/${MAX_RETRIES})`)
          await sleep(delay)
          return this.request(endpoint, options, retryCount + 1)
        }

        throw new Error(timeoutError.message)
      }

      // Handle network errors
      const classifiedError = classifyError(error)
      
      // Retry on network errors if retryable
      if (isRetryableError(classifiedError) && retryCount < MAX_RETRIES) {
        const delay = getRetryDelay(retryCount)
        console.log(`⏳ [API] Network error, retrying in ${delay}ms... (attempt ${retryCount + 1}/${MAX_RETRIES})`)
        await sleep(delay)
        return this.request(endpoint, options, retryCount + 1)
      }

      // Only log if it's not an expected error
      if (error instanceof Error &&
          !error.message.includes('No metrics') &&
          !error.message.includes('not found') &&
          !error.message.includes('Invalid token') &&
          !error.message.includes('Unauthorized')) {
        console.error('❌ [API ERROR]:', error)
      }

      // Throw user-friendly error
      throw new Error(getUserFriendlyMessage(classifiedError))
    }
  }

  // Generic GET method
  async get(endpoint: string) {
    return this.request(endpoint, { method: 'GET' })
  }

  // Auth endpoints
  async register(userData: any) {
    return this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    })
  }

  async login(email: string, password: string) {
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })
  }

  async getCurrentUser() {
    return this.request('/auth/me')
  }

  async verifyEmail(token: string) {
    return this.request('/auth/verify-email', {
      method: 'POST',
      body: JSON.stringify({ token }),
    })
  }

  async refreshToken(refreshToken: string) {
    return this.request('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    })
  }

  async logout() {
    return this.request('/auth/logout', {
      method: 'POST',
    })
  }

  // Onboarding endpoints
  async getOnboardingData() {
    return this.request('/onboarding')
  }

  async updateOnboardingStep(stepNumber: number, data: any) {
    return this.request(`/onboarding/step/${stepNumber}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  async updateOnboardingBulk(data: any) {
    return this.request('/onboarding/bulk', {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  async resetOnboarding() {
    return this.request('/onboarding/reset', {
      method: 'POST',
    })
  }

  // Website analysis endpoint
  async analyzeWebsite(url: string) {
    return this.request('/onboarding/analyze-website', {
      method: 'POST',
      body: JSON.stringify({ url }),
      timeout: 600000, // 10 minutes to match Nginx proxy_read_timeout (AI processing can take time)
    })
  }

  // Get latest analysis results
  async getLatestAnalysis() {
    return this.request('/onboarding/latest-analysis')
  }

  // Get cached onboarding data for demo account
  async getCachedOnboardingData(url: string) {
    return this.request(`/onboarding/cached-data?url=${encodeURIComponent(url)}`)
  }

  // Check if user has done URL analysis
  async hasAnalysis() {
    return this.request('/onboarding/has-analysis')
  }

  // Generate prompts based on selected topics and personas
  async generatePrompts(urlAnalysisId?: string) {
    return this.request('/onboarding/generate-prompts', {
      method: 'POST',
      timeout: 600000, // 10 minutes to match Nginx proxy_read_timeout (can involve multiple AI calls)
      body: urlAnalysisId ? JSON.stringify({ urlAnalysisId }) : undefined,
    })
  }

  // Update selections for competitors, topics, and personas
  async updateSelections(competitors: string[], topics: string[], personas: string[], urlAnalysisId?: string) {
    return this.request('/onboarding/update-selections', {
      method: 'POST',
      body: JSON.stringify({
        competitors,
        topics,
        personas,
        urlAnalysisId
      }),
    })
  }

  // Test prompts with multi-LLM
  async testPrompts() {
    return this.request('/prompts/test', {
      method: 'POST',
      timeout: 600000, // 10 minutes to match Nginx proxy_read_timeout (can involve multiple AI calls)
    })
  }

  // Actionables endpoints
  async loadActionablePageContent(payload: ActionablePageContentRequest) {
    return this.request('/actionables/page-content', {
      method: 'POST',
      body: JSON.stringify(payload),
      timeout: 180000, // Scraping can take time depending on the page
    }) as Promise<{ success: boolean; data: ActionablePageContentResponse }>
  }

      async regenerateActionableContent(payload: ActionableRegenerateContentRequest) {
        return this.request('/actionables/regenerate-content', {
          method: 'POST',
          body: JSON.stringify(payload),
          timeout: 200000, // ✅ FIX: 200 seconds (3.3 min) to match new backend worst case (20+20+45+20+90=195s)
        }) as Promise<{ success: boolean; data: ActionableRegenerateContentResponse }>
      }

  // ✅ NEW: Generate HTML preview from markdown
  async generateHtmlPreview(markdown: string, title?: string) {
    return this.request('/actionables/generate-html-preview', {
      method: 'POST',
      body: JSON.stringify({ markdown, title: title || 'Content Preview' }),
      timeout: 30000,
    }) as Promise<{ success: boolean; data: { previewId: string; previewUrl: string } }>
  }

  // ✅ NEW: Generate merged HTML preview with highlighted regenerated sections
  // ✅ NEW: Generate patched HTML preview (inject regenerated content into original HTML)
  async generatePatchedHtmlPreview(
    originalHtml: string,
    newContentMarkdown: string,
    title?: string,
    highlightChanges?: boolean
  ) {
    return this.request('/actionables/generate-patched-html-preview', {
      method: 'POST',
      body: JSON.stringify({
        originalHtml,
        newContentMarkdown,
        title: title || 'Regenerated Content Preview',
        highlightChanges: highlightChanges !== false, // Default to true
      }),
    })
  }

  async generateMergedHtmlPreview(
    originalUrl: string,
    regeneratedMarkdown: string,
    highlights: Array<{ normalized: string; resolvedNormalized?: string; resolvedHeading?: string; match: string }>,
    title?: string
  ) {
    return this.request('/actionables/generate-merged-html-preview', {
      method: 'POST',
      body: JSON.stringify({
        originalUrl,
        regeneratedMarkdown,
        highlights,
        title: title || 'Regenerated Content Preview',
      }),
      timeout: 60000, // 60 seconds (fetching original HTML + processing)
    }) as Promise<{ success: boolean; data: { previewId: string; previewUrl: string; replacedSections: number } }>
  }

  // Calculate metrics from test results
  async calculateMetrics(urlAnalysisId?: string) {
    return this.request('/metrics/calculate', {
      method: 'POST',
      body: JSON.stringify({ urlAnalysisId }),
    })
  }

  // Legacy alias for backward compatibility (deprecated - use getDashboardAll instead)
  async getDashboardMetrics() {
    console.warn('⚠️ getDashboardMetrics() is deprecated. Use getDashboardAll() instead.')
    return this.getDashboardAll()
  }

  async getPromptTests(promptId: string) {
    return this.request(`/prompts/${promptId}/tests`)
  }

  async getAllTests(options: Record<string, any> = {}) {
    const params = new URLSearchParams(options).toString()
    return this.request(`/prompts/tests/all${params ? `?${params}` : ''}`)
  }

  // Get all prompts
  async getPrompts(options: Record<string, any> = {}) {
    const params = new URLSearchParams(options).toString()
    return this.request(`/prompts${params ? `?${params}` : ''}`)
  }

  // Analytics endpoints
  async getAnalyticsSummary(dateFrom?: string, dateTo?: string) {
    const params = new URLSearchParams()
    if (dateFrom) params.append('dateFrom', dateFrom)
    if (dateTo) params.append('dateTo', dateTo)
    return this.request(`/analytics/summary${params.toString() ? `?${params.toString()}` : ''}`)
  }

  async getAnalyticsVisibility(dateFrom?: string, dateTo?: string, urlAnalysisId?: string) {
    const params = new URLSearchParams()
    if (dateFrom) params.append('dateFrom', dateFrom)
    if (dateTo) params.append('dateTo', dateTo)
    if (urlAnalysisId) params.append('urlAnalysisId', urlAnalysisId)
    return this.request(`/analytics/visibility${params.toString() ? `?${params.toString()}` : ''}`)
  }

  async getAnalyticsPrompts(dateFrom?: string, dateTo?: string) {
    const params = new URLSearchParams()
    if (dateFrom) params.append('dateFrom', dateFrom)
    if (dateTo) params.append('dateTo', dateTo)
    return this.request(`/analytics/prompts${params.toString() ? `?${params.toString()}` : ''}`)
  }

  async getAnalyticsSentiment(dateFrom?: string, dateTo?: string) {
    const params = new URLSearchParams()
    if (dateFrom) params.append('dateFrom', dateFrom)
    if (dateTo) params.append('dateTo', dateTo)
    return this.request(`/analytics/sentiment${params.toString() ? `?${params.toString()}` : ''}`)
  }

  async getAnalyticsCitations(dateFrom?: string, dateTo?: string) {
    const params = new URLSearchParams()
    if (dateFrom) params.append('dateFrom', dateFrom)
    if (dateTo) params.append('dateTo', dateTo)
    return this.request(`/analytics/citations${params.toString() ? `?${params.toString()}` : ''}`)
  }

  async getAnalyticsCompetitors(dateFrom?: string, dateTo?: string) {
    const params = new URLSearchParams()
    if (dateFrom) params.append('dateFrom', dateFrom)
    if (dateTo) params.append('dateTo', dateTo)
    return this.request(`/analytics/competitors${params.toString() ? `?${params.toString()}` : ''}`)
  }

  // New analytics endpoints for dashboard integration
  async getAnalyticsFilters() {
    return this.request('/analytics/filters')
  }

  // Deprecated - Use getDashboardAll() instead
  async getAnalyticsDashboard(options: {
    dateFrom?: string
    dateTo?: string
    platforms?: string[]
    topics?: string[]
    personas?: string[]
    comparisonDateFrom?: string
    comparisonDateTo?: string
  } = {}) {
    console.warn('⚠️ getAnalyticsDashboard() is deprecated. Use getDashboardAll() instead.')
    return this.getDashboardAll(options)
  }

  // Metrics endpoints (deprecated - use getDashboardAll instead)
  async getMetricsDashboard(dateFrom?: string, dateTo?: string) {
    console.warn('⚠️ getMetricsDashboard() is deprecated. Use getDashboardAll() instead.')
    return this.getDashboardAll({ dateFrom, dateTo })
  }

  // URL Analysis endpoints
  async getUrlAnalyses() {
    return this.request('/url-analysis/list')
  }

  async getUrlAnalysis(id: string) {
    return this.request(`/url-analysis/${id}`)
  }

  async findUrlAnalysisByUrl(url: string) {
    const encodedUrl = encodeURIComponent(url)
    return this.request(`/url-analysis/by-url?url=${encodedUrl}`)
  }

  async getUrlMetrics(id: string) {
    return this.request(`/url-analysis/${id}/metrics`)
  }

  // Performance Insights endpoints
  async generateInsights(urlAnalysisId?: string) {
    return this.request('/insights/generate', {
      method: 'POST',
      body: JSON.stringify({ urlAnalysisId }),
      timeout: 600000, // 10 minutes to match Nginx proxy_read_timeout (AI processing can take time)
    })
  }

  // Generate insights for a specific tab
  async generateInsightsForTab(tabType: string, urlAnalysisId?: string) {
    return this.request('/insights/generate', {
      method: 'POST',
      timeout: 600000, // 10 minutes to match Nginx proxy_read_timeout
      body: JSON.stringify({ tabType, urlAnalysisId }),
    })
  }

  // Get existing insights for a specific tab
  async getInsightsForTab(tabType: string, urlAnalysisId?: string) {
    const params = urlAnalysisId ? `?urlAnalysisId=${urlAnalysisId}` : ''
    return this.request(`/insights/${tabType}${params}`)
  }

  async getLatestInsights(urlAnalysisId?: string) {
    const params = urlAnalysisId ? `?urlAnalysisId=${urlAnalysisId}` : ''
    return this.request(`/insights/latest${params}`)
  }

  async getInsightsHistory(urlAnalysisId?: string, limit?: number) {
    const params = new URLSearchParams()
    if (urlAnalysisId) params.append('urlAnalysisId', urlAnalysisId)
    if (limit) params.append('limit', limit.toString())
    return this.request(`/insights/history${params.toString() ? `?${params.toString()}` : ''}`)
  }

  async getInsight(insightId: string) {
    return this.request(`/insights/${insightId}`)
  }

  // Dashboard Metrics endpoints (new aggregated metrics)
  async getAggregatedMetrics(options: {
    dateFrom?: string
    dateTo?: string
    urlAnalysisId?: string
    scope?: 'overall' | 'platform' | 'topic' | 'persona'
  } = {}) {
    const params = new URLSearchParams()
    if (options.dateFrom) params.append('dateFrom', options.dateFrom)
    if (options.dateTo) params.append('dateTo', options.dateTo)
    if (options.urlAnalysisId) params.append('urlAnalysisId', options.urlAnalysisId)
    if (options.scope) params.append('scope', options.scope)
    
    return this.request(`/metrics/aggregated${params.toString() ? `?${params.toString()}` : ''}`)
  }

  // ✅ NEW: Get all dashboard data in one call (includes AI insights and filtering)
  async getDashboardAll(options: {
    dateFrom?: string
    dateTo?: string
    urlAnalysisId?: string
    topics?: string[]
    personas?: string[]
    platforms?: string[]
  } = {}) {
    const params = new URLSearchParams()
    if (options.dateFrom) params.append('dateFrom', options.dateFrom)
    if (options.dateTo) params.append('dateTo', options.dateTo)
    if (options.urlAnalysisId) params.append('urlAnalysisId', options.urlAnalysisId)
    
    // ✅ NEW: Add filter parameters
    if (options.topics && options.topics.length > 0) {
      options.topics.forEach(topic => params.append('topics', topic))
    }
    if (options.personas && options.personas.length > 0) {
      options.personas.forEach(persona => params.append('personas', persona))
    }
    if (options.platforms && options.platforms.length > 0) {
      options.platforms.forEach(platform => params.append('platforms', platform))
    }
    
    return this.request(`/dashboard/all${params.toString() ? `?${params.toString()}` : ''}`)
  }

  // Competitors endpoints
  async getCompetitors(urlAnalysisId?: string) {
    const params = urlAnalysisId ? `?urlAnalysisId=${urlAnalysisId}` : ''
    return this.request(`/competitors${params}`)
  }

  async updateCompetitor(id: string, data: any) {
    return this.request(`/competitors/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  async createCompetitor(data: any) {
    return this.request('/competitors', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async deleteCompetitor(id: string) {
    return this.request(`/competitors/${id}`, {
      method: 'DELETE',
    })
  }

  // Topics endpoints
  async getTopics(urlAnalysisId?: string) {
    const params = urlAnalysisId ? `?urlAnalysisId=${urlAnalysisId}` : ''
    return this.request(`/topics${params}`)
  }

  async updateTopic(id: string, data: any) {
    return this.request(`/topics/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  async createTopic(data: any) {
    return this.request('/topics', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async deleteTopic(id: string) {
    return this.request(`/topics/${id}`, {
      method: 'DELETE',
    })
  }

  // Personas endpoints
  async getPersonas(urlAnalysisId?: string) {
    const params = urlAnalysisId ? `?urlAnalysisId=${urlAnalysisId}` : ''
    return this.request(`/personas${params}`)
  }

  async updatePersona(id: string, data: any) {
    return this.request(`/personas/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  async createPersona(data: any) {
    return this.request('/personas', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async deletePersona(id: string) {
    return this.request(`/personas/${id}`, {
      method: 'DELETE',
    })
  }

  // Clusters endpoints
  async getClusters(options: {
    dateFrom?: string
    dateTo?: string
    urlAnalysisId?: string
  } = {}) {
    const params = new URLSearchParams()
    if (options.dateFrom) params.append('dateFrom', options.dateFrom)
    if (options.dateTo) params.append('dateTo', options.dateTo)
    if (options.urlAnalysisId) params.append('urlAnalysisId', options.urlAnalysisId)
    
    return this.request(`/clusters${params.toString() ? `?${params.toString()}` : ''}`)
  }

  // Analysis endpoints
  async getAnalyses() {
    return this.request('/metrics/analyses')
  }

  // Prompts Dashboard endpoint - Get topics/personas with their prompts and metrics
  async getPromptsDashboard(urlAnalysisId?: string) {
    const params = urlAnalysisId ? `?urlAnalysisId=${urlAnalysisId}` : ''
    return this.request(`/prompts/dashboard${params}`)
  }

  async getPromptDetails(promptId: string) {
    return this.request(`/prompts/details/${promptId}`)
  }

  // Subjective Metrics endpoints
  async evaluateSubjectiveMetrics(promptId: string, brandName: string) {
    return this.request('/subjective-metrics/evaluate', {
      method: 'POST',
      body: JSON.stringify({ promptId, brandName }),
    })
  }

  async getSubjectiveMetrics(promptId: string, brandName?: string) {
    const params = brandName ? `?brandName=${encodeURIComponent(brandName)}` : ''
    try {
      return await this.request(`/subjective-metrics/${promptId}${params}`)
    } catch (error) {
      // If it's a "no metrics found" error, return success with no data instead of throwing
      const errorMessage = error.message || ''
      if (errorMessage.includes('No metrics found') || 
          errorMessage.includes('not found') || 
          errorMessage.includes('404')) {
        return {
          success: true,
          data: null,
          message: 'No metrics found'
        }
      }
      // Re-throw other errors
      throw error
    }
  }

  async getBatchSubjectiveMetrics(promptIds: string[], brandName: string) {
    return this.request('/subjective-metrics/batch', {
      method: 'POST',
      body: JSON.stringify({ promptIds, brandName }),
    })
  }

  // Sentiment Breakdown endpoints - uses new sentiment/breakdown endpoint
  async getPromptSentimentBreakdown(urlAnalysisId?: string, sortBy?: string) {
    const params = new URLSearchParams()
    if (urlAnalysisId) params.append('urlAnalysisId', urlAnalysisId)
    if (sortBy) params.append('sortBy', sortBy)
    
    // Use the new sentiment/breakdown endpoint
    return this.request(`/sentiment/breakdown${params.toString() ? `?${params.toString()}` : ''}`)
  }

  // Citation endpoints
  async getCitationDetails(brandName: string, type: string) {
    const encodedBrandName = encodeURIComponent(brandName)
    const encodedType = encodeURIComponent(type)
    return this.request(`/dashboard/citations/${encodedBrandName}/${encodedType}`)
  }

  async getPromptIdsForCitations(citationUrls: string[], brandName: string) {
    return this.request('/dashboard/citations/prompt-ids', {
      method: 'POST',
      body: JSON.stringify({ citationUrls, brandName }),
    })
  }

  // ✅ NEW: Generate citation prompts for a page
  async generateCitationPrompts(pageUrl: string, pageTitle?: string) {
    return this.request('/actionables/generate-citation-prompts', {
      method: 'POST',
      body: JSON.stringify({ pageUrl, pageTitle }),
    }) as Promise<{
      success: boolean
      data: {
        pageUrl: string
        domain: string
        pageTitle: string | null
        prompts: Array<{
          id: string
          title: string
          prompt: string
          pageUrl: string
          domain: string
        }>
        count: number
      }
    }>
  }
}

export default new ApiService()