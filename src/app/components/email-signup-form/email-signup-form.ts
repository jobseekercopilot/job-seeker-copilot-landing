import { ChangeDetectionStrategy, Component, inject, input, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { BUSINESS_CONTACT_DETAILS } from '../../config/business-contact-details';
import { EARLY_ACCESS_OFFER_CONFIG, formatOfferTokenAmount } from '../../config/early-access-offer';
import { PUBLIC_APP_CONFIG } from '../../config/public-app-config';
import { EmailSubscriptionService } from '../../services/email-subscription.service';

type FormState = 'idle' | 'pending-confirmation' | 'already-subscribed' | 'error' | 'backend-disabled';

@Component({
  selector: 'app-email-signup-form',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './email-signup-form.html',
  styleUrl: './email-signup-form.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EmailSignupFormComponent {
  private readonly subscriptionService = inject(EmailSubscriptionService);
  protected readonly contact = BUSINESS_CONTACT_DETAILS;
  protected readonly config = inject(PUBLIC_APP_CONFIG);
  protected readonly offer = inject(EARLY_ACCESS_OFFER_CONFIG);
  protected readonly formattedBonusTokens = formatOfferTokenAmount(this.offer.bonusTokens);
  private formStartedAt = Date.now();

  readonly context = input<'hero' | 'footer'>('hero');
  protected readonly email = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required, Validators.email, Validators.maxLength(254)],
  });
  protected readonly submitting = signal(false);
  protected readonly state = signal<FormState>('idle');
  protected readonly website = new FormControl('', { nonNullable: true });
  protected readonly productionDisabled = !this.config.enableLiveSubmissions && this.config.environmentName === 'production';
  protected readonly developmentDisabled = !this.config.enableLiveSubmissions && this.config.environmentName === 'development';

  protected submit(event?: Event): void {
    event?.preventDefault();
    if (this.submitting()) return;

    if (this.email.invalid) {
      this.email.markAsTouched();
      return;
    }

    this.submitting.set(true);
    this.state.set('idle');

    this.subscriptionService.subscribe(this.email.value, {
      website: this.website.value,
      formStartedAt: this.formStartedAt,
    }).pipe(
      finalize(() => this.submitting.set(false)),
    ).subscribe({
      next: result => {
        this.state.set(result.status);
        if (result.status === 'pending-confirmation' || result.status === 'already-subscribed') {
          this.email.reset();
          this.formStartedAt = Date.now();
        }
      },
      error: () => this.state.set('error'),
    });
  }
}
