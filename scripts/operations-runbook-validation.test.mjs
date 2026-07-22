import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const runbookUrl = new URL(
  '../docs/launch/operations-and-troubleshooting-runbook.md',
  import.meta.url,
);
const checklistUrl = new URL(
  '../docs/launch/release-operations-checklist.md',
  import.meta.url,
);
const verificationUrl = new URL(
  '../docs/launch/operations-runbook-verification-2026-07-22.md',
  import.meta.url,
);
const runbook = await readFile(runbookUrl, 'utf8');
const checklist = await readFile(checklistUrl, 'utf8');
const verification = await readFile(verificationUrl, 'utf8');
const readme = await readFile(new URL('../README.md', import.meta.url), 'utf8');

for (const required of [
  'Backend deployment and change-set review',
  'Frontend deployment and Amplify verification',
  'Rollback',
  'Waiting-list troubleshooting',
  'Contact troubleshooting',
  'SES bounce, complaint and simulator troubleshooting',
  'Development and production smoke tests',
  'Monitoring, logs and cost',
  'Evidence preservation and close-out',
  'UsePreviousValue',
  'enableLiveSubmissions=false',
  'analyticsEnabled=false',
  'EnableAnalyticsCollection',
  'Optional analytics controlled window',
]) {
  assert.match(runbook, new RegExp(required.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
}

for (const required of [
  'Preflight',
  'Code and security gate',
  'Backend deployment',
  'Development E2E',
  'Frontend release and promotion',
  'Production smoke',
  'Rollback readiness',
  'Launch decision and close-out',
]) {
  assert.match(checklist, new RegExp(required));
}

for (const forbidden of [
  /aws\s+cloudformation\s+delete-stack/i,
  /aws\s+dynamodb\s+scan/i,
  /aws\s+dynamodb\s+delete-table/i,
  /aws\s+lambda\s+update-function-configuration/i,
  /aws\s+cloudwatch\s+set-alarm-state/i,
  /sam\s+delete/i,
  /git\s+push\s+--force/i,
  /rm\s+-rf/i,
]) {
  assert.doesNotMatch(`${runbook}\n${checklist}\n${verification}`, forbidden);
}

assert.match(
  readme,
  /docs\/launch\/operations-and-troubleshooting-runbook\.md/,
);
assert.match(
  readme,
  /docs\/launch\/release-operations-checklist\.md/,
);
assert.match(
  readme,
  /docs\/launch\/operations-runbook-verification-2026-07-22\.md/,
);

for (const required of [
  'Read-only command dry run',
  'Repository validation',
  'Tabletop walkthrough',
  'Review and evidence boundary',
  'Both public submission switches remained `false`',
]) {
  assert.match(verification, new RegExp(required));
}

for (const [url, content] of [
  [runbookUrl, runbook],
  [checklistUrl, checklist],
  [verificationUrl, verification],
]) {
  const directory = dirname(fileURLToPath(url));
  const relativeLinks = [...content.matchAll(/\]\(((?:\.\.\/|\.\/)[^)#]+)(?:#[^)]+)?\)/g)];
  for (const [, link] of relativeLinks) {
    await access(resolve(directory, link));
  }
}

console.log('Operations runbook and release checklist policy checks passed.');
