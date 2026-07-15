import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

const output = join('dist', 'job-seeker-copilot-landing', 'browser');
const home = await readFile(join(output, 'index.html'), 'utf8');
const article = await readFile(
  join(output, 'the-journey-so-far', 'job-search-platform-comparison', 'index.html'),
  'utf8',
);
const faq = await readFile(join(output, 'faq', 'index.html'), 'utf8');

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

if (home.indexOf('id="competitor-comparison"') > home.indexOf('id="roadmap"')) {
  throw new Error('The comparison section must appear before the roadmap.');
}

console.log('Prerender verification passed.');
