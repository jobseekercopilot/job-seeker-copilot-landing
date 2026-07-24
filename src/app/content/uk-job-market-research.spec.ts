import { UK_JOB_MARKET_RESEARCH } from './uk-job-market-research';

describe('UK_JOB_MARKET_RESEARCH', () => {
  it('records the reviewed and next scheduled ONS dates', () => {
    expect(UK_JOB_MARKET_RESEARCH.dataReviewed).toBe('24 July 2026');
    expect(UK_JOB_MARKET_RESEARCH.nextScheduledOnsRelease).toBe('18 August 2026');
  });

  it('keeps the consistent ONS comparison periods and the verified vacancy peak context', () => {
    expect(UK_JOB_MARKET_RESEARCH.historicalLabourMarket).toEqual([
      expect.objectContaining({ period: 'March to May 2016', vacancies: '746,000', unemployedPerVacancy: '2.2' }),
      expect.objectContaining({ period: 'January to March 2020', vacancies: '788,000', unemployedPerVacancy: '1.8' }),
      expect.objectContaining({ period: 'March to May 2022', vacancies: '1.293 million', unemployedPerVacancy: '1.0' }),
      expect.objectContaining({ period: 'March to May 2026', vacancies: '710,000', unemployedPerVacancy: '2.5' }),
    ]);
  });

  it('keeps graduate application ratios separate from the national labour-market series', () => {
    expect(UK_JOB_MARKET_RESEARCH.graduateApplications.map(point => point.applicationsPerVacancy))
      .toEqual([38, 86, 140, 140]);
    expect(UK_JOB_MARKET_RESEARCH.graduateApplications.every(point => point.note.includes('ISE'))).toBe(true);
  });

  it('provides a unique, complete and direct source list', () => {
    const sources = UK_JOB_MARKET_RESEARCH.sources;
    expect(sources).toHaveLength(23);
    expect(new Set(sources.map(source => source.id)).size).toBe(sources.length);
    expect(new Set(sources.map(source => source.number)).size).toBe(sources.length);
    expect(sources.every(source => source.url.startsWith('https://'))).toBe(true);
    expect(sources.every(source => source.accessedDate === '24 July 2026')).toBe(true);
    expect(sources.every(source => source.supports.length > 20)).toBe(true);
    expect(sources.map(source => source.id)).toContain('source-totaljobs-2026');
    expect(sources.map(source => source.id)).toContain('source-totaljobs-hiring-efficiency-2025');
  });

  it('does not introduce rejected application-success claims', () => {
    const content = JSON.stringify(UK_JOB_MARKET_RESEARCH);
    for (const rejected of ['27 applications', '162 applications', '4% interview', '1% job', '100 applications']) {
      expect(content).not.toContain(rejected);
    }
  });
});
