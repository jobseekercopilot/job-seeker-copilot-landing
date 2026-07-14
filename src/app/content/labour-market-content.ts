export interface LabourMarketStatistic {
  value: string;
  label: string;
  description: string;
  period: string;
  sourceName: string;
  sourceTitle: string;
  sourceUrl: string;
}

export interface LabourMarketSource {
  title: string;
  url: string;
}

export interface LabourMarketContent {
  lastReviewed: string;
  publicationDate: string;
  statistics: readonly LabourMarketStatistic[];
  sources: readonly LabourMarketSource[];
}

const employmentSource =
  'https://www.ons.gov.uk/employmentandlabourmarket/peopleinwork/employmentandemployeetypes/bulletins/employmentintheuk/june2026';
const vacanciesSource =
  'https://www.ons.gov.uk/employmentandlabourmarket/peopleinwork/employmentandemployeetypes/bulletins/jobsandvacanciesintheuk/june2026';
const overviewSource =
  'https://www.ons.gov.uk/employmentandlabourmarket/peopleinwork/employmentandemployeetypes/bulletins/uklabourmarket/june2026';

export const LABOUR_MARKET_CONTENT: LabourMarketContent = {
  lastReviewed: '13 July 2026',
  publicationDate: '18 June 2026',
  statistics: [
    {
      value: '4.9%',
      label: 'UK unemployment rate',
      description: 'Estimated rate for people aged 16 and over.',
      period: 'February to April 2026',
      sourceName: 'Office for National Statistics',
      sourceTitle: 'Employment in the UK: June 2026',
      sourceUrl: employmentSource,
    },
    {
      value: '75.0%',
      label: 'UK employment rate',
      description: 'Estimated rate for people aged 16 to 64.',
      period: 'February to April 2026',
      sourceName: 'Office for National Statistics',
      sourceTitle: 'Employment in the UK: June 2026',
      sourceUrl: employmentSource,
    },
    {
      value: '707,000',
      label: 'Estimated UK job vacancies',
      description: 'The estimate fell by 19,000 during the latest quarter and by 31,000 compared with a year earlier.',
      period: 'March to May 2026',
      sourceName: 'Office for National Statistics',
      sourceTitle: 'Vacancies and jobs in the UK: June 2026',
      sourceUrl: vacanciesSource,
    },
    {
      value: '2.5',
      label: 'Unemployed people per vacancy',
      description: 'Estimated number of unemployed people for each vacancy.',
      period: 'February to April 2026',
      sourceName: 'Office for National Statistics',
      sourceTitle: 'Vacancies and jobs in the UK: June 2026',
      sourceUrl: vacanciesSource,
    },
  ],
  sources: [
    { title: 'Employment in the UK: June 2026', url: employmentSource },
    { title: 'Vacancies and jobs in the UK: June 2026', url: vacanciesSource },
    { title: 'Labour market overview, UK: June 2026', url: overviewSource },
  ],
};
