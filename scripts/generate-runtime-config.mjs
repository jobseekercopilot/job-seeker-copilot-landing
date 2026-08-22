import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { resolveAnalyticsEnabled } from './analytics-policy.mjs';
import {
  validatePublicBetaConfig,
  validateAnalyticsConfig,
  validateLiveSubmissionConfig,
  validateSearchIndexingConfig,
} from './runtime-config-validation.mjs';
import { resolveSearchIndexingEnabled } from './search-indexing-policy.mjs';

const outputPath = resolve(process.env.RUNTIME_CONFIG_OUTPUT_PATH || 'public/config/app-config.json');

const config = {
  environmentName: oneOf(process.env.PUBLIC_ENVIRONMENT_NAME, ['development', 'test', 'production'], 'production'),
  enableLiveSubmissions: process.env.ENABLE_LIVE_SUBMISSIONS === 'true',
  publicBetaEnabled: process.env.PUBLIC_BETA_ENABLED === 'true',
  searchIndexingEnabled: resolveSearchIndexingEnabled(),
  analyticsEnabled: resolveAnalyticsEnabled(),
  analyticsEndpointUrl: text('ANALYTICS_ENDPOINT_URL'),
  waitlistApiUrl: text('WAITLIST_API_URL'),
  waitlistConfirmationApiUrl: text('WAITLIST_CONFIRMATION_API_URL'),
  waitlistResendApiUrl: text('WAITLIST_RESEND_API_URL'),
  waitlistUnsubscribeApiUrl: text('WAITLIST_UNSUBSCRIBE_API_URL'),
  contactApiUrl: text('CONTACT_API_URL'),
  mainApplicationUrl: text('MAIN_APPLICATION_URL'),
  registrationUrl: text('REGISTRATION_URL'),
  signInUrl: text('SIGN_IN_URL'),
  pricingUrl: text('PRICING_URL'),
  legalDocumentsReviewed: process.env.LEGAL_DOCUMENTS_REVIEWED === 'true',
  minimumUserAge: 18,
  legalEffectiveDate: text('LEGAL_EFFECTIVE_DATE'),
  legalVersion: text('LEGAL_VERSION'),
  legalEntityType: oneOf(
    process.env.LEGAL_ENTITY_TYPE,
    ['NOT_CONFIGURED', 'SOLE_TRADER', 'LIMITED_COMPANY'],
    'NOT_CONFIGURED',
  ),
  taxStatus: oneOf(
    process.env.TAX_STATUS,
    ['NOT_CONFIGURED', 'NOT_VAT_REGISTERED', 'VAT_REGISTERED'],
    'NOT_CONFIGURED',
  ),
  legalEntityName: text('LEGAL_ENTITY_NAME'),
  tradingName: text('TRADING_NAME'),
  businessAddress: text('BUSINESS_ADDRESS'),
  privacyEmail: text('PRIVACY_EMAIL'),
  supportEmail: text('SUPPORT_EMAIL'),
  icoRegistrationStatus: text('ICO_REGISTRATION_STATUS'),
  icoRegistrationReference: text('ICO_REGISTRATION_REFERENCE'),
  accountDeletionCompletionDays: positiveInteger('ACCOUNT_DELETION_COMPLETION_DAYS', 0),
  documentDeletionCompletionDays: positiveInteger('DOCUMENT_DELETION_COMPLETION_DAYS', 0),
  securityLogRetentionDays: positiveInteger('SECURITY_LOG_RETENTION_DAYS', 0),
  supportRecordRetentionDays: positiveInteger('SUPPORT_RECORD_RETENTION_DAYS', 0),
  financialRecordRetentionYears: positiveInteger('FINANCIAL_RECORD_RETENTION_YEARS', 0),
  publicWebsiteUrl: text('PUBLIC_WEBSITE_URL'),
  privacyPolicyUrl: text('PRIVACY_POLICY_URL', '/privacy'),
  termsUrl: text('TERMS_URL', '/terms'),
  supportUrl: text('SUPPORT_URL', '/contact'),
  antiBotProvider: text('ANTI_BOT_PROVIDER', 'none'),
  antiBotSiteKey: text('ANTI_BOT_SITE_KEY'),
  consentVersion: text('CONSENT_VERSION', new Date().toISOString().slice(0, 10)),
  minimumFormCompletionMs: integer('MINIMUM_FORM_COMPLETION_MS', 1200),
  contactMessageMaxLength: positiveInteger('CONTACT_MESSAGE_MAX_LENGTH', 3000),
  copyrightNotice: text('COPYRIGHT_NOTICE', 'Job Seeker Copilot'),
};

validateLiveSubmissionConfig(config);
validatePublicBetaConfig(config);
validateSearchIndexingConfig(config);
validateAnalyticsConfig(config);

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(config, null, 2)}\n`, 'utf8');
console.log(`Wrote public runtime configuration to ${outputPath}`);

function text(name, fallback = '') {
  return process.env[name]?.trim() || fallback;
}

function integer(name, fallback) {
  const parsed = Number.parseInt(process.env[name] ?? '', 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

function positiveInteger(name, fallback) {
  const parsed = Number.parseInt(process.env[name] ?? '', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function oneOf(value, allowed, fallback) {
  return value && allowed.includes(value) ? value : fallback;
}
