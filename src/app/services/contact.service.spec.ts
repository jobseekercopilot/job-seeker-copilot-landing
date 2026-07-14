import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { DEFAULT_PUBLIC_APP_CONFIG, PUBLIC_APP_CONFIG } from '../config/public-app-config';
import { ContactRequest, ContactService } from './contact.service';

describe('ContactService', () => {
  const request: ContactRequest = {
    name: ' Alex ', email: ' ALEX@Example.com ', subject: ' Question ', message: ' A detailed question. ',
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
      name: 'Alex', email: 'alex@example.com', subject: 'Question', message: 'A detailed question.',
      source: 'landing-page', website: '', formStartedAt: 123,
    });
    httpRequest.flush({ success: true, code: 'CONTACT_ACCEPTED', message: 'Sent.' });
    expect(status).toBe('sent');
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
