import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AnalyticsConsentComponent } from './analytics-consent';
import { AnalyticsService } from './analytics.service';

class AnalyticsServiceStub {
  readonly consent = {
    shouldShow: signal(true),
    choice: signal<'unset' | 'accepted' | 'refused'>('unset'),
    accept: vi.fn(),
    refuse: vi.fn(),
    closePreferences: vi.fn(),
  };
}

describe('AnalyticsConsentComponent', () => {
  let fixture: ComponentFixture<AnalyticsConsentComponent>;
  let analytics: AnalyticsServiceStub;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AnalyticsConsentComponent],
      providers: [
        provideRouter([]),
        { provide: AnalyticsService, useClass: AnalyticsServiceStub },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(AnalyticsConsentComponent);
    analytics = TestBed.inject(AnalyticsService) as unknown as AnalyticsServiceStub;
    fixture.detectChanges();
  });

  it('presents accept and refuse as equal first-level choices with privacy details', () => {
    const buttons = [...fixture.nativeElement.querySelectorAll('button')] as HTMLButtonElement[];
    expect(buttons.slice(0, 2).map(button => button.textContent?.trim())).toEqual([
      'Allow analytics', 'Refuse analytics',
    ]);
    expect(buttons[0].className).toBe(buttons[1].className);
    expect(fixture.nativeElement.querySelector('a[href="/privacy"]')).toBeTruthy();

    buttons[0].click();
    buttons[1].click();
    expect(analytics.consent.accept).toHaveBeenCalledOnce();
    expect(analytics.consent.refuse).toHaveBeenCalledOnce();
  });
});
