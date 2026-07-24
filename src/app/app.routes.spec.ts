import { routes } from './app.routes';
import { SEO_ROUTES } from './seo/seo-routes';

describe('application routes', () => {
  it('registers the Statistics journey article with its central SEO data', async () => {
    const route = routes.find(candidate => candidate.path === 'the-journey-so-far/uk-job-search-statistics');

    expect(route).toBeTruthy();
    expect(route?.title).toBe(SEO_ROUTES.statistics.title);
    expect(route?.data?.['seo']).toBe(SEO_ROUTES.statistics);
    expect(route?.loadComponent).toBeTypeOf('function');

    const component = await route?.loadComponent?.();
    expect('ɵcmp' in (component as object)).toBe(true);
  });
});
