import { writeSync } from 'node:fs';
import { chromium } from 'playwright';

const mode = process.env.TEST_MODE?.trim();
const baseUrl = normaliseBaseUrl(process.env.BASE_URL);
const viewport = process.env.TEST_VIEWPORT === 'mobile'
  ? { width: 390, height: 844 }
  : { width: 1280, height: 900 };
const contactEndpoint = 'https://1la3mp57zg.execute-api.eu-west-2.amazonaws.com/contact';
let currentStage = 'initialise';

if (!['disabled', 'validation', 'honeypot', 'network-failure', 'submit'].includes(mode)) {
  fail('unsupported_mode');
}

const browser = await chromium.launch({ headless: true });
try {
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();
  const cspViolations = [];
  let contactPosts = 0;
  page.on('console', message => {
    if (message.text().toLowerCase().includes('content security policy')) cspViolations.push(true);
  });
  page.on('request', request => {
    if (request.method() === 'POST' && request.url() === contactEndpoint) contactPosts += 1;
  });

  const result = mode === 'disabled'
    ? await disabled(page)
    : mode === 'validation'
      ? await validation(page, () => contactPosts)
      : mode === 'honeypot'
        ? await honeypot(page, () => contactPosts)
        : mode === 'network-failure'
          ? await networkFailure(page, () => contactPosts)
          : await submit(page, () => contactPosts);

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

async function openContact(page) {
  currentStage = 'open_contact_page';
  await page.goto(`${baseUrl}/contact`, { waitUntil: 'networkidle' });
}

async function disabled(page) {
  await openContact(page);
  const button = page.getByRole('button', { name: 'Send message' });
  const body = await page.locator('body').innerText();
  return {
    submitDisabled: await button.isDisabled(),
    fallbackVisible: /online contact is temporarily unavailable/i.test(body),
    companyFallbackPresent: await page.locator('a[href^="mailto:"]').count() > 0,
    personalMailboxAbsent: !/@gmail\.com/i.test(body),
    statusAnnounced: await page.locator('.form-status').getAttribute('role') === 'status',
  };
}

async function validation(page, getPostCount) {
  await openContact(page);
  currentStage = 'validation_programmatic_submit';
  await dispatchSubmit(page);
  return {
    firstInvalidFocused: await page.locator('#contact-name').evaluate(
      element => element === document.activeElement,
    ),
    requiredErrorVisible: await page.getByText(
      'Enter your name using no more than 120 characters.',
      { exact: true },
    ).isVisible(),
    noBackendRequest: getPostCount() === 0,
  };
}

async function honeypot(page, getPostCount) {
  await openContact(page);
  await fillControlled(page);
  await page.locator('#contact-website').evaluate(element => {
    element.value = 'controlled-automation-signal';
    element.dispatchEvent(new Event('input', { bubbles: true }));
  });
  currentStage = 'honeypot_programmatic_submit';
  await dispatchSubmit(page);
  const error = page.locator('.form-status .status-error');
  await error.waitFor({ state: 'visible' });
  return {
    safeErrorVisible: /could not be sent/i.test(await error.innerText()),
    alertAnnounced: await page.locator('.form-status').getAttribute('role') === 'alert',
    noBackendRequest: getPostCount() === 0,
  };
}

async function networkFailure(page, getPostCount) {
  await page.route(contactEndpoint, route => route.request().method() === 'POST'
    ? route.abort('failed')
    : route.continue());
  await openContact(page);
  await fillControlled(page);
  await waitForServerTimingSignal(page);
  const message = await page.locator('#contact-message').inputValue();
  currentStage = 'network_failure_keyboard_submit';
  const keyboardReachedButton = await focusSubmitByKeyboard(page);
  await page.keyboard.press('Enter');
  const error = page.locator('.form-status .status-error');
  currentStage = 'network_failure_wait_for_error';
  await error.waitFor({ state: 'visible', timeout: 20_000 });
  return {
    keyboardReachedButton,
    safeErrorVisible: /could not be sent/i.test(await error.innerText()),
    alertAnnounced: await page.locator('.form-status').getAttribute('role') === 'alert',
    inputPreserved: await page.locator('#contact-message').inputValue() === message,
    exactlyOneAttempt: getPostCount() === 1,
  };
}

async function submit(page, getPostCount) {
  await openContact(page);
  await fillControlled(page);
  await waitForServerTimingSignal(page);
  const button = page.getByRole('button', { name: 'Send message' });
  const initiallyEnabled = await button.isEnabled();
  currentStage = 'submit_keyboard';
  const keyboardReachedButton = await focusSubmitByKeyboard(page);
  await page.keyboard.press('Enter');
  await dispatchSubmit(page);
  const success = page.locator('.form-status .status-success');
  currentStage = 'submit_wait_for_acceptance';
  await success.waitFor({ state: 'visible', timeout: 20_000 });
  return {
    initiallyEnabled,
    keyboardReachedButton,
    acceptedMessageVisible: /message has been sent/i.test(await success.innerText()),
    formCleared: await page.locator('#contact-name').inputValue() === '' &&
      await page.locator('#contact-email').inputValue() === '' &&
      await page.locator('#contact-subject').inputValue() === '' &&
      await page.locator('#contact-message').inputValue() === '',
    statusAnnounced: await page.locator('.form-status').getAttribute('role') === 'status',
    exactlyOnePostDespiteRepeat: getPostCount() === 1,
  };
}

async function fillControlled(page) {
  const values = controlledValues();
  currentStage = 'fill_controlled_fields';
  await page.locator('#contact-name').fill(values.name);
  await page.locator('#contact-email').fill(values.email);
  await page.locator('#contact-subject').fill(values.subject);
  await page.locator('#contact-message').fill(values.message);
}

async function focusSubmitByKeyboard(page) {
  const button = page.getByRole('button', { name: 'Send message' });
  await page.locator('#contact-message').focus();
  await page.keyboard.press('Tab');
  return button.evaluate(element => element === document.activeElement);
}

async function dispatchSubmit(page) {
  await page.locator('.contact-form').evaluate(form => {
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
  });
}

async function waitForServerTimingSignal(page) {
  await page.waitForTimeout(1_300);
}

function controlledValues() {
  const values = {
    name: process.env.TEST_NAME?.trim() ?? '',
    email: process.env.TEST_EMAIL?.trim() ?? '',
    subject: process.env.TEST_SUBJECT?.trim() ?? '',
    message: process.env.TEST_MESSAGE?.trim() ?? '',
  };
  if (!values.name || values.name.length > 120 || /[\r\n]/.test(values.name)) fail('invalid_test_name');
  if (!/^[^\s@]+@jobseekercopilot\.com$/i.test(values.email)) fail('invalid_test_identity');
  if (!values.subject || values.subject.length > 160 || /[\r\n]/.test(values.subject)) fail('invalid_test_subject');
  if (values.message.length < 10 || values.message.length > 3_000 || /\0/.test(values.message)) {
    fail('invalid_test_message');
  }
  return values;
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

function fail(reason) {
  writeSync(process.stdout.fd, `${JSON.stringify({ pass: false, reason })}\n`);
  process.exit(1);
}
