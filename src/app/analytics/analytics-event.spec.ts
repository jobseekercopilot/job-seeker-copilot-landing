import {
  analyticsAcquisition,
  analyticsTrafficClass,
  analyticsViewport,
  approvedAnalyticsPath,
  isSafeCampaign,
  safeCampaignFromUrl,
} from './analytics-event';

describe('privacy-bounded analytics event helpers', () => {
  it('allows only approved public paths and never returns a query or fragment', () => {
    expect(approvedAnalyticsPath('/about/?private=value#section')).toBe('/about');
    expect(approvedAnalyticsPath('/waitlist/confirm?token=private')).toBeNull();
    expect(approvedAnalyticsPath('/waitlist/resend?token=private')).toBeNull();
    expect(approvedAnalyticsPath('/internal')).toBeNull();
  });

  it('accepts only controlled non-personal campaign labels', () => {
    expect(safeCampaignFromUrl(
      '/?utm_source=LinkedIn&utm_medium=social&utm_campaign=beta_launch&utm_content=founder_post',
    )).toEqual({
      source: 'linkedin', medium: 'social', campaign: 'beta_launch', content: 'founder_post',
    });
    expect(safeCampaignFromUrl(
      '/?utm_source=person%40example.com&utm_medium=custom&utm_campaign=bernard_mcgeever&utm_content=private',
    )).toBeNull();
    expect(isSafeCampaign({ source: 'google', campaign: 'launch' })).toBe(true);
    expect(isSafeCampaign({ source: 'visitor_name' })).toBe(false);
    expect(isSafeCampaign({ source: 'google', visitor: 'identifier' })).toBe(false);
  });

  it('reduces attribution to a bounded category without returning the referrer', () => {
    expect(analyticsAcquisition('/?utm_source=google', '')).toBe('search');
    expect(analyticsAcquisition('/?utm_source=linkedin', '')).toBe('social');
    expect(analyticsAcquisition('/', 'https://www.google.com/search?q=private')).toBe('search');
    expect(analyticsAcquisition('/', 'https://unknown.example/private/person')).toBe('other');
    expect(analyticsAcquisition('/', '')).toBe('direct');
  });

  it('separates exact smoke traffic and exposes only broad viewport buckets', () => {
    expect(analyticsTrafficClass('/?analytics_test=smoke')).toBe('smoke');
    expect(analyticsTrafficClass('/?analytics_test=developer-name')).toBe('production');
    expect(analyticsViewport(320)).toBe('mobile');
    expect(analyticsViewport(800)).toBe('tablet');
    expect(analyticsViewport(1440)).toBe('desktop');
  });
});
