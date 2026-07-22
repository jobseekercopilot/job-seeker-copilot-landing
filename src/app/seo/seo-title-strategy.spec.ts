import { TestBed } from '@angular/core/testing';
import { Meta, Title } from '@angular/platform-browser';
import { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { DEFAULT_PUBLIC_APP_CONFIG, PUBLIC_APP_CONFIG, PublicAppConfig } from '../config/public-app-config';
import { SeoRouteData } from './seo-route-data';
import { SEO_ROUTES } from './seo-routes';
import { SeoTitleStrategy } from './seo-title-strategy';

describe('SeoTitleStrategy', () => {
  let config: PublicAppConfig;
  let strategy: SeoTitleStrategy;

  beforeEach(() => {
    config = {
      ...DEFAULT_PUBLIC_APP_CONFIG,
      environmentName: 'production',
      publicWebsiteUrl: 'https://www.jobseekercopilot.com',
      searchIndexingEnabled: true,
    };
    TestBed.configureTestingModule({
      providers: [SeoTitleStrategy, { provide: PUBLIC_APP_CONFIG, useValue: config }],
    });
    strategy = TestBed.inject(SeoTitleStrategy);
    document.head.querySelectorAll('link[rel="canonical"], script[type="application/ld+json"], meta[name="robots"], meta[property^="og:"], meta[name^="twitter:"]')
      .forEach(element => element.remove());
  });

  afterEach(() => {
    document.head.querySelectorAll('link[rel="canonical"], script[type="application/ld+json"], meta[name="robots"], meta[property^="og:"], meta[name^="twitter:"]')
      .forEach(element => element.remove());
  });

  it('sets complete canonical, social and supported structured data for public routes', () => {
    strategy.updateTitle(snapshot(SEO_ROUTES.home));
    expect(TestBed.inject(Title).getTitle()).toBe(SEO_ROUTES.home.title);
    expect(TestBed.inject(Meta).getTag('name="robots"')?.content).toBe('index, follow, max-image-preview:large');
    expect(document.querySelector<HTMLLinkElement>('link[rel="canonical"]')?.href).toBe('https://www.jobseekercopilot.com/');
    expect(TestBed.inject(Meta).getTag('property="og:image"')?.content).toBe('https://www.jobseekercopilot.com/social/og-image.png');
    expect(TestBed.inject(Meta).getTag('property="og:image:width"')?.content).toBe('1200');
    const homeSchema = JSON.parse(document.querySelector<HTMLScriptElement>('#seo-structured-data')?.textContent ?? '{}');
    expect(homeSchema['@graph'].map((item: { '@type': string }) => item['@type'])).toEqual(['Organization', 'WebSite']);

    strategy.updateTitle(snapshot(SEO_ROUTES.faq));
    const faqSchema = JSON.parse(document.querySelector<HTMLScriptElement>('#seo-structured-data')?.textContent ?? '{}');
    expect(faqSchema['@type']).toBe('FAQPage');
    expect(faqSchema.mainEntity).toHaveLength(9);

    strategy.updateTitle(snapshot(SEO_ROUTES.comparison));
    const articleSchema = JSON.parse(document.querySelector<HTMLScriptElement>('#seo-structured-data')?.textContent ?? '{}');
    expect(articleSchema['@type']).toBe('BlogPosting');
    expect(articleSchema.mainEntityOfPage).toBe('https://www.jobseekercopilot.com/the-journey-so-far/job-search-platform-comparison');
  });

  it('keeps every route noindex until the explicit launch gate is enabled', () => {
    config.searchIndexingEnabled = false;
    strategy.updateTitle(snapshot(SEO_ROUTES.home));

    expect(TestBed.inject(Meta).getTag('name="robots"')?.content).toBe('noindex, nofollow, noarchive');
    expect(document.querySelector<HTMLLinkElement>('link[rel="canonical"]')?.href).toBe('https://www.jobseekercopilot.com/');
  });

  it('always excludes action routes and removes canonical and social metadata', () => {
    strategy.updateTitle(snapshot(SEO_ROUTES.home));
    strategy.updateTitle(snapshot(SEO_ROUTES.confirm));

    expect(TestBed.inject(Meta).getTag('name="robots"')?.content).toBe('noindex, nofollow, noarchive');
    expect(document.querySelector('link[rel="canonical"]')).toBeNull();
    expect(document.querySelector('meta[property^="og:"]')).toBeNull();
    expect(document.querySelector('meta[name^="twitter:"]')).toBeNull();
    expect(document.querySelector('script[type="application/ld+json"]')).toBeNull();
  });
});

function snapshot(seo: SeoRouteData): RouterStateSnapshot {
  return {
    root: {
      data: { seo },
      firstChild: null,
    } as unknown as ActivatedRouteSnapshot,
  } as RouterStateSnapshot;
}
