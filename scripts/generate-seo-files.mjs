import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { CANONICAL_PUBLIC_ORIGIN, resolveSearchIndexingEnabled } from './search-indexing-policy.mjs';

const outputDirectory = resolve(process.env.SEO_PUBLIC_OUTPUT_DIR || 'public');
const routeSource = JSON.parse(await readFile('src/app/seo/seo-routes.json', 'utf8'));
const indexingEnabled = resolveSearchIndexingEnabled();
const urls = Object.values(routeSource)
  .filter(route => route.indexable === true)
  .map(route => canonicalPublicUrl(route.path));

validateUrls(urls);
await mkdir(outputDirectory, { recursive: true });
await Promise.all([
  writeFile(resolve(outputDirectory, 'sitemap.xml'), sitemap(urls), 'utf8'),
  writeFile(resolve(outputDirectory, 'robots.txt'), robots(indexingEnabled), 'utf8'),
]);
console.log(`Wrote deterministic SEO files with indexing ${indexingEnabled ? 'enabled' : 'disabled'}.`);

function validateUrls(values) {
  if (!values.length || new Set(values).size !== values.length) throw new Error('Sitemap URLs must be non-empty and unique.');
  for (const value of values) {
    const url = new URL(value);
    if (url.origin !== CANONICAL_PUBLIC_ORIGIN || url.protocol !== 'https:' || url.search || url.hash) {
      throw new Error('Sitemap contains a prohibited host, protocol, query or fragment.');
    }
    if (/\/(?:waitlist|api|404)(?:\/|$)/.test(url.pathname)) {
      throw new Error('Sitemap contains a private, action, API or error route.');
    }
  }
}

function canonicalPublicUrl(path) {
  const canonicalPath = path === '/' ? '/' : `${path.replace(/\/+$/, '')}/`;
  return `${CANONICAL_PUBLIC_ORIGIN}${canonicalPath}`;
}

function sitemap(values) {
  const entries = values.map(value => `  <url><loc>${escapeXml(value)}</loc></url>`).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries}\n</urlset>\n`;
}

function robots(enabled) {
  return enabled
    ? `User-agent: *\nAllow: /\n\nSitemap: ${CANONICAL_PUBLIC_ORIGIN}/sitemap.xml\n`
    : 'User-agent: *\nDisallow: /\n';
}

function escapeXml(value) {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}
