import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { DEFAULT_PUBLIC_APP_CONFIG, PUBLIC_APP_CONFIG } from '../../config/public-app-config';
import { NotFoundPage } from './not-found';

describe('NotFoundPage', () => {
  it('explains the missing page and offers a route back home', async () => {
    await TestBed.configureTestingModule({
      imports: [NotFoundPage],
      providers: [
        provideRouter([]),
        { provide: PUBLIC_APP_CONFIG, useValue: DEFAULT_PUBLIC_APP_CONFIG },
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(NotFoundPage);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;

    expect(root.querySelector('h1')?.textContent).toContain('could not find');
    expect(root.querySelector<HTMLAnchorElement>('a[routerlink="/"]')?.getAttribute('href')).toBe('/');
  });
});
