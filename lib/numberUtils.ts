/**
 * Number formatting utilities
 */

/**
 * Format a number to 2 decimal places
 * @param value - The number to format
 * @returns Formatted number as string
 */
export function formatToTwoDecimals(value: number | string | null | undefined): string {
  if (value === null || value === undefined) {
    return '0.00'
  }
  
  const num = typeof value === 'string' ? parseFloat(value) : value
  
  if (isNaN(num)) {
    return '0.00'
  }
  
  return num.toFixed(2)
}

/**
 * Format a percentage to 2 decimal places
 * @param value - The percentage value (0-100)
 * @returns Formatted percentage as string with % symbol
 */
export function formatPercentage(value: number | string | null | undefined): string {
  const formatted = formatToTwoDecimals(value)
  return `${formatted}%`
}

/**
 * Format a score to 2 decimal places
 * @param value - The score value
 * @returns Formatted score as string
 */
export function formatScore(value: number | string | null | undefined): string {
  return formatToTwoDecimals(value)
}

/**
 * Format a word count to 2 decimal places
 * @param value - The word count value
 * @returns Formatted word count as string
 */
export function formatWordCount(value: number | string | null | undefined): string {
  return formatToTwoDecimals(value)
}

