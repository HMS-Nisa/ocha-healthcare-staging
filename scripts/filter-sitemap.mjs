import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

function attribute(tag, name) {
  return tag.match(new RegExp(`\\b${name}\\s*=\\s*["']([^"']*)["']`, 'i'))?.[1] || '';
}

function tagWithAttribute(html, tagName, attributeName, expectedValue) {
  return [...html.matchAll(new RegExp(`<${tagName}\\b[^>]*>`, 'gi'))]
    .find((match) => attribute(match[0], attributeName).toLowerCase() === expectedValue)?.[0] || '';
}

function isIndexable(robots) {
  const directives = robots.toLowerCase().split(',').map((value) => value.trim());
  return directives.includes('index') && !directives.includes('noindex');
}

export function filterEntries(entries) {
  return entries.filter(({ url, html }) => {
    const robotsTag = tagWithAttribute(html, 'meta', 'name', 'robots');
    const canonicalTag = tagWithAttribute(html, 'link', 'rel', 'canonical');
    return isIndexable(attribute(robotsTag, 'content')) && attribute(canonicalTag, 'href') === url;
  });
}

export function htmlPathForUrl(url, distDirectory) {
  const pathname = decodeURIComponent(new URL(url).pathname);
  return pathname === '/'
    ? path.join(distDirectory, 'index.html')
    : path.join(distDirectory, pathname.replace(/^\//, ''), 'index.html');
}

export async function filterSitemapXml(xml, distDirectory) {
  const sitemapEntries = [...xml.matchAll(/<url\b[^>]*>[\s\S]*?<loc>([^<]+)<\/loc>[\s\S]*?<\/url>/gi)];
  if (sitemapEntries.length === 0) throw new Error('sitemap-0.xml contains no URLs');

  const entries = await Promise.all(sitemapEntries.map(async ([, url]) => {
    try {
      return { url, html: await fs.readFile(htmlPathForUrl(url, distDirectory), 'utf8') };
    } catch (error) {
      if (error?.code === 'ENOENT') return { url, html: '' };
      throw error;
    }
  }));
  const allowed = new Set(filterEntries(entries).map((entry) => entry.url));
  return xml.replace(/<url\b[^>]*>[\s\S]*?<loc>([^<]+)<\/loc>[\s\S]*?<\/url>/gi, (entry, url) => (
    allowed.has(url) ? entry : ''
  ));
}

async function main() {
  const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const distDirectory = path.join(projectRoot, 'dist');
  const sitemapPath = path.join(distDirectory, 'sitemap-0.xml');
  const xml = await fs.readFile(sitemapPath, 'utf8');
  await fs.writeFile(sitemapPath, await filterSitemapXml(xml, distDirectory));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main();
}
