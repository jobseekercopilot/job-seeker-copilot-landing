import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { DEFAULT_PUBLIC_APP_CONFIG, PUBLIC_APP_CONFIG } from '../config/public-app-config';
import { ContactRequest, ContactService } from './contact.service';

describe('ContactService', () => {
  const request: ContactRequest = {
    name: ' Alex   Smith ', email: ' ALEX@Example.com ', subject: ' Product   question ',
    message: ' A detailed question. ',
    website: '', formStartedAt: 123,
  };

  it('does not pretend to send when live submission is disabled', () => {
    configure(false, '');
    let status = '';
    TestBed.inject(ContactService).send(request).subscribe(result => status = result.status);
    expect(status).toBe('backend-disabled');
    TestBed.inject(HttpTestingController).expectNone(() => true);
  });

  it('normalises and sends contact details to the configured endpoint', () => {
    configure(true, '/api/contact');
    let status = '';
    TestBed.inject(ContactService).send(request).subscribe(result => status = result.status);
    const httpRequest = TestBed.inject(HttpTestingController).expectOne('/api/contact');
    expect(httpRequest.request.body).toEqual({
      name: 'Alex Smith', email: 'alex@example.com', subject: 'Product question', message: 'A detailed question.',
      source: 'landing-page', website: '', formStartedAt: 123,
    });
    httpRequest.flush({ success: true, code: 'CONTACT_ACCEPTED', message: 'Sent.' });
    expect(status).toBe('sent');
  });

  it('does not accept a malformed success body or expose its private message', () => {
    configure(true, '/api/contact');
    let errorMessage = '';
    TestBed.inject(ContactService).send(request).subscribe({
      error: error => errorMessage = String(error.message),
    });
    TestBed.inject(HttpTestingController).expectOne('/api/contact').flush({
      success: false, code: 'PRIVATE_ERROR', message: 'private backend detail',
    });
    expect(errorMessage).toBe('Contact submission failed.');
    expect(errorMessage).not.toContain('private backend detail');
  });

  it.each([400, 429, 503])('maps HTTP %i failures to one safe error', status => {
    configure(true, '/api/contact');
    let errorMessage = '';
    TestBed.inject(ContactService).send(request).subscribe({
      error: error => errorMessage = String(error.message),
    });
    TestBed.inject(HttpTestingController).expectOne('/api/contact').flush(
      { success: false, code: 'PRIVATE_ERROR', message: 'private backend detail' },
      { status, statusText: 'Failure' },
    );
    expect(errorMessage).toBe('Contact submission failed.');
  });

  it('maps a network failure to the same safe error', () => {
    configure(true, '/api/contact');
    let errorMessage = '';
    TestBed.inject(ContactService).send(request).subscribe({
      error: error => errorMessage = String(error.message),
    });
    TestBed.inject(HttpTestingController).expectOne('/api/contact').error(new ProgressEvent('network-error'));
    expect(errorMessage).toBe('Contact submission failed.');
  });

  it('fails closed for an insecure production endpoint', () => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(), provideHttpClientTesting(),
        {
          provide: PUBLIC_APP_CONFIG,
          useValue: {
            ...DEFAULT_PUBLIC_APP_CONFIG,
            environmentName: 'production',
            enableLiveSubmissions: true,
            contactApiUrl: 'http://api.example.test/contact',
          },
        },
      ],
    });
    let status = '';
    TestBed.inject(ContactService).send(request).subscribe(result => status = result.status);
    expect(status).toBe('backend-disabled');
    TestBed.inject(HttpTestingController).expectNone(() => true);
  });

  function configure(enableLiveSubmissions: boolean, contactApiUrl: string): void {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(), provideHttpClientTesting(),
        { provide: PUBLIC_APP_CONFIG, useValue: { ...DEFAULT_PUBLIC_APP_CONFIG, enableLiveSubmissions, contactApiUrl } },
      ],
    });
  }
});
