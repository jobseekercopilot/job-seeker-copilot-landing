import { InjectionToken } from '@angular/core';

export interface EarlyAccessOfferConfig {
  bonusTokens: number;
  offerEnabled: boolean;
  offerLabel: string;
  offerSummary: string;
  eligibilitySummary: string;
  termsRoute: string;
}

const bonusTokens = 20_000;

export function formatOfferTokenAmount(value: number): string {
  return new Intl.NumberFormat('en-GB', { maximumFractionDigits: 0 }).format(value);
}

export const DEFAULT_EARLY_ACCESS_OFFER_CONFIG: Readonly<EarlyAccessOfferConfig> = {
  bonusTokens,
  offerEnabled: true,
  offerLabel: 'Priority early access',
  offerSummary: `Join the waitlist for priority early access and receive ${formatOfferTokenAmount(bonusTokens)} bonus tokens when your eligible account is created.`,
  eligibilitySummary: 'Early supporters may be invited before the wider public launch. Joining the waitlist does not create an account or guarantee selection or a particular invitation date.',
  termsRoute: '/terms',
};

export const EARLY_ACCESS_OFFER_CONFIG = new InjectionToken<EarlyAccessOfferConfig>('EARLY_ACCESS_OFFER_CONFIG', {
  providedIn: 'root',
  factory: () => DEFAULT_EARLY_ACCESS_OFFER_CONFIG,
});
