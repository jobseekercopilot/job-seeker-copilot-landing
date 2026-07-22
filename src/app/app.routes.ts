import { Routes } from '@angular/router';
import { SEO_ROUTES } from './seo/seo-routes';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/home/home').then(module => module.HomePage),
    title: SEO_ROUTES.home.title,
    data: { seo: SEO_ROUTES.home },
  },
  {
    path: 'about',
    loadComponent: () => import('./pages/about/about').then(module => module.AboutPage),
    title: SEO_ROUTES.about.title,
    data: { seo: SEO_ROUTES.about },
  },
  {
    path: 'faq',
    loadComponent: () => import('./pages/faq/faq').then(module => module.FaqPage),
    title: SEO_ROUTES.faq.title,
    data: { seo: SEO_ROUTES.faq },
  },
  {
    path: 'the-journey-so-far/job-search-platform-comparison',
    loadComponent: () => import('./pages/platform-comparison/platform-comparison').then(module => module.PlatformComparisonPage),
    title: SEO_ROUTES.comparison.title,
    data: { seo: SEO_ROUTES.comparison },
  },
  {
    path: 'privacy',
    loadComponent: () => import('./pages/legal/legal-page').then(module => module.LegalPage),
    data: { page: 'privacy', seo: SEO_ROUTES.privacy },
    title: SEO_ROUTES.privacy.title,
  },
  {
    path: 'terms',
    loadComponent: () => import('./pages/legal/legal-page').then(module => module.LegalPage),
    data: { page: 'terms', seo: SEO_ROUTES.terms },
    title: SEO_ROUTES.terms.title,
  },
  {
    path: 'contact',
    loadComponent: () => import('./pages/legal/legal-page').then(module => module.LegalPage),
    data: { page: 'contact', seo: SEO_ROUTES.contact },
    title: SEO_ROUTES.contact.title,
  },
  {
    path: 'accessibility',
    loadComponent: () => import('./pages/legal/legal-page').then(module => module.LegalPage),
    data: { page: 'accessibility', seo: SEO_ROUTES.accessibility },
    title: SEO_ROUTES.accessibility.title,
  },
  {
    path: 'waitlist/confirm',
    loadComponent: () => import('./pages/waitlist-action/waitlist-action').then(module => module.WaitlistActionPage),
    data: { action: 'confirm', seo: SEO_ROUTES.confirm },
    title: SEO_ROUTES.confirm.title,
  },
  {
    path: 'waitlist/resend',
    loadComponent: () => import('./pages/waitlist-action/waitlist-action').then(module => module.WaitlistActionPage),
    data: { action: 'resend', seo: SEO_ROUTES.resend },
    title: SEO_ROUTES.resend.title,
  },
  {
    path: 'waitlist/unsubscribe',
    loadComponent: () => import('./pages/waitlist-action/waitlist-action').then(module => module.WaitlistActionPage),
    data: { action: 'unsubscribe', seo: SEO_ROUTES.unsubscribe },
    title: SEO_ROUTES.unsubscribe.title,
  },
  {
    path: '404',
    loadComponent: () => import('./pages/not-found/not-found').then(module => module.NotFoundPage),
    title: SEO_ROUTES.notFound.title,
    data: { seo: SEO_ROUTES.notFound },
  },
  { path: '**', redirectTo: '404' },
];
