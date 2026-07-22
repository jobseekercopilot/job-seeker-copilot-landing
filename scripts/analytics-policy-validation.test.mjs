import assert from 'node:assert/strict';
import test from 'node:test';
import { resolveAnalyticsEnabled } from './analytics-policy.mjs';

const approved = {
  ENABLE_ANALYTICS: 'true',
  AWS_BRANCH: 'main',
  PUBLIC_ENVIRONMENT_NAME: 'production',
  PUBLIC_WEBSITE_URL: 'https://www.jobseekercopilot.com',
  ANALYTICS_ENDPOINT_URL: 'https://api.example.test/analytics',
  WAITLIST_API_URL: 'https://api.example.test/waitlist',
};

test('analytics policy fails closed outside explicitly approved canonical production', () => {
  assert.equal(resolveAnalyticsEnabled({}), false);
  assert.equal(resolveAnalyticsEnabled({ ENABLE_ANALYTICS: 'false' }), false);
  assert.equal(resolveAnalyticsEnabled(approved), true);
  assert.throws(() => resolveAnalyticsEnabled({ ...approved, ENABLE_ANALYTICS: 'yes' }), /true or false/);
  assert.throws(() => resolveAnalyticsEnabled({ ...approved, AWS_BRANCH: 'develop' }), /main production branch/);
  assert.throws(() => resolveAnalyticsEnabled({ ...approved, PUBLIC_ENVIRONMENT_NAME: 'development' }), /exact canonical/);
  assert.throws(() => resolveAnalyticsEnabled({ ...approved, PUBLIC_WEBSITE_URL: 'https://jobseekercopilot.com' }), /exact canonical/);
  assert.throws(() => resolveAnalyticsEnabled({ ...approved, ANALYTICS_ENDPOINT_URL: 'http://api.example.test/analytics' }), /HTTPS first-party/);
  assert.throws(() => resolveAnalyticsEnabled({ ...approved, ANALYTICS_ENDPOINT_URL: 'https://api.example.test/analytics?value=unsafe' }), /HTTPS first-party/);
  assert.throws(() => resolveAnalyticsEnabled({ ...approved, ANALYTICS_ENDPOINT_URL: 'https://other.example.test/analytics' }), /same approved first-party API origin/);
});
