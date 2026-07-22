import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { AnalyticsService } from './analytics.service';
import { AnalyticsViewDirective } from './analytics-view.directive';

@Component({
  imports: [AnalyticsViewDirective],
  template: '<form appAnalyticsView="waitlist_form_view" analyticsContext="hero"></form>',
})
class AnalyticsViewHost {}

class AnalyticsServiceStub {
  readonly consent = { canCollect: signal(false) };
  readonly track = vi.fn(() => true);
}

describe('AnalyticsViewDirective', () => {
  let analytics: AnalyticsServiceStub;

  beforeEach(() => {
    vi.stubGlobal('IntersectionObserver', class {
      constructor(private readonly callback: IntersectionObserverCallback) {}
      observe(): void {
        this.callback([{ isIntersecting: true } as IntersectionObserverEntry], this as unknown as IntersectionObserver);
      }
      readonly disconnect = vi.fn();
      readonly unobserve = vi.fn();
      takeRecords(): IntersectionObserverEntry[] { return []; }
      readonly root = null;
      readonly rootMargin = '0px';
      readonly thresholds = [0.25];
    });
    TestBed.configureTestingModule({
      imports: [AnalyticsViewHost],
      providers: [{ provide: AnalyticsService, useClass: AnalyticsServiceStub }],
    });
    analytics = TestBed.inject(AnalyticsService) as unknown as AnalyticsServiceStub;
  });

  afterEach(() => vi.unstubAllGlobals());

  it('records a visible form once, only after analytics is allowed', () => {
    const fixture = TestBed.createComponent(AnalyticsViewHost);
    fixture.detectChanges();
    TestBed.flushEffects();
    expect(analytics.track).not.toHaveBeenCalled();

    analytics.consent.canCollect.set(true);
    TestBed.flushEffects();
    fixture.detectChanges();
    TestBed.flushEffects();
    expect(analytics.track).toHaveBeenCalledOnce();
    expect(analytics.track).toHaveBeenCalledWith('waitlist_form_view', 'hero');
  });
});
