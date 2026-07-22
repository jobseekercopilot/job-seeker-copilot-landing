import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { describe, it } from 'node:test';

import { inspectApprovedEmails, inspectText, validateTrackedPaths } from './artifact-policy.mjs';

const workflow = await readFile('.github/workflows/ci.yml', 'utf8');

describe('release security gates', () => {
  it('rejects environment and credential-like tracked files', () => {
    assert.deepEqual(validateTrackedPaths(['.env', 'config/service-account.json']), [
      { path: '.env', policy: 'tracked environment file' },
      { path: 'config/service-account.json', policy: 'credential-like tracked filename' },
    ]);
    assert.deepEqual(validateTrackedPaths(['.env.example', 'public/config/app-config.json']), []);
  });

  it('rejects unsafe production artifact values without echoing them', () => {
    for (const value of [
      'http://localhost:4200',
      'https://feature-waitlist-double-opt-in.d3gd9ezfa3aujn.amplifyapp.com',
      'owner@example.test',
      'CONTACT_RECIPIENT_EMAIL',
      'private.person@another-domain.test',
    ]) {
      assert.ok(inspectText(value, 'bundle.js').length > 0);
    }
    assert.deepEqual(inspectText('Contact hello@jobseekercopilot.com', 'index.html'), []);
    assert.ok(inspectApprovedEmails('recipient@private.invalid', 'config.ts').length > 0);
    assert.deepEqual(inspectApprovedEmails('support@jobseekercopilot.com', 'config.ts'), []);
  });

  it('fails closed when complete Git history cannot be discovered', async () => {
    const empty = await mkdtemp(join(tmpdir(), 'landing-history-policy-'));
    try {
      const result = spawnSync('bash', ['scripts/security/scan-history.sh'], {
        cwd: process.cwd(),
        encoding: 'utf8',
        env: { ...process.env, SECURITY_REPO_ROOT: empty, GITLEAKS_BIN: '/unavailable/gitleaks' },
      });
      assert.equal(result.status, 2);
      assert.match(result.stderr, /not a Git worktree/);
    } finally {
      await rm(empty, { recursive: true });
    }
  });

  it('uses least privilege, full history and immutable official actions in CI', () => {
    assert.match(workflow, /permissions:\n  contents: read/);
    assert.doesNotMatch(workflow, /pull_request_target|write-all|contents: write/);
    assert.match(workflow, /fetch-depth: 0/);
    for (const action of [
      'actions/checkout@11d5960a326750d5838078e36cf38b85af677262',
      'actions/setup-node@49933ea5288caeca8642d1e84afbd3f7d6820020',
      'actions/setup-python@a26af69be951a213d495a4c3e4e4022e16d87065',
      'aws-actions/setup-sam@f84ec7d548307efafe33230528756de3c5841a17',
      'actions/upload-artifact@ea165f8d65b6e75b540449e92b4886f43607fa02',
    ]) {
      assert.match(workflow, new RegExp(action));
    }
    assert.match(workflow, /GITLEAKS_SHA256: 551f6fc83ea457d62a0d98237cbad105af8d557003051f41f3e7ca7b3f2470eb/);
    assert.match(workflow, /npm audit --audit-level=high/);
    assert.match(workflow, /sam validate --lint --template-file infrastructure\/template\.yaml/);
    assert.match(workflow, /sam validate --lint --template-file infrastructure\/waitlist-backend\/template\.yaml/);
  });
});
