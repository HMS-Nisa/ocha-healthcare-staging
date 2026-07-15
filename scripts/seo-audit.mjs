import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { filterEntries, htmlPathForUrl } from './filter-sitemap.mjs';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(projectRoot, 'dist');
const failures = [];
const siteOrigin = 'https://ocha.health';

async function walk(directory) {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const files = await Promise.all(entries.map((entry) => {
    const target = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(target) : [target];
  }));
  return files.flat();
}

function count(html, expression) {
  return [...html.matchAll(expression)].length;
}

function attribute(tag, name) {
  return tag.match(new RegExp(`\\b${name}\\s*=\\s*["']([^"']*)["']`, 'i'))?.[1] || '';
}

function tags(html, tagName) {
  return [...html.matchAll(new RegExp(`<${tagName}\\b[^>]*>`, 'gi'))].map((match) => match[0]);
}

function tagWithAttribute(html, tagName, attributeName, expectedValue) {
  return tags(html, tagName).find((tag) => (
    attribute(tag, attributeName).toLowerCase() === expectedValue
  )) || '';
}

function isIndexable(html) {
  const robotsTag = tagWithAttribute(html, 'meta', 'name', 'robots');
  const directives = attribute(robotsTag, 'content').toLowerCase().split(',').map((value) => value.trim());
  return directives.includes('index') && !directives.includes('noindex');
}

function outputUrl(file) {
  const relative = path.relative(dist, file).split(path.sep).join('/');
  const pathname = relative === 'index.html' ? '/' : `/${relative.replace(/\/index\.html$/, '/')}`;
  return `${siteOrigin}${pathname}`;
}

function visibleHtml(html) {
  const body = html.slice(Math.max(0, html.search(/<body\b/i)));
  return body
    .replace(/<!--([\s\S]*?)-->/g, '')
    .replace(/<(script|style|noscript)\b[^>]*>[\s\S]*?<\/\1>/gi, '');
}

function internalTargets(html) {
  return tags(html, 'a')
    .map((tag) => attribute(tag, 'href'))
    .filter((href) => href.startsWith('/') && !href.startsWith('//'))
    .map((href) => href.split('#')[0].split('?')[0])
    .filter(Boolean);
}

async function hasInternalTarget(target) {
  if (/\.[a-z0-9]{2,8}$/i.test(target)) return true;
  const pathname = decodeURIComponent(target).replace(/\/index\.html$/, '/');
  const file = pathname === '/'
    ? path.join(dist, 'index.html')
    : path.join(dist, pathname.replace(/^\//, '').replace(/\/$/, ''), 'index.html');
  try {
    await fs.access(file);
    return true;
  } catch {
    return false;
  }
}

const allFiles = await walk(dist);
const htmlFiles = allFiles.filter((file) => file.endsWith('.html'));
const indexableEntries = [];

for (const file of htmlFiles) {
  const html = await fs.readFile(file, 'utf8');
  const relative = path.relative(dist, file);
  if (!isIndexable(html)) continue;

  const required = [
    ['lang=id', /<html[^>]+lang=["']id["']/i],
    ['title', /<title>[^<]+<\/title>/i],
    ['description', /<meta[^>]+name=["']description["']/i],
    ['canonical', /<link[^>]+rel=["']canonical["']/i],
    ['robots', /<meta[^>]+name=["']robots["']/i],
    ['og:title', /<meta[^>]+property=["']og:title["']/i],
    ['og:description', /<meta[^>]+property=["']og:description["']/i],
    ['og:url', /<meta[^>]+property=["']og:url["']/i],
    ['twitter:card', /<meta[^>]+name=["']twitter:card["']/i],
  ];
  for (const [label, expression] of required) {
    if (!expression.test(html)) failures.push(`${relative}: missing ${label}`);
  }

  const canonicalTags = tags(html, 'link').filter((tag) => attribute(tag, 'rel').toLowerCase() === 'canonical');
  if (canonicalTags.length !== 1) failures.push(`${relative}: canonical count is not 1`);
  const canonical = attribute(canonicalTags[0] || '', 'href');
  const expectedUrl = outputUrl(file);
  if (canonical !== expectedUrl) failures.push(`${relative}: canonical ${canonical || '(missing)'} does not equal ${expectedUrl}`);
  if (count(html, /<h1(?:\s|>)/gi) !== 1) failures.push(`${relative}: H1 count is not 1`);

  const schemaScripts = [...html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  for (const match of schemaScripts) {
    try {
      JSON.parse(match[1]);
    } catch {
      failures.push(`${relative}: invalid JSON-LD`);
    }
  }

  const visible = visibleHtml(html);
  if (/AI-Powered|airport transfer|airport pickup|accommodation support|dukungan akomodasi|Guarantee Letter/i.test(visible)) {
    failures.push(`${relative}: out-of-scope positioning`);
  }

  const missingTargets = [];
  for (const target of new Set(internalTargets(html))) {
    if (!await hasInternalTarget(target)) missingTargets.push(target);
  }
  for (const target of missingTargets) failures.push(`${relative}: broken internal link ${target}`);
  indexableEntries.push({ url: expectedUrl, html });
}

for (const file of allFiles.filter((candidate) => /\.(?:html|m?js)$/i.test(candidate))) {
  const source = await fs.readFile(file, 'utf8');
  for (const match of source.matchAll(/dataLayer\.push\(\s*\{([\s\S]{0,1000}?)\}\s*\)/g)) {
    if (/\b(?:doctor_name|message|phone|email|diagnosis|medical_answer|free_text)\s*:/i.test(match[1])) {
      failures.push(`${path.relative(dist, file)}: sensitive analytics event parameter`);
    }
  }
}

const sitemapPath = path.join(dist, 'sitemap-0.xml');
const sitemap = await fs.readFile(sitemapPath, 'utf8');
const sitemapUrls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/gi)].map((match) => match[1]);
if (sitemapUrls.length === 0) failures.push('sitemap-0.xml: contains no URLs');
if (/\/article\/template\/|--/.test(sitemap)) failures.push('sitemap-0.xml: mock or malformed URL');
if (new Set(sitemapUrls).size !== sitemapUrls.length) failures.push('sitemap-0.xml: duplicate URL');

const sitemapEntries = await Promise.all(sitemapUrls.map(async (url) => {
  try {
    return { url, html: await fs.readFile(htmlPathForUrl(url, dist), 'utf8') };
  } catch {
    return { url, html: '' };
  }
}));
const allowedSitemapUrls = new Set(filterEntries(sitemapEntries).map((entry) => entry.url));
for (const url of sitemapUrls) {
  if (!allowedSitemapUrls.has(url)) failures.push(`sitemap-0.xml: non-indexable, redirect, or noncanonical URL ${url}`);
  const pathname = new URL(url).pathname;
  if (url !== url.toLowerCase() || (pathname !== '/' && !pathname.endsWith('/'))) {
    failures.push(`sitemap-0.xml: noncanonical URL format ${url}`);
  }
}
const sitemapUrlSet = new Set(sitemapUrls);
for (const { url, html } of indexableEntries) {
  const canonical = attribute(tagWithAttribute(html, 'link', 'rel', 'canonical'), 'href');
  if (canonical === url && !sitemapUrlSet.has(url)) failures.push(`sitemap-0.xml: missing indexable URL ${url}`);
}

const robots = await fs.readFile(path.join(dist, 'robots.txt'), 'utf8');
const sitemapDeclarations = robots.match(/^Sitemap:.*$/gmi) || [];
if (sitemapDeclarations.length !== 1 || sitemapDeclarations[0] !== 'Sitemap: https://ocha.health/sitemap-index.xml') {
  failures.push('robots.txt: canonical sitemap declaration is invalid');
}

if (failures.length) {
  console.error(failures.join('\n'));
  process.exitCode = 1;
} else {
  console.log(`SEO audit passed: ${indexableEntries.length} indexable pages, ${sitemapUrls.length} sitemap URLs.`);
}
