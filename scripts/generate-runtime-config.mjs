import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { validateLiveWaitlistConfig } from './runtime-config-validation.mjs';

const outputPath = resolve(process.env.RUNTIME_CONFIG_OUTPUT_PATH || 'public/config/app-config.json');

const config = {
  environmentName: oneOf(process.env.PUBLIC_ENVIRONMENT_NAME, ['development', 'test', 'production'], 'production'),
  enableLiveSubmissions: process.env.ENABLE_LIVE_SUBMISSIONS === 'true',
  waitlistApiUrl: text('WAITLIST_API_URL'),
  waitlistConfirmationApiUrl: text('WAITLIST_CONFIRMATION_API_URL'),
  waitlistResendApiUrl: text('WAITLIST_RESEND_API_URL'),
  waitlistUnsubscribeApiUrl: text('WAITLIST_UNSUBSCRIBE_API_URL'),
  contactApiUrl: text('CONTACT_API_URL'),
  mainApplicationUrl: text('MAIN_APPLICATION_URL'),
  registrationUrl: text('REGISTRATION_URL'),
  signInUrl: text('SIGN_IN_URL'),
  pricingUrl: text('PRICING_URL'),
  publicWebsiteUrl: text('PUBLIC_WEBSITE_URL'),
  privacyPolicyUrl: text('PRIVACY_POLICY_URL', '/privacy'),
  termsUrl: text('TERMS_URL', '/terms'),
  supportUrl: text('SUPPORT_URL', '/contact'),
  analyticsId: text('ANALYTICS_ID'),
  antiBotProvider: text('ANTI_BOT_PROVIDER', 'none'),
  antiBotSiteKey: text('ANTI_BOT_SITE_KEY'),
  consentVersion: text('CONSENT_VERSION', new Date().toISOString().slice(0, 10)),
  minimumFormCompletionMs: integer('MINIMUM_FORM_COMPLETION_MS', 1200),
  contactMessageMaxLength: positiveInteger('CONTACT_MESSAGE_MAX_LENGTH', 3000),
  copyrightNotice: text('COPYRIGHT_NOTICE', 'Job Seeker Copilot'),
};

validateLiveWaitlistConfig(config);

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
