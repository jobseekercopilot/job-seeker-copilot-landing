import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  validateAnalyticsConfig,
  validateApplicationAccessConfig,
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

describe('application access runtime configuration', () => {
  const applicationRoutes = {
    environmentName: 'production',
    mainApplicationUrl: 'https://app.jobseekercopilot.com',
    registrationUrl: 'https://app.jobseekercopilot.com/register',
    signInUrl: 'https://app.jobseekercopilot.com/sign-in',
  };

  it('allows access to stay safely disabled', () => {
    assert.doesNotThrow(() => validateApplicationAccessConfig({
      environmentName: 'production',
      mainApplicationUrl: '',
      registrationUrl: '',
      signInUrl: '',
    }));
  });

  it('accepts the complete approved hosted route set', () => {
    assert.doesNotThrow(() => validateApplicationAccessConfig(applicationRoutes));
  });

  it('rejects an incomplete route set', () => {
    assert.throws(
      () => validateApplicationAccessConfig({ ...applicationRoutes, signInUrl: '' }),
      /requires MAIN_APPLICATION_URL, REGISTRATION_URL and SIGN_IN_URL together/,
    );
  });

  it('rejects another host and token-bearing routes', () => {
    assert.throws(
      () => validateApplicationAccessConfig({
        ...applicationRoutes,
        mainApplicationUrl: 'https://example.test',
      }),
      /approved application origin/,
    );
    assert.throws(
      () => validateApplicationAccessConfig({
        ...applicationRoutes,
        registrationUrl: 'https://app.jobseekercopilot.com/register?token=secret',
      }),
      /credential-free, query-free application route/,
    );
  });

  it('accepts explicit localhost routes outside production', () => {
    assert.doesNotThrow(() => validateApplicationAccessConfig({
      environmentName: 'development',
      mainApplicationUrl: 'http://localhost:4200',
      registrationUrl: 'http://localhost:4200/register',
      signInUrl: 'http://localhost:4200/sign-in',
    }));
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
