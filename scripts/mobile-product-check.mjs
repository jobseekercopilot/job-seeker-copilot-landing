import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

const baseUrl = (process.env.BASE_URL || 'http://127.0.0.1:4201').replace(/\/$/, '');
const evidenceDirectory = path.resolve(
  process.env.RELEASE_REVIEW_DIR || 'docs/release-review/mobile',
);
const viewports = [
  {name: 'phone-320', width: 320, height: 720},
  {name: 'phone-360', width: 360, height: 800},
  {name: 'phone-375', width: 375, height: 812},
  {name: 'phone-390', width: 390, height: 844},
  {name: 'phone-412', width: 412, height: 915},
  {name: 'tablet-768', width: 768, height: 1024},
];

await mkdir(evidenceDirectory, {recursive: true});
const browser = await chromium.launch({headless: true});
const failures = [];

try {
  for (const viewport of viewports) {
    const context = await browser.newContext({
      viewport: {width: viewport.width, height: viewport.height},
      deviceScaleFactor: 1,
      isMobile: viewport.width < 768,
      hasTouch: viewport.width < 768,
    });
    const page = await context.newPage();
    try {
      await page.goto(baseUrl, {waitUntil: 'networkidle'});
      await assertNoHorizontalOverflow(page, viewport.name, failures);

      if (await page.getByRole('button', {name: 'Toggle navigation'}).isVisible()) {
        const menu = page.getByRole('button', {name: 'Toggle navigation'});
        await menu.click();
        await menu.waitFor({state: 'visible'});
        await page.waitForFunction(
          () => document.querySelector('[aria-controls="primary-navigation"]')
            ?.getAttribute('aria-expanded') === 'true',
        );
        const pricing = page.getByRole('navigation', {name: 'Primary navigation'})
          .getByRole('link', {name: 'Pricing', exact: true});
        await pricing.click();
        await page.waitForFunction(() => location.hash === '#pricing');
      } else {
        await page.getByRole('navigation', {name: 'Primary navigation'})
          .getByRole('link', {name: 'Pricing', exact: true})
          .click();
      }

      await page.locator('#pricing').scrollIntoViewIfNeeded();
      await assertNoHorizontalOverflow(page, `${viewport.name}/pricing`, failures);
      await assertPracticalTouchTargets(page, viewport.name, failures);

      if (viewport.name === 'phone-390') {
        await page.screenshot({
          path: path.join(evidenceDirectory, 'landing-page-phone-390.png'),
          fullPage: true,
        });
        await page.locator('#pricing').screenshot({
          path: path.join(evidenceDirectory, 'pricing-phone-390.png'),
        });
        await page.goto(`${baseUrl}/faq`, {waitUntil: 'networkidle'});
        await page.screenshot({
          path: path.join(evidenceDirectory, 'faq-phone-390.png'),
          fullPage: true,
        });
      }
    } catch (error) {
      failures.push(`${viewport.name}: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      await context.close();
    }
  }
} finally {
  await browser.close();
}

if (failures.length) {
  console.error(failures.join('\n'));
  process.exitCode = 1;
} else {
  console.log(`Mobile product check passed at ${viewports.length} representative widths.`);
  console.log(`Release-review screenshots: ${evidenceDirectory}`);
}

async function assertNoHorizontalOverflow(page, label, failures) {
  const dimensions = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  if (dimensions.scrollWidth > dimensions.clientWidth) {
    failures.push(`${label}: horizontal overflow ${dimensions.scrollWidth}px > ${dimensions.clientWidth}px.`);
  }
}

async function assertPracticalTouchTargets(page, label, failures) {
  const undersized = await page.locator(
    'button:visible, a.button:visible, .primary-navigation a:visible',
  ).evaluateAll(elements => elements
    .map(element => {
      const box = element.getBoundingClientRect();
      return {
        label: (element.textContent || element.getAttribute('aria-label') || '').trim().slice(0, 80),
        width: Math.round(box.width),
        height: Math.round(box.height),
      };
    })
    .filter(box => box.width < 44 || box.height < 44));
  if (undersized.length) {
    failures.push(`${label}: undersized primary touch targets ${JSON.stringify(undersized)}.`);
  }
}
