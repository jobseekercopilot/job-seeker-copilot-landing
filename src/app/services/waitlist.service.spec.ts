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
    request.flush({ success: true, code: 'WAITLIST_CREATED', message: 'Saved.' }, { status: 201, statusText: 'Created' });
    expect(status).toBe('joined');
  });

  it('maps a conditional-write conflict to a duplicate validation result', () => {
    configure({ enableLiveSubmissions: true, waitlistApiUrl: '/api/waitlist' });
    let status = '';
    TestBed.inject(WaitlistService).join('person@example.com').subscribe(result => status = result.status);

    TestBed.inject(HttpTestingController).expectOne('/api/waitlist').flush(
      { success: false, code: 'EMAIL_ALREADY_REGISTERED', message: 'Already registered.' },
      { status: 409, statusText: 'Conflict' },
    );
    expect(status).toBe('duplicate');
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
