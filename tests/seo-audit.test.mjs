import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {
  containsSensitiveAnalyticsPayload,
  hasProhibitedPositioning,
  isIndexableByDefault,
  resolveInternalTarget,
  targetPathForUrl,
} from '../scripts/seo-audit.mjs';

test('treats missing robots metadata as indexable by default', () => {
  assert.equal(isIndexableByDefault('<html lang="id"><title>Page</title></html>'), true);
  assert.equal(isIndexableByDefault('<meta name="robots" content="noindex,follow">'), false);
});

test('finds prohibited visible copy on a noindex page', () => {
  const html = '<meta name="robots" content="noindex,follow"><body><h1>AI-Powered matching</h1></body>';
  assert.equal(hasProhibitedPositioning(html), true);
  assert.equal(hasProhibitedPositioning('<body><script>const label = "AI-Powered";</script><p>Koordinasi manusia.</p></body>'), false);
});

test('resolves relative and same-origin links and checks extension targets as files', () => {
  assert.equal(resolveInternalTarget('../privacy/', 'https://ocha.health/blog/post/'), 'https://ocha.health/blog/privacy/');
  assert.equal(resolveInternalTarget('https://ocha.health/terms/?from=footer', 'https://ocha.health/'), 'https://ocha.health/terms/');
  assert.equal(resolveInternalTarget('https://example.com/', 'https://ocha.health/'), null);
  assert.equal(targetPathForUrl('https://ocha.health/assets/logo.png', '/tmp/dist'), path.join('/tmp/dist', 'assets/logo.png'));
  assert.equal(targetPathForUrl('https://ocha.health/privacy/', '/tmp/dist'), path.join('/tmp/dist', 'privacy/index.html'));
});

test('detects quoted, shorthand, indirect, and gtag sensitive analytics payloads', () => {
  assert.equal(containsSensitiveAnalyticsPayload('dataLayer.push({ "doctor_name": value })'), true);
  assert.equal(containsSensitiveAnalyticsPayload('dataLayer.push({ phone })'), true);
  assert.equal(containsSensitiveAnalyticsPayload('const payload = { message: text }; dataLayer.push(payload)'), true);
  assert.equal(containsSensitiveAnalyticsPayload("gtag('event', 'lead', { email: value })"), true);
  assert.equal(containsSensitiveAnalyticsPayload('dataLayer.push({ event: "lead", page_type: "guide" })'), false);
});
