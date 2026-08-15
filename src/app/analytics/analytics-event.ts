export const ANALYTICS_EVENT_NAMES = [
  'visit',
  'page_view',
  'waitlist_form_view',
  'waitlist_attempt',
  'contact_form_view',
  'contact_attempt',
  'pricing_view',
  'pricing_cta',
] as const;

export type AnalyticsEventName = typeof ANALYTICS_EVENT_NAMES[number];
export type AnalyticsContext = 'hero' | 'footer' | 'contact' | 'pricing';
export type AnalyticsViewport = 'mobile' | 'tablet' | 'desktop';
export type AnalyticsTrafficClass = 'production' | 'smoke';
export type AnalyticsAcquisition = 'direct' | 'search' | 'social' | 'email' | 'partner' | 'other';

export interface SafeCampaign {
  source?: string;
  medium?: string;
  campaign?: string;
  content?: string;
}

export interface AnalyticsEventPayload {
  eventName: AnalyticsEventName;
  path: string;
  context?: AnalyticsContext;
  viewport: AnalyticsViewport;
  trafficClass: AnalyticsTrafficClass;
  acquisition: AnalyticsAcquisition;
  campaign?: SafeCampaign;
}

const PUBLIC_ANALYTICS_PATHS = new Set([
  '/',
  '/about',
  '/faq',
  '/the-journey-so-far/job-search-platform-comparison',
  '/privacy',
  '/terms',
  '/contact',
  '/accessibility',
  '/404',
]);

const CAMPAIGN_FIELDS: readonly [keyof SafeCampaign, string][] = [
  ['source', 'utm_source'],
  ['medium', 'utm_medium'],
  ['campaign', 'utm_campaign'],
  ['content', 'utm_content'],
];

const SAFE_CAMPAIGN_VALUES: Readonly<Record<keyof SafeCampaign, ReadonlySet<string>>> = {
  source: new Set(['direct', 'google', 'bing', 'linkedin', 'facebook', 'whatsapp', 'email', 'partner', 'other']),
  medium: new Set(['direct', 'organic', 'social', 'email', 'referral', 'partner']),
  campaign: new Set(['beta_launch', 'founder_update', 'launch', 'newsletter', 'partner_launch']),
  content: new Set(['founder_post', 'homepage', 'profile', 'article', 'newsletter', 'message']),
};

export function approvedAnalyticsPath(value: string): string | null {
  try {
    const path = new URL(value, 'https://www.jobseekercopilot.com').pathname.replace(/\/$/, '') || '/';
    return PUBLIC_ANALYTICS_PATHS.has(path) ? path : null;
  } catch {
    return null;
  }
}

export function safeCampaignFromUrl(value: string): SafeCampaign | null {
  let url: URL;
  try {
    url = new URL(value, 'https://www.jobseekercopilot.com');
  } catch {
    return null;
  }
  const campaign: SafeCampaign = {};
  for (const [field, parameter] of CAMPAIGN_FIELDS) {
    const candidate = url.searchParams.get(parameter)?.trim().toLowerCase() ?? '';
    if (SAFE_CAMPAIGN_VALUES[field].has(candidate)) campaign[field] = candidate;
  }
  return Object.keys(campaign).length ? campaign : null;
}

export function analyticsAcquisition(value: string, referrer: string): AnalyticsAcquisition {
  const campaign = safeCampaignFromUrl(value);
  const source = campaign?.source;
  if (source === 'google' || source === 'bing') return 'search';
  if (source === 'linkedin' || source === 'facebook' || source === 'whatsapp') return 'social';
  if (source === 'email') return 'email';
  if (source === 'partner') return 'partner';
  if (source === 'direct') return 'direct';
  if (source === 'other') return 'other';
  if (!referrer) return 'direct';
  try {
    const host = new URL(referrer).hostname.toLowerCase();
    if (host === 'google.com' || host.endsWith('.google.com') || host === 'bing.com' || host.endsWith('.bing.com')) {
      return 'search';
    }
    if (['linkedin.com', 'facebook.com', 'whatsapp.com'].some(domain => host === domain || host.endsWith(`.${domain}`))) {
      return 'social';
    }
    return 'other';
  } catch {
    return 'other';
  }
}

export function isSafeCampaign(value: unknown): value is SafeCampaign {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const candidate = value as Record<string, unknown>;
  const keys = Object.keys(candidate) as (keyof SafeCampaign)[];
  if (!keys.length || keys.some(key => !Object.hasOwn(SAFE_CAMPAIGN_VALUES, key))) return false;
  return keys.every(key => typeof candidate[key] === 'string' && SAFE_CAMPAIGN_VALUES[key].has(candidate[key]));
}

export function analyticsTrafficClass(value: string): AnalyticsTrafficClass {
  try {
    return new URL(value, 'https://www.jobseekercopilot.com').searchParams.get('analytics_test') === 'smoke'
      ? 'smoke'
      : 'production';
  } catch {
    return 'production';
  }
}

export function analyticsViewport(width: number): AnalyticsViewport {
  if (width < 640) return 'mobile';
  if (width < 1024) return 'tablet';
  return 'desktop';
}
