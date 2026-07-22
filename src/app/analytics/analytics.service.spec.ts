import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { DEFAULT_PUBLIC_APP_CONFIG, PUBLIC_APP_CONFIG } from '../config/public-app-config';
import { AnalyticsEventPayload } from './analytics-event';
import { AnalyticsService } from './analytics.service';

const ENDPOINT = 'https://1la3mp57zg.execute-api.eu-west-2.amazonaws.com/analytics';
const ENABLED_CONFIG = {
  ...DEFAULT_PUBLIC_APP_CONFIG,
  environmentName: 'production' as const,
  analyticsEnabled: true,
  analyticsEndpointUrl: ENDPOINT,
  publicWebsiteUrl: 'https://www.jobseekercopilot.com',
};

class MemoryStorage implements Storage {
  private readonly values = new Map<string, string>();
  get length(): number { return this.values.size; }
  clear(): void { this.values.clear(); }
  getItem(key: string): string | null { return this.values.get(key) ?? null; }
  key(index: number): string | null { return [...this.values.keys()][index] ?? null; }
  removeItem(key: string): void { this.values.delete(key); }
  setItem(key: string, value: string): void { this.values.set(key, value); }
}

describe('AnalyticsService', () => {
  let http: HttpTestingController;

  beforeEach(() => {
    Object.defineProperty(window, 'localStorage', { configurable: true, value: new MemoryStorage() });
    Object.defineProperty(window, 'sessionStorage', { configurable: true, value: new MemoryStorage() });
    window.history.replaceState({}, '', '/');
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: PUBLIC_APP_CONFIG, useValue: ENABLED_CONFIG },
      ],
    });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http?.verify();
    window.history.replaceState({}, '', '/');
  });

  it('makes no request before consent or after refusal and clears attribution', () => {
    window.sessionStorage.setItem('job-seeker-copilot:analytics-campaign', '{"source":"google"}');
    window.sessionStorage.setItem('job-seeker-copilot:analytics-traffic-class', 'smoke');
    const service = TestBed.inject(AnalyticsService);
    expect(service.track('waitlist_attempt', 'hero')).toBe(false);
    http.expectNone(ENDPOINT);

    service.consent.refuse();
    TestBed.flushEffects();
    expect(window.sessionStorage.getItem('job-seeker-copilot:analytics-campaign')).toBeNull();
    expect(window.sessionStorage.getItem('job-seeker-copilot:analytics-traffic-class')).toBeNull();
    http.expectNone(ENDPOINT);
  });

  it('sends one visit, a page view and a bounded campaign only after acceptance', () => {
    window.history.replaceState({}, '', '/?utm_source=linkedin&utm_medium=social&utm_campaign=beta_launch' +
      '&utm_content=founder_post&analytics_test=smoke&private=discarded');
    TestBed.inject(Router).navigated = true;
    const service = TestBed.inject(AnalyticsService);
    service.consent.accept();
    TestBed.flushEffects();

    const requests = http.match(ENDPOINT);
    expect(requests.map(request => request.request.body.eventName).sort()).toEqual(['page_view', 'visit']);
    for (const request of requests) {
      const body = request.request.body as AnalyticsEventPayload;
      expect(body).toMatchObject({
        path: '/',
        trafficClass: 'smoke',
        acquisition: 'social',
        campaign: {
          source: 'linkedin', medium: 'social', campaign: 'beta_launch', content: 'founder_post',
        },
      });
      expect(JSON.stringify(body)).not.toContain('private');
      expect(JSON.stringify(body)).not.toContain('referrer');
      request.flush({ success: true });
    }

    service.consent.openPreferences();
    service.consent.accept();
    TestBed.flushEffects();
    http.expectNone(ENDPOINT);
  });

  it('does not emit events for confirmation-token or unapproved routes', () => {
    const router = TestBed.inject(Router);
    router.navigated = true;
    vi.spyOn(router, 'url', 'get').mockReturnValue('/waitlist/confirm?token=private-token');
    const service = TestBed.inject(AnalyticsService);
    service.consent.accept();
    TestBed.flushEffects();
    expect(service.track('waitlist_attempt', 'hero')).toBe(false);
    http.expectNone(ENDPOINT);
  });

  it('swallows collector failures so interactions and later attempts continue', () => {
    TestBed.inject(Router).navigated = true;
    const service = TestBed.inject(AnalyticsService);
    service.consent.accept();
    TestBed.flushEffects();
    for (const automatic of http.match(ENDPOINT)) automatic.flush({ success: true });

    expect(service.track('waitlist_attempt', 'hero')).toBe(true);
    http.expectOne(ENDPOINT).flush({ success: false }, { status: 503, statusText: 'Unavailable' });
    expect(service.track('waitlist_attempt', 'footer')).toBe(true);
    http.expectOne(ENDPOINT).flush({ success: true });
  });
});
