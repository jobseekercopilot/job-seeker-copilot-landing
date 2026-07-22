import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { validateLiveSubmissionConfig } from './runtime-config-validation.mjs';

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
