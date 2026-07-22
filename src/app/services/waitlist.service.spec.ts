import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { DEFAULT_PUBLIC_APP_CONFIG, PUBLIC_APP_CONFIG, PublicAppConfig } from '../config/public-app-config';
import { WaitlistService } from './waitlist.service';

describe('WaitlistService', () => {
  it('makes a disabled backend explicit without calling HTTP', () => {
    configure({ enableLiveSubmissions: false, waitlistApiUrl: '' });
    let status = '';
    TestBed.inject(WaitlistService).join('person@example.com').subscribe(result => status = result.status);

    expect(status).toBe('backend-disabled');
    TestBed.inject(HttpTestingController).expectNone(() => true);
  });

  it('normalises the email and succeeds only after persistence is confirmed', () => {
    configure({ enableLiveSubmissions: true, waitlistApiUrl: '/api/waitlist' });
    let status = '';
    TestBed.inject(WaitlistService).join('  PERSON@Example.com ').subscribe(result => status = result.status);

    const request = TestBed.inject(HttpTestingController).expectOne('/api/waitlist');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ email: 'person@example.com' });
    request.flush({ success: true, code: 'WAITLIST_PENDING_CONFIRMATION', message: 'Check your inbox.' }, { status: 201, statusText: 'Created' });
    expect(status).toBe('pending-confirmation');
  });

  it('maps the neutral registration contract used by the hardened backend', () => {
    configure({ enableLiveSubmissions: true, waitlistApiUrl: '/api/waitlist' });
    let status = '';
    TestBed.inject(WaitlistService).join('person@example.com').subscribe(result => status = result.status);

    TestBed.inject(HttpTestingController).expectOne('/api/waitlist').flush({
      success: true,
      code: 'WAITLIST_REQUEST_ACCEPTED',
      message: 'Request received.',
    }, { status: 202, statusText: 'Accepted' });
    expect(status).toBe('pending-confirmation');
  });

  it('maps an existing pending record without claiming confirmation', () => {
    configure({ enableLiveSubmissions: true, waitlistApiUrl: '/api/waitlist' });
    let status = '';
    TestBed.inject(WaitlistService).join('person@example.com').subscribe(result => status = result.status);

    TestBed.inject(HttpTestingController).expectOne('/api/waitlist').flush({
      success: true, code: 'WAITLIST_CONFIRMATION_REQUIRED', message: 'Check your inbox.',
    });
    expect(status).toBe('confirmation-required');
  });

  it('maps a confirmed record to a neutral already-confirmed result', () => {
    configure({ enableLiveSubmissions: true, waitlistApiUrl: '/api/waitlist' });
    let status = '';
    TestBed.inject(WaitlistService).join('person@example.com').subscribe(result => status = result.status);
    TestBed.inject(HttpTestingController).expectOne('/api/waitlist').flush({
      success: true, code: 'WAITLIST_ALREADY_CONFIRMED', message: 'No action needed.',
    });
    expect(status).toBe('already-confirmed');
  });

  it('maps backend email rejection to a validation result', () => {
    configure({ enableLiveSubmissions: true, waitlistApiUrl: '/api/waitlist' });
    let status = '';
    TestBed.inject(WaitlistService).join('person@example.com').subscribe(result => status = result.status);

    TestBed.inject(HttpTestingController).expectOne('/api/waitlist').flush(
      { success: false, code: 'INVALID_EMAIL', message: 'Enter a valid email address.' },
      { status: 400, statusText: 'Bad Request' },
    );
    expect(status).toBe('validation-error');
  });

  it('does not report success for an unconfirmed or malformed API response', () => {
    configure({ enableLiveSubmissions: true, waitlistApiUrl: '/api/waitlist' });
    let error: unknown;
    TestBed.inject(WaitlistService).join('person@example.com').subscribe({ error: value => error = value });

    TestBed.inject(HttpTestingController).expectOne('/api/waitlist')
      .flush({ success: false, code: 'UNKNOWN', message: 'Not persisted.' });
    expect(error).toBeInstanceOf(Error);
  });

  it('maps email delivery failure and API throttling without claiming success', () => {
    configure({ enableLiveSubmissions: true, waitlistApiUrl: '/api/waitlist' });
    const statuses: string[] = [];
    const service = TestBed.inject(WaitlistService);
    const http = TestBed.inject(HttpTestingController);
    service.join('person@example.com').subscribe(result => statuses.push(result.status));
    http.expectOne('/api/waitlist').flush(
      { success: false, code: 'CONFIRMATION_EMAIL_TEMPORARILY_UNAVAILABLE', message: 'Try later.' },
      { status: 503, statusText: 'Unavailable' },
    );
    service.join('person@example.com').subscribe(result => statuses.push(result.status));
    http.expectOne('/api/waitlist').flush({}, { status: 429, statusText: 'Too Many Requests' });
    expect(statuses).toEqual(['email-delivery-error', 'rate-limited']);
  });

  it('rejects invalid emails before calling HTTP', () => {
    configure({ enableLiveSubmissions: true, waitlistApiUrl: '/api/waitlist' });

    expect(() => TestBed.inject(WaitlistService).join('not-an-email'))
      .toThrowError('A valid email address is required.');
    TestBed.inject(HttpTestingController).expectNone(() => true);
  });

  function configure(overrides: Partial<PublicAppConfig>): void {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: PUBLIC_APP_CONFIG, useValue: { ...DEFAULT_PUBLIC_APP_CONFIG, ...overrides } },
      ],
    });
  }
});
