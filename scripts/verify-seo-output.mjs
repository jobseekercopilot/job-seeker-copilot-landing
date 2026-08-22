import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { CANONICAL_PUBLIC_ORIGIN } from './search-indexing-policy.mjs';

const output = join('dist', 'job-seeker-copilot-landing', 'browser');
const routes = JSON.parse(await readFile('src/app/seo/seo-routes.json', 'utf8'));
const runtimeConfig = JSON.parse(await readFile(join(output, 'config', 'app-config.json'), 'utf8'));
const namedRoutes = Object.entries(routes);
const pages = [];

for (const [key, route] of namedRoutes) {
  const html = await readFile(outputFile(route.path), 'utf8');
  const head = html.split('</head>', 1)[0];
  const title = capture(head, /<title>([\s\S]*?)<\/title>/i, `${key} title`);
  const description = meta(head, 'name', 'description');
  const robots = meta(head, 'name', 'robots');
  const canonical = captureOptional(head, /<link\b(?=[^>]*rel="canonical")(?=[^>]*href="([^"]+)")[^>]*>/i);
  const expectedCanonical = canonicalPublicUrl(route.path);
  const expectedRobots = runtimeConfig.searchIndexingEnabled && route.indexable
    ? 'index, follow, max-image-preview:large'
    : 'noindex, nofollow, noarchive';

  assert(title === route.title, `${key} title is not the approved route title.`);
  assert(description === route.description, `${key} description is not the approved route description.`);
  assert(robots === expectedRobots, `${key} robots policy is not fail closed for this build.`);
  assert(!head.includes('amplifyapp.com'), `${key} metadata contains a development host.`);
  assert(!/[?&]token=|controlled-audit-token/i.test(head), `${key} metadata contains a token or sensitive query.`);
  assert((html.match(/<h1\b/gi) ?? []).length === 1, `${key} must render exactly one H1.`);
  assert(validHeadingOrder(html), `${key} contains an invalid heading-level jump.`);
  assert([...html.matchAll(/<img\b[^>]*>/gi)].every(match => /\balt="[^"]*"/i.test(match[0])), `${key} has an image without alt text.`);

  if (route.indexable) {
    assert(canonical === expectedCanonical, `${key} canonical is missing or incorrect.`);
    verifySocialMetadata(head, route, expectedCanonical);
  } else {
    assert(!canonical, `${key} action route must not have a canonical.`);
    assert(!/<meta\b[^>]*(?:property="og:|name="twitter:)/i.test(head), `${key} action route must not expose social metadata.`);
  }

  const schemas = [...head.matchAll(/<script\b[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)];
  if (route.schema) {
    assert(schemas.length === 1, `${key} must expose exactly one supported structured-data block.`);
    JSON.parse(schemas[0][1]);
  } else {
    assert(schemas.length === 0, `${key} exposes unsupported structured data.`);
  }

  pages.push({ key, route, html, title, description });
}

assert(unique(pages.filter(page => page.route.indexable).map(page => page.title)), 'Indexable page titles must be unique.');
assert(unique(pages.filter(page => page.route.indexable).map(page => page.description)), 'Indexable page descriptions must be unique.');
verifyInternalLinks(pages);
await verifySitemapAndRobots();
await verifySocialImage();
console.log(`SEO output verification passed for ${pages.length} prerendered routes.`);

function outputFile(path) {
  return path === '/' ? join(output, 'index.html') : join(output, path.slice(1), 'index.html');
}

function verifySocialMetadata(head, route, canonical) {
  const properties = {
    'og:type': route.socialType,
    'og:site_name': 'Job Seeker Copilot',
    'og:locale': 'en_GB',
    'og:title': route.title,
    'og:description': route.description,
    'og:url': canonical,
    'og:image': `${CANONICAL_PUBLIC_ORIGIN}/social/og-image.png`,
    'og:image:secure_url': `${CANONICAL_PUBLIC_ORIGIN}/social/og-image.png`,
    'og:image:type': 'image/png',
    'og:image:width': '1200',
    'og:image:height': '630',
    'og:image:alt': 'Job Seeker Copilot — your job search, organised',
  };
  for (const [property, expected] of Object.entries(properties)) {
    assert(meta(head, 'property', property) === expected, `${route.path} is missing complete ${property} metadata.`);
  }
  for (const name of ['twitter:card', 'twitter:title', 'twitter:description', 'twitter:image', 'twitter:image:alt']) {
    assert(Boolean(meta(head, 'name', name)), `${route.path} is missing ${name} metadata.`);
  }
}

function verifyInternalLinks(pagesToCheck) {
  const routePaths = new Set(pagesToCheck.map(page => page.route.path));
  const pagesByPath = new Map(pagesToCheck.map(page => [page.route.path, page]));
  for (const page of pagesToCheck) {
    for (const match of page.html.matchAll(/<a\b[^>]*href="(\/[^"]*)"[^>]*>/gi)) {
      const [pathAndQuery, fragment] = match[1].split('#', 2);
      const [path] = pathAndQuery.split('?', 1);
      assert(!path || routePaths.has(path), `${page.route.path} links to a missing internal route: ${path}`);
      if (fragment) {
        const target = pagesByPath.get(path || page.route.path);
        assert(target && new RegExp(`\\bid="${escapeRegExp(decodeURIComponent(fragment))}"`, 'i').test(target.html), `${page.route.path} links to a missing fragment: ${fragment}`);
      }
    }
  }
}

async function verifySitemapAndRobots() {
  const sitemap = await readFile(join(output, 'sitemap.xml'), 'utf8');
  const actual = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match => match[1]);
  const expected = namedRoutes.filter(([, route]) => route.indexable).map(([, route]) => canonicalPublicUrl(route.path));
  assert(JSON.stringify(actual) === JSON.stringify(expected), 'Sitemap URLs or deterministic ordering are incorrect.');
  assert(unique(actual), 'Sitemap URLs must be unique.');
  assert(actual.every(value => value.startsWith(`${CANONICAL_PUBLIC_ORIGIN}/`) && !/[?#]|\/waitlist\//.test(value)), 'Sitemap contains a prohibited URL.');

  const robots = await readFile(join(output, 'robots.txt'), 'utf8');
  if (runtimeConfig.searchIndexingEnabled) {
    assert(robots === `User-agent: *\nAllow: /\n\nSitemap: ${CANONICAL_PUBLIC_ORIGIN}/sitemap.xml\n`, 'Enabled robots policy is incorrect.');
  } else {
    assert(robots === 'User-agent: *\nDisallow: /\n', 'Disabled robots policy must disallow all crawling.');
  }
}

function canonicalPublicUrl(path) {
  const canonicalPath = path === '/' ? '/' : `${path.replace(/\/+$/, '')}/`;
  return `${CANONICAL_PUBLIC_ORIGIN}${canonicalPath}`;
}

async function verifySocialImage() {
  const image = await readFile(join(output, 'social', 'og-image.png'));
  assert(image.subarray(1, 4).toString('ascii') === 'PNG', 'Social image must be a PNG.');
  assert(image.readUInt32BE(16) === 1200 && image.readUInt32BE(20) === 630, 'Social image must be 1200x630.');
}

function meta(head, attribute, value) {
  return captureOptional(head, new RegExp(`<meta\\b(?=[^>]*${attribute}="${escapeRegExp(value)}")(?=[^>]*content="([^"]*)")[^>]*>`, 'i'));
}

function capture(value, pattern, label) {
  const match = pattern.exec(value)?.[1]?.trim();
  if (!match) throw new Error(`Missing ${label}.`);
  return match;
}

function captureOptional(value, pattern) {
  return pattern.exec(value)?.[1]?.trim() ?? '';
}

function validHeadingOrder(html) {
  const levels = [...html.matchAll(/<h([1-6])\b/gi)].map(match => Number(match[1]));
  return levels.slice(1).every((level, index) => level - levels[index] <= 1);
}

function unique(values) {
  return new Set(values).size === values.length;
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
