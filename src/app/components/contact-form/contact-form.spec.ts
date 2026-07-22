import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { By } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { Observable, of, Subject, throwError } from 'rxjs';
import { AnalyticsService } from '../../analytics/analytics.service';
import { DEFAULT_PUBLIC_APP_CONFIG, PUBLIC_APP_CONFIG } from '../../config/public-app-config';
import { ContactRequest, ContactResult, ContactService } from '../../services/contact.service';
import { ContactFormComponent } from './contact-form';

class ContactServiceStub {
  response: Observable<ContactResult> = of({ status: 'sent' });
  calls = 0;
  lastRequest: ContactRequest | undefined;

  send(request: ContactRequest): Observable<ContactResult> {
    this.calls += 1;
    this.lastRequest = request;
    return this.response;
  }
}

class AnalyticsServiceStub {
  readonly consent = { canCollect: signal(false) };
  readonly track = vi.fn(() => true);
}

describe('ContactFormComponent', () => {
  let fixture: ComponentFixture<ContactFormComponent>;
  let service: ContactServiceStub;
  let analytics: AnalyticsServiceStub;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ContactFormComponent],
      providers: [
        provideRouter([]),
        { provide: PUBLIC_APP_CONFIG, useValue: DEFAULT_PUBLIC_APP_CONFIG },
        { provide: ContactService, useClass: ContactServiceStub },
        { provide: AnalyticsService, useClass: AnalyticsServiceStub },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(ContactFormComponent);
    service = TestBed.inject(ContactService) as unknown as ContactServiceStub;
    analytics = TestBed.inject(AnalyticsService) as unknown as AnalyticsServiceStub;
    fixture.detectChanges();
  });

  it('rejects missing and whitespace-only fields', () => {
    setField('#contact-name', '   ');
    submit();
    expect(service.calls).toBe(0);
    expect(analytics.track).not.toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain('Enter your name using no more than 120 characters.');
    expect(document.activeElement).toBe(fixture.nativeElement.querySelector('#contact-name'));
  });

  it('validates the trimmed message length and rejects whitespace-only values', () => {
    fillValidForm();
    setField('#contact-message', '     short     ');
    submit();
    expect(service.calls).toBe(0);
    expect(fixture.nativeElement.textContent).toContain('Enter a message between 10 and 3000 characters.');
  });

  it('rejects invalid and oversized values and enforces the displayed message limit', () => {
    fillValidForm();
    setField('#contact-email', 'invalid');
    setField('#contact-subject', 'x'.repeat(161));
    setField('#contact-message', 'x'.repeat(3001));
    submit();
    expect(service.calls).toBe(0);
    expect(fixture.nativeElement.textContent).toContain('Enter a valid email address.');
    expect((fixture.nativeElement.querySelector('#contact-message') as HTMLTextAreaElement).maxLength).toBe(3000);
  });

  it('normalises approved fields, submits once, announces success and resets only then', () => {
    setField('#contact-name', '  Alex   Smith  ');
    setField('#contact-email', ' ALEX@Example.COM ');
    setField('#contact-subject', '  Early   access  ');
    setField('#contact-message', '  I would like to learn more.  ');
    submit();
    expect(service.calls).toBe(1);
    expect(analytics.track).toHaveBeenCalledOnce();
    expect(analytics.track).toHaveBeenCalledWith('contact_attempt', 'contact');
    expect(service.lastRequest).toMatchObject({
      name: 'Alex Smith', email: 'alex@example.com', subject: 'Early access',
      message: 'I would like to learn more.', website: '',
    });
    expect(fixture.nativeElement.textContent).toContain('Your message has been sent.');
    expect(fixture.nativeElement.querySelector('[aria-live="polite"]')).toBeTruthy();
    expect((fixture.nativeElement.querySelector('#contact-name') as HTMLInputElement).value).toBe('');
  });

  it('shows a safe backend error, preserves input and permits a successful retry', () => {
    service.response = throwError(() => new Error('private provider detail'));
    fillValidForm();
    submit();
    expect(fixture.nativeElement.textContent).toContain('Your message could not be sent.');
    expect(fixture.nativeElement.textContent).toContain('hello@jobseekercopilot.com');
    expect(fixture.nativeElement.textContent).not.toContain('private provider detail');
    expect((fixture.nativeElement.querySelector('#contact-message') as HTMLTextAreaElement).value)
      .toBe('I would like to learn more about early access.');
    service.response = of({ status: 'sent' });
    submit();
    expect(service.calls).toBe(2);
    expect(fixture.nativeElement.textContent).toContain('Your message has been sent.');
  });

  it('prevents repeated submission, disables fields and announces loading while sending', () => {
    const pending = new Subject<ContactResult>();
    service.response = pending;
    fillValidForm();
    submit();
    submit();
    expect(service.calls).toBe(1);
    expect(analytics.track).toHaveBeenCalledOnce();
    expect((fixture.nativeElement.querySelector('button[type="submit"]') as HTMLButtonElement).disabled).toBe(true);
    expect((fixture.nativeElement.querySelector('#contact-name') as HTMLInputElement).disabled).toBe(true);
    expect((fixture.nativeElement.querySelector('form') as HTMLFormElement).getAttribute('aria-busy')).toBe('true');
    expect(fixture.nativeElement.textContent).toContain('Sending your message securely');
    pending.next({ status: 'sent' });
    pending.complete();
    fixture.detectChanges();
    expect((fixture.nativeElement.querySelector('#contact-name') as HTMLInputElement).disabled).toBe(false);
  });

  it('does not send a populated honeypot field', () => {
    fillValidForm();
    setField('#contact-website', 'automated-value');
    submit();
    expect(service.calls).toBe(0);
    expect(fixture.nativeElement.textContent).toContain('Your message could not be sent.');
  });

  it('supports native keyboard submission and includes the privacy acknowledgement', () => {
    fillValidForm();
    const form = fixture.nativeElement.querySelector('form') as HTMLFormElement;
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    fixture.detectChanges();
    expect(service.calls).toBe(1);
    expect(fixture.nativeElement.textContent).toContain('It does not join you to the waiting list.');
    expect(form.getAttribute('aria-describedby')).toBe('contact-privacy-note');
  });

  function fillValidForm(): void {
    setField('#contact-name', 'Alex');
    setField('#contact-email', 'alex@example.com');
    setField('#contact-subject', 'Early access');
    setField('#contact-message', 'I would like to learn more about early access.');
  }

  function setField(selector: string, value: string): void {
    const field = fixture.nativeElement.querySelector(selector) as HTMLInputElement | HTMLTextAreaElement;
    field.value = value;
    field.dispatchEvent(new Event('input', { bubbles: true }));
    fixture.detectChanges();
  }

  function submit(): void {
    fixture.debugElement.query(By.css('form')).triggerEventHandler('submit', new Event('submit'));
    fixture.detectChanges();
  }
});

describe('ContactFormComponent production fallback', () => {
  it('disables an unconfigured production form and shows only a company fallback', async () => {
    await TestBed.configureTestingModule({
      imports: [ContactFormComponent],
      providers: [
        provideRouter([]),
        {
          provide: PUBLIC_APP_CONFIG,
          useValue: { ...DEFAULT_PUBLIC_APP_CONFIG, environmentName: 'production' },
        },
        { provide: ContactService, useClass: ContactServiceStub },
        { provide: AnalyticsService, useClass: AnalyticsServiceStub },
      ],
    }).compileComponents();
    const productionFixture = TestBed.createComponent(ContactFormComponent);
    productionFixture.detectChanges();
    const text = productionFixture.nativeElement.textContent;
    const button = productionFixture.nativeElement.querySelector('button[type="submit"]') as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    expect(text).toContain('Online contact is temporarily unavailable.');
    expect(text).toContain('hello@jobseekercopilot.com');
    expect(text).not.toContain('@gmail.com');
  });
});
