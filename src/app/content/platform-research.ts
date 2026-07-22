export type PlatformCategory = 'traditional' | 'specialist';

export interface ResearchSource {
  readonly label: string;
  readonly url: string;
}

export interface PlatformResearch {
  readonly platformId: string;
  readonly category: PlatformCategory;
  readonly description: string;
  readonly confirmed: readonly string[];
  readonly boundaries: readonly string[];
  readonly notConfirmed: readonly string[];
  readonly significance: string;
  readonly sources: readonly ResearchSource[];
}

export const PLATFORM_RESEARCH: readonly PlatformResearch[] = [
  {
    platformId: 'linkedin',
    category: 'traditional',
    description: 'A professional network and job marketplace with search, matching, application and job-tracking tools.',
    confirmed: [
      'Job search, recommendations and match information based on profile, preferences and résumé data.',
      'A five-stage Job Tracker with notes and manual updates for LinkedIn listings that redirect to an employer site.',
      'Saved application answers and up to four recently uploaded résumés.',
      'AI-assisted résumé tailoring and cover-letter drafting in supported Premium or rollout contexts.',
    ],
    boundaries: [
      'The documented tracker concerns jobs listed on LinkedIn, including LinkedIn listings that redirect elsewhere.',
      'AI résumé and application assistance can depend on Premium access, language, device, job eligibility or rollout.',
      'LinkedIn documents its AI résumé and cover-letter tools as producing material the applicant can review and edit before using it in an application.',
    ],
    notConfirmed: [
      'A general facility for importing an arbitrary vacancy found only on an unrelated job board.',
      'Automatic submission without the applicant’s final approval.',
    ],
    significance: 'LinkedIn overlaps with discovery, matching, tracking, notes, document tailoring and application assistance. It should not be described as only a place to find jobs.',
    sources: [
      { label: 'LinkedIn Help: Track and organise job opportunities', url: 'https://www.linkedin.com/help/linkedin/answer/a8684146' },
      { label: 'LinkedIn Help: AI-powered résumé tips', url: 'https://www.linkedin.com/help/linkedin/answer/a6865810' },
      { label: 'LinkedIn Help: AI-powered cover letter drafting', url: 'https://www.linkedin.com/help/linkedin/answer/a7127697' },
    ],
  },
  {
    platformId: 'indeed',
    category: 'traditional',
    description: 'A large job-search engine with direct and externally hosted vacancies, saved jobs and application-management tools.',
    confirmed: [
      'Job search, preferences and personalised results.',
      'My Jobs stages for Saved, Applied, Interviews and Archived opportunities.',
      'CV upload or selection during supported applications.',
      'Application statuses and employer messaging where the relevant Indeed workflow supports them.',
    ],
    boundaries: [
      'Some statuses and management actions apply only to jobs posted directly on Indeed.',
      'Applications completed on employer websites may require manual stage updates and are not fully recorded by Indeed.',
      'My Jobs shows a limited period rather than a permanent, complete application history.',
    ],
    notConfirmed: [
      'AI generation of a separate vacancy-specific CV inside Indeed.',
      'A central library linking several generated CV and cover-letter versions to individual applications.',
    ],
    significance: 'Indeed already solves important discovery and tracking needs, but its documented workflow varies according to where the application is completed.',
    sources: [
      { label: 'Indeed Support: What is My Jobs?', url: 'https://support.indeed.com/hc/en-gb/articles/205332490-What-is-My-Jobs' },
      { label: 'Indeed Support: Applying for a job', url: 'https://support.indeed.com/hc/en-us/articles/204652920-Applying-for-a-Job-Using-a-Resume-File' },
      { label: 'Indeed Support: Following up on an application', url: 'https://support.indeed.com/hc/en-gb/articles/360061954851-Following-Up-On-Your-Application' },
    ],
  },
  {
    platformId: 'reed',
    category: 'traditional',
    description: 'A UK job board for vacancy search, candidate profiles and applications to recruiters and employers.',
    confirmed: [
      'UK vacancy search, saved jobs and a list of jobs applied for.',
      'A candidate CV that can be replaced when applying.',
      'A covering letter written for an application, with the latest letter available for reuse.',
      'Basic application confirmation and recent application history.',
    ],
    boundaries: [
      'Uploading a different CV replaces the CV held on the candidate account for future applications.',
      'The latest covering letter is reused rather than documented as a library of separately stored versions.',
    ],
    notConfirmed: [
      'Integrated AI generation of vacancy-specific CVs or cover letters.',
      'Cross-platform application tracking or a separate document history for every vacancy.',
    ],
    significance: 'Reed is important because it already provides a familiar UK-focused search and application journey, while the reviewed documentation describes a simpler document model.',
    sources: [
      { label: 'Reed Help: Applying for jobs', url: 'https://www.reed.co.uk/help/applying' },
    ],
  },
  {
    platformId: 'totaljobs',
    category: 'traditional',
    description: 'A UK job board with profiles, alerts, job matching and account-based application tools.',
    confirmed: [
      'UK vacancy search, job alerts and instant job-match emails.',
      'A stored CV and active or archived application history.',
      'One-click apply using approved CV and cover-letter information.',
    ],
    boundaries: [
      'One-click apply depends on account configuration and the relevant application workflow.',
      'The help documentation describes reusable account information rather than a generated document set for each vacancy.',
    ],
    notConfirmed: [
      'AI generation or tailoring of a separate CV and cover letter for every vacancy.',
      'A tracker for arbitrary jobs imported from unrelated platforms.',
    ],
    significance: 'Totaljobs demonstrates that UK job boards already combine matching, stored application information and application history.',
    sources: [
      { label: 'Totaljobs: Help and support', url: 'https://www.totaljobs.com/about/help-and-support/' },
    ],
  },
  {
    platformId: 'cv-library',
    category: 'traditional',
    description: 'A UK job board with CV registration, alerts, saved jobs and direct application tools.',
    confirmed: [
      'UK vacancy search, CV registration and job alerts.',
      'Saved jobs and a candidate Applications view.',
      'One-click applications and mobile application tracking.',
    ],
    boundaries: [
      'The documented workflow centres on CV-Library vacancies and a candidate’s uploaded CV.',
      'Advice about tailoring documents is not evidence of integrated AI document generation.',
    ],
    notConfirmed: [
      'Vacancy-specific AI CV or cover-letter generation.',
      'Tracking jobs imported from several unrelated providers.',
      'A connected history of separate document versions for every application.',
    ],
    significance: 'CV-Library is another established UK route for search, alerts and application tracking, but the reviewed product documentation does not establish the same document-generation workflow.',
    sources: [
      { label: 'CV-Library: Candidate help', url: 'https://www.cv-library.co.uk/help/popular-questions' },
      { label: 'CV-Library: Job Search App', url: 'https://www.cv-library.co.uk/job-search-app' },
    ],
  },
  {
    platformId: 'adzuna',
    category: 'traditional',
    description: 'A job-search engine that aggregates vacancies and provides matching, CV and automated-application tools.',
    confirmed: [
      'Vacancy aggregation from many sources and AI-supported job matching.',
      'CV review, salary information and vacancy alerts.',
      'ApplyIQ can find and automatically submit applications matching user-defined requirements.',
      'ApplyIQ applications can be viewed in the user’s Adzuna account.',
    ],
    boundaries: [
      'ApplyIQ uses the uploaded CV and states that it does not rewrite that CV.',
      'The user controls criteria and can pause the service, but does not review every final submission before it is sent.',
    ],
    notConfirmed: [
      'A separately generated and stored tailored CV and cover letter for each ApplyIQ application.',
      'The broader connected document and work-search reporting workflow considered for Job Seeker Copilot.',
    ],
    significance: 'Adzuna means multi-source discovery and automated applications cannot be presented as unique ideas. Its automation model also provides a useful contrast with review-led submission.',
    sources: [
      { label: 'Adzuna: ApplyIQ', url: 'https://www.adzuna.co.uk/jobs/apply-iq' },
      { label: 'Adzuna: Recruitment products and matching', url: 'https://www.adzuna.co.uk/hire/products/job-listings/' },
    ],
  },
  {
    platformId: 'teal',
    category: 'specialist',
    description: 'A job-search workspace combining cross-site job saving, matching, tailored documents and tracking.',
    confirmed: [
      'Saving vacancies from supported job boards through a browser extension or adding them manually.',
      'Unlimited job tracking, notes, contacts, company information and stage guidance.',
      'A Match Score connected to a saved job and tailored résumé.',
      'AI-generated cover letters, email templates and PDF résumé export.',
    ],
    boundaries: [
      'Some analysis, AI and template capabilities depend on plan or credit limits.',
      'The documented workflow guides the user to submit the application rather than submitting it automatically.',
    ],
    notConfirmed: [
      'Automatic submission of applications without review.',
      'A feature designed specifically for UK employment-support activity reporting.',
    ],
    significance: 'Teal already demonstrates a connected save, match, tailor and track workflow, so that sequence cannot safely be claimed as unique.',
    sources: [
      { label: 'Teal Help: Track job applications', url: 'https://help.tealhq.com/en/articles/14435727-how-to-track-your-job-applications' },
      { label: 'Teal Help: Tailor a résumé for a job', url: 'https://help.tealhq.com/en/articles/14435726-how-to-tailor-your-resume-for-a-specific-job' },
    ],
  },
  {
    platformId: 'huntr',
    category: 'specialist',
    description: 'A job-search organiser with cross-site clipping, tailored documents, autofill, contacts and metrics.',
    confirmed: [
      'Saving jobs from employer sites and hundreds of supported job boards with a Chrome extension.',
      'Application tracking, activities, contacts, maps, metrics and data export.',
      'Job matching, tailored résumés and AI cover letters.',
      'Application autofill and document storage for résumés, cover letters and other correspondence.',
    ],
    boundaries: [
      'Tracking and AI allowances vary between Basic and Pro plans.',
      'Autofill prepares form content; the reviewed documentation does not establish automatic final submission.',
    ],
    notConfirmed: [
      'Automatic submission without the applicant’s final decision.',
      'UK-specific employment-support activity reporting.',
    ],
    significance: 'Huntr overlaps with nearly every current headline capability and is one of the closest direct competitors in the reviewed set.',
    sources: [
      { label: 'Huntr Help: Job Tracker', url: 'https://help.huntr.co/en/collections/10297189-job-tracker' },
      { label: 'Huntr Help: Plans and features', url: 'https://help.huntr.co/en/articles/10714568-plan-types-and-pricing' },
      { label: 'Huntr Help: Contacts and documents', url: 'https://help.huntr.co/en/articles/10089169-contacts-and-documents' },
    ],
  },
  {
    platformId: 'simplify',
    category: 'specialist',
    description: 'A job-search platform and browser assistant that combines matching, tracking, tailored documents and application autofill.',
    confirmed: [
      'Job search, personalised matches and saving jobs from supported boards.',
      'Application tracking across job sites, including automatic tracking after supported submissions.',
      'Résumé tailoring and job-specific cover-letter generation.',
      'Application autofill, saved responses and recruiter-email workflows connected to tracked roles.',
    ],
    boundaries: [
      'Autofill coverage varies by application website and workflow.',
      'The documented autofill process tells the user to review, edit and submit the application.',
      'Some generation and email features are part of Simplify+.',
    ],
    notConfirmed: [
      'Automatic final submission without user review.',
      'A work-search evidence feature designed for UK employment-support requirements.',
    ],
    significance: 'Simplify has a broad connected workflow and supports UK vacancies, showing that UK availability plus end-to-end tooling is not sufficient differentiation by itself.',
    sources: [
      { label: 'Simplify Help: Autofill applications', url: 'https://help.simplify.jobs/en/help/articles/2415391-using-copilot-to-autofill-applications' },
      { label: 'Simplify Help: Generate a cover letter', url: 'https://help.simplify.jobs/en/articles/0221176-auto-generating-a-cover-letter-with-copilot' },
      { label: 'Simplify Help: Simplify+ workflow', url: 'https://help.simplify.jobs/articles/8197013-the-complete-guide-to-simplify' },
    ],
  },
  {
    platformId: 'jobscan',
    category: 'specialist',
    description: 'A résumé-matching and optimisation platform that now also includes job discovery, tracking, cover letters and assisted applications.',
    confirmed: [
      'Résumé-to-job matching, ATS analysis and AI résumé optimisation.',
      'A Job Tracker containing match scores, interviews, contacts, notes and tasks.',
      'A vacancy-specific cover-letter generator whose output is linked to the tracked role.',
      'Auto Apply finds matching roles, prepares application answers and centralises statuses.',
    ],
    boundaries: [
      'Jobscan states that Auto Apply holds applications for review and requires the user to approve submission.',
      'Access to some optimisation and generation capabilities depends on plan or trial status.',
    ],
    notConfirmed: [
      'Automatic submission without the applicant’s approval.',
      'UK-specific work-search activity reporting.',
    ],
    significance: 'Jobscan has expanded beyond résumé scanning into a broad platform that overlaps strongly with matching, documents, tracking and controlled application assistance.',
    sources: [
      { label: 'Jobscan: Job Application Tracker', url: 'https://www.jobscan.co/job-tracker' },
      { label: 'Jobscan: Cover Letter Generator', url: 'https://www.jobscan.co/cover-letter-generator' },
      { label: 'Jobscan: Auto Apply', url: 'https://www.jobscan.co/auto-apply' },
    ],
  },
  {
    platformId: 'careerflow',
    category: 'specialist',
    description: 'A career platform combining a job portal, cross-site tracker, tailored résumés, cover letters and networking tools.',
    confirmed: [
      'A job portal aggregating listings plus browser-extension saving from supported boards and manual entry elsewhere.',
      'Application statuses, deadlines, notes, reminders, contacts and insights.',
      'Job-description skill matching and job-tailored résumé optimisation.',
      'AI cover letters and related premium career tools.',
    ],
    boundaries: [
      'Free and premium plans have different tracking, optimisation and cover-letter allowances.',
      'Some sites support one-click import while others require manual entry.',
    ],
    notConfirmed: [
      'Automatic final application submission.',
      'UK employment-support reporting or authorised adviser sharing.',
    ],
    significance: 'Careerflow is a direct competitor when the product scope includes application management, career guidance, interview preparation and networking.',
    sources: [
      { label: 'Careerflow Help: Getting started', url: 'https://help.careerflow.ai/en/articles/10723830-getting-started-with-careerflow-ai' },
      { label: 'Careerflow Help: Add a job to the tracker', url: 'https://help.careerflow.ai/en/articles/8936780-adding-a-job-to-your-job-tracker' },
      { label: 'Careerflow Help: Tailor a résumé', url: 'https://help.careerflow.ai/en/articles/13356325-how-to-tailor-a-resume-via-a-browser-extension' },
    ],
  },
  {
    platformId: 'kickresume',
    category: 'specialist',
    description: 'An AI-assisted résumé and cover-letter builder with a job board and application tracker.',
    confirmed: [
      'AI résumé creation, rewriting, templates and ATS-oriented checks.',
      'Personalised cover letters generated from a résumé and job description.',
      'A job board and application tracker for organising applications.',
    ],
    boundaries: [
      'AI use and template access vary between free and paid plans.',
      'The reviewed documentation establishes core document creation and tracking more clearly than cross-board automation or analytics.',
    ],
    notConfirmed: [
      'The same depth of application autofill, cross-board integration or analytics documented by Huntr and Simplify.',
      'Automatic final application submission.',
      'UK-specific employment-support reporting.',
    ],
    significance: 'Kickresume demonstrates that document generation and tracking are widely available together, even where the wider application workflow is less deeply documented.',
    sources: [
      { label: 'Kickresume: AI Résumé Writer', url: 'https://www.kickresume.com/en/ai-resume-writer/' },
      { label: 'Kickresume: Cover Letter Generator', url: 'https://www.kickresume.com/en/cover-letter-generator-from-resume/' },
      { label: 'Kickresume: Job Application Tracker', url: 'https://www.kickresume.com/en/job-application-tracker/' },
    ],
  },
];
