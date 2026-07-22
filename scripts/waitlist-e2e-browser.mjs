import { writeSync } from 'node:fs';
import { chromium } from 'playwright';

const mode = process.env.TEST_MODE?.trim();
const baseUrl = normaliseBaseUrl(process.env.BASE_URL);
const viewport = process.env.TEST_VIEWPORT === 'mobile'
  ? { width: 390, height: 844 }
  : { width: 1280, height: 900 };
let currentStage = 'initialise';

if (!['submit', 'resend', 'confirm', 'invalid'].includes(mode)) {
  fail('unsupported_mode');
}

const browser = await chromium.launch({ headless: true });
try {
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();
  const cspViolations = [];
  page.on('console', message => {
    if (message.text().toLowerCase().includes('content security policy')) {
      cspViolations.push(true);
    }
  });

  const result = mode === 'submit'
    ? await submit(page)
    : mode === 'resend'
      ? await resend(page)
      : mode === 'confirm'
        ? await confirm(page)
        : await invalid(page);

  result.noCspViolations = cspViolations.length === 0;
  result.fitsViewport = await page.evaluate(
    () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
  );
  result.pass = Object.values(result).every(Boolean);
  process.stdout.write(`${JSON.stringify(result)}\n`);
  if (!result.pass) process.exitCode = 1;
  await context.close();
} catch {
  fail(`browser_e2e_failed_${currentStage}`);
} finally {
  await browser.close();
}

async function submit(page) {
  const email = controlledEmail();
  currentStage = 'submit_open_page';
  await page.goto(`${baseUrl}/`, { waitUntil: 'networkidle' });
  const input = page.locator('#waitlist-email-hero');
  const button = page.locator('.signup-form button[type="submit"]').first();
  const initiallyEnabled = await button.isEnabled();
  currentStage = 'submit_keyboard_input';
  await input.focus();
  await page.keyboard.type(email);
  await page.keyboard.press('Tab');
  const keyboardReachedButton = await button.evaluate(
    element => element === document.activeElement,
  );
  currentStage = 'submit_request';
  await page.keyboard.press('Enter');
  const success = page.locator('#waitlist-message-hero .message-success');
  currentStage = 'submit_wait_for_acceptance';
  await success.waitFor({ state: 'visible', timeout: 20_000 });
  return {
    initiallyEnabled,
    keyboardReachedButton,
    acceptedMessageVisible: /request received/i.test(await success.innerText()),
    inputCleared: await input.inputValue() === '',
    statusAnnounced: await page.locator('#waitlist-message-hero').getAttribute('role') === 'status',
  };
}

async function resend(page) {
  const email = controlledEmail();
  currentStage = 'resend_open_page';
  await page.goto(`${baseUrl}/waitlist/resend`, { waitUntil: 'networkidle' });
  const input = page.locator('#confirmation-resend-email');
  const button = page.getByRole('button', { name: 'Request a new confirmation email' });
  await input.focus();
  await page.keyboard.type(email);
  currentStage = 'resend_keyboard_submit';
  await page.keyboard.press('Tab');
  const keyboardReachedButton = await button.evaluate(
    element => element === document.activeElement,
  );
  await page.keyboard.press('Enter');
  const heading = page.getByRole('heading', {
    level: 1,
    name: 'Check your inbox if confirmation is pending.',
  });
  currentStage = 'resend_wait_for_acceptance';
  await heading.waitFor({ state: 'visible', timeout: 20_000 });
  return {
    keyboardReachedButton,
    neutralAcceptedHeading: await heading.isVisible(),
    statusAnnounced: await page.locator('.action-card').getAttribute('role') === 'status',
  };
}

async function confirm(page) {
  const confirmationUrl = process.env.CONFIRMATION_URL?.trim();
  const expectedHeading = process.env.EXPECTED_HEADING?.trim();
  if (!confirmationUrl || !expectedHeading || !allowedConfirmationUrl(confirmationUrl)) {
    fail('invalid_confirmation_input');
  }
  const secretToken = new URL(confirmationUrl).searchParams.get('token') ?? '';
  if (!secretToken) fail('missing_confirmation_token');
  currentStage = 'confirm_open_link';
  await page.goto(confirmationUrl, { waitUntil: 'networkidle' });
  const heading = page.getByRole('heading', { level: 1, name: expectedHeading });
  currentStage = 'confirm_wait_for_expected_state';
  await heading.waitFor({ state: 'visible', timeout: 20_000 });
  const bodyText = await page.locator('body').innerText();
  return {
    expectedHeadingVisible: await heading.isVisible(),
    tokenRemovedFromUrl: !page.url().includes(secretToken),
    tokenNotRendered: !bodyText.includes(secretToken),
    statusAnnounced: await page.locator('.action-card').getAttribute('role') === 'status',
  };
}

async function invalid(page) {
  const dummyToken = 'controlled-invalid-browser-token';
  currentStage = 'invalid_open_link';
  await page.goto(`${baseUrl}/waitlist/confirm?token=${dummyToken}`, {
    waitUntil: 'networkidle',
  });
  const heading = page.getByRole('heading', {
    level: 1,
    name: 'We couldn’t recognise this link.',
  });
  currentStage = 'invalid_wait_for_expected_state';
  await heading.waitFor({ state: 'visible', timeout: 20_000 });
  const bodyText = await page.locator('body').innerText();
  return {
    invalidHeadingVisible: await heading.isVisible(),
    tokenRemovedFromUrl: !page.url().includes(dummyToken),
    tokenNotRendered: !bodyText.includes(dummyToken),
    alertAnnounced: await page.locator('.action-card').getAttribute('role') === 'alert',
  };
}

function controlledEmail() {
  const value = process.env.TEST_EMAIL?.trim() ?? '';
  if (!/^[^\s@]+@jobseekercopilot\.com$/i.test(value)) fail('invalid_test_identity');
  return value;
}

function normaliseBaseUrl(value) {
  const candidate = value?.trim().replace(/\/$/, '') ?? '';
  if (![
    'https://develop.d3gd9ezfa3aujn.amplifyapp.com',
    'https://www.jobseekercopilot.com',
  ].includes(candidate)) {
    fail('invalid_base_url');
  }
  return candidate;
}

function allowedConfirmationUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' &&
      ['develop.d3gd9ezfa3aujn.amplifyapp.com', 'www.jobseekercopilot.com'].includes(url.hostname) &&
      url.pathname === '/waitlist/confirm';
  } catch {
    return false;
  }
}

function fail(reason) {
  writeSync(process.stdout.fd, `${JSON.stringify({ pass: false, reason })}\n`);
  process.exit(1);
}
