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

export function validateApplicationAccessConfig(value) {
  const routes = [
    ['MAIN_APPLICATION_URL', value.mainApplicationUrl, '/'],
    ['REGISTRATION_URL', value.registrationUrl, '/register'],
    ['SIGN_IN_URL', value.signInUrl, '/sign-in'],
  ];
  const configuredCount = routes.filter(([, endpoint]) => Boolean(endpoint)).length;
  if (configuredCount === 0) return;
  if (configuredCount !== routes.length) {
    throw new Error('Application access requires MAIN_APPLICATION_URL, REGISTRATION_URL and SIGN_IN_URL together.');
  }

  for (const [name, endpoint, requiredPath] of routes) {
    let parsed;
    try {
      parsed = new URL(endpoint);
    } catch {
      throw new Error(`${name} must be a valid absolute URL when application access is configured.`);
    }
    const isProductionApplication = parsed.protocol === 'https:' &&
      parsed.origin === 'https://app.jobseekercopilot.com';
    const isLocalDevelopment = value.environmentName !== 'production' &&
      (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1') &&
      (parsed.protocol === 'http:' || parsed.protocol === 'https:');
    if (!isProductionApplication && !isLocalDevelopment) {
      throw new Error(`${name} must use the approved application origin or an explicit local development origin.`);
    }
    if (parsed.username || parsed.password || parsed.search || parsed.hash || parsed.pathname !== requiredPath) {
      throw new Error(`${name} must be a credential-free, query-free application route with path ${requiredPath}.`);
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
