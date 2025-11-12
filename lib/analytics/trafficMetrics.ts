/**
 * Utilities for ensuring analytics formulas remain consistent across tabs.
 */

type SessionQualityInput = {
  engagementRate?: number
  conversionRate?: number
  pagesPerSession?: number
  avgSessionDurationSeconds?: number
}

/**
 * Calculate the Session Quality Score (SQS) on a 0-100 scale.
 *
 * Formula (weights align with UI tooltips):
 * - Engagement Rate × 0.4  (max 40 points)
 * - Conversion Rate × 0.3  (max 30 points)
 * - Pages per Session × 4, capped at 5 pages (max 20 points)
 * - Session Duration (minutes) × 2, capped at 5 minutes (max 10 points)
 */
export function calculateSessionQualityScore({
  engagementRate = 0,
  conversionRate = 0,
  pagesPerSession = 0,
  avgSessionDurationSeconds = 0,
}: SessionQualityInput): number {
  const safeEngagement = clampPercentage(engagementRate)
  const safeConversion = clampPercentage(conversionRate)
  const safePages = Math.max(0, pagesPerSession)
  const safeDurationSeconds = Math.max(0, avgSessionDurationSeconds)

  const pagesComponent = Math.min(safePages, 5) * 4 // max 20 points
  const durationMinutes = safeDurationSeconds / 60
  const durationComponent = Math.min(durationMinutes, 5) * 2 // max 10 points
  const engagementComponent = safeEngagement * 0.4 // max 40 points
  const conversionComponent = safeConversion * 0.3 // max 30 points

  const score = engagementComponent + conversionComponent + pagesComponent + durationComponent
  const normalized = Math.max(0, Math.min(score, 100))

  return roundToTwoDecimals(normalized)
}

/**
 * Normalize engagement rate values to a 0-100 percentage range.
 */
export function calculateEngagementScore(value?: number): number {
  return roundToTwoDecimals(clampPercentage(value ?? 0))
}

function clampPercentage(value: number): number {
  if (Number.isNaN(value) || !Number.isFinite(value)) {
    return 0
  }
  return Math.max(0, Math.min(value, 100))
}

function roundToTwoDecimals(value: number): number {
  return Math.round(value * 100) / 100
}

