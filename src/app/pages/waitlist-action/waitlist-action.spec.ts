import { Location } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { Observable, of } from 'rxjs';
import { DEFAULT_EARLY_ACCESS_OFFER_CONFIG, EARLY_ACCESS_OFFER_CONFIG } from '../../config/early-access-offer';
import { DEFAULT_PUBLIC_APP_CONFIG, PUBLIC_APP_CONFIG } from '../../config/public-app-config';
import { EmailSubscriptionService, WaitlistActionResult } from '../../services/email-subscription.service';
import { WaitlistActionPage } from './waitlist-action';

class ActionServiceStub {
  result: WaitlistActionResult = { status: 'confirmed' };
  confirmedToken = '';
  resendEmail = '';

  confirm(token: string): Observable<WaitlistActionResult> {
    this.confirmedToken = token;
    return of(this.result);
  }

  unsubscribe(): Observable<WaitlistActionResult> { return of(this.result); }

  resend(email: string): Observable<WaitlistActionResult> {
    this.resendEmail = email;
    return of({ status: 'resent' });
  }
}

describe('WaitlistActionPage', () => {
  async function create(status: WaitlistActionResult['status'], token = 'raw-secret-token') {
    const location = { replaceState: vi.fn() };
    await TestBed.configureTestingModule({
      imports: [WaitlistActionPage],
      providers: [
        provideRouter([]),
        { provide: ActivatedRoute, useValue: { snapshot: {
          data: { action: 'confirm' }, queryParamMap: convertToParamMap(token ? { token } : {}),
        } } },
        { provide: Location, useValue: location },
        { provide: EARLY_ACCESS_OFFER_CONFIG, useValue: DEFAULT_EARLY_ACCESS_OFFER_CONFIG },
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
    input.value = 'person@example.com';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    fixture.detectChanges();
    (fixture.nativeElement.querySelector('.resend-form') as HTMLFormElement)
      .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    fixture.detectChanges();
    expect(service.resendEmail).toBe('person@example.com');
    expect(fixture.nativeElement.textContent).toContain('If that address has a pending subscription');
  });
});
