import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { validateLiveWaitlistConfig } from './runtime-config-validation.mjs';

const valid = {
  environmentName: 'production',
  enableLiveSubmissions: true,
  waitlistApiUrl: 'https://api.example.test/waitlist',
  waitlistConfirmationApiUrl: 'https://api.example.test/waitlist/confirm',
  waitlistResendApiUrl: 'https://api.example.test/waitlist/resend',
};

describe('live waitlist runtime configuration', () => {
  it('accepts complete HTTPS production endpoints', () => {
    assert.doesNotThrow(() => validateLiveWaitlistConfig(valid));
  });

  it('fails closed when a required endpoint is missing', () => {
    assert.throws(
      () => validateLiveWaitlistConfig({ ...valid, waitlistConfirmationApiUrl: '' }),
      /WAITLIST_CONFIRMATION_API_URL must be a valid absolute URL/,
    );
  });

  it('fails closed when a production endpoint is not HTTPS', () => {
    assert.throws(
      () => validateLiveWaitlistConfig({ ...valid, waitlistResendApiUrl: 'http://api.example.test/waitlist/resend' }),
      /WAITLIST_RESEND_API_URL must use HTTPS/,
    );
  });

  it('allows intentionally disabled and non-production configurations', () => {
    assert.doesNotThrow(() => validateLiveWaitlistConfig({
      ...valid,
      enableLiveSubmissions: false,
      waitlistApiUrl: '',
      waitlistConfirmationApiUrl: '',
      waitlistResendApiUrl: '',
    }));
    assert.doesNotThrow(() => validateLiveWaitlistConfig({
      ...valid,
      environmentName: 'development',
      waitlistApiUrl: '/waitlist',
      waitlistConfirmationApiUrl: '/waitlist/confirm',
      waitlistResendApiUrl: '/waitlist/resend',
    }));
  });
});
