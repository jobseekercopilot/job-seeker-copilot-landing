import rawRoutes from './seo-routes.json';
import { SeoRouteData } from './seo-route-data';

export type SeoRouteKey = keyof typeof rawRoutes;

export const SEO_ROUTES = rawRoutes as Record<SeoRouteKey, SeoRouteData>;
