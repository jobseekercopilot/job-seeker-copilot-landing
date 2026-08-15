export function validateLiveSubmissionConfig(value) {
  if (value.environmentName !== 'production' || !value.enableLiveSubmissions) return;

  const requiredEndpoints = [
    ['WAITLIST_API_URL', value.waitlistApiUrl],
    ['WAITLIST_CONFIRMATION_API_URL', value.waitlistConfirmationApiUrl],
    ['WAITLIST_RESEND_API_URL', value.waitlistResendApiUrl],
    ['CONTACT_API_URL', value.contactApiUrl],
  ];
  for (const [name, endpoint] of requiredEndpoints) {
    let parsed;
    try {
      parsed = new URL(endpoint);
    } catch {
      throw new Error(`${name} must be a valid absolute URL when production submissions are enabled.`);
    }
    if (parsed.protocol !== 'https:') {
      throw new Error(`${name} must use HTTPS when production submissions are enabled.`);
    }
  }
}

export function validatePublicBetaConfig(value) {
  if (!value.publicBetaEnabled) return;
  if (value.environmentName !== 'production'
    || value.publicWebsiteUrl !== 'https://www.jobseekercopilot.com') {
    throw new Error('Public beta requires production and the exact canonical public website URL.');
  }
  let app;
  let registration;
  let signIn;
  let pricing;
  try {
    app = new URL(value.mainApplicationUrl);
    registration = new URL(value.registrationUrl);
    signIn = new URL(value.signInUrl);
    pricing = new URL(value.pricingUrl);
  } catch {
    throw new Error('Public beta requires valid absolute application URLs.');
  }
  const safe = app.protocol === 'https:' && !app.search && !app.hash
    && registration.origin === app.origin && registration.pathname === '/register'
    && !registration.search && !registration.hash
    && signIn.origin === app.origin && signIn.pathname === '/sign-in'
    && !signIn.search && !signIn.hash
    && pricing.origin === app.origin && pricing.pathname === '/payment'
    && !pricing.search && !pricing.hash
    && value.legalDocumentsReviewed === true
    && value.minimumUserAge === 18
    && isIsoCalendarDate(value.legalEffectiveDate ?? '')
    && /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/.test(value.legalVersion ?? '')
    && ['SOLE_TRADER', 'LIMITED_COMPANY'].includes(value.legalEntityType)
    && ['NOT_VAT_REGISTERED', 'VAT_REGISTERED'].includes(value.taxStatus)
    && typeof value.legalEntityName === 'string'
    && isReviewedIdentityValue(value.legalEntityName, 2)
    && typeof value.tradingName === 'string'
    && isReviewedIdentityValue(value.tradingName, 2)
    && typeof value.businessAddress === 'string'
    && isReviewedIdentityValue(value.businessAddress, 8)
    && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.privacyEmail ?? '')
    && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.supportEmail ?? '')
    && (value.icoRegistrationStatus === 'NOT_REQUIRED_CONFIRMED'
      || (value.icoRegistrationStatus === 'REGISTERED'
        && /^[A-Za-z0-9-]{4,40}$/.test(value.icoRegistrationReference ?? '')))
    && [value.accountDeletionCompletionDays, value.documentDeletionCompletionDays,
      value.securityLogRetentionDays, value.supportRecordRetentionDays,
      value.financialRecordRetentionYears]
      .every(item => Number.isInteger(item) && item > 0);
  if (!safe) {
    throw new Error('Public beta requires approved app URLs and reviewed legal identity configuration.');
  }
}

export function validateSearchIndexingConfig(value) {
  if (!value.searchIndexingEnabled) return;
  if (value.environmentName !== 'production' || value.publicWebsiteUrl !== 'https://www.jobseekercopilot.com') {
    throw new Error('Search indexing requires production and the exact canonical public website URL.');
  }
}

export function validateAnalyticsConfig(value) {
  if (!value.analyticsEnabled) return;
  if (value.environmentName !== 'production' || value.publicWebsiteUrl !== 'https://www.jobseekercopilot.com') {
    throw new Error('Analytics requires production and the exact canonical public website URL.');
  }
  let endpoint;
  try {
    endpoint = new URL(value.analyticsEndpointUrl);
  } catch {
    throw new Error('ANALYTICS_ENDPOINT_URL must be a valid absolute URL when analytics is enabled.');
  }
  if (endpoint.protocol !== 'https:' || !endpoint.pathname.endsWith('/analytics') || endpoint.search || endpoint.hash) {
    throw new Error('ANALYTICS_ENDPOINT_URL must be a query-free HTTPS analytics endpoint.');
  }
  let waitlistEndpoint;
  try {
    waitlistEndpoint = new URL(value.waitlistApiUrl);
  } catch {
    throw new Error('Analytics requires the approved first-party waitlist API origin.');
  }
  if (endpoint.origin !== waitlistEndpoint.origin) {
    throw new Error('Analytics requires the approved first-party waitlist API origin.');
  }
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

function isIsoCalendarDate(value) {
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

function isReviewedIdentityValue(value, minimumLength) {
  const normalized = value.trim();
  return normalized.length >= minimumLength
    && !RELEASE_PLACEHOLDER_PATTERNS.some(pattern => pattern.test(normalized));
}
