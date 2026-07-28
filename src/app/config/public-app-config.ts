import { InjectionToken } from '@angular/core';

export type PublicEnvironmentName = 'development' | 'test' | 'production';

export interface PublicAppConfig {
  environmentName: PublicEnvironmentName;
  enableLiveSubmissions: boolean;
  searchIndexingEnabled: boolean;
  analyticsEnabled: boolean;
  analyticsEndpointUrl: string;
  waitlistApiUrl: string;
  waitlistConfirmationApiUrl: string;
  waitlistResendApiUrl: string;
  waitlistUnsubscribeApiUrl: string;
  contactApiUrl: string;
  mainApplicationUrl: string;
  registrationUrl: string;
  signInUrl: string;
  pricingUrl: string;
  publicWebsiteUrl: string;
  privacyPolicyUrl: string;
  termsUrl: string;
  supportUrl: string;
  antiBotProvider: string;
  antiBotSiteKey: string;
  consentVersion: string;
  minimumFormCompletionMs: number;
  contactMessageMaxLength: number;
  copyrightNotice: string;
}

const PRODUCTION_APPLICATION_ORIGIN = 'https://app.jobseekercopilot.com';

export const DEFAULT_PUBLIC_APP_CONFIG: PublicAppConfig = {
  environmentName: 'development',
  enableLiveSubmissions: false,
  searchIndexingEnabled: false,
  analyticsEnabled: false,
  analyticsEndpointUrl: '',
  waitlistApiUrl: '',
  waitlistConfirmationApiUrl: '',
  waitlistResendApiUrl: '',
  waitlistUnsubscribeApiUrl: '',
  contactApiUrl: '',
  mainApplicationUrl: '',
  registrationUrl: '',
  signInUrl: '',
  pricingUrl: '',
  publicWebsiteUrl: '',
  privacyPolicyUrl: '/privacy',
  termsUrl: '/terms',
  supportUrl: '/contact',
  antiBotProvider: 'none',
  antiBotSiteKey: '',
  consentVersion: '2026-07-22',
  minimumFormCompletionMs: 1200,
  contactMessageMaxLength: 3000,
  copyrightNotice: 'Job Seeker Copilot',
};

let loadedConfig: PublicAppConfig = DEFAULT_PUBLIC_APP_CONFIG;

export function setPublicAppConfig(value: unknown): void {
  if (!isRecord(value)) {
    loadedConfig = DEFAULT_PUBLIC_APP_CONFIG;
    return;
  }

  const environmentName = value['environmentName'];
  const publicWebsiteUrl = asString(value['publicWebsiteUrl'], DEFAULT_PUBLIC_APP_CONFIG.publicWebsiteUrl);
  const analyticsEndpointUrl = asString(value['analyticsEndpointUrl'], DEFAULT_PUBLIC_APP_CONFIG.analyticsEndpointUrl);
  const waitlistApiUrl = asString(value['waitlistApiUrl'], DEFAULT_PUBLIC_APP_CONFIG.waitlistApiUrl);
  const resolvedEnvironmentName = isEnvironmentName(environmentName)
    ? environmentName
    : DEFAULT_PUBLIC_APP_CONFIG.environmentName;
  loadedConfig = {
    environmentName: resolvedEnvironmentName,
    enableLiveSubmissions: value['enableLiveSubmissions'] === true,
    searchIndexingEnabled: value['searchIndexingEnabled'] === true &&
      environmentName === 'production' && publicWebsiteUrl === 'https://www.jobseekercopilot.com',
    analyticsEnabled: value['analyticsEnabled'] === true &&
      environmentName === 'production' && publicWebsiteUrl === 'https://www.jobseekercopilot.com' &&
      isQueryFreeHttpsAnalyticsEndpoint(analyticsEndpointUrl, waitlistApiUrl),
    analyticsEndpointUrl,
    waitlistApiUrl,
    waitlistConfirmationApiUrl: asString(value['waitlistConfirmationApiUrl'], DEFAULT_PUBLIC_APP_CONFIG.waitlistConfirmationApiUrl),
    waitlistResendApiUrl: asString(value['waitlistResendApiUrl'], DEFAULT_PUBLIC_APP_CONFIG.waitlistResendApiUrl),
    waitlistUnsubscribeApiUrl: asString(value['waitlistUnsubscribeApiUrl'], DEFAULT_PUBLIC_APP_CONFIG.waitlistUnsubscribeApiUrl),
    contactApiUrl: asString(value['contactApiUrl'], DEFAULT_PUBLIC_APP_CONFIG.contactApiUrl),
    mainApplicationUrl: asApplicationUrl(value['mainApplicationUrl'], resolvedEnvironmentName),
    registrationUrl: asApplicationUrl(value['registrationUrl'], resolvedEnvironmentName, '/register'),
    signInUrl: asApplicationUrl(value['signInUrl'], resolvedEnvironmentName, '/sign-in'),
    pricingUrl: asString(value['pricingUrl'], DEFAULT_PUBLIC_APP_CONFIG.pricingUrl),
    publicWebsiteUrl,
    privacyPolicyUrl: asString(value['privacyPolicyUrl'], DEFAULT_PUBLIC_APP_CONFIG.privacyPolicyUrl),
    termsUrl: asString(value['termsUrl'], DEFAULT_PUBLIC_APP_CONFIG.termsUrl),
    supportUrl: asString(value['supportUrl'], DEFAULT_PUBLIC_APP_CONFIG.supportUrl),
    antiBotProvider: asString(value['antiBotProvider'], DEFAULT_PUBLIC_APP_CONFIG.antiBotProvider),
    antiBotSiteKey: asString(value['antiBotSiteKey'], DEFAULT_PUBLIC_APP_CONFIG.antiBotSiteKey),
    consentVersion: asString(value['consentVersion'], DEFAULT_PUBLIC_APP_CONFIG.consentVersion),
    minimumFormCompletionMs: asNonNegativeNumber(
      value['minimumFormCompletionMs'],
      DEFAULT_PUBLIC_APP_CONFIG.minimumFormCompletionMs,
    ),
    contactMessageMaxLength: asPositiveNumber(
      value['contactMessageMaxLength'],
      DEFAULT_PUBLIC_APP_CONFIG.contactMessageMaxLength,
    ),
    copyrightNotice: asString(value['copyrightNotice'], DEFAULT_PUBLIC_APP_CONFIG.copyrightNotice),
  };
}

export const PUBLIC_APP_CONFIG = new InjectionToken<PublicAppConfig>('PUBLIC_APP_CONFIG', {
  providedIn: 'root',
  factory: () => loadedConfig,
});

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isEnvironmentName(value: unknown): value is PublicEnvironmentName {
  return value === 'development' || value === 'test' || value === 'production';
}

function asNonNegativeNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : fallback;
}

function asPositiveNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isInteger(value) && value > 0 ? value : fallback;
}

function asString(value: unknown, fallback: string): string {
  return typeof value === 'string' ? value.trim() : fallback;
}

function asApplicationUrl(
  value: unknown,
  environmentName: PublicEnvironmentName,
  requiredPath?: string,
): string {
  const candidate = asString(value, '');
  if (!candidate) return '';

  try {
    const url = new URL(candidate);
    const isLocalDevelopmentUrl = environmentName !== 'production' &&
      (url.hostname === 'localhost' || url.hostname === '127.0.0.1') &&
      (url.protocol === 'http:' || url.protocol === 'https:');
    const isApprovedHostedUrl = url.protocol === 'https:' &&
      url.origin === PRODUCTION_APPLICATION_ORIGIN;
    const hasSafeShape = !url.username && !url.password && !url.search && !url.hash;
    const hasExpectedPath = requiredPath ? url.pathname === requiredPath : url.pathname === '/';

    return (isLocalDevelopmentUrl || isApprovedHostedUrl) && hasSafeShape && hasExpectedPath
      ? url.toString()
      : '';
  } catch {
    return '';
  }
}

function isQueryFreeHttpsAnalyticsEndpoint(value: string, waitlistApiUrl: string): boolean {
  try {
    const endpoint = new URL(value);
    const waitlistEndpoint = new URL(waitlistApiUrl);
    return endpoint.protocol === 'https:' && endpoint.pathname.endsWith('/analytics') &&
      !endpoint.search && !endpoint.hash && endpoint.origin === waitlistEndpoint.origin;
  } catch {
    return false;
  }
}
