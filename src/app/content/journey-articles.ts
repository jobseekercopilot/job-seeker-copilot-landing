export interface JourneyArticle {
  readonly title: string;
  readonly path: string;
  readonly publishedDate: string;
  readonly dateTime: string;
}

export const JOURNEY_ARTICLES: readonly JourneyArticle[] = [
  {
    title: 'How Job Seeker Copilot Compares with Today’s Job Search Platforms',
    path: '/the-journey-so-far/job-search-platform-comparison',
    publishedDate: '16 July 2026',
    dateTime: '2026-07-16',
  },
  {
    title: 'The Story Behind Job Seeker Copilot',
    path: '/about',
    publishedDate: '14 July 2026',
    dateTime: '2026-07-14',
  },
];
