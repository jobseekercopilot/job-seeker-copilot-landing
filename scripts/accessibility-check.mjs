import AxeBuilder from '@axe-core/playwright';
import { chromium } from 'playwright';

const baseUrl = (process.env.BASE_URL || 'http://127.0.0.1:4201').replace(/\/$/, '');
const routes = ['/', '/about', '/privacy', '/terms', '/accessibility', '/contact', '/waitlist/confirm', '/waitlist/unsubscribe'];
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
