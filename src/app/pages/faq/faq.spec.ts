import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { routes } from '../../app.routes';
import { DEFAULT_PUBLIC_APP_CONFIG, PUBLIC_APP_CONFIG } from '../../config/public-app-config';
import { FaqPage } from './faq';

describe('FaqPage', () => {
  const fragment = new BehaviorSubject<string | null>(null);

  beforeEach(async () => {
    fragment.next(null);
    await TestBed.configureTestingModule({
      imports: [FaqPage],
      providers: [
        provideRouter([]),
        { provide: ActivatedRoute, useValue: { fragment } },
        { provide: PUBLIC_APP_CONFIG, useValue: DEFAULT_PUBLIC_APP_CONFIG },
      ],
    }).compileComponents();
  });

  it('is registered at the public FAQ route', () => {
    expect(routes.some(route => route.path === 'faq' && route.title === 'Frequently Asked Questions | Job Seeker Copilot')).toBe(true);
  });

  it('renders questions in the required order with provider and pre-beta detail', () => {
    const fixture = TestBed.createComponent(FaqPage);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    const buttons = Array.from(root.querySelectorAll<HTMLButtonElement>('.faq-item h2 button'));
    const jobSources = root.querySelector('#job-sources');

    expect(buttons).toHaveLength(9);
    expect(buttons[0].textContent).toContain('What is Job Seeker Copilot?');
    expect(buttons[1].textContent).toContain('Who is Job Seeker Copilot for?');
    expect(jobSources?.textContent).toContain('Reed');
    expect(jobSources?.textContent).toContain('Adzuna');
    expect(jobSources?.textContent).toContain('JSearch');
    expect(jobSources?.textContent).toContain('currently at a pre-beta stage');
    expect(jobSources?.textContent).toContain('broad range of general vacancies');
    expect(jobSources?.textContent).toContain('specialised opportunities');
    expect(jobSources?.textContent).toContain('only be announced as available after they have been implemented and tested');
  });

  it('uses native accessible controls and opens an anchored question', () => {
    const fixture = TestBed.createComponent(FaqPage);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    const firstButton = root.querySelector<HTMLButtonElement>('#faq-button-what-is-job-seeker-copilot');
    const targetButton = root.querySelector<HTMLButtonElement>('#faq-button-job-sources');

    expect(firstButton?.tagName).toBe('BUTTON');
    expect(firstButton?.getAttribute('aria-expanded')).toBe('true');
    expect(firstButton?.getAttribute('aria-controls')).toBe('faq-answer-what-is-job-seeker-copilot');
    firstButton?.click();
    fixture.detectChanges();
    expect(firstButton?.getAttribute('aria-expanded')).toBe('false');

    fragment.next('job-sources');
    fixture.detectChanges();
    expect(targetButton?.getAttribute('aria-expanded')).toBe('true');
    expect(root.querySelector('#faq-answer-job-sources')?.hasAttribute('hidden')).toBe(false);
  });

  it('links the competitor answer from the visible FAQ content', () => {
    const fixture = TestBed.createComponent(FaqPage);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    const comparison = root.querySelector<HTMLAnchorElement>('#linkedin-and-indeed .answer-link');

    expect(comparison?.getAttribute('href')).toBe('/the-journey-so-far/job-search-platform-comparison');
  });
});
