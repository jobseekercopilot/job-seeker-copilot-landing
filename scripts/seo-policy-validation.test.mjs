import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { CANONICAL_PUBLIC_ORIGIN, resolveSearchIndexingEnabled } from './search-indexing-policy.mjs';

test('search indexing policy fails closed outside the approved main production build', () => {
  assert.equal(resolveSearchIndexingEnabled({}), false);
  assert.equal(resolveSearchIndexingEnabled({ ENABLE_SEARCH_INDEXING: 'false' }), false);
  assert.throws(
    () => resolveSearchIndexingEnabled({ ENABLE_SEARCH_INDEXING: 'true', AWS_BRANCH: 'develop', PUBLIC_WEBSITE_URL: CANONICAL_PUBLIC_ORIGIN }),
    /main production branch/,
  );
  assert.throws(
    () => resolveSearchIndexingEnabled({ ENABLE_SEARCH_INDEXING: 'true', AWS_BRANCH: 'main', PUBLIC_WEBSITE_URL: 'https://jobseekercopilot.com' }),
    /exact canonical public website URL/,
  );
  assert.throws(() => resolveSearchIndexingEnabled({ ENABLE_SEARCH_INDEXING: 'yes' }), /true or false/);
  assert.equal(resolveSearchIndexingEnabled({
    ENABLE_SEARCH_INDEXING: 'true',
    AWS_BRANCH: 'main',
    PUBLIC_WEBSITE_URL: CANONICAL_PUBLIC_ORIGIN,
  }), true);
});

test('SEO files are deterministic, canonical and gated for disabled and approved builds', async () => {
  const disabled = await mkdtemp(join(tmpdir(), 'seo-disabled-'));
  const enabled = await mkdtemp(join(tmpdir(), 'seo-enabled-'));
  try {
    runGenerator(disabled, {});
    runGenerator(enabled, {
      ENABLE_SEARCH_INDEXING: 'true',
      AWS_BRANCH: 'main',
      PUBLIC_WEBSITE_URL: CANONICAL_PUBLIC_ORIGIN,
    });
    assert.equal(await readFile(join(disabled, 'robots.txt'), 'utf8'), 'User-agent: *\nDisallow: /\n');
    assert.equal(
      await readFile(join(enabled, 'robots.txt'), 'utf8'),
      `User-agent: *\nAllow: /\n\nSitemap: ${CANONICAL_PUBLIC_ORIGIN}/sitemap.xml\n`,
    );
    const disabledSitemap = await readFile(join(disabled, 'sitemap.xml'), 'utf8');
    const enabledSitemap = await readFile(join(enabled, 'sitemap.xml'), 'utf8');
    assert.equal(disabledSitemap, enabledSitemap);
    const urls = [...enabledSitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match => match[1]);
    assert.equal(urls.length, 9);
    assert.equal(new Set(urls).size, urls.length);
    assert.ok(urls.every(url => url.startsWith(`${CANONICAL_PUBLIC_ORIGIN}/`)));
    assert.ok(urls.every(url => !/[?#]|\/waitlist\/|\/404(?:\/|$)/.test(url)));
  } finally {
    await Promise.all([rm(disabled, { recursive: true, force: true }), rm(enabled, { recursive: true, force: true })]);
  }
});

test('route metadata is complete and unique for approved public pages', async () => {
  const routes = JSON.parse(await readFile('src/app/seo/seo-routes.json', 'utf8'));
  const publicRoutes = Object.values(routes).filter(route => route.indexable);
  assert.equal(publicRoutes.length, 9);
  assert.equal(new Set(publicRoutes.map(route => route.path)).size, publicRoutes.length);
  assert.equal(new Set(publicRoutes.map(route => route.title)).size, publicRoutes.length);
  assert.equal(new Set(publicRoutes.map(route => route.description)).size, publicRoutes.length);
  for (const route of Object.values(routes)) {
    assert.match(route.path, /^\//);
    assert.ok(route.title.length >= 20 && route.title.length <= 90);
    assert.ok(route.description.length >= 50 && route.description.length <= 180);
  }
  const packageJson = JSON.parse(await readFile('package.json', 'utf8'));
  assert.match(packageJson.scripts['config:generate'], /generate-seo-files/);
  assert.match(packageJson.scripts.build, /verify-seo-output/);
});

function runGenerator(outputDirectory, additions) {
  const result = spawnSync(process.execPath, ['scripts/generate-seo-files.mjs'], {
    encoding: 'utf8',
    env: { ...process.env, ENABLE_SEARCH_INDEXING: '', AWS_BRANCH: '', PUBLIC_WEBSITE_URL: '', ...additions, SEO_PUBLIC_OUTPUT_DIR: outputDirectory },
  });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stderr, '');
}
