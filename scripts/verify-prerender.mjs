import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

const output = join('dist', 'job-seeker-copilot-landing', 'browser');
const home = await readFile(join(output, 'index.html'), 'utf8');
const article = await readFile(
  join(output, 'the-journey-so-far', 'job-search-platform-comparison', 'index.html'),
  'utf8',
);
const faq = await readFile(join(output, 'faq', 'index.html'), 'utf8');
const contact = await readFile(join(output, 'contact', 'index.html'), 'utf8');
const runtimeConfig = JSON.parse(await readFile(join(output, 'config', 'app-config.json'), 'utf8'));

const requirements = [
  [home, 'id="competitor-comparison"', 'homepage comparison section'],
  [home, 'How Job Seeker Copilot Fits In', 'homepage comparison heading'],
  [article, 'How Job Seeker Copilot Compares with Today’s Job Search Platforms', 'article title'],
  [article, 'datePublished":"2026-07-16', 'structured publication date'],
  [article, 'rel="canonical" href="https://jobseekercopilot.com/the-journey-so-far/job-search-platform-comparison"', 'canonical URL'],
  [article, '"@type":"BlogPosting"', 'BlogPosting structured data'],
  [article, 'Independent comparison.', 'comparison disclaimer'],
  [faq, 'Frequently Asked Questions', 'FAQ title'],
  [faq, 'Job Seeker Copilot currently has three direct job-data integrations', 'FAQ job-source answer'],
  [faq, 'Reed', 'Reed integration'],
  [faq, 'Adzuna', 'Adzuna integration'],
  [faq, 'JSearch', 'JSearch integration'],
  [faq, '"@type":"FAQPage"', 'FAQPage structured data'],
  [faq, 'rel="canonical" href="https://www.jobseekercopilot.com/faq"', 'FAQ canonical URL'],
];

for (const [html, expected, label] of requirements) {
  if (!html.includes(expected)) throw new Error(`Prerendered HTML is missing ${label}.`);
}

if (contact.includes('@gmail.com')) {
  throw new Error('Prerendered contact HTML must not contain a personal Gmail address.');
}
if (runtimeConfig.environmentName === 'production') {
  if (contact.includes('development mode')) {
    throw new Error('Prerendered production contact HTML must not contain development-mode copy.');
  }
  if (!runtimeConfig.enableLiveSubmissions || !runtimeConfig.contactApiUrl) {
    if (!contact.includes('Online contact is temporarily unavailable') ||
        !contact.includes('hello@jobseekercopilot.com')) {
      throw new Error('Disabled production contact HTML must include the company fallback.');
    }
  }
} else if (runtimeConfig.environmentName === 'development' &&
           !contact.includes('development mode')) {
  throw new Error('Disconnected development contact HTML must explain its development state.');
}

if (home.indexOf('id="competitor-comparison"') > home.indexOf('id="roadmap"')) {
  throw new Error('The comparison section must appear before the roadmap.');
}

console.log('Prerender verification passed.');
