import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { DEFAULT_PUBLIC_APP_CONFIG, PUBLIC_APP_CONFIG } from '../config/public-app-config';
import { EmailSubscriptionService } from './email-subscription.service';

describe('EmailSubscriptionService', () => {
  beforeEach(() => TestBed.configureTestingModule({
    providers: [
      provideHttpClient(),
      provideHttpClientTesting(),
      { provide: PUBLIC_APP_CONFIG, useValue: {
        ...DEFAULT_PUBLIC_APP_CONFIG,
        enableLiveSubmissions: true,
        waitlistConfirmationApiUrl: '/api/waitlist/confirm',
        waitlistResendApiUrl: '/api/waitlist/resend',
      } },
    ],
  }));

  it('posts the token and maps a successful confirmation', () => {
    let status = '';
    TestBed.inject(EmailSubscriptionService).confirm('secure-token').subscribe(result => status = result.status);
    const request = TestBed.inject(HttpTestingController).expectOne('/api/waitlist/confirm');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ token: 'secure-token' });
    request.flush({ success: true, code: 'WAITLIST_CONFIRMED', message: 'Confirmed.' });
    expect(status).toBe('confirmed');
  });

  it('maps already-confirmed, invalid, and expired responses', () => {
    const service = TestBed.inject(EmailSubscriptionService);
    const http = TestBed.inject(HttpTestingController);
    const statuses: string[] = [];
    service.confirm('token-one').subscribe(result => statuses.push(result.status));
    http.expectOne('/api/waitlist/confirm').flush({ success: true, code: 'WAITLIST_ALREADY_CONFIRMED', message: 'Used.' });
    service.confirm('token-two').subscribe(result => statuses.push(result.status));
    http.expectOne('/api/waitlist/confirm').flush(
      { success: false, code: 'CONFIRMATION_TOKEN_INVALID', message: 'Invalid.' },
      { status: 400, statusText: 'Bad Request' },
    );
    service.confirm('token-three').subscribe(result => statuses.push(result.status));
    http.expectOne('/api/waitlist/confirm').flush(
      { success: false, code: 'CONFIRMATION_TOKEN_EXPIRED', message: 'Expired.' },
      { status: 410, statusText: 'Gone' },
    );
    expect(statuses).toEqual(['already-confirmed', 'invalid', 'expired']);
  });

  it('normalises an email for the neutral resend endpoint', () => {
    let status = '';
    TestBed.inject(EmailSubscriptionService).resend(' Person@Example.com ').subscribe(result => status = result.status);
    const request = TestBed.inject(HttpTestingController).expectOne('/api/waitlist/resend');
    expect(request.request.body).toEqual({ email: 'person@example.com' });
    request.flush({ success: true, code: 'WAITLIST_RESEND_ACCEPTED', message: 'If pending, it will be sent.' }, { status: 202, statusText: 'Accepted' });
    expect(status).toBe('resent');
  });

  it('maps resend validation and throttling without rendering backend messages', () => {
    const service = TestBed.inject(EmailSubscriptionService);
    const http = TestBed.inject(HttpTestingController);
    const statuses: string[] = [];

    service.resend('person@example.com').subscribe(result => statuses.push(result.status));
    http.expectOne('/api/waitlist/resend').flush(
      { success: false, code: 'INVALID_EMAIL', message: 'private validation detail' },
      { status: 400, statusText: 'Bad Request' },
    );
    service.resend('person@example.com').subscribe(result => statuses.push(result.status));
    http.expectOne('/api/waitlist/resend').flush(
      { success: false, code: 'TOO_MANY_REQUESTS', message: 'private throttling detail' },
      { status: 429, statusText: 'Too Many Requests' },
    );

    expect(statuses).toEqual(['validation-error', 'rate-limited']);
  });

  it('rejects an invalid resend address before HTTP', () => {
    const service = TestBed.inject(EmailSubscriptionService);

    expect(() => service.resend('person..two@example.com'))
      .toThrowError('A valid email address is required.');
    TestBed.inject(HttpTestingController).expectNone(() => true);
  });

  it('surfaces confirmation and resend network failures to controlled page handling', () => {
    const service = TestBed.inject(EmailSubscriptionService);
    const http = TestBed.inject(HttpTestingController);
    const errors: unknown[] = [];

    service.confirm('secure-token').subscribe({ error: value => errors.push(value) });
    http.expectOne('/api/waitlist/confirm').flush(
      { success: false, code: 'PRIVATE_CONFIRMATION_DETAIL', message: 'do not render' },
      { status: 503, statusText: 'Unavailable' },
    );
    service.resend('person@example.com').subscribe({ error: value => errors.push(value) });
    http.expectOne('/api/waitlist/resend').flush(
      { success: false, code: 'PRIVATE_RESEND_DETAIL', message: 'do not render' },
      { status: 503, statusText: 'Unavailable' },
    );

    expect(errors).toHaveLength(2);
  });
});
