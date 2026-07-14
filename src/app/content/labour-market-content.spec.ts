import { LABOUR_MARKET_CONTENT } from './labour-market-content';

describe('LABOUR_MARKET_CONTENT', () => {
  it('keeps the four reviewed June 2026 figures in one typed source', () => {
    expect(LABOUR_MARKET_CONTENT.publicationDate).toBe('18 June 2026');
    expect(LABOUR_MARKET_CONTENT.lastReviewed).toBe('13 July 2026');
    expect(LABOUR_MARKET_CONTENT.statistics.map(statistic => statistic.value))
      .toEqual(['4.9%', '75.0%', '707,000', '2.5']);
  });

  it('gives every statistic a period and versioned official ONS source', () => {
    for (const statistic of LABOUR_MARKET_CONTENT.statistics) {
      expect(statistic.period.length).toBeGreaterThan(0);
      expect(statistic.sourceName).toBe('Office for National Statistics');
      expect(statistic.sourceUrl).toMatch(/^https:\/\/www\.ons\.gov\.uk\//);
      expect(statistic.sourceUrl).toContain('/june2026');
    }
  });
});
