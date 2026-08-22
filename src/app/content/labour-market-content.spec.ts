import { LABOUR_MARKET_CONTENT } from './labour-market-content';

describe('LABOUR_MARKET_CONTENT', () => {
  it('keeps the four reviewed August 2026 figures in one typed source', () => {
    expect(LABOUR_MARKET_CONTENT.publicationDate).toBe('18 August 2026');
    expect(LABOUR_MARKET_CONTENT.lastReviewed).toBe('22 August 2026');
    expect(LABOUR_MARKET_CONTENT.nextReviewDate).toBe('15 September 2026');
    expect(LABOUR_MARKET_CONTENT.statistics.map(statistic => statistic.value))
      .toEqual(['4.9%', '1.772 million', '707,000', '2.5']);
  });

  it('gives every statistic transparent period, release, classification and source data', () => {
    for (const statistic of LABOUR_MARKET_CONTENT.statistics) {
      expect(statistic.period.length).toBeGreaterThan(0);
      expect(statistic.releaseDate).toBe('18 August 2026');
      expect(statistic.lastReviewed).toBe('22 August 2026');
      expect(statistic.sourceOrganisation).toBe('Office for National Statistics');
      expect(statistic.sourceUrl).toMatch(/^https:\/\/www\.ons\.gov\.uk\//);
      expect(statistic.sourceUrl).toContain('/august2026');
      expect(statistic.sourceType.length).toBeGreaterThan(0);
      expect(statistic.comparison.length).toBeGreaterThan(0);
      expect(statistic.notes.length).toBeGreaterThan(0);
    }
  });

  it('marks only the early vacancy estimate as provisional', () => {
    expect(LABOUR_MARKET_CONTENT.statistics.filter(statistic => statistic.isProvisional).map(statistic => statistic.value))
      .toEqual(['707,000']);
  });
});
