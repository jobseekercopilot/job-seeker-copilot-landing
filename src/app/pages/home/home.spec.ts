import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { DEFAULT_EARLY_ACCESS_OFFER_CONFIG, EARLY_ACCESS_OFFER_CONFIG } from '../../config/early-access-offer';
import { DEFAULT_PUBLIC_APP_CONFIG, PUBLIC_APP_CONFIG } from '../../config/public-app-config';
import { HomePage } from './home';

describe('HomePage', () => {
  it('uses the same offer data in the opening and final waitlist sections', async () => {
    await TestBed.configureTestingModule({
      imports: [HomePage],
      providers: [
        provideHttpClient(),
        provideRouter([]),
        { provide: EARLY_ACCESS_OFFER_CONFIG, useValue: DEFAULT_EARLY_ACCESS_OFFER_CONFIG },
        { provide: PUBLIC_APP_CONFIG, useValue: DEFAULT_PUBLIC_APP_CONFIG },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(HomePage);
    fixture.detectChanges();
    const summaries = Array.from<HTMLElement>(fixture.nativeElement.querySelectorAll('.offer-summary'))
      .map(element => element.textContent?.trim());

    expect(summaries).toEqual([
      DEFAULT_EARLY_ACCESS_OFFER_CONFIG.offerSummary,
      DEFAULT_EARLY_ACCESS_OFFER_CONFIG.offerSummary,
    ]);
  });
});
