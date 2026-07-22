export const CANONICAL_PUBLIC_ORIGIN = 'https://www.jobseekercopilot.com';

export function resolveSearchIndexingEnabled(environment = process.env) {
  const requested = environment.ENABLE_SEARCH_INDEXING?.trim() ?? '';
  if (requested && requested !== 'false' && requested !== 'true') {
    throw new Error('ENABLE_SEARCH_INDEXING must be true or false.');
  }
  if (requested !== 'true') return false;
  if (environment.AWS_BRANCH?.trim() !== 'main') {
    throw new Error('Search indexing can be enabled only for the main production branch.');
  }
  if (environment.PUBLIC_WEBSITE_URL?.trim() !== CANONICAL_PUBLIC_ORIGIN) {
    throw new Error('Search indexing requires the exact canonical public website URL.');
  }
  return true;
}
