import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Injectable, PLATFORM_ID, effect, inject } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { EMPTY, catchError, filter } from 'rxjs';
import { PUBLIC_APP_CONFIG } from '../config/public-app-config';
import { AnalyticsConsentService } from './analytics-consent.service';
import {
  AnalyticsAcquisition,
  AnalyticsContext,
  AnalyticsEventName,
  AnalyticsEventPayload,
  AnalyticsTrafficClass,
  SafeCampaign,
  analyticsAcquisition,
  analyticsTrafficClass,
  analyticsViewport,
  approvedAnalyticsPath,
  isSafeCampaign,
  safeCampaignFromUrl,
} from './analytics-event';

const CAMPAIGN_STORAGE_KEY = 'job-seeker-copilot:analytics-campaign';
const TRAFFIC_STORAGE_KEY = 'job-seeker-copilot:analytics-traffic-class';
const ACQUISITION_STORAGE_KEY = 'job-seeker-copilot:analytics-acquisition';
const VISIT_STORAGE_KEY = 'job-seeker-copilot:analytics-visit-recorded';

@Injectable({ providedIn: 'root' })
export class AnalyticsService {
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly config = inject(PUBLIC_APP_CONFIG);
  private readonly document = inject(DOCUMENT);
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  readonly consent = inject(AnalyticsConsentService);
  private lastPagePath = '';
  private visitSent = false;

  constructor() {
    this.router.events.pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe(event => {
        this.trackVisit(event.urlAfterRedirects);
        this.trackPageView(event.urlAfterRedirects);
      });
    effect(() => {
      if (this.consent.canCollect()) {
        this.captureAttribution(this.document.location.href);
        if (this.router.navigated) {
          this.trackVisit(this.router.url);
          this.trackPageView(this.router.url);
        }
      } else if (this.consent.choice() === 'refused') {
        this.clearAttribution();
      }
    });
  }

  track(eventName: Exclude<AnalyticsEventName, 'visit' | 'page_view'>, context?: AnalyticsContext): boolean {
    const path = approvedAnalyticsPath(this.router.url);
    if (!path) return false;
    return this.send({ eventName, path, context });
  }

  private trackPageView(url: string): void {
    const path = approvedAnalyticsPath(url);
    if (!path || path === this.lastPagePath) return;
    if (this.send({ eventName: 'page_view', path })) this.lastPagePath = path;
  }

  private trackVisit(url: string): void {
    const path = approvedAnalyticsPath(url);
    if (!path || this.visitAlreadyRecorded()) return;
    if (this.send({ eventName: 'visit', path })) {
      this.visitSent = true;
      try {
        window.sessionStorage.setItem(VISIT_STORAGE_KEY, 'true');
      } catch {
        // The in-memory marker still prevents duplicate visit counts.
      }
    }
  }

  private send(base: Pick<AnalyticsEventPayload, 'eventName' | 'path' | 'context'>): boolean {
    if (!this.browser || !this.consent.canCollect() || !this.config.analyticsEndpointUrl) return false;
    const campaign = this.campaign();
    const payload: AnalyticsEventPayload = {
      ...base,
      viewport: analyticsViewport(window.innerWidth),
      trafficClass: this.trafficClass(),
      acquisition: this.acquisition(),
      ...(campaign ? { campaign } : {}),
    };
    this.http.post(this.config.analyticsEndpointUrl, payload).pipe(catchError(() => EMPTY)).subscribe();
    return true;
  }

  private captureAttribution(url: string): void {
    if (!this.browser) return;
    const campaign = safeCampaignFromUrl(url);
    const trafficClass = analyticsTrafficClass(url);
    const acquisition = analyticsAcquisition(url, this.document.referrer);
    try {
      if (campaign) window.sessionStorage.setItem(CAMPAIGN_STORAGE_KEY, JSON.stringify(campaign));
      window.sessionStorage.setItem(TRAFFIC_STORAGE_KEY, trafficClass);
      window.sessionStorage.setItem(ACQUISITION_STORAGE_KEY, acquisition);
    } catch {
      // The event still works without cross-navigation attribution storage.
    }
  }

  private campaign(): SafeCampaign | null {
    if (!this.browser) return null;
    try {
      const parsed: unknown = JSON.parse(window.sessionStorage.getItem(CAMPAIGN_STORAGE_KEY) ?? 'null');
      return isSafeCampaign(parsed) ? parsed : null;
    } catch {
      return null;
    }
  }

  private trafficClass(): AnalyticsTrafficClass {
    if (!this.browser) return 'production';
    try {
      return window.sessionStorage.getItem(TRAFFIC_STORAGE_KEY) === 'smoke' ? 'smoke' : 'production';
    } catch {
      return 'production';
    }
  }

  private acquisition(): AnalyticsAcquisition {
    if (!this.browser) return 'direct';
    try {
      const value = window.sessionStorage.getItem(ACQUISITION_STORAGE_KEY);
      return value === 'search' || value === 'social' || value === 'email' || value === 'partner' || value === 'other'
        ? value
        : 'direct';
    } catch {
      return 'direct';
    }
  }

  private visitAlreadyRecorded(): boolean {
    if (this.visitSent || !this.browser) return this.visitSent;
    try {
      this.visitSent = window.sessionStorage.getItem(VISIT_STORAGE_KEY) === 'true';
    } catch {
      // Fall through to the in-memory marker.
    }
    return this.visitSent;
  }

  private clearAttribution(): void {
    if (!this.browser) return;
    try {
      window.sessionStorage.removeItem(CAMPAIGN_STORAGE_KEY);
      window.sessionStorage.removeItem(TRAFFIC_STORAGE_KEY);
      window.sessionStorage.removeItem(ACQUISITION_STORAGE_KEY);
    } catch {
      // Refusal still prevents collection when browser storage is unavailable.
    }
  }
}
