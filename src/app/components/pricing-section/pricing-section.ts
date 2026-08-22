import {ChangeDetectionStrategy, Component, inject} from '@angular/core';
import {RouterLink} from '@angular/router';
import {AnalyticsViewDirective} from '../../analytics/analytics-view.directive';
import {AnalyticsService} from '../../analytics/analytics.service';
import {PUBLIC_APP_CONFIG} from '../../config/public-app-config';

interface GenerationPack {
  applications: string;
  generations: number;
  description: string;
  id: 'free' | 'starter' | 'active' | 'power';
  name: string;
  price: string;
}

@Component({
  selector: 'app-pricing-section',
  imports: [RouterLink, AnalyticsViewDirective],
  templateUrl: './pricing-section.html',
  styleUrl: './pricing-section.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PricingSectionComponent {
  private readonly analytics = inject(AnalyticsService);
  protected readonly config = inject(PUBLIC_APP_CONFIG);
  protected readonly packs: readonly GenerationPack[] = [
    {
      id: 'free',
      name: 'Free',
      price: '£0',
      generations: 2,
      applications: 'One complete CV and cover-letter application',
      description: 'Included once when you create your Job Seeker Copilot account.',
    },
    {
      id: 'starter',
      name: 'Starter',
      price: '£4.99',
      generations: 10,
      applications: 'Up to 5 complete applications',
      description: 'A focused one-off pack for a smaller set of applications.',
    },
    {
      id: 'active',
      name: 'Active',
      price: '£11.99',
      generations: 25,
      applications: 'Up to 12 complete applications, plus one individual document',
      description: 'The most useful one-off pack for an active job search.',
    },
    {
      id: 'power',
      name: 'Power',
      price: '£19.99',
      generations: 60,
      applications: 'Up to 30 complete applications',
      description: 'A larger one-off pack for sustained application activity.',
    },
  ];

  protected trackPricingCta(): void {
    this.analytics.track('pricing_cta', 'pricing');
  }
}
