import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { DEFAULT_PUBLIC_APP_CONFIG, PUBLIC_APP_CONFIG, PublicAppConfig } from '../../config/public-app-config';
import { HeaderComponent } from './header';

describe('HeaderComponent', () => {
  async function createHeaderFixture(config: PublicAppConfig) {
    await TestBed.configureTestingModule({
      imports: [HeaderComponent],
      providers: [
        provideRouter([]),
        { provide: PUBLIC_APP_CONFIG, useValue: config },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(HeaderComponent);
    fixture.detectChanges();
    return fixture;
  }

  afterEach(() => TestBed.resetTestingModule());

  it('uses the hosted application as the primary navigation journey when configured', async () => {
    const fixture = await createHeaderFixture({
      ...DEFAULT_PUBLIC_APP_CONFIG,
      mainApplicationUrl: 'https://app.jobseekercopilot.com/',
      registrationUrl: 'https://app.jobseekercopilot.com/register',
      signInUrl: 'https://app.jobseekercopilot.com/sign-in',
    });
    const root = fixture.nativeElement as HTMLElement;

    expect(root.querySelector<HTMLAnchorElement>('.nav-cta')?.href)
      .toBe('https://app.jobseekercopilot.com/');
    expect(root.querySelector<HTMLAnchorElement>('.nav-sign-in')?.href)
      .toBe('https://app.jobseekercopilot.com/sign-in');
    expect(root.textContent).not.toContain('Join the waitlist');
  });

  it('keeps beta access as the safe primary journey until all app routes exist', async () => {
    const fixture = await createHeaderFixture(DEFAULT_PUBLIC_APP_CONFIG);
    const root = fixture.nativeElement as HTMLElement;

    expect(root.querySelector<HTMLAnchorElement>('.nav-cta')?.textContent)
      .toContain('Request beta access');
    expect(root.querySelector('.nav-sign-in')).toBeNull();
    expect(root.querySelector('a[href^="https://app.jobseekercopilot.com"]')).toBeNull();
  });
});
