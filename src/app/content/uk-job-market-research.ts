export type ResearchSourceType =
  | 'Official statistic'
  | 'Official statistics'
  | 'Official statistics in development'
  | 'Accredited official statistic'
  | 'Government guidance'
  | 'Government research'
  | 'Parliamentary briefing'
  | 'Industry survey'
  | 'Industry analysis'
  | 'Independent research';

export interface ResearchSource {
  readonly id: string;
  readonly number: number;
  readonly organisation: string;
  readonly title: string;
  readonly publicationDate: string;
  readonly measurementPeriod: string;
  readonly url: string;
  readonly accessedDate: string;
  readonly sourceType: ResearchSourceType;
  readonly supports: string;
}

export interface HistoricalLabourMarketPoint {
  readonly period: string;
  readonly context: string;
  readonly unemploymentRate: string;
  readonly unemployedPeople: string;
  readonly youthUnemploymentRate: string;
  readonly youthUnemployedPeople: string;
  readonly vacancies: string;
  readonly unemployedPerVacancy: string;
}

export interface GraduateApplicationPoint {
  readonly recruitmentCycle: string;
  readonly applicationsPerVacancy: number;
  readonly note: string;
}

export interface UkJobMarketResearch {
  readonly dataReviewed: string;
  readonly nextScheduledOnsRelease: string;
  readonly historicalLabourMarket: readonly HistoricalLabourMarketPoint[];
  readonly graduateApplications: readonly GraduateApplicationPoint[];
  readonly sources: readonly ResearchSource[];
}

export const UK_JOB_MARKET_RESEARCH: UkJobMarketResearch = {
  dataReviewed: '22 August 2026',
  nextScheduledOnsRelease: '15 September 2026',
  historicalLabourMarket: [
    {
      period: 'March to May 2016',
      context: 'Ten-year comparison',
      unemploymentRate: '4.9%',
      unemployedPeople: '1.649 million',
      youthUnemploymentRate: '13.4%',
      youthUnemployedPeople: '611,000',
      vacancies: '746,000',
      unemployedPerVacancy: '2.2',
    },
    {
      period: 'January to March 2020',
      context: 'Immediate pre-pandemic comparison',
      unemploymentRate: '4.1%',
      unemployedPeople: '1.410 million',
      youthUnemploymentRate: '12.4%',
      youthUnemployedPeople: '539,000',
      vacancies: '788,000',
      unemployedPerVacancy: '1.8',
    },
    {
      period: 'March to May 2022',
      context: 'Near the unusual post-pandemic vacancy peak',
      unemploymentRate: '3.7%',
      unemployedPeople: '1.281 million',
      youthUnemploymentRate: '10.3%',
      youthUnemployedPeople: '435,000',
      vacancies: '1.293 million',
      unemployedPerVacancy: '1.0',
    },
    {
      period: 'March to May 2026',
      context: 'Latest common period',
      unemploymentRate: '4.9%',
      unemployedPeople: '1.760 million',
      youthUnemploymentRate: '16.4%',
      youthUnemployedPeople: '743,000',
      vacancies: '710,000',
      unemployedPerVacancy: '2.5',
    },
  ],
  graduateApplications: [
    {
      recruitmentCycle: '2002/03',
      applicationsPerVacancy: 38,
      note: 'Historic ISE member-employer average',
    },
    {
      recruitmentCycle: '2022/23',
      applicationsPerVacancy: 86,
      note: 'ISE member-employer average',
    },
    {
      recruitmentCycle: '2023/24',
      applicationsPerVacancy: 140,
      note: 'Record ISE member-employer average reported in 2024',
    },
    {
      recruitmentCycle: '2024/25',
      applicationsPerVacancy: 140,
      note: 'ISE member-employer average remained at the record level',
    },
  ],
  sources: [
    {
      id: 'source-ons-overview',
      number: 1,
      organisation: 'Office for National Statistics',
      title: 'Labour market overview, UK: August 2026',
      publicationDate: '18 August 2026',
      measurementPeriod: 'Headline indicators cover April to June 2026; Claimant Count covers July 2026; vacancies cover May to July 2026.',
      url: 'https://www.ons.gov.uk/employmentandlabourmarket/peopleinwork/employmentandemployeetypes/bulletins/uklabourmarket/august2026',
      accessedDate: '22 August 2026',
      sourceType: 'Official statistic',
      supports: 'Headline labour-market indicators, Claimant Count definition and provisional status, mixed source classifications, and the next scheduled release.',
    },
    {
      id: 'source-ons-employment',
      number: 2,
      organisation: 'Office for National Statistics',
      title: 'Employment in the UK: August 2026',
      publicationDate: '18 August 2026',
      measurementPeriod: 'April to June 2026, with quarterly and annual changes.',
      url: 'https://www.ons.gov.uk/employmentandlabourmarket/peopleinwork/employmentandemployeetypes/bulletins/employmentintheuk/august2026',
      accessedDate: '22 August 2026',
      sourceType: 'Official statistics',
      supports: 'Employment, unemployment and inactivity levels and rates; definitions; sampling variability; revisions and LFS quality cautions.',
    },
    {
      id: 'source-ons-vacancies',
      number: 3,
      organisation: 'Office for National Statistics',
      title: 'Vacancies and jobs in the UK: August 2026',
      publicationDate: '18 August 2026',
      measurementPeriod: 'Vacancies: May to July 2026; unemployment-to-vacancy ratio: April to June 2026.',
      url: 'https://www.ons.gov.uk/employmentandlabourmarket/peopleinwork/employmentandemployeetypes/bulletins/jobsandvacanciesintheuk/august2026',
      accessedDate: '22 August 2026',
      sourceType: 'Accredited official statistic',
      supports: 'Latest vacancies, annual and pre-pandemic comparisons, vacancy definition, uncertainty, and unemployed people per vacancy.',
    },
    {
      id: 'source-ons-a05',
      number: 4,
      organisation: 'Office for National Statistics',
      title: 'A05 SA: Employment, unemployment and economic inactivity by age group (seasonally adjusted)',
      publicationDate: '21 July 2026',
      measurementPeriod: 'Rolling three-month periods from 1992 to March to May 2026.',
      url: 'https://www.ons.gov.uk/employmentandlabourmarket/peopleinwork/employmentandemployeetypes/datasets/employmentunemploymentandeconomicinactivitybyagegroupseasonallyadjusteda05sa',
      accessedDate: '24 July 2026',
      sourceType: 'Official statistics in development',
      supports: 'Age-group time series, including youth unemployment levels and rates and the consistent 2016, 2020, 2022 and 2026 comparisons.',
    },
    {
      id: 'source-ons-vacs01',
      number: 5,
      organisation: 'Office for National Statistics',
      title: 'VACS01: Vacancies and unemployment',
      publicationDate: '21 July 2026',
      measurementPeriod: 'Rolling three-month periods from 2001 to April to June 2026.',
      url: 'https://www.ons.gov.uk/employmentandlabourmarket/peoplenotinwork/unemployment/datasets/vacanciesandunemploymentvacs01',
      accessedDate: '24 July 2026',
      sourceType: 'Accredited official statistic',
      supports: 'Consistent vacancy and unemployment time series, the April to June 2022 vacancy peak, and unemployed-to-vacancy ratios.',
    },
    {
      id: 'source-ons-a01',
      number: 6,
      organisation: 'Office for National Statistics',
      title: 'A01: Summary of labour market statistics',
      publicationDate: '21 July 2026',
      measurementPeriod: 'Latest monthly and rolling three-month UK labour-market series.',
      url: 'https://www.ons.gov.uk/employmentandlabourmarket/peopleinwork/employmentandemployeetypes/datasets/summaryoflabourmarketstatistics',
      accessedDate: '24 July 2026',
      sourceType: 'Official statistic',
      supports: 'Independent dataset cross-check of the headline labour-market values and series identifiers.',
    },
    {
      id: 'source-ons-history',
      number: 7,
      organisation: 'Office for National Statistics',
      title: 'Changes in the economy since the 1970s',
      publicationDate: '2 September 2019',
      measurementPeriod: 'Historical UK labour-market and economic series from 1971 to 2018.',
      url: 'https://www.ons.gov.uk/economy/economicoutputandproductivity/output/articles/changesintheeconomysincethe1970s/2019-09-02',
      accessedDate: '24 July 2026',
      sourceType: 'Official statistic',
      supports: 'Historical caution that the 1970s and 1980s contained materially different unemployment and economic conditions.',
    },
    {
      id: 'source-parliament-youth',
      number: 8,
      organisation: 'House of Commons Library',
      title: 'Youth unemployment statistics',
      publicationDate: '18 August 2026',
      measurementPeriod: 'Youth labour-market indicators for April to June 2026; NEET indicators for January to March 2026.',
      url: 'https://commonslibrary.parliament.uk/research-briefings/sn05871/',
      accessedDate: '22 August 2026',
      sourceType: 'Parliamentary briefing',
      supports: 'Cross-check of youth unemployment, year-on-year change, the distinction from NEET, and LFS reliability caveats.',
    },
    {
      id: 'source-parliament-labour',
      number: 9,
      organisation: 'House of Commons Library',
      title: 'UK labour market statistics',
      publicationDate: '18 August 2026',
      measurementPeriod: 'Latest UK indicators, principally April to June 2026.',
      url: 'https://commonslibrary.parliament.uk/research-briefings/cbp-9366/',
      accessedDate: '22 August 2026',
      sourceType: 'Parliamentary briefing',
      supports: 'Independent interpretation of ONS data, contrasting LFS with payroll and workforce-jobs evidence, and data-quality cautions.',
    },
    {
      id: 'source-ise-record',
      number: 10,
      organisation: 'Institute of Student Employers',
      title: 'Record graduate job applications',
      publicationDate: '17 October 2024',
      measurementPeriod: 'The 2023/24 student recruitment cycle.',
      url: 'https://ise.org.uk/knowledge/insights/410/record_graduate_job_applications/',
      accessedDate: '24 July 2026',
      sourceType: 'Industry analysis',
      supports: 'The 140 mean applications per graduate vacancy, more than 1.2 million applications, just under 17,000 vacancies, sector variation and stated contributing factors.',
    },
    {
      id: 'source-ise-2025',
      number: 11,
      organisation: 'Institute of Student Employers',
      title: 'Apprenticeships rise as graduate vacancies drop 8%',
      publicationDate: '15 October 2025',
      measurementPeriod: 'The 2024/25 student recruitment cycle, with comparisons back to 2002/03.',
      url: 'https://ise.org.uk/knowledge/insights/492/apprenticeships_rise_as_graduate_vacancies_drop_8/',
      accessedDate: '24 July 2026',
      sourceType: 'Industry analysis',
      supports: 'The 38, 86 and 140 application ratios, two years at the record level, 155-member sample, hiring changes, sector variation and technology-related interpretation.',
    },
    {
      id: 'source-ise-survey',
      number: 12,
      organisation: 'Institute of Student Employers',
      title: 'Student Recruitment Survey 2025',
      publicationDate: '15 October 2025',
      measurementPeriod: 'The 2024/25 student recruitment cycle.',
      url: 'https://ise.org.uk/_userfiles/pages/files/reports/student_recruitment_survey_2025.pdf',
      accessedDate: '24 July 2026',
      sourceType: 'Industry survey',
      supports: 'Survey methodology, member-employer scope, application volumes, graduate hiring, and employer responses to AI-assisted recruitment.',
    },
    {
      id: 'source-prospects',
      number: 13,
      organisation: 'Prospects Luminate and Institute of Student Employers',
      title: 'Three key trends in graduate recruitment this year',
      publicationDate: 'December 2025',
      measurementPeriod: 'The 2024/25 student recruitment cycle and forecasts for 2025/26.',
      url: 'https://luminate.prospects.ac.uk/three-key-trends-in-graduate-recruitment-this-year',
      accessedDate: '24 July 2026',
      sourceType: 'Industry analysis',
      supports: 'ISE sample limitations, graduate hiring context, application-ratio history, online-application factors and a cautious assessment of AI.',
    },
    {
      id: 'source-uc-quick-guide',
      number: 14,
      organisation: 'Department for Work and Pensions',
      title: 'Universal Credit and your claimant commitment',
      publicationDate: '28 March 2013; updated 29 April 2026',
      measurementPeriod: 'Current claimant-commitment guidance at the access date.',
      url: 'https://www.gov.uk/government/publications/universal-credit-and-your-claimant-commitment-quick-guide',
      accessedDate: '24 July 2026',
      sourceType: 'Government guidance',
      supports: 'Individual claimant commitments, circumstance-dependent work-related requirements and the consequences of unmet commitments.',
    },
    {
      id: 'source-uc-commitment',
      number: 15,
      organisation: 'GOV.UK',
      title: 'Universal Credit: Your claimant commitment',
      publicationDate: 'Live guidance; reviewed 24 July 2026',
      measurementPeriod: 'Current Universal Credit guidance at the access date.',
      url: 'https://www.gov.uk/universal-credit/your-claimant-commitment',
      accessedDate: '24 July 2026',
      sourceType: 'Government guidance',
      supports: 'Preparing for and looking for work, circumstances, work coaches, appointments and managing work-search information online.',
    },
    {
      id: 'source-uc-sanctions',
      number: 16,
      organisation: 'Department for Work and Pensions',
      title: 'Universal Credit sanctions',
      publicationDate: '12 February 2025; updated 6 April 2026',
      measurementPeriod: 'Current sanctions guidance at the access date.',
      url: 'https://www.gov.uk/guidance/universal-credit-sanctions',
      accessedDate: '24 July 2026',
      sourceType: 'Government guidance',
      supports: 'Potential sanctions for unmet agreed activities without good reason and examples of work-related activities.',
    },
    {
      id: 'source-uc-account',
      number: 17,
      organisation: 'GOV.UK',
      title: 'Sign in to your Universal Credit account',
      publicationDate: 'Live service guidance; reviewed 24 July 2026',
      measurementPeriod: 'Current Universal Credit account features at the access date.',
      url: 'https://www.gov.uk/sign-in-universal-credit',
      accessedDate: '24 July 2026',
      sourceType: 'Government guidance',
      supports: 'The account journal, to-do list, claimant commitment and messages with a case manager or work coach.',
    },
    {
      id: 'source-dwp-work-search',
      number: 18,
      organisation: 'Department for Work and Pensions',
      title: 'What makes work search reviews effective?',
      publicationDate: '25 February 2025',
      measurementPeriod: 'Evidence synthesis and qualitative research on Universal Credit work-search reviews.',
      url: 'https://www.gov.uk/government/publications/what-makes-work-search-reviews-effective',
      accessedDate: '24 July 2026',
      sourceType: 'Government research',
      supports: 'The role of tailored work-search reviews and constructive conversations between claimants and work coaches.',
    },
    {
      id: 'source-ies-erecruitment',
      number: 19,
      organisation: 'Institute for Employment Studies',
      title: 'e-Recruitment: Is it Delivering?',
      publicationDate: 'October 2003',
      measurementPeriod: 'Literature review, survey of 50 organisations and organisational case studies.',
      url: 'https://www.employment-studies.co.uk/system/files/resources/files/402.pdf',
      accessedDate: '24 July 2026',
      sourceType: 'Independent research',
      supports: 'Early evidence of web-based recruitment, online application forms, application tracking, email responses and concerns about application quantity and quality.',
    },
    {
      id: 'source-totaljobs-2026',
      number: 20,
      organisation: 'Totaljobs',
      title: 'Hiring Trends Update: Spring/Summer 2026',
      publicationDate: 'Spring 2026',
      measurementPeriod: 'Surveys conducted in March and April 2026 with 885 UK employers and 2,017 UK workers, compared with earlier Totaljobs surveys.',
      url: 'https://www.totaljobs.com/recruiter-advice/hiring-people/hiring-trends-update/',
      accessedDate: '24 July 2026',
      sourceType: 'Industry analysis',
      supports: 'Current candidate reports on interview difficulty, employer responses, higher skills requirements and the increase in applications submitted.',
    },
    {
      id: 'source-dwp-uc-full-service-survey',
      number: 21,
      organisation: 'Department for Work and Pensions',
      title: 'Universal Credit full service claimant survey',
      publicationDate: '8 June 2018',
      measurementPeriod: 'Two-wave telephone survey conducted from March to September 2017 with people who first claimed Universal Credit in November or December 2016.',
      url: 'https://www.gov.uk/government/publications/universal-credit-full-service-claimant-survey',
      accessedDate: '24 July 2026',
      sourceType: 'Government research',
      supports: 'Historical person-level evidence on applications reported in the previous week by Universal Credit claimants in different conditionality groups.',
    },
    {
      id: 'source-dwp-uc-families',
      number: 22,
      organisation: 'Department for Work and Pensions',
      title: 'Universal Credit test and learn evaluation: families',
      publicationDate: '15 September 2017',
      measurementPeriod: 'Quantitative and qualitative research with Universal Credit family claimants conducted from July 2015 to August 2016.',
      url: 'https://www.gov.uk/government/publications/universal-credit-test-and-learn-evaluation-families',
      accessedDate: '24 July 2026',
      sourceType: 'Government research',
      supports: 'Historical person-level evidence on weekly applications reported by family claimants who were required to look for work.',
    },
    {
      id: 'source-totaljobs-hiring-efficiency-2025',
      number: 23,
      organisation: 'Totaljobs',
      title: 'What’s slowing down your hiring? UK survey reveals the top blockers and breakthroughs',
      publicationDate: '8 August 2025',
      measurementPeriod: 'Online surveys conducted from 25 June to 3 July 2025 with 748 UK HR leaders and 2,025 UK jobseekers.',
      url: 'https://www.totaljobs.com/recruiter-advice/hiring-people/whats-slowing-down-your-hiring/',
      accessedDate: '24 July 2026',
      sourceType: 'Industry analysis',
      supports: 'Recruiter reports of application-screening delays, time spent on manual recruitment tasks, applications received per role and candidate process friction.',
    },
  ],
};
