export type LabourMarketSourceType =
  | 'Official statistics'
  | 'Official statistics in development'
  | 'Accredited official statistics'
  | 'Accredited official statistics with an LFS input';

export interface LabourMarketStatistic {
  readonly value: string;
  readonly label: string;
  readonly description: string;
  readonly period: string;
  readonly releaseDate: string;
  readonly sourceOrganisation: string;
  readonly sourceTitle: string;
  readonly sourceUrl: string;
  readonly sourceType: LabourMarketSourceType;
  readonly comparison: string;
  readonly isProvisional: boolean;
  readonly lastReviewed: string;
  readonly notes: string;
}

export interface LabourMarketSource {
  readonly organisation: string;
  readonly title: string;
  readonly url: string;
  readonly type: LabourMarketSourceType | 'Official statistics';
}

export interface LabourMarketContent {
  readonly lastReviewed: string;
  readonly publicationDate: string;
  readonly nextReviewDate: string;
  readonly statistics: readonly LabourMarketStatistic[];
  readonly sources: readonly LabourMarketSource[];
}

const employmentSource =
  'https://www.ons.gov.uk/employmentandlabourmarket/peopleinwork/employmentandemployeetypes/bulletins/employmentintheuk/august2026';
const vacanciesSource =
  'https://www.ons.gov.uk/employmentandlabourmarket/peopleinwork/employmentandemployeetypes/bulletins/jobsandvacanciesintheuk/august2026';
const overviewSource =
  'https://www.ons.gov.uk/employmentandlabourmarket/peopleinwork/employmentandemployeetypes/bulletins/uklabourmarket/august2026';

export const LABOUR_MARKET_CONTENT: LabourMarketContent = {
  lastReviewed: '22 August 2026',
  publicationDate: '18 August 2026',
  nextReviewDate: '15 September 2026',
  statistics: [
    {
      value: '4.9%',
      label: 'UK unemployment rate',
      description: 'Estimated share of economically active people aged 16 and over who were unemployed.',
      period: 'April to June 2026',
      releaseDate: '18 August 2026',
      sourceOrganisation: 'Office for National Statistics',
      sourceTitle: 'Employment in the UK: August 2026',
      sourceUrl: employmentSource,
      sourceType: 'Official statistics',
      comparison: 'Up 0.2 percentage points on the year, but down 0.1 percentage points on the quarter.',
      isProvisional: false,
      lastReviewed: '22 August 2026',
      notes: 'Labour Force Survey estimate. ONS advises caution with short-term changes and recommends considering other labour-market indicators.',
    },
    {
      value: '1.772 million',
      label: 'People estimated to be unemployed',
      description: 'Estimated number of unemployed people aged 16 and over in the UK.',
      period: 'April to June 2026',
      releaseDate: '18 August 2026',
      sourceOrganisation: 'Office for National Statistics',
      sourceTitle: 'Employment in the UK: August 2026',
      sourceUrl: employmentSource,
      sourceType: 'Official statistics',
      comparison: '88,000 more than a year earlier, but 36,000 fewer than in the previous quarter.',
      isProvisional: false,
      lastReviewed: '22 August 2026',
      notes: 'ONS estimate of 1,772,000. The estimated sampling variability was plus or minus 92,000.',
    },
    {
      value: '707,000',
      label: 'Estimated UK vacancies',
      description: 'Estimated positions for which employers were actively seeking recruits from outside their organisation.',
      period: 'May to July 2026',
      releaseDate: '18 August 2026',
      sourceOrganisation: 'Office for National Statistics',
      sourceTitle: 'Vacancies and jobs in the UK: August 2026',
      sourceUrl: vacanciesSource,
      sourceType: 'Accredited official statistics',
      comparison: '19,000 (2.7%) fewer than a year earlier and about 81,000 below January to March 2020.',
      isProvisional: true,
      lastReviewed: '22 August 2026',
      notes: 'Early three-month average from the ONS Vacancy Survey; the approximate confidence interval is plus or minus 32,000.',
    },
    {
      value: '2.5',
      label: 'Unemployed people per vacancy',
      description: 'Estimated number of unemployed people for each available unfilled job.',
      period: 'April to June 2026',
      releaseDate: '18 August 2026',
      sourceOrganisation: 'Office for National Statistics',
      sourceTitle: 'Vacancies and jobs in the UK: August 2026',
      sourceUrl: vacanciesSource,
      sourceType: 'Accredited official statistics with an LFS input',
      comparison: 'Unchanged since July to September 2025 and up from 2.3 a year earlier.',
      isProvisional: false,
      lastReviewed: '22 August 2026',
      notes: 'A labour-market tightness measure, not the number of applications received by each vacancy.',
    },
  ],
  sources: [
    {
      organisation: 'Office for National Statistics',
      title: 'Employment in the UK: August 2026',
      url: employmentSource,
      type: 'Official statistics',
    },
    {
      organisation: 'Office for National Statistics',
      title: 'Vacancies and jobs in the UK: August 2026',
      url: vacanciesSource,
      type: 'Accredited official statistics',
    },
    {
      organisation: 'Office for National Statistics',
      title: 'Labour market overview, UK: August 2026',
      url: overviewSource,
      type: 'Official statistics',
    },
  ],
};
