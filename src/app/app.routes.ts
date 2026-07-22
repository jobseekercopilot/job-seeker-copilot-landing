import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/home/home').then(module => module.HomePage),
    title: 'Job Seeker Copilot | Organise your job search',
  },
  {
    path: 'about',
    loadComponent: () => import('./pages/about/about').then(module => module.AboutPage),
    title: 'The Story Behind Job Seeker Copilot | The Journey So Far',
  },
  {
    path: 'faq',
    loadComponent: () => import('./pages/faq/faq').then(module => module.FaqPage),
    title: 'Frequently Asked Questions | Job Seeker Copilot',
  },
  {
    path: 'the-journey-so-far/job-search-platform-comparison',
    loadComponent: () => import('./pages/platform-comparison/platform-comparison').then(module => module.PlatformComparisonPage),
    title: 'How Job Seeker Copilot Compares with Today’s Job Search Platforms | The Journey So Far',
  },
  {
    path: 'privacy',
    loadComponent: () => import('./pages/legal/legal-page').then(module => module.LegalPage),
    data: { page: 'privacy' },
    title: 'Privacy notice | Job Seeker Copilot',
  },
  {
    path: 'terms',
    loadComponent: () => import('./pages/legal/legal-page').then(module => module.LegalPage),
    data: { page: 'terms' },
    title: 'Terms | Job Seeker Copilot',
  },
  {
    path: 'contact',
    loadComponent: () => import('./pages/legal/legal-page').then(module => module.LegalPage),
    data: { page: 'contact' },
    title: 'Contact | Job Seeker Copilot',
  },
  {
    path: 'accessibility',
    loadComponent: () => import('./pages/legal/legal-page').then(module => module.LegalPage),
    data: { page: 'accessibility' },
    title: 'Accessibility Statement | Job Seeker Copilot',
  },
  {
    path: 'waitlist/confirm',
    loadComponent: () => import('./pages/waitlist-action/waitlist-action').then(module => module.WaitlistActionPage),
    data: { action: 'confirm' },
    title: 'Confirm your email | Job Seeker Copilot',
  },
  {
    path: 'waitlist/resend',
    loadComponent: () => import('./pages/waitlist-action/waitlist-action').then(module => module.WaitlistActionPage),
    data: { action: 'resend' },
    title: 'Request a confirmation email | Job Seeker Copilot',
  },
  {
    path: 'waitlist/unsubscribe',
    loadComponent: () => import('./pages/waitlist-action/waitlist-action').then(module => module.WaitlistActionPage),
    data: { action: 'unsubscribe' },
    title: 'Unsubscribe | Job Seeker Copilot',
  },
  { path: '**', redirectTo: '' },
];
