import { Meta } from '@angular/platform-browser';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { DEFAULT_PUBLIC_APP_CONFIG, PUBLIC_APP_CONFIG } from '../../config/public-app-config';
import { AboutPage } from './about';

describe('AboutPage', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AboutPage],
      providers: [
        provideRouter([]),
        { provide: PUBLIC_APP_CONFIG, useValue: DEFAULT_PUBLIC_APP_CONFIG },
      ],
    }).compileComponents();
  });

  it('presents the founder story and project timeline', () => {
    const fixture = TestBed.createComponent(AboutPage);
    fixture.detectChanges();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';

    expect(text).toContain('The Story Behind Job Seeker Copilot');
    expect(text).toContain('14 July 2026');
    expect(text).toContain('Bernard McGeever');
    expect(text).toContain('Approx. 5 min read');
    expect(text).toContain('June 2026');
    expect(text).toContain('Building with feedback from early users');
    expect(text).toContain('AI is a tool, not the purpose');
  });

  it('lists published journey articles newest first and marks the story as current', () => {
    const fixture = TestBed.createComponent(AboutPage);
    fixture.detectChanges();
    const navigationLinks = fixture.nativeElement.querySelectorAll('.journey-navigation a') as NodeListOf<HTMLAnchorElement>;

    expect(navigationLinks).toHaveLength(2);
    expect(navigationLinks[0].textContent).toContain('How Job Seeker Copilot Compares');
    expect(navigationLinks[0].textContent).toContain('16 July 2026');
    expect(navigationLinks[1].textContent).toContain('The Story Behind Job Seeker Copilot');
    expect(navigationLinks[1].textContent).toContain('14 July 2026');
    expect(navigationLinks[1].getAttribute('aria-current')).toBe('page');
  });

  it('sets the requested search description', () => {
    const fixture = TestBed.createComponent(AboutPage);
    fixture.detectChanges();
    const meta = TestBed.inject(Meta);

    expect(meta.getTag('name="description"')?.content).toBe(
      'Read the story behind Job Seeker Copilot, why Bernard McGeever began building it, and the milestones that shaped the project’s journey so far.',
    );
  });
});
