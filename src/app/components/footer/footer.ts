import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AnalyticsConsentService } from '../../analytics/analytics-consent.service';
import { BUSINESS_CONTACT_DETAILS } from '../../config/business-contact-details';
import { PUBLIC_APP_CONFIG } from '../../config/public-app-config';

@Component({
  selector: 'app-footer',
  imports: [RouterLink],
  templateUrl: './footer.html',
  styleUrl: './footer.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FooterComponent {
  protected readonly year = new Date().getFullYear();
  protected readonly contact = BUSINESS_CONTACT_DETAILS;
  protected readonly config = inject(PUBLIC_APP_CONFIG);
  protected readonly analyticsConsent = inject(AnalyticsConsentService);
}
