export interface JourneyArticle {
  readonly label: string;
  readonly title: string;
  readonly path: string;
  readonly publishedDate: string;
  readonly dateTime: string;
}

export const JOURNEY_ARTICLES: readonly JourneyArticle[] = [
  {
    label: 'Statistics',
    title: 'The UK Job Market in 2026: What the Statistics Show',
    path: '/the-journey-so-far/uk-job-search-statistics',
    publishedDate: '24 July 2026',
    dateTime: '2026-07-24',
  },
  {
    label: 'Research',
    title: 'How Job Seeker Copilot Compares with Today’s Job Search Platforms',
    path: '/the-journey-so-far/job-search-platform-comparison',
    publishedDate: '16 July 2026',
    dateTime: '2026-07-16',
  },
  {
    label: 'Founder story',
    title: 'The Story Behind Job Seeker Copilot',
    path: '/about',
    publishedDate: '14 July 2026',
    dateTime: '2026-07-14',
  },
];
