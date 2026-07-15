import AxeBuilder from '@axe-core/playwright';
import { chromium } from 'playwright';

const baseUrl = (process.env.BASE_URL || 'http://127.0.0.1:4201').replace(/\/$/, '');
const routes = ['/', '/about', '/faq', '/the-journey-so-far/job-search-platform-comparison', '/privacy', '/terms', '/accessibility', '/contact', '/waitlist/confirm', '/waitlist/unsubscribe'];
const browser = await chromium.launch({ headless: true });
const failures = [];

try {
  for (const route of routes) {
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await context.newPage();
    await page.goto(`${baseUrl}${route}`, { waitUntil: 'networkidle' });
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .analyze();
    if (route === '/') {
      await page.keyboard.press('Tab');
      const skipLinkFocused = await page.locator('.skip-link').evaluate(element => element === document.activeElement);
      await page.keyboard.press('Enter');
      const mainFocused = await page.locator('#main-content').evaluate(element => element === document.activeElement);
      if (!skipLinkFocused || !mainFocused) {
        results.violations.push({
          id: 'skip-link-behaviour',
          impact: 'serious',
          help: 'The first keyboard control must skip focus to the main content.',
          nodes: [{ target: ['.skip-link', '#main-content'] }],
        });
      }
    }
    if (route === '/faq') {
      const firstQuestion = page.locator('#faq-button-what-is-job-seeker-copilot');
      await firstQuestion.focus();
      await page.keyboard.press('Enter');
      await page.waitForFunction(() => document.querySelector('#faq-button-what-is-job-seeker-copilot')?.getAttribute('aria-expanded') === 'false');
      const keyboardCollapsed = await firstQuestion.getAttribute('aria-expanded') === 'false';
      await page.goto(`${baseUrl}/faq#job-sources`, { waitUntil: 'networkidle' });
      await page.waitForFunction(() => document.querySelector('#faq-button-job-sources')?.getAttribute('aria-expanded') === 'true');
      const anchoredExpanded = await page.locator('#faq-button-job-sources').getAttribute('aria-expanded') === 'true';
      if (!keyboardCollapsed || !anchoredExpanded) {
        results.violations.push({
          id: 'faq-accordion-behaviour',
          impact: 'serious',
          help: 'FAQ questions must toggle from the keyboard and anchored questions must open.',
          nodes: [{ target: ['#faq-button-what-is-job-seeker-copilot', '#faq-button-job-sources'] }],
        });
      }
    }
    if (results.violations.length) {
      failures.push({
        route,
        violations: results.violations.map(violation => ({
          id: violation.id,
          impact: violation.impact,
          help: violation.help,
          targets: violation.nodes.flatMap(node => node.target),
        })),
      });
    }
    await context.close();
  }
} finally {
  await browser.close();
}

if (failures.length) {
  console.error(JSON.stringify(failures, null, 2));
  process.exitCode = 1;
} else {
  console.log(`Accessibility check passed for ${routes.length} routes.`);
}
