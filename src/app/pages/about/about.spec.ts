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

    expect(text).toContain('About the Founder');
    expect(text).toContain('Bernard McGeever');
    expect(text).toContain('June 2026');
    expect(text).toContain('Building with feedback from early users');
    expect(text).toContain('AI is a tool, not the purpose');
  });

  it('sets the requested search description', () => {
    const fixture = TestBed.createComponent(AboutPage);
    fixture.detectChanges();
    const meta = TestBed.inject(Meta);

    expect(meta.getTag('name="description"')?.content).toBe(
      'Learn why Bernard McGeever created Job Seeker Copilot, the story behind the project, and the mission to make job searching less stressful and more effective.',
    );
  });
});
