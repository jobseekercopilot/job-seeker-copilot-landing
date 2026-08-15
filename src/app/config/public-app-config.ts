import { InjectionToken } from '@angular/core';

export type PublicEnvironmentName = 'development' | 'test' | 'production';

export interface PublicAppConfig {
  environmentName: PublicEnvironmentName;
  enableLiveSubmissions: boolean;
  publicBetaEnabled: boolean;
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
  legalDocumentsReviewed: boolean;
  minimumUserAge: number;
  legalEffectiveDate: string;
  legalVersion: string;
  legalEntityType: 'NOT_CONFIGURED' | 'SOLE_TRADER' | 'LIMITED_COMPANY';
  taxStatus: 'NOT_CONFIGURED' | 'NOT_VAT_REGISTERED' | 'VAT_REGISTERED';
  legalEntityName: string;
  tradingName: string;
  businessAddress: string;
  privacyEmail: string;
  supportEmail: string;
  icoRegistrationStatus: string;
  icoRegistrationReference: string;
  accountDeletionCompletionDays: number;
  documentDeletionCompletionDays: number;
  securityLogRetentionDays: number;
  supportRecordRetentionDays: number;
  financialRecordRetentionYears: number;
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

export const DEFAULT_PUBLIC_APP_CONFIG: PublicAppConfig = {
  environmentName: 'development',
  enableLiveSubmissions: false,
  publicBetaEnabled: false,
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
  legalDocumentsReviewed: false,
  minimumUserAge: 18,
  legalEffectiveDate: '',
  legalVersion: '',
  legalEntityType: 'NOT_CONFIGURED',
  taxStatus: 'NOT_CONFIGURED',
  legalEntityName: '',
  tradingName: '',
  businessAddress: '',
  privacyEmail: '',
  supportEmail: '',
  icoRegistrationStatus: '',
  icoRegistrationReference: '',
  accountDeletionCompletionDays: 0,
  documentDeletionCompletionDays: 0,
  securityLogRetentionDays: 0,
  supportRecordRetentionDays: 0,
  financialRecordRetentionYears: 0,
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
  const mainApplicationUrl = asString(value['mainApplicationUrl'], DEFAULT_PUBLIC_APP_CONFIG.mainApplicationUrl);
  const registrationUrl = asString(value['registrationUrl'], DEFAULT_PUBLIC_APP_CONFIG.registrationUrl);
  const signInUrl = asString(value['signInUrl'], DEFAULT_PUBLIC_APP_CONFIG.signInUrl);
  const pricingUrl = asString(value['pricingUrl'], DEFAULT_PUBLIC_APP_CONFIG.pricingUrl);
  const legalEffectiveDate = asString(value['legalEffectiveDate'], DEFAULT_PUBLIC_APP_CONFIG.legalEffectiveDate);
  const legalVersion = asString(value['legalVersion'], DEFAULT_PUBLIC_APP_CONFIG.legalVersion);
  const legalEntityType = asLegalEntityType(value['legalEntityType']);
  const taxStatus = asTaxStatus(value['taxStatus']);
  const legalEntityName = asString(value['legalEntityName'], DEFAULT_PUBLIC_APP_CONFIG.legalEntityName);
  const tradingName = asString(value['tradingName'], DEFAULT_PUBLIC_APP_CONFIG.tradingName);
  const businessAddress = asString(value['businessAddress'], DEFAULT_PUBLIC_APP_CONFIG.businessAddress);
  const privacyEmail = asString(value['privacyEmail'], DEFAULT_PUBLIC_APP_CONFIG.privacyEmail);
  const supportEmail = asString(value['supportEmail'], DEFAULT_PUBLIC_APP_CONFIG.supportEmail);
  const icoRegistrationStatus = asString(value['icoRegistrationStatus'], DEFAULT_PUBLIC_APP_CONFIG.icoRegistrationStatus);
  const icoRegistrationReference = asString(value['icoRegistrationReference'], DEFAULT_PUBLIC_APP_CONFIG.icoRegistrationReference);
  const accountDeletionCompletionDays = asPositiveNumber(value['accountDeletionCompletionDays'], 0);
  const documentDeletionCompletionDays = asPositiveNumber(value['documentDeletionCompletionDays'], 0);
  const securityLogRetentionDays = asPositiveNumber(value['securityLogRetentionDays'], 0);
  const supportRecordRetentionDays = asPositiveNumber(value['supportRecordRetentionDays'], 0);
  const financialRecordRetentionYears = asPositiveNumber(value['financialRecordRetentionYears'], 0);
  const legalDocumentsReviewed = value['legalDocumentsReviewed'] === true;
  loadedConfig = {
    environmentName: isEnvironmentName(environmentName)
      ? environmentName
      : DEFAULT_PUBLIC_APP_CONFIG.environmentName,
    enableLiveSubmissions: value['enableLiveSubmissions'] === true,
    publicBetaEnabled: value['publicBetaEnabled'] === true
      && value['minimumUserAge'] === 18
      && isSafePublicBetaConfiguration(
        environmentName,
        publicWebsiteUrl,
        mainApplicationUrl,
        registrationUrl,
        signInUrl,
        pricingUrl,
        legalDocumentsReviewed,
        legalEffectiveDate,
        legalVersion,
        legalEntityType,
        taxStatus,
        legalEntityName,
        tradingName,
        businessAddress,
        privacyEmail,
        supportEmail,
        icoRegistrationStatus,
        icoRegistrationReference,
        accountDeletionCompletionDays,
        documentDeletionCompletionDays,
        securityLogRetentionDays,
        supportRecordRetentionDays,
        financialRecordRetentionYears,
      ),
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
    mainApplicationUrl,
    registrationUrl,
    signInUrl,
    pricingUrl,
    legalDocumentsReviewed,
    minimumUserAge: 18,
    legalEffectiveDate,
    legalVersion,
    legalEntityType,
    taxStatus,
    legalEntityName,
    tradingName,
    businessAddress,
    privacyEmail,
    supportEmail,
    icoRegistrationStatus,
    icoRegistrationReference,
    accountDeletionCompletionDays,
    documentDeletionCompletionDays,
    securityLogRetentionDays,
    supportRecordRetentionDays,
    financialRecordRetentionYears,
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

function asLegalEntityType(value: unknown): PublicAppConfig['legalEntityType'] {
  return value === 'SOLE_TRADER' || value === 'LIMITED_COMPANY'
    ? value
    : 'NOT_CONFIGURED';
}

function asTaxStatus(value: unknown): PublicAppConfig['taxStatus'] {
  return value === 'NOT_VAT_REGISTERED' || value === 'VAT_REGISTERED'
    ? value
    : 'NOT_CONFIGURED';
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

function isSafePublicBetaConfiguration(
  environmentName: unknown,
  publicWebsiteUrl: string,
  mainApplicationUrl: string,
  registrationUrl: string,
  signInUrl: string,
  pricingUrl: string,
  legalDocumentsReviewed: boolean,
  legalEffectiveDate: string,
  legalVersion: string,
  legalEntityType: PublicAppConfig['legalEntityType'],
  taxStatus: PublicAppConfig['taxStatus'],
  legalEntityName: string,
  tradingName: string,
  businessAddress: string,
  privacyEmail: string,
  supportEmail: string,
  icoRegistrationStatus: string,
  icoRegistrationReference: string,
  accountDeletionCompletionDays: number,
  documentDeletionCompletionDays: number,
  securityLogRetentionDays: number,
  supportRecordRetentionDays: number,
  financialRecordRetentionYears: number,
): boolean {
  if (environmentName !== 'production'
    || publicWebsiteUrl !== 'https://www.jobseekercopilot.com') return false;
  try {
    const app = new URL(mainApplicationUrl);
    const registration = new URL(registrationUrl);
    const signIn = new URL(signInUrl);
    const pricing = new URL(pricingUrl);
    return app.protocol === 'https:'
      && !app.search && !app.hash
      && registration.origin === app.origin
      && registration.pathname === '/register'
      && !registration.search && !registration.hash
      && signIn.origin === app.origin
      && signIn.pathname === '/sign-in'
      && !signIn.search && !signIn.hash
      && pricing.origin === app.origin
      && pricing.pathname === '/payment'
      && !pricing.search && !pricing.hash
      && legalDocumentsReviewed
      && isIsoCalendarDate(legalEffectiveDate)
      && /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/.test(legalVersion)
      && ['SOLE_TRADER', 'LIMITED_COMPANY'].includes(legalEntityType)
      && ['NOT_VAT_REGISTERED', 'VAT_REGISTERED'].includes(taxStatus)
      && isReviewedIdentityValue(legalEntityName, 2)
      && isReviewedIdentityValue(tradingName, 2)
      && isReviewedIdentityValue(businessAddress, 8)
      && isPublicContactEmail(privacyEmail)
      && isPublicContactEmail(supportEmail)
      && (icoRegistrationStatus === 'NOT_REQUIRED_CONFIRMED'
        || (icoRegistrationStatus === 'REGISTERED'
          && /^[A-Za-z0-9-]{4,40}$/.test(icoRegistrationReference)))
      && [accountDeletionCompletionDays, documentDeletionCompletionDays,
        securityLogRetentionDays, supportRecordRetentionDays,
        financialRecordRetentionYears]
        .every(value => Number.isInteger(value) && value > 0);
  } catch {
    return false;
  }
}

function isPublicContactEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

const RELEASE_PLACEHOLDER_PATTERNS = [
  /\b(?:todo|tbd|tbc|placeholder|pending)\b/i,
  /\breplace(?:\s+me)?\b/i,
  /\bnot(?:\s+yet)?\s+configured\b/i,
  /\bexample\s+(?:legal\s+entity|business\s+address|address|trading\s+name)\b/i,
  /\b(?:release[- ]provided|release[- ]configured|supplied\s+at\s+release)\b/i,
  /\byour\s+(?:name|address|business)\b/i,
  /\bcoming\s+soon\b/i,
];

export function isIsoCalendarDate(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year
    && date.getUTCMonth() === month - 1
    && date.getUTCDate() === day;
}

export function isReviewedIdentityValue(value: string, minimumLength: number): boolean {
  const normalized = value.trim();
  return normalized.length >= minimumLength
    && !RELEASE_PLACEHOLDER_PATTERNS.some(pattern => pattern.test(normalized));
}
