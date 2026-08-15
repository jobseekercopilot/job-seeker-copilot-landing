import { Location } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { Observable, of, Subject, throwError } from 'rxjs';
import { DEFAULT_PUBLIC_APP_CONFIG, PUBLIC_APP_CONFIG } from '../../config/public-app-config';
import { EmailSubscriptionService, WaitlistActionResult } from '../../services/email-subscription.service';
import { WaitlistActionPage } from './waitlist-action';

class ActionServiceStub {
  result: WaitlistActionResult = { status: 'confirmed' };
  resendResponse: Observable<WaitlistActionResult> = of({ status: 'resent' });
  confirmedToken = '';
  resendEmail = '';
  resendCalls = 0;

  confirm(token: string): Observable<WaitlistActionResult> {
    this.confirmedToken = token;
    return of(this.result);
  }

  unsubscribe(): Observable<WaitlistActionResult> { return of(this.result); }

  resend(email: string): Observable<WaitlistActionResult> {
    this.resendCalls += 1;
    this.resendEmail = email;
    return this.resendResponse;
  }
}

describe('WaitlistActionPage', () => {
  async function create(
    status: WaitlistActionResult['status'],
    token = 'raw-secret-token',
    action: 'confirm' | 'resend' | 'unsubscribe' = 'confirm',
  ) {
    const location = { replaceState: vi.fn() };
    await TestBed.configureTestingModule({
      imports: [WaitlistActionPage],
      providers: [
        provideRouter([]),
        { provide: ActivatedRoute, useValue: { snapshot: {
          data: { action }, queryParamMap: convertToParamMap(token ? { token } : {}),
        } } },
        { provide: Location, useValue: location },
        { provide: PUBLIC_APP_CONFIG, useValue: DEFAULT_PUBLIC_APP_CONFIG },
        { provide: EmailSubscriptionService, useClass: ActionServiceStub },
      ],
    }).compileComponents();
    const service = TestBed.inject(EmailSubscriptionService) as unknown as ActionServiceStub;
    service.result = { status } as WaitlistActionResult;
    const fixture = TestBed.createComponent(WaitlistActionPage);
    fixture.detectChanges();
    return { fixture, service, location };
  }

  it('confirms, removes the token from the visible URL, and never renders it', async () => {
    const { fixture, service, location } = await create('confirmed');
    expect(service.confirmedToken).toBe('raw-secret-token');
    expect(location.replaceState).toHaveBeenCalledWith('/waitlist/confirm');
    expect(fixture.nativeElement.textContent).toContain('You’re on the waiting list');
    expect(fixture.nativeElement.textContent).not.toContain('raw-secret-token');
    expect(fixture.nativeElement.textContent).not.toContain('tokens have been credited');
  });

  it('provides a neutral standalone resend route without requiring a token', async () => {
    const { fixture } = await create('resent', '', 'resend');

    expect(fixture.nativeElement.textContent).toContain('Request a new confirmation email');
    expect(fixture.nativeElement.textContent).toContain('whether or not that address has a pending request');
    expect(fixture.nativeElement.querySelector('.resend-form')).toBeTruthy();
  });

  it.each([
    ['already-confirmed', 'already on the list'],
    ['invalid', 'couldn’t recognise this link'],
    ['expired', 'link is no longer active'],
  ] as const)('renders the %s confirmation result', async (status, copy) => {
    const { fixture } = await create(status);
    expect(fixture.nativeElement.textContent).toContain(copy);
  });

  it('offers neutral email-based resend for an expired link', async () => {
    const { fixture, service } = await create('expired');
    const input = fixture.nativeElement.querySelector('input[type="email"]') as HTMLInputElement;
    input.value = ' Person@Example.COM ';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    fixture.detectChanges();
    (fixture.nativeElement.querySelector('.resend-form') as HTMLFormElement)
      .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    fixture.detectChanges();
    expect(service.resendEmail).toBe('person@example.com');
    expect(fixture.nativeElement.textContent).toContain('If that address has a pending subscription');
  });

  it('disables and deduplicates the resend form while a request is active', async () => {
    const { fixture, service } = await create('expired');
    const pending = new Subject<WaitlistActionResult>();
    service.resendResponse = pending;
    const input = fixture.nativeElement.querySelector('input[type="email"]') as HTMLInputElement;
    input.value = 'person@example.com';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    fixture.detectChanges();
    const form = fixture.nativeElement.querySelector('.resend-form') as HTMLFormElement;
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    fixture.detectChanges();

    expect(input.disabled).toBe(true);
    expect((form.querySelector('button') as HTMLButtonElement).disabled).toBe(true);
    expect(form.getAttribute('aria-busy')).toBe('true');
    expect(service.resendCalls).toBe(1);
    expect(service.resendEmail).toBe('person@example.com');
    pending.next({ status: 'resent' });
    pending.complete();
  });

  it('renders a controlled recoverable message for resend network failures', async () => {
    const { fixture, service } = await create('expired');
    service.resendResponse = throwError(() => new Error('private backend detail'));
    const input = fixture.nativeElement.querySelector('input[type="email"]') as HTMLInputElement;
    input.value = 'person@example.com';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    fixture.detectChanges();
    (fixture.nativeElement.querySelector('.resend-form') as HTMLFormElement)
      .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('We couldn’t update your subscription');
    expect(fixture.nativeElement.textContent).not.toContain('private backend detail');
    expect(fixture.nativeElement.querySelector('.resend-form')).toBeTruthy();
  });
});
