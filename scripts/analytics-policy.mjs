import { CANONICAL_PUBLIC_ORIGIN } from './search-indexing-policy.mjs';

export function resolveAnalyticsEnabled(environment = process.env) {
  const requested = environment.ENABLE_ANALYTICS?.trim() ?? '';
  if (requested && requested !== 'false' && requested !== 'true') {
    throw new Error('ENABLE_ANALYTICS must be true or false.');
  }
  if (requested !== 'true') return false;
  if (environment.AWS_BRANCH?.trim() !== 'main') {
    throw new Error('Analytics can be enabled only for the main production branch.');
  }
  if (environment.PUBLIC_ENVIRONMENT_NAME?.trim() !== 'production' ||
      environment.PUBLIC_WEBSITE_URL?.trim() !== CANONICAL_PUBLIC_ORIGIN) {
    throw new Error('Analytics requires production and the exact canonical public website URL.');
  }
  const endpoint = validHttpsUrl(environment.ANALYTICS_ENDPOINT_URL);
  if (!endpoint || !endpoint.pathname.endsWith('/analytics') || endpoint.search || endpoint.hash) {
    throw new Error('Analytics requires an HTTPS first-party analytics endpoint without a query or fragment.');
  }
  const waitlistEndpoint = validHttpsUrl(environment.WAITLIST_API_URL);
  if (!waitlistEndpoint || endpoint.origin !== waitlistEndpoint.origin) {
    throw new Error('Analytics must use the same approved first-party API origin as the waitlist.');
  }
  return true;
}

function validHttpsUrl(value) {
  try {
    const parsed = new URL(value?.trim() ?? '');
    return parsed.protocol === 'https:' ? parsed : null;
  } catch {
    return null;
  }
}
