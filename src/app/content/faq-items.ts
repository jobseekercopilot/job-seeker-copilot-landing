export type FaqBlock =
  | { readonly type: 'paragraph'; readonly text: string }
  | { readonly type: 'bullets'; readonly items: readonly string[] }
  | { readonly type: 'emphasis'; readonly text: string };

export interface FaqCallToAction {
  readonly label: string;
  readonly route: string;
  readonly fragment?: string;
  readonly style: 'button' | 'link';
}

export interface FaqItem {
  readonly id: string;
  readonly question: string;
  readonly blocks: readonly FaqBlock[];
  readonly callToAction?: FaqCallToAction;
}

export const FAQ_ITEMS: readonly FaqItem[] = [
  {
    id: 'what-is-job-seeker-copilot',
    question: 'What is Job Seeker Copilot?',
    blocks: [
      { type: 'paragraph', text: 'Job Seeker Copilot is a UK-focused application designed to help people organise the complete job-search process.' },
      { type: 'paragraph', text: 'It brings together vacancy search, job matching, application tracking, tailored CV and cover-letter generation, document organisation and progress reporting.' },
      { type: 'paragraph', text: 'Instead of treating every feature as a separate tool, Job Seeker Copilot connects them around the individual job application. A vacancy, its match information, its tailored documents and its application progress can be managed together.' },
    ],
  },
  {
    id: 'who-is-it-for',
    question: 'Who is Job Seeker Copilot for?',
    blocks: [
      { type: 'paragraph', text: 'The initial version is being developed for UK jobseekers who want more structure when managing their search and applications.' },
      { type: 'paragraph', text: 'This may include people who are unemployed, returning to work, changing careers, applying for several roles at once or finding job-search administration difficult to organise.' },
      { type: 'paragraph', text: 'Future versions may also include tools for employment advisers, training providers, charities and organisations that support jobseekers.' },
    ],
  },
  {
    id: 'availability',
    question: 'Is Job Seeker Copilot available now?',
    blocks: [
      { type: 'paragraph', text: 'Job Seeker Copilot is currently at a pre-beta stage and remains in active development.' },
      { type: 'paragraph', text: 'The core application is working, but further development, security work and testing are required before it can be opened to a wider group of users.' },
      { type: 'paragraph', text: 'People interested in trying the platform can join the waiting list to receive important development updates and information about future private beta access.' },
    ],
    callToAction: { label: 'Join the waiting list', route: '/', fragment: 'waitlist', style: 'button' },
  },
  {
    id: 'job-sources',
    question: 'How many job sites does Job Seeker Copilot search?',
    blocks: [
      { type: 'paragraph', text: 'Job Seeker Copilot currently has three direct job-data integrations:' },
      { type: 'bullets', items: ['Reed', 'Adzuna', 'JSearch'] },
      { type: 'paragraph', text: 'Reed provides access to vacancies advertised through Reed. Adzuna states that it searches thousands of job sites, while JSearch retrieves vacancies from a broader range of public job listings and online sources.' },
      { type: 'paragraph', text: 'Because the underlying sources can overlap and change over time, it would not be accurate to present a fixed number of unique websites as direct Job Seeker Copilot integrations.' },
      { type: 'paragraph', text: 'The clearest description is:' },
      { type: 'emphasis', text: 'Three direct job-data integrations, providing access to vacancies drawn from a much wider network of sources.' },
      { type: 'paragraph', text: 'Job Seeker Copilot is currently at a pre-beta stage. As development continues, the aim is to integrate additional job sources that provide both:' },
      { type: 'bullets', items: ['A broad range of general vacancies.', 'More specialised opportunities for particular industries, professions and fields.'] },
      { type: 'paragraph', text: 'New integrations will only be announced as available after they have been implemented and tested.' },
    ],
  },
  {
    id: 'linkedin-and-indeed',
    question: 'Don’t LinkedIn and Indeed already do this?',
    blocks: [
      { type: 'paragraph', text: 'LinkedIn and Indeed already provide useful features such as vacancy search, saved jobs and application tracking. LinkedIn also offers job matching and AI-assisted résumé and cover-letter features in some circumstances. Specialist platforms provide additional combinations of tracking, document creation and application-management tools.' },
      { type: 'paragraph', text: 'Job Seeker Copilot is not based on the claim that these features do not exist.' },
      { type: 'paragraph', text: 'It is being developed as a UK-focused workspace that connects the different stages of a job search around each vacancy. A job can be found through a supported provider, assessed against the user’s information, connected to a tailored CV and cover letter, and tracked throughout the application process.' },
      { type: 'paragraph', text: 'The aim is to reduce the need to manage a job search across separate websites, documents, notes and spreadsheets.' },
    ],
    callToAction: { label: 'Read the full platform comparison', route: '/the-journey-so-far/job-search-platform-comparison', style: 'link' },
  },
  {
    id: 'continue-using-job-boards',
    question: 'Can I continue using LinkedIn, Indeed and other job boards?',
    blocks: [
      { type: 'paragraph', text: 'Yes. Job Seeker Copilot is not intended to prevent people from using existing job platforms.' },
      { type: 'paragraph', text: 'Job boards remain valuable places to discover vacancies. Job Seeker Copilot is designed to provide a central workspace where users can organise supported opportunities and manage what happens before and after a vacancy is found.' },
    ],
  },
  {
    id: 'automatic-applications',
    question: 'Does Job Seeker Copilot apply for jobs automatically?',
    blocks: [
      { type: 'paragraph', text: 'No. Job Seeker Copilot is designed to support the applicant, not replace their judgement.' },
      { type: 'paragraph', text: 'Users remain responsible for reviewing vacancies, checking generated documents, correcting information, deciding whether a role is suitable and submitting the final application.' },
      { type: 'paragraph', text: 'The objective is to reduce repetitive administration while keeping the jobseeker in control.' },
    ],
  },
  {
    id: 'tailored-documents',
    question: 'Are the CVs and cover letters specific to each job?',
    blocks: [
      { type: 'paragraph', text: 'Yes. The document-generation process uses information about the selected vacancy so that the resulting CV and cover letter can be tailored to that particular opportunity.' },
      { type: 'paragraph', text: 'Generated documents are associated with the relevant vacancy or application rather than being stored as unrelated generic files.' },
      { type: 'paragraph', text: 'AI-generated content should always be reviewed and corrected where necessary before it is submitted.' },
    ],
  },
  {
    id: 'work-search-reporting',
    question: 'Can Job Seeker Copilot help me record my Universal Credit work-search activity?',
    blocks: [
      { type: 'paragraph', text: 'Job Seeker Copilot aims to make it easier for users to record and understand the work they are doing to find employment.' },
      { type: 'paragraph', text: 'Applications, generated documents, job statuses and other activity can be kept together rather than being spread across websites, email accounts, folders and handwritten notes.' },
      { type: 'emphasis', text: 'Planned functionality — not currently available:' },
      { type: 'paragraph', text: 'Reporting features are being developed to provide clearer summaries of activity, including:' },
      { type: 'bullets', items: ['Jobs considered.', 'Applications made.', 'CVs and cover letters prepared.', 'Interviews.', 'Follow-up activity.', 'Application outcomes.'] },
      { type: 'paragraph', text: 'Future versions may allow users to export or copy a weekly activity summary that they can review and use when updating their Universal Credit journal or discussing progress with a work coach.' },
      { type: 'paragraph', text: 'Job Seeker Copilot is independent and is not connected to the Department for Work and Pensions, Jobcentre Plus or Universal Credit. Users remain responsible for reviewing the information and deciding what they submit through official government services.' },
    ],
  },
];

export function faqItemsForRelease(publicBetaEnabled: boolean): readonly FaqItem[] {
  if (!publicBetaEnabled) return FAQ_ITEMS;

  return FAQ_ITEMS.map(item => item.id === 'availability' ? {
    ...item,
    blocks: [
      {type: 'paragraph' as const, text: 'Yes. Job Seeker Copilot is available as a UK public beta.'},
      {type: 'paragraph' as const, text: 'Beta features may change as reliability, security and usability evidence is gathered.'},
      {type: 'paragraph' as const, text: 'Create a free account to begin with two document credits, or sign in if you already have an account.'},
    ],
    callToAction: undefined,
  } : {
    ...item,
    blocks: item.blocks.map(block => block.type === 'paragraph'
      ? {...block, text: block.text.replace(
        'Job Seeker Copilot is currently at a pre-beta stage.',
        'Job Seeker Copilot is currently available as a public beta.',
      )}
      : block),
  });
}

export function faqAnswerText(item: FaqItem): string {
  return item.blocks.map(block => block.type === 'bullets' ? block.items.join(' ') : block.text).join(' ');
}
