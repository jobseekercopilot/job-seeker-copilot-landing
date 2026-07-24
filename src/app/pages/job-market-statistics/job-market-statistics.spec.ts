import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { DEFAULT_PUBLIC_APP_CONFIG, PUBLIC_APP_CONFIG } from '../../config/public-app-config';
import { JobMarketStatisticsPage } from './job-market-statistics';

describe('JobMarketStatisticsPage', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [JobMarketStatisticsPage],
      providers: [
        provideRouter([]),
        { provide: PUBLIC_APP_CONFIG, useValue: DEFAULT_PUBLIC_APP_CONFIG },
      ],
    }).compileComponents();
  });

  function render(): HTMLElement {
    const fixture = TestBed.createComponent(JobMarketStatisticsPage);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  it('renders the dated Statistics article, methodology and complete bibliography', () => {
    const root = render();

    expect(root.querySelector('h1')?.textContent).toContain('The UK Job Search Has Changed');
    expect(root.querySelector('time[datetime="2026-07-24"]')?.textContent).toContain('24 July 2026');
    expect(root.querySelector('.review-date')?.textContent?.replace(/\s+/g, ' ').trim())
      .toContain('Data last reviewed: 24 July 2026');
    expect(root.querySelector('#methodology')).toBeTruthy();
    expect(root.querySelector('#sources-heading')?.textContent).toContain('Sources and further reading');
    expect(root.querySelectorAll('.bibliography > ol > li')).toHaveLength(19);
    expect(root.querySelectorAll('.citation').length).toBeGreaterThan(30);
  });

  it('shows accessible data tables for the historical and graduate comparisons', () => {
    const root = render();
    const tables = root.querySelectorAll('table');
    const scrollRegions = Array.from(root.querySelectorAll<HTMLElement>('.table-scroll'));

    expect(tables).toHaveLength(2);
    expect(root.querySelector('#history-table-caption')?.textContent).toContain('Selected consistent');
    expect(root.textContent).toContain('Text alternative and data table');
    expect(scrollRegions.every(region => region.getAttribute('tabindex') === '0')).toBe(true);
  });

  it('marks the new article current and places it first in Journey navigation', () => {
    const root = render();
    const navigationLinks = root.querySelectorAll('.journey-navigation a') as NodeListOf<HTMLAnchorElement>;

    expect(navigationLinks).toHaveLength(3);
    expect(navigationLinks[0].getAttribute('href')).toBe('/the-journey-so-far/uk-job-search-statistics');
    expect(navigationLinks[0].textContent).toContain('Statistics');
    expect(navigationLinks[0].getAttribute('aria-current')).toBe('page');
  });

  it('makes bibliography links safe and does not render rejected claims', () => {
    const root = render();
    const sourceLinks = Array.from(root.querySelectorAll<HTMLAnchorElement>('.source-link'));
    const text = root.textContent ?? '';

    expect(sourceLinks).toHaveLength(19);
    expect(sourceLinks.every(link => link.href.startsWith('https://'))).toBe(true);
    expect(sourceLinks.every(link => link.target === '_blank')).toBe(true);
    expect(sourceLinks.every(link => link.rel === 'noopener noreferrer')).toBe(true);
    for (const rejected of ['27 applications', '162 applications', '4% interview', '1% job', 'must submit 100 applications']) {
      expect(text).not.toContain(rejected);
    }
  });
});
