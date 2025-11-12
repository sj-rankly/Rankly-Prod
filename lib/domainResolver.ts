/**
 * Domain Resolution Service
 * Intelligently resolves company names to domains for favicon fetching
 */

/**
 * Normalizes a company name to a domain-friendly format
 */
export const normalizeCompanyName = (companyName: string): string => {
  return companyName
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '') // Remove spaces
    .replace(/[®™℠©]/g, '') // Remove trademark symbols
    .replace(/[^a-z0-9]/g, '') // Remove special characters
    .replace(/^(the|a|an)/, '') // Remove articles
}

/**
 * Known company name to domain mappings for special cases
 * These handle companies where name doesn't directly map to domain
 */
const knownDomainMappings: Record<string, string> = {
  'capital one': 'capitalone.com',
  'capitalone': 'capitalone.com',
  'american express': 'americanexpress.com',
  'americanexpress': 'americanexpress.com',
  'amex': 'amex.com',
  'chase': 'chase.com',
  'jpmorgan chase': 'chase.com',
  'bank of america': 'bankofamerica.com',
  'wells fargo': 'wellsfargo.com',
  'itilite': 'itilite.com',
  'itilite corp': 'itilite.com',
  'hdfc bank': 'hdfcbank.com',
  'hdfc': 'hdfcbank.com',
  'discover': 'discover.com',
  'citi': 'citi.com',
  'citibank': 'citi.com',
  // LLM Platforms - Latest favicon URLs
  'chatgpt': 'chat.openai.com',
  'openai': 'openai.com',
  'gemini': 'gemini.google.com',
  'claude': 'claude.ai',
  'anthropic': 'claude.ai',
  'perplexity': 'perplexity.ai'
}

/**
 * Extracts domain from URL if input is already a URL
 */
export const extractDomainFromUrl = (input: string): string | null => {
  try {
    // If full URL
    if (/^https?:\/\//i.test(input)) {
      const { hostname } = new URL(input)
      return hostname.replace(/^www\./, '')
    }
    // If looks like a domain already
    if (/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(input)) {
      return input.replace(/^www\./, '').toLowerCase()
    }
    return null
  } catch {
    return null
  }
}

/**
 * Resolves a company name or URL to a domain for favicon fetching
 * @param identifier - Company name or URL
 * @returns Domain string or null if cannot be resolved
 */
export const resolveToDomain = (identifier: string): string | null => {
  if (!identifier || typeof identifier !== 'string') {
    return null
  }

  const trimmed = identifier.trim()

  // First, try to extract domain if it's already a URL
  const extractedDomain = extractDomainFromUrl(trimmed)
  if (extractedDomain) {
    return extractedDomain
  }

  // Check known mappings (case-insensitive)
  const lowerIdentifier = trimmed.toLowerCase()
  if (knownDomainMappings[lowerIdentifier]) {
    return knownDomainMappings[lowerIdentifier]
  }

  // Try partial matching for known mappings
  for (const [key, domain] of Object.entries(knownDomainMappings)) {
    if (lowerIdentifier.includes(key) || key.includes(lowerIdentifier)) {
      return domain
    }
  }

  // Normalize company name and generate likely domain
  const normalized = normalizeCompanyName(trimmed)
  if (normalized.length < 2) {
    return null
  }

  // Generate domain variations to try (most likely first)
  const domainVariations = [
    `${normalized}.com`,
    `${normalized}.io`,
    `${normalized}.co`,
    `${normalized}.org`,
    `${normalized}.net`
  ]

  // Return the most likely domain (we'll let the favicon API handle validation)
  return domainVariations[0]
}

/**
 * Gets confidence score for domain resolution
 * @param identifier - Input identifier
 * @param resolvedDomain - Resolved domain
 * @returns Confidence score 0-1
 */
export const getResolutionConfidence = (identifier: string, resolvedDomain: string | null): number => {
  if (!resolvedDomain) {
    return 0
  }

  // High confidence if it was a direct URL extraction
  if (extractDomainFromUrl(identifier)) {
    return 1.0
  }

  // High confidence if it matches a known mapping
  const lowerIdentifier = identifier.toLowerCase().trim()
  if (knownDomainMappings[lowerIdentifier]) {
    return 0.9
  }

  // Medium confidence if partial match
  for (const key of Object.keys(knownDomainMappings)) {
    if (lowerIdentifier.includes(key) || key.includes(lowerIdentifier)) {
      return 0.7
    }
  }

  // Lower confidence for generated domains
  return 0.5
}

