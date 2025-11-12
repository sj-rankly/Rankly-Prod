const test = require('node:test');
const assert = require('node:assert/strict');

const {
  canonicalizeUrl,
  normalizeActionableUrl,
} = require('../actionablesUrlNormalizer');

test('canonicalizeUrl removes protocol, www, and trailing slash', () => {
  assert.equal(canonicalizeUrl('https://www.example.com/pricing/'), 'example.com/pricing');
  assert.equal(canonicalizeUrl('http://example.com'), 'example.com/');
  assert.equal(canonicalizeUrl('EXAMPLE.com/Support'), 'example.com/Support');
});

test('canonicalizeUrl gracefully handles invalid inputs', () => {
  assert.equal(canonicalizeUrl(''), '');
  assert.equal(canonicalizeUrl('/relative-path'), '');
});

test('normalizeActionableUrl returns canonically formatted URL', () => {
  const normalized = normalizeActionableUrl('https://www.example.com/docs/guide?ref=utm');
  assert.ok(normalized);
  assert.equal(normalized.canonicalUrl, 'example.com/docs/guide');
  assert.equal(normalized.normalizedUrl, 'https://example.com/docs/guide');
  assert.equal(normalized.hostname, 'example.com');
  assert.equal(normalized.mapping, null);
});

test('normalizeActionableUrl applies mapping rules when available', () => {
  const mappingRules = [
    {
      sourceUrl: 'https://example.com/pricing',
      targetUrl: 'https://app.example.com/billing/pricing',
      note: 'GA4 mapped to app subdomain',
    },
  ];

  const normalized = normalizeActionableUrl('https://www.example.com/pricing', mappingRules);
  assert.ok(normalized);
  assert.equal(normalized.canonicalUrl, 'app.example.com/billing/pricing');
  assert.equal(normalized.normalizedUrl, 'https://app.example.com/billing/pricing');
  assert.equal(normalized.hostname, 'app.example.com');
  assert.ok(normalized.mapping);
  assert.equal(normalized.mapping.sourceUrl, 'https://example.com/pricing');
  assert.equal(normalized.mapping.targetUrl, 'https://app.example.com/billing/pricing');
});

test('normalizeActionableUrl returns null for invalid URLs', () => {
  const normalized = normalizeActionableUrl('/pricing', []);
  assert.equal(normalized, null);
});



