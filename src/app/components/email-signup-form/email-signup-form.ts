import { ChangeDetectionStrategy, Component, inject, input, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { AnalyticsService } from '../../analytics/analytics.service';
import { AnalyticsViewDirective } from '../../analytics/analytics-view.directive';
import { BUSINESS_CONTACT_DETAILS } from '../../config/business-contact-details';
import { EARLY_ACCESS_OFFER_CONFIG, formatOfferTokenAmount } from '../../config/early-access-offer';
import { PUBLIC_APP_CONFIG } from '../../config/public-app-config';
import { normaliseWaitlistEmail, waitlistEmailValidator } from '../../services/waitlist-email';
import { WaitlistService } from '../../services/waitlist.service';

type FormState = 'idle' | 'pending-confirmation' | 'already-confirmed' | 'confirmation-required' |
  'resubscription-required' | 'validation-error' | 'email-delivery-error' | 'rate-limited' |
  'error' | 'backend-disabled';

@Component({
  selector: 'app-email-signup-form',
  imports: [ReactiveFormsModule, RouterLink, AnalyticsViewDirective],
  templateUrl: './email-signup-form.html',
  styleUrl: './email-signup-form.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EmailSignupFormComponent {
  private readonly waitlistService = inject(WaitlistService);
  private readonly analytics = inject(AnalyticsService);
  protected readonly contact = BUSINESS_CONTACT_DETAILS;
  protected readonly config = inject(PUBLIC_APP_CONFIG);
  protected readonly offer = inject(EARLY_ACCESS_OFFER_CONFIG);
  protected readonly formattedBonusTokens = formatOfferTokenAmount(this.offer.bonusTokens);

  readonly context = input<'hero' | 'footer'>('hero');
  protected readonly email = new FormControl('', {
    nonNullable: true,
    validators: [waitlistEmailValidator],
  });
  protected readonly submitting = signal(false);
  protected readonly state = signal<FormState>('idle');
  protected readonly website = new FormControl('', { nonNullable: true });
  protected readonly productionDisabled = !this.config.enableLiveSubmissions && this.config.environmentName === 'production';
  protected readonly developmentDisabled = !this.config.enableLiveSubmissions && this.config.environmentName === 'development';

  protected submit(event?: Event): void {
    event?.preventDefault();
    if (this.submitting()) return;

    const normalisedEmail = normaliseWaitlistEmail(this.email.value);
    this.email.setValue(normalisedEmail, { emitEvent: false });
    this.email.updateValueAndValidity({ emitEvent: false });
    if (this.email.invalid) {
      this.email.markAsTouched();
      return;
    }
    if (this.website.value) {
      this.state.set('error');
      return;
    }

    this.analytics.track('waitlist_attempt', this.context());
    this.submitting.set(true);
    this.state.set('idle');
    this.email.disable({ emitEvent: false });

    this.waitlistService.join(normalisedEmail).pipe(
      finalize(() => {
        this.submitting.set(false);
        this.email.enable({ emitEvent: false });
      }),
    ).subscribe({
      next: result => {
        this.state.set(result.status);
        if (result.status === 'pending-confirmation' || result.status === 'already-confirmed' ||
            result.status === 'confirmation-required' || result.status === 'resubscription-required') {
          this.email.reset();
        }
      },
      error: () => this.state.set('error'),
    });
  }

  protected clearStatus(): void {
    if (!this.submitting()) this.state.set('idle');
  }

  protected isRequestAccepted(): boolean {
    return this.state() === 'pending-confirmation' || this.state() === 'already-confirmed' ||
      this.state() === 'confirmation-required' || this.state() === 'resubscription-required';
  }

  protected announcementRole(): 'alert' | 'status' {
    return this.email.touched && this.email.invalid ||
      ['validation-error', 'email-delivery-error', 'rate-limited', 'error'].includes(this.state())
      ? 'alert'
      : 'status';
  }
}
