import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { describe, it } from 'node:test';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');
const [events, consent, service, collector, submit, confirm, contact, template, privacy, guide, adr, config] =
  await Promise.all([
    read('src/app/analytics/analytics-event.ts'),
    read('src/app/analytics/analytics-consent.service.ts'),
    read('src/app/analytics/analytics.service.ts'),
    read('infrastructure/waitlist-backend/function/analytics.py'),
    read('infrastructure/waitlist-backend/function/app.py'),
    read('infrastructure/waitlist-backend/function/confirm.py'),
    read('infrastructure/waitlist-backend/function/contact.py'),
    read('infrastructure/waitlist-backend/template.yaml'),
    read('src/app/pages/legal/legal-page.html'),
    read('docs/launch/privacy-focused-analytics-and-reporting.md'),
    read('docs/launch/analytics-monitoring-architecture-decision.md'),
    read('public/config/app-config.json'),
  ]);

describe('privacy-focused monitoring policy', () => {
  it('uses an exact bounded frontend/backend event contract with no personal fields', () => {
    for (const name of ['visit', 'page_view', 'waitlist_form_view', 'waitlist_attempt', 'contact_form_view', 'contact_attempt', 'pricing_view', 'pricing_cta']) {
      assert.match(events, new RegExp(`'${name}'`));
      assert.match(collector, new RegExp(`"${name}"`));
    }
    const payload = events.split('export interface AnalyticsEventPayload', 2)[1].split('}', 1)[0];
    for (const forbidden of ['name', 'message', 'token', 'referrer', 'userAgent', 'ipAddress', 'visitorId', 'sessionId']) {
      assert.doesNotMatch(payload, new RegExp(`\\b${forbidden}\\??:`));
      assert.doesNotMatch(collector, new RegExp(`["']${forbidden}["']\\s*:`));
    }
    assert.match(events, /SAFE_CAMPAIGN_VALUES/);
    assert.match(collector, /SAFE_CAMPAIGN_VALUES/);
    assert.match(events, /PUBLIC_ANALYTICS_PATHS/);
    assert.match(service, /VISIT_STORAGE_KEY/);
    assert.doesNotMatch(service, /crypto\.randomUUID|Math\.random|document\.cookie/);
  });

  it('requires explicit choice, fails closed and keeps collector IAM log-only', () => {
    assert.match(consent, /choice\(\) === 'accepted'/);
    assert.match(consent, /setChoice\('refused'\)/);
    assert.match(service, /choice\(\) === 'refused'/);
    assert.match(config, /"analyticsEnabled": false/);
    const parameter = template.split('  EnableAnalyticsCollection:', 2)[1].split('  ContactSenderEmail:', 1)[0];
    assert.match(parameter, /Default: 'false'/);
    const role = template.split('  AnalyticsExecutionRole:', 2)[1].split('  WaitlistFunction:', 1)[0];
    assert.match(role, /logs:CreateLogStream/);
    assert.match(role, /logs:PutLogEvents/);
    assert.doesNotMatch(role, /dynamodb:|ses:|Resource: '\*'/);
    const logGroup = template.split('  AnalyticsFunctionLogGroup:', 2)[1].split('  WaitlistExecutionRole:', 1)[0];
    assert.match(logGroup, /RetentionInDays: 30/);
  });

  it('emits conversions only after real backend success and retains duplicate suppression', () => {
    assert.ok(submit.indexOf('metric("WaitlistAcceptedRequests"') > submit.indexOf('send_confirmation_email'));
    assert.ok(submit.indexOf('metric("WaitlistConfirmationSent"') > submit.indexOf('send_confirmation_email'));
    assert.ok(confirm.indexOf('metric("WaitlistConfirmed"') > confirm.indexOf('transact_write_items'));
    assert.ok(contact.indexOf('metric("ContactAcceptedRequests"') > contact.indexOf('_send_contact_email'));
    assert.ok(contact.indexOf('duplicate-suppressed') < contact.indexOf('_send_contact_email'));
  });

  it('keeps the reviewed operational surface, privacy notice and owner guidance complete', () => {
    assert.equal((template.match(/Type: AWS::CloudWatch::Alarm/g) ?? []).length, 31);
    for (const required of [
      'Opt-in web analytics funnel', 'WaitlistAcceptedRequests', 'WaitlistConfirmed',
      'ContactAcceptedRequests', 'ContactSesDeliveries', 'AnalyticsLambdaErrorAlarm',
    ]) assert.match(template, new RegExp(required));
    assert.match(template, /WaitlistAcceptedRequests","Environment","\$\{EnvironmentName\}"/);
    assert.match(template, /ContactAcceptedRequests","Environment","\$\{EnvironmentName\}"/);
    for (const required of [
      '30-day', 'Refuse analytics', 'full URL', 'raw referrer', 'visitor identifier',
    ]) assert.match(privacy, new RegExp(required, 'i'));
    for (const required of [
      'Event catalogue', 'UTM convention', 'Environment and smoke separation',
      'Founder dashboard', 'Activation, disabling and incident response',
    ]) assert.match(guide, new RegExp(required, 'i'));
    assert.match(adr, /Status: Accepted/);
    assert.match(adr, /First-party events on the existing AWS stack/);
  });
});
