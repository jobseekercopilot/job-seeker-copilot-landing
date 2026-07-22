import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const runnerUrl = new URL('./contact-e2e-browser.mjs', import.meta.url);
const runner = await readFile(runnerUrl, 'utf8');

for (const required of [
  "['disabled', 'validation', 'honeypot', 'network-failure', 'submit']",
  'https://develop.d3gd9ezfa3aujn.amplifyapp.com',
  'https://www.jobseekercopilot.com',
  'https://1la3mp57zg.execute-api.eu-west-2.amazonaws.com/contact',
  'exactlyOnePostDespiteRepeat',
  'noBackendRequest',
  'inputPreserved',
  'alertAnnounced',
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
  /TEST_(?:NAME|EMAIL|SUBJECT|MESSAGE)[^\n]*(?:stdout|stderr)/,
]) {
  assert.doesNotMatch(runner, forbidden);
}

const failClosed = spawnSync(process.execPath, [fileURLToPath(runnerUrl)], {
  encoding: 'utf8',
  env: {
    ...process.env,
    BASE_URL: '',
    TEST_MODE: '',
    TEST_NAME: '',
    TEST_EMAIL: '',
    TEST_SUBJECT: '',
    TEST_MESSAGE: '',
  },
});
assert.equal(failClosed.status, 1);
assert.equal(failClosed.stderr, '');
const result = JSON.parse(failClosed.stdout);
assert.equal(result.pass, false);
assert.equal(result.reason, 'invalid_base_url');
assert.deepEqual(Object.keys(result).sort(), ['pass', 'reason']);

console.log('Contact browser E2E runner policy checks passed.');
