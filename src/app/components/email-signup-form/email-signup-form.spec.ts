import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { Observable, of, Subject, throwError } from 'rxjs';
import { DEFAULT_PUBLIC_APP_CONFIG, PUBLIC_APP_CONFIG } from '../../config/public-app-config';
import { EmailSubscriptionService, SubscriptionResult } from '../../services/email-subscription.service';
import { EmailSignupFormComponent } from './email-signup-form';

class SubscriptionServiceStub {
  response: Observable<SubscriptionResult> = of({ status: 'pending-confirmation' });
  calls = 0;

  subscribe(): Observable<SubscriptionResult> {
    this.calls += 1;
    return this.response;
  }
}

describe('EmailSignupFormComponent', () => {
  let fixture: ComponentFixture<EmailSignupFormComponent>;
  let service: SubscriptionServiceStub;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EmailSignupFormComponent],
      providers: [
        provideRouter([]),
        { provide: PUBLIC_APP_CONFIG, useValue: DEFAULT_PUBLIC_APP_CONFIG },
        { provide: EmailSubscriptionService, useClass: SubscriptionServiceStub },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(EmailSignupFormComponent);
    service = TestBed.inject(EmailSubscriptionService) as unknown as SubscriptionServiceStub;
    fixture.detectChanges();
  });

  it('shows validation and does not submit an empty email', () => {
    submitForm();

    expect(service.calls).toBe(0);
    expect(fixture.nativeElement.textContent).toContain('Enter your email address to join the list.');
    expect(emailInput().getAttribute('aria-invalid')).toBe('true');
  });

  it('asks the visitor to complete double opt-in after a successful request', () => {
    setEmail('person@example.com');
    submitForm();

    expect(service.calls).toBe(1);
    expect(fixture.nativeElement.textContent).toContain('Check your inbox and confirm your email');
  });

  it('states that the email was not stored when the endpoint is not configured', () => {
    service.response = of({ status: 'backend-disabled' });
    setEmail('person@example.com');
    submitForm();

    expect(fixture.nativeElement.textContent).toContain('Your email has not been stored');
  });

  it('shows a recoverable error when the endpoint fails', () => {
    service.response = throwError(() => new Error('Unavailable'));
    setEmail('person@example.com');
    submitForm();

    expect(fixture.nativeElement.textContent).toContain('We couldn’t add you just now.');
  });

  it('handles an already-subscribed response without implying a new record', () => {
    service.response = of({ status: 'already-subscribed' });
    setEmail('person@example.com');
    submitForm();

    expect(fixture.nativeElement.textContent).toContain('already subscribed');
  });

  it('disables and deduplicates submission while a request is active', () => {
    const pending = new Subject<SubscriptionResult>();
    service.response = pending;
    setEmail('person@example.com');
    submitForm();
    submitForm();

    expect(service.calls).toBe(1);
    expect((fixture.nativeElement.querySelector('button[type="submit"]') as HTMLButtonElement).disabled).toBe(true);
    expect(fixture.nativeElement.textContent).toContain('Joining…');
    pending.next({ status: 'pending-confirmation' });
    pending.complete();
    fixture.detectChanges();
  });

  it('supports native form submission used by keyboard enter', () => {
    setEmail('person@example.com');
    const form = fixture.nativeElement.querySelector('form') as HTMLFormElement;
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    fixture.detectChanges();

    expect(service.calls).toBe(1);
    expect(fixture.nativeElement.querySelector('[aria-live="polite"]')).toBeTruthy();
  });

  function emailInput(): HTMLInputElement {
    return fixture.nativeElement.querySelector('input[type="email"]');
  }

  function setEmail(value: string): void {
    const input = emailInput();
    input.value = value;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    fixture.detectChanges();
  }

  function submitForm(): void {
    fixture.debugElement.query(By.css('form')).triggerEventHandler('submit', new Event('submit'));
    fixture.detectChanges();
  }
});
