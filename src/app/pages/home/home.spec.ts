import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { DEFAULT_PUBLIC_APP_CONFIG, PUBLIC_APP_CONFIG } from '../../config/public-app-config';
import { HomePage } from './home';

describe('HomePage', () => {
  async function createHomeFixture(publicConfig = DEFAULT_PUBLIC_APP_CONFIG) {
    await TestBed.configureTestingModule({
      imports: [HomePage],
      providers: [
        provideHttpClient(),
        provideRouter([]),
        { provide: PUBLIC_APP_CONFIG, useValue: publicConfig },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(HomePage);
    fixture.detectChanges();
    return fixture;
  }

  it('keeps account links fail closed and shows the waitlist before beta activation', async () => {
    const fixture = await createHomeFixture();
    expect(fixture.nativeElement.querySelectorAll('app-email-signup-form')).toHaveLength(2);
    expect(fixture.nativeElement.textContent).toContain('Public beta in preparation');
    expect(fixture.nativeElement.querySelector('a[href^="https://app."]')).toBeNull();
  });

  it('switches both calls to action to approved app URLs when public beta is enabled', async () => {
    const fixture = await createHomeFixture({
      ...DEFAULT_PUBLIC_APP_CONFIG,
      publicBetaEnabled: true,
      registrationUrl: 'https://app.jobseekercopilot.com/register',
      signInUrl: 'https://app.jobseekercopilot.com/sign-in',
    });

    expect(fixture.nativeElement.textContent).toContain('UK public beta open');
    expect(fixture.nativeElement.querySelectorAll('app-email-signup-form')).toHaveLength(0);
    expect(fixture.nativeElement.querySelectorAll(
      'a[href="https://app.jobseekercopilot.com/register"]',
    ).length).toBeGreaterThan(1);
    expect(fixture.nativeElement.textContent).toContain('Try the public beta');
    expect(fixture.nativeElement.textContent).not.toContain('Get product updates');
  });

  it('places an accessible, sourced comparison immediately before the roadmap', async () => {
    const fixture = await createHomeFixture();
    const root = fixture.nativeElement as HTMLElement;
    const comparison = root.querySelector('#competitor-comparison');
    const comparisonHost = root.querySelector('app-competitor-comparison-section');
    const roadmap = root.querySelector('app-roadmap-section');
    const matrix = comparison?.querySelector('.comparison-scroll');

    expect(comparison).toBeTruthy();
    expect(comparisonHost?.nextElementSibling).toBe(roadmap);
    expect(matrix?.getAttribute('tabindex')).toBe('0');
    expect(comparison?.querySelectorAll('thead img')).toHaveLength(9);
    expect(Array.from(comparison?.querySelectorAll('thead img') ?? []).every(image => image.getAttribute('alt')?.endsWith(' logo'))).toBe(true);
    expect(comparison?.textContent).toContain('Confirmed in official product documentation');
    expect(comparison?.textContent).not.toContain('Planned, not currently available');
    expect(comparison?.querySelector<HTMLAnchorElement>('.research-link')?.getAttribute('href')).toBe('/the-journey-so-far/job-search-platform-comparison');
  });

  it('links to FAQ answers contextually without rendering the full FAQ', async () => {
    const fixture = await createHomeFixture();
    const root = fixture.nativeElement as HTMLElement;
    const hrefs = Array.from(root.querySelectorAll<HTMLAnchorElement>('a[href*="/faq"]')).map(link => link.getAttribute('href'));

    expect(root.querySelector('app-faq-page')).toBeNull();
    expect(root.textContent).not.toContain('What is Job Seeker Copilot?');
    expect(hrefs).toContain('/faq');
    expect(hrefs).toContain('/faq#job-sources');
    expect(hrefs).toContain('/faq#linkedin-and-indeed');
    expect(hrefs).toContain('/faq#work-search-reporting');
    expect(root.querySelector('footer a[href="/faq"]')?.textContent).toContain('Frequently Asked Questions');
    expect(root.querySelector('footer a[href="/about"]')?.textContent).toContain('The Journey So Far');
  });
});
