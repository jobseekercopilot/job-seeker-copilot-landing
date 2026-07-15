import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { DEFAULT_PUBLIC_APP_CONFIG, PUBLIC_APP_CONFIG } from '../../config/public-app-config';
import { PlatformComparisonPage } from './platform-comparison';

describe('PlatformComparisonPage', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PlatformComparisonPage],
      providers: [
        provideRouter([]),
        { provide: PUBLIC_APP_CONFIG, useValue: DEFAULT_PUBLIC_APP_CONFIG },
      ],
    }).compileComponents();
  });

  it('renders the dated research article and all compared platforms', () => {
    const fixture = TestBed.createComponent(PlatformComparisonPage);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;

    expect(root.querySelector('h1')?.textContent).toContain('How Job Seeker Copilot Compares');
    expect(root.textContent).toContain('16 July 2026');
    expect(root.textContent).toContain('Bernard McGeever');
    expect(root.querySelectorAll('.platform-review')).toHaveLength(12);
    expect(root.querySelectorAll('app-comparison-matrix thead img')).toHaveLength(13);
    expect(root.textContent).toContain('Planned, not currently available');
    expect(root.textContent).toContain('not affiliated with, endorsed by or sponsored by');
  });

  it('makes sources safe and navigation keyboard accessible with the newest article current', () => {
    const fixture = TestBed.createComponent(PlatformComparisonPage);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    const current = root.querySelector<HTMLAnchorElement>('.journey-navigation a[aria-current="page"]');
    const sources = Array.from(root.querySelectorAll<HTMLAnchorElement>('.sources a, #future-gap a'));

    expect(current?.textContent).toContain('16 July 2026');
    expect(current?.getAttribute('href')).toBe('/the-journey-so-far/job-search-platform-comparison');
    expect(sources.length).toBeGreaterThan(12);
    expect(sources.every(link => link.href.startsWith('https://'))).toBe(true);
    expect(sources.every(link => link.rel === 'noopener noreferrer')).toBe(true);
  });

  it('adds canonical, social and BlogPosting metadata', () => {
    const fixture = TestBed.createComponent(PlatformComparisonPage);
    fixture.detectChanges();
    const document = fixture.nativeElement.ownerDocument as Document;
    const canonical = document.querySelector<HTMLLinkElement>('#platform-comparison-canonical');
    const schema = document.querySelector<HTMLScriptElement>('#platform-comparison-structured-data');

    expect(canonical?.href).toBe('https://jobseekercopilot.com/the-journey-so-far/job-search-platform-comparison');
    expect(JSON.parse(schema?.textContent ?? '{}')['@type']).toBe('BlogPosting');
    expect(JSON.parse(schema?.textContent ?? '{}').datePublished).toBe('2026-07-16');
    fixture.destroy();
  });
});
