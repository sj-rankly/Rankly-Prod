'use client'

import React, { Component, ErrorInfo, ReactNode } from 'react'
import { AlertCircle, RefreshCw, Home } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'

interface Props {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: ErrorInfo) => void
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
}

/**
 * React Error Boundary to catch component errors and prevent app crashes
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    }
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error to console for debugging
    console.error('❌ [ErrorBoundary] Caught an error:', error)
    console.error('❌ [ErrorBoundary] Error info:', errorInfo)

    // Log to error tracking service (if available)
    if (process.env.NODE_ENV === 'production') {
      // TODO: Send to error tracking service (e.g., Sentry)
      // Sentry.captureException(error, { contexts: { react: errorInfo } })
    }

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo)
    }

    this.setState({
      error,
      errorInfo,
    })
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    })
  }

  handleGoHome = () => {
    window.location.href = '/'
  }

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback
      }

      // Default error UI
      const isDevelopment = process.env.NODE_ENV === 'development'
      const errorMessage = this.state.error?.message || 'An unexpected error occurred'
      const errorStack = this.state.error?.stack

      return (
        <div className="flex min-h-screen items-center justify-center p-4">
          <Card className="w-full max-w-2xl">
            <CardHeader>
              <div className="flex items-center gap-2">
                <AlertCircle className="h-6 w-6 text-destructive" />
                <CardTitle>Something went wrong</CardTitle>
              </div>
              <CardDescription>
                We encountered an unexpected error. Don't worry, your data is safe.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="rounded-lg bg-destructive/10 p-4">
                  <p className="font-medium text-destructive">{errorMessage}</p>
                </div>

                {isDevelopment && errorStack && (
                  <details className="rounded-lg border bg-muted p-4">
                    <summary className="cursor-pointer font-medium text-sm">
                      Error Details (Development Only)
                    </summary>
                    <pre className="mt-2 overflow-auto text-xs">
                      {errorStack}
                    </pre>
                    {this.state.errorInfo && (
                      <pre className="mt-2 overflow-auto text-xs">
                        {this.state.errorInfo.componentStack}
                      </pre>
                    )}
                  </details>
                )}

                <div className="text-sm text-muted-foreground">
                  <p>What you can do:</p>
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    <li>Try refreshing the page</li>
                    <li>Go back to the home page</li>
                    <li>Clear your browser cache and try again</li>
                    <li>If the problem persists, contact support</li>
                  </ul>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex gap-2">
              <Button onClick={this.handleReset} variant="default" className="gap-2">
                <RefreshCw className="h-4 w-4" />
                Try Again
              </Button>
              <Button onClick={this.handleGoHome} variant="outline" className="gap-2">
                <Home className="h-4 w-4" />
                Go Home
              </Button>
            </CardFooter>
          </Card>
        </div>
      )
    }

    return this.props.children
  }
}

/**
 * Higher-order component to wrap components with ErrorBoundary
 */
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  fallback?: ReactNode
) {
  return function WithErrorBoundaryComponent(props: P) {
    return (
      <ErrorBoundary fallback={fallback}>
        <Component {...props} />
      </ErrorBoundary>
    )
  }
}















