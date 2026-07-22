import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import {
  DEFAULT_EARLY_ACCESS_OFFER_CONFIG,
  EARLY_ACCESS_OFFER_CONFIG,
  EarlyAccessOfferConfig,
} from '../../config/early-access-offer';
import { WaitlistOfferComponent } from './waitlist-offer';

@Component({
  imports: [WaitlistOfferComponent],
  template: `
    <app-waitlist-offer context="hero" />
    <app-waitlist-offer context="final" />
  `,
})
class OfferContextsHost {}

describe('WaitlistOfferComponent', () => {
  it('shows the configured offer with a formatted token amount and terms link', async () => {
    const fixture = await render(DEFAULT_EARLY_ACCESS_OFFER_CONFIG);
    const panels = fixture.nativeElement.querySelectorAll('.offer-panel');
    const text = fixture.nativeElement.textContent;
    const termsLink = fixture.nativeElement.querySelector('a') as HTMLAnchorElement;

    expect(panels.length).toBe(2);
    expect(text).toContain('Priority early access');
    expect(text).toContain('20,000 bonus tokens');
    expect(text).not.toContain('20000 bonus tokens');
    expect(termsLink.getAttribute('href')).toBe('/terms#early-access-offer');
  });

  it('uses consistent offer data in the opening and final waitlist sections', async () => {
    const fixture = await render(DEFAULT_EARLY_ACCESS_OFFER_CONFIG);
    const summaries = Array.from<HTMLElement>(fixture.nativeElement.querySelectorAll('.offer-summary'));
    const eligibility = Array.from<HTMLElement>(fixture.nativeElement.querySelectorAll('.offer-eligibility'));

    expect(summaries.map(element => element.textContent?.trim())).toEqual([
      DEFAULT_EARLY_ACCESS_OFFER_CONFIG.offerSummary,
      DEFAULT_EARLY_ACCESS_OFFER_CONFIG.offerSummary,
    ]);
    expect(eligibility[0].textContent).toContain(DEFAULT_EARLY_ACCESS_OFFER_CONFIG.eligibilitySummary);
    expect(eligibility[1].textContent).toContain(DEFAULT_EARLY_ACCESS_OFFER_CONFIG.eligibilitySummary);
  });

  it('hides the offer everywhere when it is disabled', async () => {
    const fixture = await render({ ...DEFAULT_EARLY_ACCESS_OFFER_CONFIG, offerEnabled: false });

    expect(fixture.nativeElement.querySelector('.offer-panel')).toBeNull();
    expect(fixture.nativeElement.textContent).not.toContain('bonus tokens');
  });

  async function render(config: EarlyAccessOfferConfig) {
    await TestBed.configureTestingModule({
      imports: [OfferContextsHost],
      providers: [
        provideRouter([]),
        { provide: EARLY_ACCESS_OFFER_CONFIG, useValue: config },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(OfferContextsHost);
    fixture.detectChanges();
    return fixture;
  }
});
