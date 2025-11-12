const { URL } = require('url');

function ensureProtocol(url) {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  const cleaned = url.startsWith('//') ? url.slice(2) : url;
  return `https://${cleaned}`;
}

function cleanPath(pathname) {
  if (!pathname) return '/';
  const decoded = decodeURIComponent(pathname);
  let cleaned = decoded.replace(/\/+/g, '/');
  if (!cleaned.startsWith('/')) {
    cleaned = `/${cleaned}`;
  }
  if (cleaned.length > 1 && cleaned.endsWith('/')) {
    cleaned = cleaned.slice(0, -1);
  }
  return cleaned || '/';
}

function canonicalizeUrl(rawUrl) {
  if (!rawUrl || typeof rawUrl !== 'string') {
    return '';
  }

  const trimmed = rawUrl.trim();
  if (!trimmed) {
    return '';
  }

  const lowerTrimmed = trimmed.toLowerCase();
  const looksLikeRelative =
    trimmed.startsWith('/') ||
    trimmed.startsWith('./') ||
    trimmed.startsWith('../');
  const maybeBareWord =
    !trimmed.includes('://') &&
    !trimmed.startsWith('//') &&
    !trimmed.includes('.') &&
    !trimmed.includes(':') &&
    lowerTrimmed !== 'localhost';

  if (looksLikeRelative || maybeBareWord) {
    return '';
  }

  let parsed;
  try {
    parsed = new URL(trimmed);
  } catch (error) {
    try {
      parsed = new URL(ensureProtocol(trimmed));
    } catch {
      return '';
    }
  }

  const hostname = parsed.hostname.replace(/^www\./, '').toLowerCase();
  if (!hostname) {
    return '';
  }

  const pathname = cleanPath(parsed.pathname);
  return `${hostname}${pathname}`;
}

function buildFullUrlFromCanonical(canonicalUrl) {
  if (!canonicalUrl) {
    return '';
  }

  const [hostname, ...pathParts] = canonicalUrl.split('/');
  const remainder = pathParts.join('/');
  const path = remainder ? `/${remainder}` : '/';
  return `https://${hostname}${path}`;
}

function findMappingForUrl(canonicalUrl, mappingRules = []) {
  if (!canonicalUrl) {
    return null;
  }

  const canonicalLower = canonicalUrl.toLowerCase();

  for (const rule of mappingRules) {
    if (!rule || !rule.sourceUrl || !rule.targetUrl) {
      continue;
    }

    const sourceCanonical = canonicalizeUrl(rule.sourceUrl);
    const targetCanonical = canonicalizeUrl(rule.targetUrl);

    if (!sourceCanonical || !targetCanonical) {
      continue;
    }

    const sourceLower = sourceCanonical.toLowerCase();
    const exactMatch = canonicalLower === sourceLower;
    const prefixMatch = canonicalLower.startsWith(sourceLower.endsWith('/')
      ? sourceLower
      : `${sourceLower}/`);

    if (exactMatch || prefixMatch) {
      return {
        targetCanonical,
        mapping: {
          sourceUrl: buildFullUrlFromCanonical(sourceCanonical),
          targetUrl: buildFullUrlFromCanonical(targetCanonical),
          note: rule.note || undefined,
        },
      };
    }
  }

  return null;
}

function normalizeActionableUrl(rawUrl, mappingRules = []) {
  const canonicalUrl = canonicalizeUrl(rawUrl);
  if (!canonicalUrl) {
    return null;
  }

  const mappingMatch = findMappingForUrl(canonicalUrl, mappingRules);
  const finalCanonical = mappingMatch?.targetCanonical || canonicalUrl;
  const hostname = finalCanonical.split('/')[0] || '';

  return {
    canonicalUrl: finalCanonical,
    normalizedUrl: buildFullUrlFromCanonical(finalCanonical),
    hostname,
    mapping: mappingMatch?.mapping || null,
  };
}

module.exports = {
  normalizeActionableUrl,
  canonicalizeUrl,
  buildFullUrlFromCanonical,
};


