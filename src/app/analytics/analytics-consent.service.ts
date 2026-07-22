import { isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { PUBLIC_APP_CONFIG } from '../config/public-app-config';

export type AnalyticsChoice = 'unset' | 'accepted' | 'refused';

@Injectable({ providedIn: 'root' })
export class AnalyticsConsentService {
  private readonly config = inject(PUBLIC_APP_CONFIG);
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly manuallyOpen = signal(false);
  readonly choice = signal<AnalyticsChoice>(this.readChoice());
  readonly canCollect = computed(() => this.config.analyticsEnabled && this.choice() === 'accepted');
  readonly shouldShow = computed(() => this.config.analyticsEnabled &&
    (this.choice() === 'unset' || this.manuallyOpen()));

  accept(): void {
    this.setChoice('accepted');
  }

  refuse(): void {
    this.setChoice('refused');
  }

  openPreferences(): void {
    if (this.config.analyticsEnabled) this.manuallyOpen.set(true);
  }

  closePreferences(): void {
    if (this.choice() !== 'unset') this.manuallyOpen.set(false);
  }

  private setChoice(choice: Exclude<AnalyticsChoice, 'unset'>): void {
    this.choice.set(choice);
    this.manuallyOpen.set(false);
    if (!this.browser) return;
    try {
      window.localStorage.setItem(this.storageKey(), choice);
    } catch {
      // The in-memory choice still applies when browser storage is unavailable.
    }
  }

  private readChoice(): AnalyticsChoice {
    if (!this.config.analyticsEnabled || !this.browser) return 'unset';
    try {
      const stored = window.localStorage.getItem(this.storageKey());
      return stored === 'accepted' || stored === 'refused' ? stored : 'unset';
    } catch {
      return 'unset';
    }
  }

  private storageKey(): string {
    return `job-seeker-copilot:analytics-choice:${this.config.consentVersion}`;
  }
}
