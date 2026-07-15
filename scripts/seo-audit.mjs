import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { filterEntries, htmlPathForUrl } from './filter-sitemap.mjs';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(projectRoot, 'dist');
const failures = [];
const siteOrigin = 'https://ocha.health';
const ghlTrackingUrl = 'https://link.ocha.health/js/external-tracking.js';
const ghlTrackingId = 'tk_1d3f5f01348b42b7a2b92e23faa347cd';
const requiredNetlifyRedirects = [
  '/article/template/ /blog/biaya-operasi-bypass-jantung-di-malaysia/ 301!',
  '/dokter/dokter-spesialis-ortopedi-tulang--kuala-lumpur/ /dokter/dokter-spesialis-ortopedi-tulang-kuala-lumpur/ 301!',
  '/dokter/dokter-spesialis-ortopedi-tulang--penang/ /dokter/dokter-spesialis-ortopedi-tulang-penang/ 301!',
  '/dokter/dokter-spesialis-ortopedi-tulang--sarawak/ /dokter/dokter-spesialis-ortopedi-tulang-sarawak/ 301!',
];

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

export function isIndexableByDefault(html) {
  const robotsTag = tagWithAttribute(html, 'meta', 'name', 'robots');
  const directives = attribute(robotsTag, 'content').toLowerCase().split(',').map((value) => value.trim());
  return !directives.includes('noindex');
}

export function hasGhlTracking(html) {
  return tags(html, 'script').some((tag) => (
    attribute(tag, 'src') === ghlTrackingUrl
    && attribute(tag, 'data-tracking-id') === ghlTrackingId
  ));
}

export function findDuplicateValues(values = []) {
  const counts = new Map();
  for (const raw of values) {
    const value = String(raw || '').trim();
    if (value) counts.set(value, (counts.get(value) || 0) + 1);
  }
  return [...counts.entries()]
    .filter(([, count]) => count > 1)
    .map(([value]) => value)
    .sort();
}

export function hasRequiredNetlifyRedirects(source = '') {
  const lines = new Set(String(source).split(/\r?\n/).map((line) => line.trim()).filter(Boolean));
  return requiredNetlifyRedirects.every((rule) => lines.has(rule));
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

export function hasProhibitedPositioning(html) {
  return /AI-Powered|airport transfer|airport pickup|accommodation support|dukungan akomodasi|Guarantee Letter/i.test(visibleHtml(html));
}

export function resolveInternalTarget(href, pageUrl) {
  try {
    const target = new URL(href, pageUrl);
    if (target.origin !== siteOrigin || !['http:', 'https:'].includes(target.protocol)) return null;
    return `${target.origin}${target.pathname}`;
  } catch {
    return null;
  }
}

export function targetPathForUrl(target, distDirectory = dist) {
  const pathname = decodeURIComponent(new URL(target).pathname);
  if (pathname === '/') return path.join(distDirectory, 'index.html');
  const relative = pathname.replace(/^\//, '');
  if (pathname.endsWith('/')) return path.join(distDirectory, relative, 'index.html');
  if (path.extname(pathname)) return path.join(distDirectory, relative);
  return path.join(distDirectory, relative, 'index.html');
}

async function hasInternalTarget(target) {
  try {
    await fs.access(targetPathForUrl(target));
    return true;
  } catch {
    return false;
  }
}

const sensitiveAnalyticsKeys = 'doctor_name|message|phone|email|diagnosis|medical_answer|free_text';

function objectHasSensitiveKey(objectSource) {
  const namedKey = new RegExp(`(?:["']?(?:${sensitiveAnalyticsKeys})["']?\\s*:|\\b(?:${sensitiveAnalyticsKeys})\\b(?=\\s*[,}]))`, 'i');
  return namedKey.test(objectSource);
}

export function containsSensitiveAnalyticsPayload(source) {
  const directObjects = [
    ...source.matchAll(/dataLayer\.push\(\s*(\{[\s\S]{0,2000}?\})\s*\)/g),
    ...source.matchAll(/gtag\([\s\S]{0,500}?,\s*(\{[\s\S]{0,2000}?\})\s*\)/g),
  ];
  if (directObjects.some((match) => objectHasSensitiveKey(match[1]))) return true;

  for (const match of source.matchAll(/dataLayer\.push\(\s*([A-Za-z_$][\w$]*)\s*\)/g)) {
    const variable = match[1].replace(/[$]/g, '\\$&');
    const assignment = source.match(new RegExp(`(?:const|let|var)\\s+${variable}\\s*=\\s*(\\{[\\s\\S]{0,2000}?\\})`));
    if (assignment && objectHasSensitiveKey(assignment[1])) return true;
  }
  return false;
}

async function main() {
  const allFiles = await walk(dist);
  const htmlFiles = allFiles.filter((file) => file.endsWith('.html'));
  const indexableEntries = [];

  for (const file of htmlFiles) {
    const html = await fs.readFile(file, 'utf8');
    const relative = path.relative(dist, file).split(path.sep).join('/');
    const isLongStayPage = relative === 'mm2h-pvip/index.html';
    if (isLongStayPage) {
      if (isIndexableByDefault(html)) failures.push(`${relative}: must remain noindex until claims are approved and sourced`);
      if (!/<html[^>]+lang=["']en["']/i.test(html)) failures.push(`${relative}: missing lang=en`);
      if (!hasGhlTracking(html)) failures.push(`${relative}: missing approved GHL tracking`);
    } else if (hasGhlTracking(html)) {
      failures.push(`${relative}: GHL tracking is restricted to the MM2H/PVIP page`);
    }
    if (hasProhibitedPositioning(html)) failures.push(`${relative}: out-of-scope positioning`);
    if (!isIndexableByDefault(html)) continue;

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

    const missingTargets = [];
    const hrefs = tags(html, 'a').map((tag) => attribute(tag, 'href')).filter(Boolean);
    for (const href of new Set(hrefs)) {
      const target = resolveInternalTarget(href, expectedUrl);
      if (target && !await hasInternalTarget(target)) missingTargets.push(target);
    }
    for (const target of missingTargets) failures.push(`${relative}: broken internal link ${target}`);
    const title = html.match(/<title>([^<]+)<\/title>/i)?.[1] || '';
    const description = attribute(tagWithAttribute(html, 'meta', 'name', 'description'), 'content');
    indexableEntries.push({ url: expectedUrl, html, title, description });
  }

  for (const title of findDuplicateValues(indexableEntries.map((entry) => entry.title))) {
    failures.push(`indexable pages: duplicate title ${title}`);
  }
  for (const description of findDuplicateValues(indexableEntries.map((entry) => entry.description))) {
    failures.push(`indexable pages: duplicate description ${description}`);
  }

  for (const file of allFiles.filter((candidate) => /\.(?:html|m?js)$/i.test(candidate))) {
    const source = await fs.readFile(file, 'utf8');
    const analyticsSources = file.endsWith('.html')
      ? [...source.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)].map((match) => match[1])
      : [source];
    if (analyticsSources.some(containsSensitiveAnalyticsPayload)) {
      failures.push(`${path.relative(dist, file)}: sensitive analytics event parameter`);
    }
  }

  const sitemapPath = path.join(dist, 'sitemap-0.xml');
  const sitemap = await fs.readFile(sitemapPath, 'utf8');
  const sitemapUrls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/gi)].map((match) => match[1]);
  if (sitemapUrls.length === 0) failures.push('sitemap-0.xml: contains no URLs');
  if (/\/article\/template\/|--/.test(sitemap)) failures.push('sitemap-0.xml: mock or malformed URL');
  if (/\/mm2h-pvip\//.test(sitemap)) failures.push('sitemap-0.xml: MM2H/PVIP must remain excluded while noindex');
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

  const netlifyRedirects = await fs.readFile(path.join(dist, '_redirects'), 'utf8');
  if (!hasRequiredNetlifyRedirects(netlifyRedirects)) {
    failures.push('_redirects: required permanent legacy redirects are missing');
  }

  if (failures.length) {
    console.error(failures.join('\n'));
    process.exitCode = 1;
  } else {
    console.log(`SEO audit passed: ${indexableEntries.length} indexable pages, ${sitemapUrls.length} sitemap URLs.`);
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main();
}
