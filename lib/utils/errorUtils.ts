/**
 * Error utilities for consistent error handling across the application
 */

export interface ApiError {
  message: string
  code?: string
  status?: number
  isNetworkError?: boolean
  isTimeout?: boolean
  isRetryable?: boolean
}

/**
 * Classify error type from fetch/API errors
 */
export function classifyError(error: unknown): ApiError {
  // Network errors (fetch throws)
  if (error instanceof TypeError && error.message.includes('fetch')) {
    return {
      message: 'Network error. Please check your internet connection.',
      code: 'NETWORK_ERROR',
      isNetworkError: true,
      isRetryable: true,
    }
  }

  // Timeout errors
  if (error instanceof Error && (error.message.includes('timeout') || error.message.includes('Timeout'))) {
    return {
      message: 'Request timed out. Please try again.',
      code: 'TIMEOUT',
      isTimeout: true,
      isRetryable: true,
    }
  }

  // CORS errors
  if (error instanceof TypeError && error.message.includes('CORS')) {
    return {
      message: 'CORS error. Please check API configuration.',
      code: 'CORS_ERROR',
      isNetworkError: true,
      isRetryable: false,
    }
  }

  // Generic error
  if (error instanceof Error) {
    return {
      message: error.message || 'An unexpected error occurred',
      code: 'UNKNOWN_ERROR',
      isRetryable: false,
    }
  }

  return {
    message: 'An unexpected error occurred',
    code: 'UNKNOWN_ERROR',
    isRetryable: false,
  }
}

/**
 * Check if error is retryable
 */
export function isRetryableError(error: ApiError): boolean {
  return error.isRetryable === true || 
         (error.status && error.status >= 500) || 
         error.isNetworkError === true ||
         error.isTimeout === true
}

/**
 * Get user-friendly error message
 */
export function getUserFriendlyMessage(error: ApiError): string {
  // Network errors
  if (error.isNetworkError) {
    return 'Unable to connect to the server. Please check your internet connection and try again.'
  }

  // Timeout errors
  if (error.isTimeout) {
    return 'The request took too long. Please try again.'
  }

  // Specific status codes
  if (error.status === 401) {
    return 'Your session has expired. Please sign in again.'
  }

  if (error.status === 403) {
    return 'You don\'t have permission to perform this action.'
  }

  if (error.status === 404) {
    return 'The requested resource was not found.'
  }

  if (error.status === 429) {
    return 'Too many requests. Please wait a moment and try again.'
  }

  if (error.status && error.status >= 500) {
    return 'Server error. Please try again later.'
  }

  // Fallback to error message
  return error.message || 'An unexpected error occurred. Please try again.'
}

/**
 * Sleep utility for retries
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Calculate exponential backoff delay
 */
export function getRetryDelay(attempt: number, baseDelay: number = 1000): number {
  return baseDelay * Math.pow(2, attempt) + Math.random() * 1000
}















