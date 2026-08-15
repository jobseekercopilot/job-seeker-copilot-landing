import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  validatePublicBetaConfig,
  validateAnalyticsConfig,
  validateLiveSubmissionConfig,
  validateSearchIndexingConfig,
} from './runtime-config-validation.mjs';

const valid = {
  environmentName: 'production',
  enableLiveSubmissions: true,
  waitlistApiUrl: 'https://api.example.test/waitlist',
  waitlistConfirmationApiUrl: 'https://api.example.test/waitlist/confirm',
  waitlistResendApiUrl: 'https://api.example.test/waitlist/resend',
  contactApiUrl: 'https://api.example.test/contact',
};

describe('live submission runtime configuration', () => {
  it('accepts complete HTTPS production endpoints', () => {
    assert.doesNotThrow(() => validateLiveSubmissionConfig(valid));
  });

  it('fails closed when a required endpoint is missing', () => {
    assert.throws(
      () => validateLiveSubmissionConfig({ ...valid, waitlistConfirmationApiUrl: '' }),
      /WAITLIST_CONFIRMATION_API_URL must be a valid absolute URL/,
    );
  });

  it('fails closed when a production endpoint is not HTTPS', () => {
    assert.throws(
      () => validateLiveSubmissionConfig({ ...valid, waitlistResendApiUrl: 'http://api.example.test/waitlist/resend' }),
      /WAITLIST_RESEND_API_URL must use HTTPS/,
    );
  });

  it('fails closed when the production contact endpoint is missing', () => {
    assert.throws(
      () => validateLiveSubmissionConfig({ ...valid, contactApiUrl: '' }),
      /CONTACT_API_URL must be a valid absolute URL/,
    );
  });

  it('requires the contact endpoint to use HTTPS in production', () => {
    assert.throws(
      () => validateLiveSubmissionConfig({ ...valid, contactApiUrl: 'http://api.example.test/contact' }),
      /CONTACT_API_URL must use HTTPS/,
    );
  });

  it('allows intentionally disabled and non-production configurations', () => {
    assert.doesNotThrow(() => validateLiveSubmissionConfig({
      ...valid,
      enableLiveSubmissions: false,
      waitlistApiUrl: '',
      waitlistConfirmationApiUrl: '',
      waitlistResendApiUrl: '',
    }));
    assert.doesNotThrow(() => validateLiveSubmissionConfig({
      ...valid,
      environmentName: 'development',
      waitlistApiUrl: '/waitlist',
      waitlistConfirmationApiUrl: '/waitlist/confirm',
      waitlistResendApiUrl: '/waitlist/resend',
      contactApiUrl: '/contact',
    }));
  });
});

describe('public beta runtime configuration', () => {
  const beta = {
    publicBetaEnabled: true,
    environmentName: 'production',
    publicWebsiteUrl: 'https://www.jobseekercopilot.com',
    mainApplicationUrl: 'https://app.jobseekercopilot.com',
    registrationUrl: 'https://app.jobseekercopilot.com/register',
    signInUrl: 'https://app.jobseekercopilot.com/sign-in',
    pricingUrl: 'https://app.jobseekercopilot.com/payment',
    legalDocumentsReviewed: true,
    minimumUserAge: 18,
    legalEffectiveDate: '2026-09-01',
    legalVersion: 'beta-1',
    legalEntityType: 'SOLE_TRADER',
    taxStatus: 'NOT_VAT_REGISTERED',
    legalEntityName: 'Northstar Career Services',
    tradingName: 'Job Seeker Copilot',
    businessAddress: '10 High Street, London, SW1A 1AA',
    privacyEmail: 'privacy@jobseekercopilot.com',
    supportEmail: 'support@jobseekercopilot.com',
    icoRegistrationStatus: 'NOT_REQUIRED_CONFIRMED',
    icoRegistrationReference: '',
    accountDeletionCompletionDays: 30,
    documentDeletionCompletionDays: 30,
    securityLogRetentionDays: 30,
    supportRecordRetentionDays: 365,
    financialRecordRetentionYears: 6,
  };

  it('accepts only the canonical production website and one approved HTTPS app origin', () => {
    assert.doesNotThrow(() => validatePublicBetaConfig(beta));
    assert.throws(
      () => validatePublicBetaConfig({...beta, registrationUrl: 'https://other.example/register'}),
      /approved app URLs/,
    );
    assert.throws(
      () => validatePublicBetaConfig({...beta, environmentName: 'development'}),
      /requires production/,
    );
  });

  it('allows the launch switch to remain disabled with no app URLs', () => {
    assert.doesNotThrow(() => validatePublicBetaConfig({publicBetaEnabled: false}));
  });

  it('fails closed if the reviewed beta age policy is not exactly 18+', () => {
    assert.throws(
      () => validatePublicBetaConfig({...beta, minimumUserAge: 16}),
      /reviewed legal identity configuration/,
    );
  });

  it('fails closed without an explicit reviewed seller form and tax status', () => {
    assert.throws(
      () => validatePublicBetaConfig({...beta, legalEntityType: 'NOT_CONFIGURED'}),
      /reviewed legal identity configuration/,
    );
    assert.throws(
      () => validatePublicBetaConfig({...beta, taxStatus: 'NOT_CONFIGURED'}),
      /reviewed legal identity configuration/,
    );
  });

  it('fails closed for impossible dates and release placeholders', () => {
    assert.throws(
      () => validatePublicBetaConfig({...beta, legalEffectiveDate: '2026-02-30'}),
      /reviewed legal identity configuration/,
    );
    assert.throws(
      () => validatePublicBetaConfig({...beta, legalEntityName: 'Example Legal Entity'}),
      /reviewed legal identity configuration/,
    );
    assert.throws(
      () => validatePublicBetaConfig({...beta, businessAddress: 'Address supplied at release'}),
      /reviewed legal identity configuration/,
    );
  });
});

describe('search indexing runtime configuration', () => {
  it('allows disabled search indexing in every environment', () => {
    assert.doesNotThrow(() => validateSearchIndexingConfig({ searchIndexingEnabled: false }));
  });

  it('accepts only the exact production canonical URL when enabled', () => {
    assert.doesNotThrow(() => validateSearchIndexingConfig({
      searchIndexingEnabled: true,
      environmentName: 'production',
      publicWebsiteUrl: 'https://www.jobseekercopilot.com',
    }));
    assert.throws(() => validateSearchIndexingConfig({
      searchIndexingEnabled: true,
      environmentName: 'development',
      publicWebsiteUrl: 'https://www.jobseekercopilot.com',
    }), /exact canonical public website URL/);
    assert.throws(() => validateSearchIndexingConfig({
      searchIndexingEnabled: true,
      environmentName: 'production',
      publicWebsiteUrl: 'https://jobseekercopilot.com',
    }), /exact canonical public website URL/);
  });
});

describe('analytics runtime configuration', () => {
  it('allows analytics to remain disabled in every environment', () => {
    assert.doesNotThrow(() => validateAnalyticsConfig({ analyticsEnabled: false }));
  });

  it('accepts only canonical production with a query-free HTTPS analytics route', () => {
    const analytics = {
      analyticsEnabled: true,
      environmentName: 'production',
      publicWebsiteUrl: 'https://www.jobseekercopilot.com',
      analyticsEndpointUrl: 'https://api.example.test/analytics',
      waitlistApiUrl: 'https://api.example.test/waitlist',
    };
    assert.doesNotThrow(() => validateAnalyticsConfig(analytics));
    assert.throws(
      () => validateAnalyticsConfig({ ...analytics, environmentName: 'development' }),
      /exact canonical public website URL/,
    );
    assert.throws(
      () => validateAnalyticsConfig({ ...analytics, analyticsEndpointUrl: 'https://api.example.test/analytics?visitor=value' }),
      /query-free HTTPS analytics endpoint/,
    );
    assert.throws(
      () => validateAnalyticsConfig({ ...analytics, analyticsEndpointUrl: 'https://api.example.test/events' }),
      /query-free HTTPS analytics endpoint/,
    );
    assert.throws(
      () => validateAnalyticsConfig({ ...analytics, analyticsEndpointUrl: 'https://other.example.test/analytics' }),
      /approved first-party waitlist API origin/,
    );
  });
});
