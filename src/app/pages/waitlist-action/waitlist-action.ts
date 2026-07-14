import { Location } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { FooterComponent } from '../../components/footer/footer';
import { HeaderComponent } from '../../components/header/header';
import { BUSINESS_CONTACT_DETAILS } from '../../config/business-contact-details';
import { EARLY_ACCESS_OFFER_CONFIG, formatOfferTokenAmount } from '../../config/early-access-offer';
import { EmailSubscriptionService } from '../../services/email-subscription.service';

type ActionKind = 'confirm' | 'unsubscribe';
type ActionState = 'working' | 'confirmed' | 'already-confirmed' | 'unsubscribed' |
  'already-unsubscribed' | 'invalid' | 'expired' | 'backend-disabled' | 'error' | 'resent' | 'rate-limited';

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
    validators: [Validators.required, Validators.email, Validators.maxLength(254)],
  });
  private token = '';

  ngOnInit(): void {
    this.token = this.route.snapshot.queryParamMap.get('token')?.trim() ?? '';
    if (this.action === 'confirm') this.location.replaceState('/waitlist/confirm');
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
    if (this.resending() || this.resendEmail.invalid) {
      this.resendEmail.markAsTouched();
      return;
    }
    this.resending.set(true);
    this.service.resend(this.resendEmail.value).pipe(
      finalize(() => this.resending.set(false)),
    ).subscribe({
      next: result => {
        this.state.set(result.status);
        if (result.status === 'resent') this.resendEmail.reset();
      },
      error: () => this.state.set('error'),
    });
  }
}
