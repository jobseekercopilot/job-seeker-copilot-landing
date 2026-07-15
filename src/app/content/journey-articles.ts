export interface JourneyArticle {
  readonly title: string;
  readonly path: string;
}

export const JOURNEY_ARTICLES: readonly JourneyArticle[] = [
  {
    title: 'The Story Behind Job Seeker Copilot',
    path: '/about',
  },
];
