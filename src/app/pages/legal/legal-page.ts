import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ContactFormComponent } from '../../components/contact-form/contact-form';
import { FooterComponent } from '../../components/footer/footer';
import { HeaderComponent } from '../../components/header/header';
import { BUSINESS_CONTACT_DETAILS } from '../../config/business-contact-details';
import {
  isIsoCalendarDate,
  isReviewedIdentityValue,
  PUBLIC_APP_CONFIG,
} from '../../config/public-app-config';

@Component({
  selector: 'app-legal-page',
  imports: [HeaderComponent, FooterComponent, ContactFormComponent, RouterLink],
  templateUrl: './legal-page.html',
  styleUrl: './legal-page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LegalPage {
  private readonly route = inject(ActivatedRoute);
  protected readonly contact = BUSINESS_CONTACT_DETAILS;
  protected readonly config = inject(PUBLIC_APP_CONFIG);
  protected readonly page = this.route.snapshot.data['page'] as 'privacy' | 'terms' | 'accessibility' | 'contact';
  protected readonly legalReady = this.config.publicBetaEnabled
    && this.config.legalDocumentsReviewed
    && this.config.minimumUserAge === 18
    && isIsoCalendarDate(this.config.legalEffectiveDate)
    && /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/.test(this.config.legalVersion)
    && ['SOLE_TRADER', 'LIMITED_COMPANY'].includes(this.config.legalEntityType)
    && ['NOT_VAT_REGISTERED', 'VAT_REGISTERED'].includes(this.config.taxStatus)
    && isReviewedIdentityValue(this.config.legalEntityName, 2)
    && isReviewedIdentityValue(this.config.tradingName, 2)
    && isReviewedIdentityValue(this.config.businessAddress, 8)
    && Boolean(this.config.privacyEmail)
    && Boolean(this.config.supportEmail)
    && ['REGISTERED', 'NOT_REQUIRED_CONFIRMED']
      .includes(this.config.icoRegistrationStatus)
    && this.config.accountDeletionCompletionDays > 0
    && this.config.documentDeletionCompletionDays > 0
    && this.config.securityLogRetentionDays > 0
    && this.config.supportRecordRetentionDays > 0
    && this.config.financialRecordRetentionYears > 0;
}
