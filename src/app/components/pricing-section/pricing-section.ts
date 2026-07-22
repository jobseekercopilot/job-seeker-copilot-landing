import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { EARLY_ACCESS_OFFER_CONFIG, formatOfferTokenAmount } from '../../config/early-access-offer';

interface CreditPack {
  name: string;
  price: string;
  tokens: string;
  generations: string;
  description: string;
}

@Component({
  selector: 'app-pricing-section',
  imports: [RouterLink],
  templateUrl: './pricing-section.html',
  styleUrl: './pricing-section.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PricingSectionComponent {
  protected readonly offer = inject(EARLY_ACCESS_OFFER_CONFIG);
  protected readonly formattedBonusTokens = formatOfferTokenAmount(this.offer.bonusTokens);
  protected readonly packs: CreditPack[] = [
    {
      name: 'Free',
      price: '£0',
      tokens: '20,000 AI credits',
      generations: 'Try tailored document generation',
      description: 'Included when you create your Job Seeker Copilot account.',
    },
    {
      name: 'Starter',
      price: '£7.99',
      tokens: '100,000 AI credits',
      generations: 'About 25–30 CV and cover letter pairs',
      description: 'Good for trying the document-generation features.',
    },
    {
      name: 'Standard',
      price: '£16.99',
      tokens: '250,000 AI credits',
      generations: 'About 60–70 CV and cover letter pairs',
      description: 'Useful for an active job search with several applications.',
    },
    {
      name: 'Pro',
      price: '£34.99',
      tokens: '600,000 AI credits',
      generations: 'About 140+ CV and cover letter pairs',
      description: 'Designed for heavier document-generation use.',
    },
  ];
}
