import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const runnerUrl = new URL('./waitlist-e2e-browser.mjs', import.meta.url);
const runner = await readFile(runnerUrl, 'utf8');

for (const required of [
  "['submit', 'resend', 'confirm', 'invalid']",
  'https://develop.d3gd9ezfa3aujn.amplifyapp.com',
  'https://www.jobseekercopilot.com',
  "url.protocol === 'https:'",
  "url.pathname === '/waitlist/confirm'",
  'tokenRemovedFromUrl',
  'tokenNotRendered',
  'noCspViolations',
  'fitsViewport',
]) {
  assert.match(runner, new RegExp(required.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
}

for (const forbidden of [
  /console\.(?:log|error|warn)/,
  /screenshot\s*\(/,
  /tracing\./,
  /writeFile\s*\(/,
  /TEST_EMAIL[^\n]*(?:stdout|stderr)/,
  /CONFIRMATION_URL[^\n]*(?:stdout|stderr)/,
]) {
  assert.doesNotMatch(runner, forbidden);
}

const failClosed = spawnSync(process.execPath, [fileURLToPath(runnerUrl)], {
  encoding: 'utf8',
  env: { ...process.env, BASE_URL: '', TEST_MODE: '', TEST_EMAIL: '', CONFIRMATION_URL: '' },
});
assert.equal(failClosed.status, 1);
assert.equal(failClosed.stderr, '');
const result = JSON.parse(failClosed.stdout);
assert.equal(result.pass, false);
assert.equal(result.reason, 'invalid_base_url');
assert.deepEqual(Object.keys(result).sort(), ['pass', 'reason']);

console.log('Waitlist browser E2E runner policy checks passed.');
