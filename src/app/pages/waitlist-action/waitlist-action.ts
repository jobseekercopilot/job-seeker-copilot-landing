import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { FooterComponent } from '../../components/footer/footer';
import { HeaderComponent } from '../../components/header/header';
import { BUSINESS_CONTACT_DETAILS } from '../../config/business-contact-details';
import { EARLY_ACCESS_OFFER_CONFIG, formatOfferTokenAmount } from '../../config/early-access-offer';
import { EmailSubscriptionService } from '../../services/email-subscription.service';

type ActionKind = 'confirm' | 'unsubscribe';
type ActionState = 'working' | 'confirmed' | 'already-confirmed' | 'unsubscribed' |
  'already-unsubscribed' | 'invalid' | 'expired' | 'backend-disabled' | 'error' | 'resent';

@Component({
  selector: 'app-waitlist-action',
  imports: [HeaderComponent, FooterComponent, RouterLink],
  templateUrl: './waitlist-action.html',
  styleUrl: './waitlist-action.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WaitlistActionPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly service = inject(EmailSubscriptionService);
  protected readonly contact = BUSINESS_CONTACT_DETAILS;
  protected readonly offer = inject(EARLY_ACCESS_OFFER_CONFIG);
  protected readonly formattedBonusTokens = formatOfferTokenAmount(this.offer.bonusTokens);
  protected readonly action = this.route.snapshot.data['action'] as ActionKind;
  protected readonly state = signal<ActionState>('working');
  protected readonly resending = signal(false);
  private readonly token = this.route.snapshot.queryParamMap.get('token')?.trim() ?? '';

  ngOnInit(): void {
    if (!this.token) {
      this.state.set('invalid');
      return;
    }

    const request = this.action === 'confirm'
      ? this.service.confirm(this.token)
      : this.service.unsubscribe(this.token);
    request.subscribe({
      next: result => this.state.set(result.status),
      error: error => this.state.set(this.errorState(error)),
    });
  }

  protected resend(): void {
    if (!this.token || this.resending()) return;
    this.resending.set(true);
    this.service.resend(this.token).pipe(
      finalize(() => this.resending.set(false)),
    ).subscribe({
      next: result => this.state.set(result.status),
      error: error => this.state.set(this.errorState(error)),
    });
  }

  private errorState(error: { error?: { code?: string } }): ActionState {
    const code = error?.error?.code;
    if (code === 'TOKEN_EXPIRED') return 'expired';
    if (code === 'INVALID_TOKEN') return 'invalid';
    if (code === 'ALREADY_CONFIRMED') return 'already-confirmed';
    if (code === 'ALREADY_UNSUBSCRIBED') return 'already-unsubscribed';
    return 'error';
  }
}
