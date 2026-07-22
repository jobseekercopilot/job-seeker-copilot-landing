import { Location } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { FooterComponent } from '../../components/footer/footer';
import { HeaderComponent } from '../../components/header/header';
import { BUSINESS_CONTACT_DETAILS } from '../../config/business-contact-details';
import { EARLY_ACCESS_OFFER_CONFIG, formatOfferTokenAmount } from '../../config/early-access-offer';
import { EmailSubscriptionService } from '../../services/email-subscription.service';
import { normaliseWaitlistEmail, waitlistEmailValidator } from '../../services/waitlist-email';

type ActionKind = 'confirm' | 'resend' | 'unsubscribe';
type ActionState = 'working' | 'confirmed' | 'already-confirmed' | 'unsubscribed' |
  'already-unsubscribed' | 'invalid' | 'expired' | 'backend-disabled' | 'error' |
  'resend-ready' | 'resent' | 'rate-limited' | 'validation-error';

@Component({
  selector: 'app-waitlist-action',
  imports: [HeaderComponent, FooterComponent, ReactiveFormsModule, RouterLink],
  templateUrl: './waitlist-action.html',
  styleUrl: './waitlist-action.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WaitlistActionPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly location = inject(Location);
  private readonly service = inject(EmailSubscriptionService);
  protected readonly contact = BUSINESS_CONTACT_DETAILS;
  protected readonly offer = inject(EARLY_ACCESS_OFFER_CONFIG);
  protected readonly formattedBonusTokens = formatOfferTokenAmount(this.offer.bonusTokens);
  protected readonly action = this.route.snapshot.data['action'] as ActionKind;
  protected readonly state = signal<ActionState>('working');
  protected readonly resending = signal(false);
  protected readonly resendEmail = new FormControl('', {
    nonNullable: true,
    validators: [waitlistEmailValidator],
  });
  private token = '';

  ngOnInit(): void {
    if (this.action === 'resend') {
      this.state.set('resend-ready');
      return;
    }
    this.token = this.route.snapshot.queryParamMap.get('token')?.trim() ?? '';
    this.location.replaceState(`/waitlist/${this.action}`);
    if (!this.token) {
      this.state.set('invalid');
      return;
    }
    const request = this.action === 'confirm'
      ? this.service.confirm(this.token)
      : this.service.unsubscribe(this.token);
    this.token = '';
    request.subscribe({
      next: result => this.state.set(result.status),
      error: () => this.state.set('error'),
    });
  }

  protected resend(): void {
    if (this.resending()) return;
    const normalisedEmail = normaliseWaitlistEmail(this.resendEmail.value);
    this.resendEmail.setValue(normalisedEmail, { emitEvent: false });
    this.resendEmail.updateValueAndValidity({ emitEvent: false });
    if (this.resendEmail.invalid) {
      this.resendEmail.markAsTouched();
      return;
    }
    this.resending.set(true);
    this.resendEmail.disable({ emitEvent: false });
    this.service.resend(normalisedEmail).pipe(
      finalize(() => {
        this.resending.set(false);
        this.resendEmail.enable({ emitEvent: false });
      }),
    ).subscribe({
      next: result => {
        this.state.set(result.status);
        if (result.status === 'resent') this.resendEmail.reset();
      },
      error: () => this.state.set('error'),
    });
  }

  protected clearResendStatus(): void {
    if (!this.resending() && (this.state() === 'validation-error' || this.state() === 'error')) {
      this.state.set('resend-ready');
    }
  }

  protected showResendForm(): boolean {
    if (this.action === 'resend') {
      return ['resend-ready', 'validation-error', 'error', 'rate-limited'].includes(this.state());
    }
    return this.action === 'confirm' &&
      ['expired', 'invalid', 'error', 'rate-limited', 'validation-error'].includes(this.state());
  }

  protected announcementRole(): 'alert' | 'status' {
    return ['invalid', 'expired', 'backend-disabled', 'error', 'rate-limited', 'validation-error'].includes(this.state())
      ? 'alert'
      : 'status';
  }
}
