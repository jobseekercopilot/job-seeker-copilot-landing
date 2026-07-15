export type FeatureStatus = 'confirmed' | 'limited' | 'not-confirmed' | 'planned';

export type ComparisonFeatureId =
  | 'multi-source'
  | 'job-matching'
  | 'application-tracking'
  | 'tailored-cv'
  | 'tailored-cover-letter'
  | 'document-storage'
  | 'documents-connected'
  | 'application-automation'
  | 'application-autofill'
  | 'automatic-submission'
  | 'notes-reporting'
  | 'notes-contacts'
  | 'reporting-analytics'
  | 'uk-specific'
  | 'employment-support'
  | 'user-control';

export interface ComparisonFeature {
  readonly id: ComparisonFeatureId;
  readonly label: string;
  readonly description: string;
}

export interface ComparisonPlatform {
  readonly id: string;
  readonly name: string;
  readonly logoPath: string;
  readonly websiteUrl: string;
  readonly isJobSeekerCopilot: boolean;
  readonly features: Readonly<Record<ComparisonFeatureId, FeatureStatus>>;
}

export const COMPARISON_FEATURES: readonly ComparisonFeature[] = [
  {
    id: 'multi-source',
    label: 'Searches multiple job sources',
    description: 'Finds, aggregates or saves vacancies from more than one job source or employer site.',
  },
  {
    id: 'job-matching',
    label: 'Job matching',
    description: 'Compares a person’s profile or CV with a vacancy to surface or explain relevant matches.',
  },
  {
    id: 'application-tracking',
    label: 'Application tracking',
    description: 'Records vacancies and lets the user follow their progress through application stages.',
  },
  {
    id: 'tailored-cv',
    label: 'Vacancy-specific CV or résumé',
    description: 'Creates or tailors a CV or résumé using the requirements of an individual vacancy.',
  },
  {
    id: 'tailored-cover-letter',
    label: 'Vacancy-specific cover letter',
    description: 'Creates, tailors or supports a cover letter for an individual vacancy.',
  },
  {
    id: 'document-storage',
    label: 'Document storage',
    description: 'Stores CVs, résumés, cover letters or other application documents in the product.',
  },
  {
    id: 'documents-connected',
    label: 'Documents connected to an application',
    description: 'Keeps the relevant document version associated with a particular vacancy or application.',
  },
  {
    id: 'application-automation',
    label: 'Application autofill or auto-apply',
    description: 'Fills application forms or submits applications through an automated or assisted workflow.',
  },
  {
    id: 'application-autofill',
    label: 'Application autofill',
    description: 'Prepares or fills application fields while leaving the applicant to review and submit.',
  },
  {
    id: 'automatic-submission',
    label: 'Automatic application submission',
    description: 'Can submit an application without the applicant reviewing each final submission.',
  },
  {
    id: 'notes-reporting',
    label: 'Notes, reporting or activity history',
    description: 'Keeps notes, progress information, activity records, contacts or job-search reporting.',
  },
  {
    id: 'notes-contacts',
    label: 'Notes and contacts',
    description: 'Stores notes, reminders, recruiter details or other contacts against job-search records.',
  },
  {
    id: 'reporting-analytics',
    label: 'Reporting or analytics',
    description: 'Provides activity summaries, metrics, insights or exportable job-search information.',
  },
  {
    id: 'uk-specific',
    label: 'Designed specifically for UK jobseekers',
    description: 'The product and language are designed primarily around the UK job-search context.',
  },
  {
    id: 'employment-support',
    label: 'Employment-support or work-search reporting',
    description: 'Supports structured evidence of work-search and preparation activity for UK employment-support contexts.',
  },
  {
    id: 'user-control',
    label: 'User remains in control of submission',
    description: 'The applicant reviews and decides whether each application is submitted.',
  },
];

export const HOMEPAGE_FEATURE_IDS: readonly ComparisonFeatureId[] = [
  'multi-source',
  'job-matching',
  'application-tracking',
  'tailored-cv',
  'tailored-cover-letter',
  'documents-connected',
  'application-automation',
  'notes-reporting',
  'uk-specific',
  'user-control',
];

export const ARTICLE_FEATURE_IDS: readonly ComparisonFeatureId[] = [
  'multi-source',
  'job-matching',
  'application-tracking',
  'tailored-cv',
  'tailored-cover-letter',
  'document-storage',
  'documents-connected',
  'application-autofill',
  'automatic-submission',
  'notes-contacts',
  'reporting-analytics',
  'uk-specific',
  'employment-support',
];

export const HOMEPAGE_PLATFORM_IDS: readonly string[] = [
  'job-seeker-copilot',
  'linkedin',
  'indeed',
  'reed',
  'adzuna',
  'teal',
  'huntr',
  'simplify',
  'jobscan',
];

export const COMPARISON_PLATFORMS: readonly ComparisonPlatform[] = [
  createPlatform('job-seeker-copilot', 'Job Seeker Copilot', '/brand/jobseeker-copilot-logo.svg', 'https://jobseekercopilot.com', true, {
    'multi-source': 'confirmed',
    'job-matching': 'confirmed',
    'application-tracking': 'confirmed',
    'tailored-cv': 'confirmed',
    'tailored-cover-letter': 'confirmed',
    'document-storage': 'confirmed',
    'documents-connected': 'confirmed',
    'application-automation': 'not-confirmed',
    'application-autofill': 'not-confirmed',
    'automatic-submission': 'not-confirmed',
    'notes-reporting': 'confirmed',
    'notes-contacts': 'limited',
    'reporting-analytics': 'confirmed',
    'uk-specific': 'confirmed',
    'employment-support': 'planned',
    'user-control': 'confirmed',
  }),
  createPlatform('linkedin', 'LinkedIn', '/platform-logos/linkedin.png', 'https://www.linkedin.com/jobs/', false, {
    'multi-source': 'limited',
    'job-matching': 'confirmed',
    'application-tracking': 'confirmed',
    'tailored-cv': 'limited',
    'tailored-cover-letter': 'limited',
    'document-storage': 'confirmed',
    'documents-connected': 'limited',
    'application-automation': 'limited',
    'application-autofill': 'limited',
    'notes-reporting': 'confirmed',
    'notes-contacts': 'confirmed',
    'reporting-analytics': 'limited',
    'user-control': 'confirmed',
  }),
  createPlatform('indeed', 'Indeed', '/platform-logos/indeed.png', 'https://uk.indeed.com/', false, {
    'multi-source': 'limited',
    'job-matching': 'limited',
    'application-tracking': 'confirmed',
    'document-storage': 'confirmed',
    'documents-connected': 'limited',
    'application-automation': 'limited',
    'application-autofill': 'limited',
    'notes-reporting': 'limited',
    'notes-contacts': 'limited',
    'reporting-analytics': 'limited',
    'user-control': 'confirmed',
  }),
  createPlatform('reed', 'Reed', '/platform-logos/reed.png', 'https://www.reed.co.uk/jobs', false, {
    'application-tracking': 'confirmed',
    'tailored-cv': 'limited',
    'tailored-cover-letter': 'confirmed',
    'document-storage': 'confirmed',
    'documents-connected': 'limited',
    'application-automation': 'limited',
    'application-autofill': 'limited',
    'notes-reporting': 'limited',
    'reporting-analytics': 'limited',
    'uk-specific': 'confirmed',
    'user-control': 'confirmed',
  }),
  createPlatform('totaljobs', 'Totaljobs', '/platform-logos/totaljobs.png', 'https://www.totaljobs.com/', false, {
    'job-matching': 'limited',
    'application-tracking': 'confirmed',
    'document-storage': 'confirmed',
    'documents-connected': 'limited',
    'application-automation': 'limited',
    'application-autofill': 'confirmed',
    'notes-reporting': 'limited',
    'reporting-analytics': 'limited',
    'uk-specific': 'confirmed',
    'user-control': 'confirmed',
  }),
  createPlatform('cv-library', 'CV-Library', '/platform-logos/cv-library.png', 'https://www.cv-library.co.uk/', false, {
    'job-matching': 'limited',
    'application-tracking': 'confirmed',
    'document-storage': 'confirmed',
    'documents-connected': 'limited',
    'application-automation': 'limited',
    'application-autofill': 'confirmed',
    'notes-reporting': 'limited',
    'reporting-analytics': 'limited',
    'uk-specific': 'confirmed',
    'user-control': 'confirmed',
  }),
  createPlatform('adzuna', 'Adzuna', '/platform-logos/adzuna.webp', 'https://www.adzuna.co.uk/', false, {
    'multi-source': 'confirmed',
    'job-matching': 'confirmed',
    'application-tracking': 'limited',
    'tailored-cv': 'limited',
    'document-storage': 'confirmed',
    'documents-connected': 'limited',
    'application-automation': 'confirmed',
    'automatic-submission': 'confirmed',
    'notes-reporting': 'limited',
    'reporting-analytics': 'limited',
    'uk-specific': 'limited',
    'user-control': 'limited',
  }),
  createPlatform('teal', 'Teal', '/platform-logos/teal.svg', 'https://www.tealhq.com/', false, {
    'multi-source': 'confirmed',
    'job-matching': 'confirmed',
    'application-tracking': 'confirmed',
    'tailored-cv': 'confirmed',
    'tailored-cover-letter': 'confirmed',
    'document-storage': 'confirmed',
    'documents-connected': 'confirmed',
    'notes-reporting': 'confirmed',
    'notes-contacts': 'confirmed',
    'reporting-analytics': 'confirmed',
    'user-control': 'confirmed',
  }),
  createPlatform('huntr', 'Huntr', '/platform-logos/huntr.png', 'https://huntr.co/', false, {
    'multi-source': 'confirmed',
    'job-matching': 'confirmed',
    'application-tracking': 'confirmed',
    'tailored-cv': 'confirmed',
    'tailored-cover-letter': 'confirmed',
    'document-storage': 'confirmed',
    'documents-connected': 'confirmed',
    'application-automation': 'confirmed',
    'application-autofill': 'confirmed',
    'notes-reporting': 'confirmed',
    'notes-contacts': 'confirmed',
    'reporting-analytics': 'confirmed',
    'user-control': 'confirmed',
  }),
  createPlatform('simplify', 'Simplify', '/platform-logos/simplify.png', 'https://simplify.jobs/', false, {
    'multi-source': 'confirmed',
    'job-matching': 'confirmed',
    'application-tracking': 'confirmed',
    'tailored-cv': 'confirmed',
    'tailored-cover-letter': 'confirmed',
    'document-storage': 'confirmed',
    'documents-connected': 'confirmed',
    'application-automation': 'confirmed',
    'application-autofill': 'confirmed',
    'notes-reporting': 'confirmed',
    'notes-contacts': 'confirmed',
    'reporting-analytics': 'confirmed',
    'uk-specific': 'limited',
    'user-control': 'confirmed',
  }),
  createPlatform('jobscan', 'Jobscan', '/platform-logos/jobscan.svg', 'https://www.jobscan.co/', false, {
    'multi-source': 'limited',
    'job-matching': 'confirmed',
    'application-tracking': 'confirmed',
    'tailored-cv': 'confirmed',
    'tailored-cover-letter': 'confirmed',
    'document-storage': 'confirmed',
    'documents-connected': 'confirmed',
    'application-automation': 'confirmed',
    'application-autofill': 'confirmed',
    'notes-reporting': 'confirmed',
    'notes-contacts': 'confirmed',
    'reporting-analytics': 'limited',
    'user-control': 'confirmed',
  }),
  createPlatform('careerflow', 'Careerflow', '/platform-logos/careerflow.png', 'https://www.careerflow.ai/', false, {
    'multi-source': 'confirmed',
    'job-matching': 'confirmed',
    'application-tracking': 'confirmed',
    'tailored-cv': 'confirmed',
    'tailored-cover-letter': 'confirmed',
    'document-storage': 'limited',
    'documents-connected': 'confirmed',
    'application-automation': 'limited',
    'application-autofill': 'limited',
    'notes-reporting': 'confirmed',
    'notes-contacts': 'confirmed',
    'reporting-analytics': 'confirmed',
    'user-control': 'confirmed',
  }),
  createPlatform('kickresume', 'Kickresume', '/platform-logos/kickresume.png', 'https://www.kickresume.com/', false, {
    'multi-source': 'limited',
    'application-tracking': 'confirmed',
    'tailored-cv': 'confirmed',
    'tailored-cover-letter': 'confirmed',
    'document-storage': 'confirmed',
    'documents-connected': 'limited',
    'notes-reporting': 'limited',
    'notes-contacts': 'limited',
    'reporting-analytics': 'limited',
    'user-control': 'confirmed',
  }),
];

export function comparisonFeatures(ids: readonly ComparisonFeatureId[]): readonly ComparisonFeature[] {
  return ids.map(id => {
    const feature = COMPARISON_FEATURES.find(item => item.id === id);
    if (!feature) throw new Error(`Unknown comparison feature: ${id}`);
    return feature;
  });
}

export function comparisonPlatforms(ids: readonly string[]): readonly ComparisonPlatform[] {
  return ids.map(id => {
    const platform = COMPARISON_PLATFORMS.find(item => item.id === id);
    if (!platform) throw new Error(`Unknown comparison platform: ${id}`);
    return platform;
  });
}

function createPlatform(
  id: string,
  name: string,
  logoPath: string,
  websiteUrl: string,
  isJobSeekerCopilot: boolean,
  features: Partial<Record<ComparisonFeatureId, FeatureStatus>>,
): ComparisonPlatform {
  const defaultStatuses = Object.fromEntries(
    COMPARISON_FEATURES.map(feature => [feature.id, 'not-confirmed']),
  ) as Record<ComparisonFeatureId, FeatureStatus>;

  return {
    id,
    name,
    logoPath,
    websiteUrl,
    isJobSeekerCopilot,
    features: { ...defaultStatuses, ...features },
  };
}
