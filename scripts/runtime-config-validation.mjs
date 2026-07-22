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
