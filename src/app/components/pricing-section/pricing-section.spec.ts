import {TestBed} from '@angular/core/testing';
import {provideRouter} from '@angular/router';
import {AnalyticsService} from '../../analytics/analytics.service';
import {DEFAULT_PUBLIC_APP_CONFIG, PUBLIC_APP_CONFIG} from '../../config/public-app-config';
import {PricingSectionComponent} from './pricing-section';

describe('PricingSectionComponent', () => {
  const analytics = {consent: {canCollect: () => false}, track: vi.fn(() => false)};

  async function render(publicBetaEnabled = false) {
    await TestBed.configureTestingModule({
      imports: [PricingSectionComponent],
      providers: [
        provideRouter([]),
        {provide: AnalyticsService, useValue: analytics},
        {
          provide: PUBLIC_APP_CONFIG,
          useValue: {
            ...DEFAULT_PUBLIC_APP_CONFIG,
            publicBetaEnabled,
            registrationUrl: publicBetaEnabled
              ? 'https://app.jobseekercopilot.com/register'
              : '',
            pricingUrl: publicBetaEnabled
              ? 'https://app.jobseekercopilot.com/payment'
              : '',
          },
        },
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(PricingSectionComponent);
    fixture.detectChanges();
    return fixture;
  }

  it('renders exact one-off document-credit packages without token estimates', async () => {
    const fixture = await render();
    const text = fixture.nativeElement.textContent;

    expect(text).toContain('Free');
    expect(text).toContain('2 document credits');
    expect(text).toContain('Starter');
    expect(text).toContain('£7.99');
    expect(text).toContain('10 document credits');
    expect(text).toContain('Active');
    expect(text).toContain('£16.99');
    expect(text).toContain('25 document credits');
    expect(text).toContain('Power');
    expect(text).toContain('£34.99');
    expect(text).toContain('60 document credits');
    expect(text).toContain('No subscription and no automatic renewal');
    expect(text).not.toContain('token');
    expect(text).not.toContain('25–30');
  });

  it('uses fail-closed waitlist links until the public beta runtime switch is valid', async () => {
    const fixture = await render();
    expect(fixture.nativeElement.querySelector('a[href="/#waitlist"]')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('a[href^="https://app."]')).toBeNull();
  });

  it('uses the runtime registration URL after public beta activation', async () => {
    const fixture = await render(true);
    expect(fixture.nativeElement.querySelector(
      'a[href="https://app.jobseekercopilot.com/register"]',
    )).toBeTruthy();
    expect(fixture.nativeElement.querySelectorAll(
      'a[href="https://app.jobseekercopilot.com/payment"]',
    )).toHaveLength(3);
    expect(fixture.nativeElement.textContent).toContain('View plans in the app');
  });
});
