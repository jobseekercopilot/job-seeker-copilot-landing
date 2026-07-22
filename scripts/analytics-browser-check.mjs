import assert from 'node:assert/strict';
import AxeBuilder from '@axe-core/playwright';
import { readFile } from 'node:fs/promises';
import { chromium } from 'playwright';

const baseUrl = (process.env.BASE_URL || 'http://127.0.0.1:4201').replace(/\/$/, '');
const endpoint = 'https://1la3mp57zg.execute-api.eu-west-2.amazonaws.com/analytics';
const waitlistEndpoint = 'https://1la3mp57zg.execute-api.eu-west-2.amazonaws.com/waitlist';
const baseConfig = JSON.parse(await readFile('public/config/app-config.json', 'utf8'));
const runtimeConfig = {
  ...baseConfig,
  environmentName: 'production',
  analyticsEnabled: true,
  analyticsEndpointUrl: endpoint,
  waitlistApiUrl: waitlistEndpoint,
  publicWebsiteUrl: 'https://www.jobseekercopilot.com',
  enableLiveSubmissions: false,
  searchIndexingEnabled: false,
};
const viewports = [
  { name: 'desktop', width: 1280, height: 900 },
  { name: 'mobile', width: 390, height: 844 },
];
const browser = await chromium.launch({ headless: true });

try {
  for (const viewport of viewports) {
    const context = await browser.newContext({ viewport });
    const page = await context.newPage();
    const payloads = [];
    await page.route(`${baseUrl}/config/app-config.json`, route => route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(runtimeConfig),
    }));
    await page.route(endpoint, route => {
      const request = route.request();
      const corsHeaders = {
        'Access-Control-Allow-Origin': baseUrl,
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST,OPTIONS',
      };
      if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: corsHeaders });
      payloads.push(JSON.parse(request.postData() ?? '{}'));
      return route.fulfill({
        status: 202,
        contentType: 'application/json',
        headers: corsHeaders,
        body: '{"success":true,"code":"ANALYTICS_ACCEPTED","message":"Event accepted."}',
      });
    });

    await page.goto(
      `${baseUrl}/?utm_source=linkedin&utm_medium=social&utm_campaign=beta_launch` +
      '&utm_content=founder_post&analytics_test=smoke&private=discarded',
      { waitUntil: 'networkidle' },
    );
    assert.equal(payloads.length, 0, `${viewport.name}: analytics ran before choice`);
    const panel = page.locator('.consent-panel');
    await panel.waitFor();
    const accessibility = await new AxeBuilder({ page })
      .include('.consent-panel')
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .analyze();
    assert.deepEqual(
      accessibility.violations.map(violation => violation.id),
      [],
      `${viewport.name}: consent accessibility violations`,
    );

    await page.getByRole('button', { name: 'Refuse analytics' }).click();
    await page.waitForTimeout(50);
    assert.equal(payloads.length, 0, `${viewport.name}: refusal emitted analytics`);
    await page.getByRole('button', { name: 'Analytics choices' }).click();
    await panel.waitFor();
    await page.getByRole('button', { name: 'Allow analytics' }).click();
    await waitForPayloads(page, payloads, 3);

    assert.deepEqual(
      payloads.map(payload => payload.eventName).sort(),
      ['page_view', 'visit', 'waitlist_form_view'],
    );
    for (const payload of payloads) {
      const expectedKeys = ['acquisition', 'campaign', 'eventName', 'path', 'trafficClass', 'viewport'];
      if (payload.eventName === 'waitlist_form_view') expectedKeys.push('context');
      assert.deepEqual(
        Object.keys(payload).sort(),
        expectedKeys.sort(),
      );
      assert.equal(payload.path, '/');
      assert.equal(payload.trafficClass, 'smoke');
      assert.equal(payload.acquisition, 'social');
      assert.deepEqual(payload.campaign, {
        source: 'linkedin', medium: 'social', campaign: 'beta_launch', content: 'founder_post',
      });
      if (payload.eventName === 'waitlist_form_view') {
        assert.ok(['hero', 'footer'].includes(payload.context));
      }
      assert.doesNotMatch(JSON.stringify(payload), /private|referrer|token|visitor|sessionId|userAgent|ipAddress/);
    }

    const beforeActionRoute = payloads.length;
    await page.goto(`${baseUrl}/waitlist/confirm?token=browser-fixture-token-value`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(50);
    assert.equal(payloads.length, beforeActionRoute, `${viewport.name}: token route emitted analytics`);
    assert.doesNotMatch(page.url(), /browser-fixture-token-value/);
    await context.close();
  }
} finally {
  await browser.close();
}

console.log('Opt-in analytics browser check passed at desktop and mobile widths.');

async function waitForPayloads(page, payloads, count) {
  for (let attempt = 0; attempt < 40 && payloads.length < count; attempt += 1) {
    await page.waitForTimeout(25);
  }
  assert.equal(payloads.length, count, `expected ${count} analytics payloads`);
}
