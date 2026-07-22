import { TestBed } from '@angular/core/testing';
import { DEFAULT_PUBLIC_APP_CONFIG, PUBLIC_APP_CONFIG } from '../config/public-app-config';
import { AnalyticsConsentService } from './analytics-consent.service';

const ENABLED_CONFIG = {
  ...DEFAULT_PUBLIC_APP_CONFIG,
  environmentName: 'production' as const,
  analyticsEnabled: true,
  analyticsEndpointUrl: 'https://1la3mp57zg.execute-api.eu-west-2.amazonaws.com/analytics',
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

describe('AnalyticsConsentService', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'localStorage', { configurable: true, value: new MemoryStorage() });
  });

  it('defaults to no collection and offers equally direct accept and refuse choices', () => {
    TestBed.configureTestingModule({
      providers: [{ provide: PUBLIC_APP_CONFIG, useValue: ENABLED_CONFIG }],
    });
    const consent = TestBed.inject(AnalyticsConsentService);
    expect(consent.choice()).toBe('unset');
    expect(consent.canCollect()).toBe(false);
    expect(consent.shouldShow()).toBe(true);

    consent.refuse();
    expect(consent.choice()).toBe('refused');
    expect(consent.canCollect()).toBe(false);
    expect(window.localStorage.getItem('job-seeker-copilot:analytics-choice:2026-07-22')).toBe('refused');

    consent.openPreferences();
    expect(consent.shouldShow()).toBe(true);
    consent.accept();
    expect(consent.choice()).toBe('accepted');
    expect(consent.canCollect()).toBe(true);
  });

  it('stays unavailable when analytics is disabled regardless of stored values', () => {
    window.localStorage.setItem('job-seeker-copilot:analytics-choice:2026-07-22', 'accepted');
    TestBed.configureTestingModule({
      providers: [{ provide: PUBLIC_APP_CONFIG, useValue: DEFAULT_PUBLIC_APP_CONFIG }],
    });
    const consent = TestBed.inject(AnalyticsConsentService);
    expect(consent.choice()).toBe('unset');
    expect(consent.canCollect()).toBe(false);
    expect(consent.shouldShow()).toBe(false);
  });
});
