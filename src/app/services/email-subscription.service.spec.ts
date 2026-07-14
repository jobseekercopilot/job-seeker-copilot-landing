import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { DEFAULT_PUBLIC_APP_CONFIG, PUBLIC_APP_CONFIG, PublicAppConfig } from '../config/public-app-config';
import { EmailSubscriptionService } from './email-subscription.service';

describe('EmailSubscriptionService', () => {
  it('makes the disabled backend explicit and does not call HTTP', () => {
    configure({ enableLiveSubmissions: false, waitlistApiUrl: '' });
    let status = '';
    TestBed.inject(EmailSubscriptionService).subscribe('person@example.com', metadata())
      .subscribe(result => status = result.status);

    expect(status).toBe('backend-disabled');
    TestBed.inject(HttpTestingController).expectNone(() => true);
  });

  it('normalises the email and reports pending double opt-in', () => {
    configure({ enableLiveSubmissions: true, waitlistApiUrl: '/api/waitlist' });
    let status = '';
    TestBed.inject(EmailSubscriptionService).subscribe('  PERSON@Example.com ', metadata())
      .subscribe(result => status = result.status);

    const request = TestBed.inject(HttpTestingController).expectOne('/api/waitlist');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({
      email: 'person@example.com', source: 'landing-page', consentVersion: '2026-07-13',
      website: '', formStartedAt: 123,
    });
    request.flush({ success: true, code: 'WAITLIST_PENDING_CONFIRMATION', message: 'Check your inbox.' });
    expect(status).toBe('pending-confirmation');
  });

  it('recognises an existing subscription', () => {
    configure({ enableLiveSubmissions: true, waitlistApiUrl: '/api/waitlist' });
    let status = '';
    TestBed.inject(EmailSubscriptionService).subscribe('person@example.com', metadata())
      .subscribe(result => status = result.status);
    TestBed.inject(HttpTestingController).expectOne('/api/waitlist')
      .flush({ success: true, code: 'ALREADY_SUBSCRIBED', message: 'Already subscribed.' });
    expect(status).toBe('already-subscribed');
  });

  it('rejects invalid email input before making a request', () => {
    configure({ enableLiveSubmissions: true, waitlistApiUrl: '/api/waitlist' });
    expect(() => TestBed.inject(EmailSubscriptionService).subscribe('not-an-email', metadata()))
      .toThrowError('A valid email address is required.');
    TestBed.inject(HttpTestingController).expectNone(() => true);
  });

  function configure(overrides: Partial<PublicAppConfig>): void {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(), provideHttpClientTesting(),
        { provide: PUBLIC_APP_CONFIG, useValue: { ...DEFAULT_PUBLIC_APP_CONFIG, ...overrides } },
      ],
    });
  }

  function metadata() {
    return { website: '', formStartedAt: 123 };
  }
});
