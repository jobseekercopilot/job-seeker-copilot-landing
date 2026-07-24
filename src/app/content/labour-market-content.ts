export type LabourMarketSourceType =
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
  'https://www.ons.gov.uk/employmentandlabourmarket/peopleinwork/employmentandemployeetypes/bulletins/employmentintheuk/july2026';
const vacanciesSource =
  'https://www.ons.gov.uk/employmentandlabourmarket/peopleinwork/employmentandemployeetypes/bulletins/jobsandvacanciesintheuk/july2026';
const overviewSource =
  'https://www.ons.gov.uk/employmentandlabourmarket/peopleinwork/employmentandemployeetypes/bulletins/uklabourmarket/july2026';

export const LABOUR_MARKET_CONTENT: LabourMarketContent = {
  lastReviewed: '24 July 2026',
  publicationDate: '21 July 2026',
  nextReviewDate: '18 August 2026',
  statistics: [
    {
      value: '4.9%',
      label: 'UK unemployment rate',
      description: 'Estimated share of economically active people aged 16 and over who were unemployed.',
      period: 'March to May 2026',
      releaseDate: '21 July 2026',
      sourceOrganisation: 'Office for National Statistics',
      sourceTitle: 'Employment in the UK: July 2026',
      sourceUrl: employmentSource,
      sourceType: 'Official statistics in development',
      comparison: 'Up 0.2 percentage points on the year, but down 0.1 percentage points on the quarter.',
      isProvisional: false,
      lastReviewed: '24 July 2026',
      notes: 'Labour Force Survey estimate. ONS advises caution with short-term changes.',
    },
    {
      value: '1.76 million',
      label: 'People estimated to be unemployed',
      description: 'Estimated number of unemployed people aged 16 and over in the UK.',
      period: 'March to May 2026',
      releaseDate: '21 July 2026',
      sourceOrganisation: 'Office for National Statistics',
      sourceTitle: 'Employment in the UK: July 2026',
      sourceUrl: employmentSource,
      sourceType: 'Official statistics in development',
      comparison: '81,000 more than a year earlier, but 17,000 fewer than in the previous quarter.',
      isProvisional: false,
      lastReviewed: '24 July 2026',
      notes: 'Rounded from the ONS estimate of 1,760,000. The estimated sampling variability was plus or minus 92,000.',
    },
    {
      value: '712,000',
      label: 'Estimated UK vacancies',
      description: 'Estimated positions for which employers were actively seeking recruits from outside their organisation.',
      period: 'April to June 2026',
      releaseDate: '21 July 2026',
      sourceOrganisation: 'Office for National Statistics',
      sourceTitle: 'Vacancies and jobs in the UK: July 2026',
      sourceUrl: vacanciesSource,
      sourceType: 'Accredited official statistics',
      comparison: '18,000 (2.5%) fewer than a year earlier and about 77,000 below January to March 2020.',
      isProvisional: true,
      lastReviewed: '24 July 2026',
      notes: 'Early three-month average from the ONS Vacancy Survey; the approximate confidence interval is plus or minus 32,000.',
    },
    {
      value: '2.5',
      label: 'Unemployed people per vacancy',
      description: 'Estimated number of unemployed people for each available unfilled job.',
      period: 'March to May 2026',
      releaseDate: '21 July 2026',
      sourceOrganisation: 'Office for National Statistics',
      sourceTitle: 'Vacancies and jobs in the UK: July 2026',
      sourceUrl: vacanciesSource,
      sourceType: 'Accredited official statistics with an LFS input',
      comparison: 'Unchanged since July to September 2025 and up from 2.3 a year earlier.',
      isProvisional: false,
      lastReviewed: '24 July 2026',
      notes: 'A labour-market tightness measure, not the number of applications received by each vacancy.',
    },
  ],
  sources: [
    {
      organisation: 'Office for National Statistics',
      title: 'Employment in the UK: July 2026',
      url: employmentSource,
      type: 'Official statistics in development',
    },
    {
      organisation: 'Office for National Statistics',
      title: 'Vacancies and jobs in the UK: July 2026',
      url: vacanciesSource,
      type: 'Accredited official statistics',
    },
    {
      organisation: 'Office for National Statistics',
      title: 'Labour market overview, UK: July 2026',
      url: overviewSource,
      type: 'Official statistics',
    },
  ],
};
