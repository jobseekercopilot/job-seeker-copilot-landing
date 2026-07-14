import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { Observable, of, Subject, throwError } from 'rxjs';
import { DEFAULT_EARLY_ACCESS_OFFER_CONFIG, EARLY_ACCESS_OFFER_CONFIG } from '../../config/early-access-offer';
import { DEFAULT_PUBLIC_APP_CONFIG, PUBLIC_APP_CONFIG } from '../../config/public-app-config';
import { WaitlistResult, WaitlistService } from '../../services/waitlist.service';
import { EmailSignupFormComponent } from './email-signup-form';

class WaitlistServiceStub {
  response: Observable<WaitlistResult> = of({ status: 'pending-confirmation' });
  calls = 0;

  join(): Observable<WaitlistResult> {
    this.calls += 1;
    return this.response;
  }
}

describe('EmailSignupFormComponent', () => {
  let fixture: ComponentFixture<EmailSignupFormComponent>;
  let service: WaitlistServiceStub;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EmailSignupFormComponent],
      providers: [
        provideRouter([]),
        { provide: EARLY_ACCESS_OFFER_CONFIG, useValue: DEFAULT_EARLY_ACCESS_OFFER_CONFIG },
        { provide: PUBLIC_APP_CONFIG, useValue: DEFAULT_PUBLIC_APP_CONFIG },
        { provide: WaitlistService, useClass: WaitlistServiceStub },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(EmailSignupFormComponent);
    service = TestBed.inject(WaitlistService) as unknown as WaitlistServiceStub;
    fixture.detectChanges();
  });

  it('shows validation and does not submit an empty email', () => {
    submitForm();

    expect(service.calls).toBe(0);
    expect(fixture.nativeElement.textContent).toContain('Enter your email address to join the list.');
    expect(emailInput().getAttribute('aria-invalid')).toBe('true');
  });

  it('asks for confirmation without claiming that joining is complete', () => {
    setEmail('person@example.com');
    submitForm();

    expect(service.calls).toBe(1);
    expect(fixture.nativeElement.textContent).toContain('Check your inbox to confirm your email address');
    expect(fixture.nativeElement.textContent).toContain('Joining is not complete');
    expect(fixture.nativeElement.textContent).not.toContain('You are now subscribed');
    expect(fixture.nativeElement.textContent).not.toContain('tokens credited');
  });

  it('states that the email was not stored when the endpoint is not configured', () => {
    service.response = of({ status: 'backend-disabled' });
    setEmail('person@example.com');
    submitForm();

    expect(fixture.nativeElement.textContent).toContain('Your email has not been stored');
    expect(fixture.nativeElement.textContent).not.toContain('bonus tokens');
  });

  it('shows a recoverable error when the endpoint fails', () => {
    service.response = throwError(() => new Error('Unavailable'));
    setEmail('person@example.com');
    submitForm();

    expect(fixture.nativeElement.textContent).toContain('We couldn’t add you just now.');
  });

  it('handles an existing pending address without implying confirmation', () => {
    service.response = of({ status: 'confirmation-required' });
    setEmail('person@example.com');
    submitForm();

    expect(fixture.nativeElement.textContent).toContain('still needs confirmation');
  });

  it('shows a validation message when the API rejects the email format', () => {
    service.response = of({ status: 'validation-error' });
    setEmail('person@example.com');
    submitForm();

    expect(fixture.nativeElement.textContent).toContain('Enter a valid email address.');
  });

  it('disables and deduplicates submission while a request is active', () => {
    const pending = new Subject<WaitlistResult>();
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
