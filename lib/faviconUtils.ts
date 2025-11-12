/**
 * Dynamic favicon utility functions
 * Automatically generates favicon URLs for any company name or URL
 * Supports multiple favicon APIs with intelligent fallbacks
 */

import { resolveToDomain, extractDomainFromUrl } from './domainResolver'

/**
 * Converts a company name to a clean domain format
 * @param companyName - The company name to convert
 * @returns Clean domain-friendly string
 */
export const cleanCompanyName = (companyName: string): string => {
  return companyName
    .toLowerCase()
    .replace(/\s+/g, '') // Remove spaces
    .replace(/[^a-z0-9]/g, '') // Remove special characters
    .replace(/^(the|a|an)\s+/i, '') // Remove articles
}

/**
 * Generates multiple domain variations for better favicon detection
 * @param cleanName - Clean company name without spaces/special chars
 * @returns Array of possible domain variations
 */
export const generateDomainVariations = (cleanName: string): string[] => {
  return [
    `${cleanName}.com`,
    `${cleanName}.org`,
    `${cleanName}.net`,
    `${cleanName}.io`,
    `www.${cleanName}.com`,
    `${cleanName}.co`,
    `${cleanName}.ai`
  ]
}

/**
 * Gets a dynamic favicon URL for any company name
 * @param companyName - The company name
 * @param size - Favicon size (default: 16)
 * @returns Favicon URL
 */
export const extractDomain = (input: string): string | null => {
  try {
    // If full URL
    if (/^https?:\/\//i.test(input)) {
      const { hostname } = new URL(input)
      return hostname.replace(/^www\./, '')
    }
    // If looks like a domain already
    if (/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(input)) {
      return input.replace(/^www\./, '')
    }
    return null
  } catch {
    return null
  }
}

/**
 * Favicon API providers with priority order
 */
const FAVICON_APIS = {
  GOOGLE: (domain: string, size: number) => 
    `https://www.google.com/s2/favicons?domain=${domain}&sz=${size}`,
  FAVICON_GRABBER: (domain: string) => 
    `http://favicongrabber.com/api/grab/${domain}`,
  FETCH_FAVICON: (domain: string) => 
    `https://fetchfavicon.com/i/${domain}`
}

/**
 * Gets favicon URL from Google's service (primary)
 */
export const getFaviconUrlForDomain = (domain: string, size: number = 16): string => {
  return FAVICON_APIS.GOOGLE(domain, size)
}

/**
 * Direct favicon URL mappings for known platforms (uses official favicons)
 * These bypass the Google favicon API to use the official favicon URLs directly
 */
const DIRECT_FAVICON_MAPPINGS: Record<string, string> = {
  // ChatGPT/OpenAI
  'chatgpt': 'https://www.google.com/s2/favicons?domain=chatgpt.com&sz=32',
  'openai': 'https://www.google.com/s2/favicons?domain=chatgpt.com&sz=32',
  'gpt': 'https://www.google.com/s2/favicons?domain=chatgpt.com&sz=32',
  // Claude/Anthropic
  'claude': 'https://www.google.com/s2/favicons?domain=claude.ai&sz=32',
  'anthropic': 'https://www.google.com/s2/favicons?domain=claude.ai&sz=32',
  // Gemini/Bard
  'gemini': 'https://www.google.com/s2/favicons?domain=gemini.google.com&sz=32',
  'bard': 'https://www.google.com/s2/favicons?domain=gemini.google.com&sz=32',
  // Perplexity
  'perplexity': 'https://www.google.com/s2/favicons?domain=perplexity.ai&sz=32',
  // Poe
  'poe': 'https://www.google.com/s2/favicons?domain=poe.com&sz=32',
  // Microsoft Copilot
  'copilot': 'https://www.google.com/s2/favicons?domain=copilot.microsoft.com&sz=32',
  'microsoft copilot': 'https://www.google.com/s2/favicons?domain=copilot.microsoft.com&sz=32',
  'bing chat': 'https://www.google.com/s2/favicons?domain=copilot.microsoft.com&sz=32',
  // Grok (X/Twitter)
  'grok': 'https://www.google.com/s2/favicons?domain=x.com&sz=32',
  // Character.ai
  'character': 'https://www.google.com/s2/favicons?domain=character.ai&sz=32',
  'character.ai': 'https://www.google.com/s2/favicons?domain=character.ai&sz=32',
  'characterai': 'https://www.google.com/s2/favicons?domain=character.ai&sz=32',
  // You.com
  'you': 'https://www.google.com/s2/favicons?domain=you.com&sz=32',
  'you.com': 'https://www.google.com/s2/favicons?domain=you.com&sz=32',
  'youcom': 'https://www.google.com/s2/favicons?domain=you.com&sz=32',
  // HuggingChat
  'huggingchat': 'https://www.google.com/s2/favicons?domain=huggingface.co&sz=32',
  'hugging face': 'https://www.google.com/s2/favicons?domain=huggingface.co&sz=32',
  'huggingface': 'https://www.google.com/s2/favicons?domain=huggingface.co&sz=32',
  // Pi (Inflection)
  'pi': 'https://www.google.com/s2/favicons?domain=heypi.com&sz=32',
  'inflection': 'https://www.google.com/s2/favicons?domain=heypi.com&sz=32',
  'heypi': 'https://www.google.com/s2/favicons?domain=heypi.com&sz=32',
  // Llama/Meta AI
  'llama': 'https://www.google.com/s2/favicons?domain=meta.ai&sz=32',
  'meta ai': 'https://www.google.com/s2/favicons?domain=meta.ai&sz=32',
  'metaai': 'https://www.google.com/s2/favicons?domain=meta.ai&sz=32',
  // Mistral
  'mistral': 'https://www.google.com/s2/favicons?domain=mistral.ai&sz=32',
  // Cohere
  'cohere': 'https://www.google.com/s2/favicons?domain=cohere.com&sz=32'
}

/**
 * Gets favicon URL for an identifier (URL, domain, or company name)
 * Prioritizes direct mappings for known platforms, then URL-based resolution
 */
export const getFaviconUrlForIdentifier = (identifier: string, size: number = 16): string => {
  if (!identifier) {
    return getFallbackFaviconUrl(size)
  }

  // First check for direct favicon mappings (prioritized for known platforms)
  // This ensures we use the official favicon URLs directly
  const lowerIdentifier = identifier.toLowerCase().trim()
  if (DIRECT_FAVICON_MAPPINGS[lowerIdentifier]) {
    return DIRECT_FAVICON_MAPPINGS[lowerIdentifier]
  }

  // Try to extract domain if it's already a URL
  const domain = extractDomainFromUrl(identifier)
  if (domain) {
    return getFaviconUrlForDomain(domain, size)
  }

  // Use domain resolver for intelligent name-to-domain conversion
  const resolvedDomain = resolveToDomain(identifier)
  if (resolvedDomain) {
    return getFaviconUrlForDomain(resolvedDomain, size)
  }

  // Final fallback to old name-based logic
  return getDynamicFaviconFromName(identifier, size)
}

/**
 * Gets dynamic favicon URL - now supports URL or company name
 * @param identifier - Company name, URL, or domain
 * @param size - Favicon size (default: 16)
 * @returns Favicon URL
 */
export const getDynamicFaviconUrl = (
  identifier: string | { url?: string; name: string }, 
  size: number = 16
): string => {
  // Support object format with url and name
  if (typeof identifier === 'object' && identifier !== null) {
    // Prioritize URL if available
    if (identifier.url) {
      return getFaviconUrlForIdentifier(identifier.url, size)
    }
    // Fallback to name
    if (identifier.name) {
      return getFaviconUrlForIdentifier(identifier.name, size)
    }
    return getFallbackFaviconUrl(size)
  }

  // Support string format (URL, domain, or company name)
  if (typeof identifier === 'string') {
    return getFaviconUrlForIdentifier(identifier, size)
  }

  return getFallbackFaviconUrl(size)
}

// Internal: name-based mapping and fallback generation
const getDynamicFaviconFromName = (companyName: string, size: number = 16): string => {
  // First check for known platform mappings - using Google favicon service for consistency
  const faviconMap: Record<string, string> = {
    // ChatGPT/OpenAI
    'ChatGPT': 'https://www.google.com/s2/favicons?domain=chatgpt.com&sz=32',
    'OpenAI': 'https://www.google.com/s2/favicons?domain=chatgpt.com&sz=32',
    'openai': 'https://www.google.com/s2/favicons?domain=chatgpt.com&sz=32',
    'GPT': 'https://www.google.com/s2/favicons?domain=chatgpt.com&sz=32',
    'gpt': 'https://www.google.com/s2/favicons?domain=chatgpt.com&sz=32',
    // Claude/Anthropic
    'Claude': 'https://www.google.com/s2/favicons?domain=claude.ai&sz=32',
    'claude': 'https://www.google.com/s2/favicons?domain=claude.ai&sz=32',
    'Anthropic': 'https://www.google.com/s2/favicons?domain=claude.ai&sz=32',
    // Gemini/Bard
    'Gemini': 'https://www.google.com/s2/favicons?domain=gemini.google.com&sz=32',
    'gemini': 'https://www.google.com/s2/favicons?domain=gemini.google.com&sz=32',
    'Bard': 'https://www.google.com/s2/favicons?domain=gemini.google.com&sz=32',
    'bard': 'https://www.google.com/s2/favicons?domain=gemini.google.com&sz=32',
    // Perplexity
    'perplexity': 'https://www.google.com/s2/favicons?domain=perplexity.ai&sz=32',
    'Perplexity': 'https://www.google.com/s2/favicons?domain=perplexity.ai&sz=32',
    // Poe
    'Poe': 'https://www.google.com/s2/favicons?domain=poe.com&sz=32',
    'poe': 'https://www.google.com/s2/favicons?domain=poe.com&sz=32',
    // Microsoft Copilot
    'Copilot': 'https://www.google.com/s2/favicons?domain=copilot.microsoft.com&sz=32',
    'copilot': 'https://www.google.com/s2/favicons?domain=copilot.microsoft.com&sz=32',
    'Microsoft Copilot': 'https://www.google.com/s2/favicons?domain=copilot.microsoft.com&sz=32',
    'Bing Chat': 'https://www.google.com/s2/favicons?domain=copilot.microsoft.com&sz=32',
    // Grok
    'Grok': 'https://www.google.com/s2/favicons?domain=x.com&sz=32',
    'grok': 'https://www.google.com/s2/favicons?domain=x.com&sz=32',
    // Character.ai
    'Character': 'https://www.google.com/s2/favicons?domain=character.ai&sz=32',
    'character': 'https://www.google.com/s2/favicons?domain=character.ai&sz=32',
    'Character.ai': 'https://www.google.com/s2/favicons?domain=character.ai&sz=32',
    // You.com
    'You': 'https://www.google.com/s2/favicons?domain=you.com&sz=32',
    'you': 'https://www.google.com/s2/favicons?domain=you.com&sz=32',
    'You.com': 'https://www.google.com/s2/favicons?domain=you.com&sz=32',
    // HuggingChat
    'HuggingChat': 'https://www.google.com/s2/favicons?domain=huggingface.co&sz=32',
    'huggingchat': 'https://www.google.com/s2/favicons?domain=huggingface.co&sz=32',
    'Hugging Face': 'https://www.google.com/s2/favicons?domain=huggingface.co&sz=32',
    // Pi
    'Pi': 'https://www.google.com/s2/favicons?domain=heypi.com&sz=32',
    'pi': 'https://www.google.com/s2/favicons?domain=heypi.com&sz=32',
    'Inflection': 'https://www.google.com/s2/favicons?domain=heypi.com&sz=32',
    // Meta AI/Llama
    'Llama': 'https://www.google.com/s2/favicons?domain=meta.ai&sz=32',
    'llama': 'https://www.google.com/s2/favicons?domain=meta.ai&sz=32',
    'Meta AI': 'https://www.google.com/s2/favicons?domain=meta.ai&sz=32',
    // Mistral
    'Mistral': 'https://www.google.com/s2/favicons?domain=mistral.ai&sz=32',
    'mistral': 'https://www.google.com/s2/favicons?domain=mistral.ai&sz=32',
    // Cohere
    'Cohere': 'https://www.google.com/s2/favicons?domain=cohere.com&sz=32',
    'cohere': 'https://www.google.com/s2/favicons?domain=cohere.com&sz=32',
    // Credit card companies
    'HDFC Bank': 'https://www.google.com/s2/favicons?domain=hdfcbank.com&sz=32',
    'HDFC Bank Freedom Credit Card': 'https://www.google.com/s2/favicons?domain=hdfcbank.com&sz=32',
    'Chase Freedom Flex': 'https://www.google.com/s2/favicons?domain=chase.com&sz=32',
    'Chase Ink Business': 'https://www.google.com/s2/favicons?domain=chase.com&sz=32',
    'Chase Ink Bu': 'https://www.google.com/s2/favicons?domain=chase.com&sz=32',
    'Chase Sapphire': 'https://www.google.com/s2/favicons?domain=chase.com&sz=32',
    'Chase Sapphi': 'https://www.google.com/s2/favicons?domain=chase.com&sz=32',
    'JPMorgan Chase': 'https://www.google.com/s2/favicons?domain=chase.com&sz=32',
    'Discover it Cash Back': 'https://www.google.com/s2/favicons?domain=discover.com&sz=32',
    'Bank of America': 'https://www.google.com/s2/favicons?domain=bankofamerica.com&sz=32',
    'Wells Fargo': 'https://www.google.com/s2/favicons?domain=wellsfargo.com&sz=32',
    'Citibank': 'https://www.google.com/s2/favicons?domain=citi.com&sz=32',
    'Citi Custom Cash Card': 'https://www.google.com/s2/favicons?domain=citi.com&sz=32',
    'Citi Double Cash Card': 'https://www.google.com/s2/favicons?domain=citi.com&sz=32',
    // Capital One - critical fix
    'Capital One': 'https://www.google.com/s2/favicons?domain=capitalone.com&sz=32',
    'capital one': 'https://www.google.com/s2/favicons?domain=capitalone.com&sz=32',
    'CapitalOne': 'https://www.google.com/s2/favicons?domain=capitalone.com&sz=32',
    'capitalone': 'https://www.google.com/s2/favicons?domain=capitalone.com&sz=32',
    // American Express - critical fix
    'American Express': 'https://www.google.com/s2/favicons?domain=americanexpress.com&sz=32',
    'american express': 'https://www.google.com/s2/favicons?domain=americanexpress.com&sz=32',
    'American Express SmartEarn': 'https://www.google.com/s2/favicons?domain=americanexpress.com&sz=32',
    'AmericanExpress': 'https://www.google.com/s2/favicons?domain=americanexpress.com&sz=32',
    'americanexpress': 'https://www.google.com/s2/favicons?domain=americanexpress.com&sz=32',
    'Amex': 'https://www.google.com/s2/favicons?domain=amex.com&sz=32',
    'AMEX': 'https://www.google.com/s2/favicons?domain=amex.com&sz=32',
    'amex': 'https://www.google.com/s2/favicons?domain=amex.com&sz=32',
    // itilite Corp - fix
    'itilite Corp': 'https://www.google.com/s2/favicons?domain=itilite.com&sz=32',
    'itilite': 'https://www.google.com/s2/favicons?domain=itilite.com&sz=32',
    'Itilite': 'https://www.google.com/s2/favicons?domain=itilite.com&sz=32'
  }
  
  // Normalize company name for matching
  const normalizedName = companyName.trim()
  
  // Return specific mapping if available (exact match first)
  if (faviconMap[normalizedName]) {
    return faviconMap[normalizedName]
  }
  
  // Try case-insensitive exact match
  const exactMatch = Object.keys(faviconMap).find(key => key.toLowerCase() === normalizedName.toLowerCase())
  if (exactMatch) {
    return faviconMap[exactMatch]
  }
  
  // Try partial matching for credit card brands and common company names
  const partialMatches: Record<string, string> = {
    'hdfc': 'https://www.google.com/s2/favicons?domain=hdfcbank.com&sz=32',
    'chase': 'https://www.google.com/s2/favicons?domain=chase.com&sz=32',
    'discover': 'https://www.google.com-to/favicons?domain=discover.com&sz=32',
    'citi': 'https://www.google.com/s2/favicons?domain=citi.com&sz=32',
    'bank of america': 'https://www.google.com/s2/favicons?domain=bankofamerica.com&sz=32',
    'wells fargo': 'https://www.google.com/s2/favicons?domain=wellsfargo.com&sz=32',
    'capital one': 'https://www.google.com/s2/favicons?domain=capitalone.com&sz=32',
    'capitalone': 'https://www.google.com/s2/favicons?domain=capitalone.com&sz=32',
    'american express': 'https://www.google.com/s2/favicons?domain=americanexpress.com&sz=32',
    'americanexpress': 'https://www.google.com/s2/favicons?domain=americanexpress.com&sz=32',
    'amex': 'https://www.google.com/s2/favicons?domain=amex.com&sz=32',
    'itilite': 'https://www.google.com/s2/favicons?domain=itilite.com&sz=32'
  }
  
  // Check for partial matches (case-insensitive)
  const lowerCompanyName = normalizedName.toLowerCase()
  for (const [key, faviconUrl] of Object.entries(partialMatches)) {
    if (lowerCompanyName.includes(key.toLowerCase())) {
      return faviconUrl
    }
  }
  
  // Fallback to dynamic generation for other companies
  const cleanName = cleanCompanyName(companyName)
  const domainVariations = generateDomainVariations(cleanName)
  
  // Use Google's favicon service with the first domain variation
  // Google's service is smart enough to find favicons for most domains
  return `https://www.google.com/s2/favicons?domain=${domainVariations[0]}&sz=${size}`
}

/**
 * Fallback favicon URL for when dynamic favicons fail
 * @param size - Favicon size (default: 16)
 * @returns Generic favicon URL
 */
export const getFallbackFaviconUrl = (size: number = 16): string => {
  return `https://www.google.com/s2/favicons?domain=google.com&sz=${size}`
}

/**
 * Cache for favicon URLs to avoid repeated failed attempts
 */
const faviconCache = new Map<string, string>()

/**
 * Enhanced error handler with retry logic using different APIs
 * @param event - The error event from img onError
 */
export const handleFaviconError = (event: React.SyntheticEvent<HTMLImageElement, Event>): void => {
  const target = event.currentTarget
  const currentSrc = target.src
  const originalIdentifier = target.getAttribute('data-favicon-identifier') || ''
  const size = parseInt(target.getAttribute('data-favicon-size') || '16', 10)

  // Extract domain from failed URL
  let domain: string | null = null
  
  // Try to extract domain from Google API URL
  const googleMatch = currentSrc.match(/domain=([^&]+)/)
  if (googleMatch) {
    domain = googleMatch[1]
  } else {
    // Try to resolve from original identifier
    domain = resolveToDomain(originalIdentifier) || extractDomainFromUrl(originalIdentifier)
  }

  if (domain && !faviconCache.has(`failed:${domain}`)) {
    // Mark this domain as failed for Google API
    faviconCache.set(`failed:${domain}`, '')
    
    // Try FetchFavicon API as fallback
    const fallbackUrl = FAVICON_APIS.FETCH_FAVICON(domain)
    target.src = fallbackUrl
    return
  }

  // All APIs failed, use generic fallback
  target.src = getFallbackFaviconUrl(size)
}

/**
 * Enhanced favicon component props - supports URL or company name
 */
export interface FaviconProps {
  companyName?: string
  url?: string
  size?: number
  className?: string
  alt?: string
  onError?: (event: React.SyntheticEvent<HTMLImageElement, Event>) => void
}

/**
 * Creates favicon image props for easy use in components
 * @param props - Favicon configuration
 * @returns Image props object
 */
export const createFaviconProps = (props: FaviconProps) => {
  const { companyName, url, size = 16, className = "w-4 h-4 rounded-sm", alt, onError } = props
  
  // Prioritize URL if available
  const identifier = url ? { url, name: companyName || '' } : (companyName || '')
  const faviconUrl = getDynamicFaviconUrl(identifier, size)
  
  return {
    src: faviconUrl,
    alt: alt || companyName || 'Favicon',
    className,
    'data-favicon-identifier': url || companyName || '',
    'data-favicon-size': size.toString(),
    onError: onError || handleFaviconError
  }
}