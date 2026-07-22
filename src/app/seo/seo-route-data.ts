export const CANONICAL_ORIGIN = 'https://www.jobseekercopilot.com';
export const SOCIAL_IMAGE_URL = `${CANONICAL_ORIGIN}/social/og-image.png`;
export const SOCIAL_IMAGE_ALT = 'Job Seeker Copilot — your job search, organised';

export type SeoSchemaKind = 'home' | 'faq' | 'comparison';

export interface SeoRouteData {
  path: string;
  title: string;
  description: string;
  indexable: boolean;
  socialType: 'website' | 'article';
  schema?: SeoSchemaKind;
}
