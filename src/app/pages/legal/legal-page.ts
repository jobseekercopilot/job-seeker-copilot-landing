import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ContactFormComponent } from '../../components/contact-form/contact-form';
import { FooterComponent } from '../../components/footer/footer';
import { HeaderComponent } from '../../components/header/header';
import { BUSINESS_CONTACT_DETAILS } from '../../config/business-contact-details';

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
  protected readonly page = this.route.snapshot.data['page'] as 'privacy' | 'terms' | 'accessibility' | 'contact';
  protected readonly effectiveDate = '13 July 2026';
}
