import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { EARLY_ACCESS_OFFER_CONFIG, formatOfferTokenAmount } from '../../config/early-access-offer';

@Component({
  selector: 'app-waitlist-offer',
  imports: [RouterLink],
  templateUrl: './waitlist-offer.html',
  styleUrl: './waitlist-offer.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WaitlistOfferComponent {
  readonly context = input<'hero' | 'final'>('hero');
  protected readonly offer = inject(EARLY_ACCESS_OFFER_CONFIG);
  protected readonly formattedBonusTokens = formatOfferTokenAmount(this.offer.bonusTokens);
}
