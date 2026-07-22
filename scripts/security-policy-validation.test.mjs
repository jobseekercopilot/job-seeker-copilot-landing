import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { describe, it } from 'node:test';

const workspace = JSON.parse(await readFile('angular.json', 'utf8'));
const packageJson = JSON.parse(await readFile('package.json', 'utf8'));
const headers = await readFile('customHttp.yml', 'utf8');
const injector = await readFile('scripts/inject-csp.mjs', 'utf8');
const main = await readFile('src/main.ts', 'utf8');
const buildOptions = workspace.projects['job-seeker-copilot-landing'].architect.build.options;

describe('browser security policy', () => {
  it('injects a route-specific hash CSP after prerender without unsafe eval', () => {
    assert.equal(buildOptions.security?.autoCsp, undefined);
    assert.match(
      packageJson.scripts.build,
      /ng build && node scripts\/prepare-static-not-found\.mjs && node scripts\/inject-csp\.mjs/,
    );
    assert.match(injector, /createHash\('sha256'\)/);
    assert.match(injector, /script-src 'self'/);
    assert.doesNotMatch(injector, /unsafe-inline|unsafe-eval/);
    assert.doesNotMatch(headers, /unsafe-eval/);
    const production = workspace.projects['job-seeker-copilot-landing'].architect.build.configurations.production;
    assert.equal(production.optimization.styles.inlineCritical, false);
  });

  it('restricts browser connections to this site and the exact deployed API', () => {
    assert.match(
      headers,
      /connect-src 'self' https:\/\/1la3mp57zg\.execute-api\.eu-west-2\.amazonaws\.com;/,
    );
    assert.doesNotMatch(headers, /connect-src[^\n]*\*/);
    assert.doesNotMatch(headers, /Access-Control-Allow-Origin/);
    assert.doesNotMatch(headers, /script-src/);
  });

  it('declares the required transport, framing, MIME, referrer and permissions headers', () => {
    for (const value of [
      'Content-Security-Policy',
      'Strict-Transport-Security',
      'Referrer-Policy',
      'Permissions-Policy',
      'X-Content-Type-Options',
      'X-Frame-Options',
      'X-Permitted-Cross-Domain-Policies',
    ]) {
      assert.match(headers, new RegExp(`key: '${value}'`));
    }
    assert.match(headers, /frame-ancestors 'none'/);
    assert.match(headers, /Referrer-Policy'[\s\S]*value: 'no-referrer'/);
    assert.match(headers, /X-Frame-Options'[\s\S]*value: 'DENY'/);
  });

  it('prevents public runtime configuration caching', () => {
    assert.match(headers, /pattern: '\/config\/app-config\.json'[\s\S]*value: 'no-store, max-age=0'/);
  });

  it('keeps browser startup errors generic', () => {
    assert.match(main, /console\.error\('Application startup failed\.'\)/);
    assert.doesNotMatch(main, /console\.error\(error\)|console\.error\(err\)/);
  });
});
