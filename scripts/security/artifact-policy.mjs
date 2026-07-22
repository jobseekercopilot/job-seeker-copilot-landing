import { readFile, readdir, stat } from 'node:fs/promises';
import { basename, extname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(new URL('../..', import.meta.url)));
const DEFAULT_ARTIFACT_ROOT = join(ROOT, 'dist', 'job-seeker-copilot-landing', 'browser');
const PUBLIC_EMAILS = new Set([
  'hello@jobseekercopilot.com',
  'legal@jobseekercopilot.com',
  'privacy@jobseekercopilot.com',
  'support@jobseekercopilot.com',
  'updates@jobseekercopilot.com',
]);
const TEXT_EXTENSIONS = new Set(['.css', '.html', '.js', '.json', '.map', '.svg', '.txt', '.webmanifest', '.xml']);
const SOURCE_TEXT_EXTENSIONS = new Set([...TEXT_EXTENSIONS, '.py', '.ts', '.yaml', '.yml']);

const FORBIDDEN_ARTIFACT_PATTERNS = [
  ['local development URL', /(?:localhost|127\.0\.0\.1|0\.0\.0\.0)/i],
  ['deleted feature URL', /(?:feature[/-]waitlist-double-opt-in|waitlist-double-opt-in\.d3gd9ezfa3aujn\.amplifyapp\.com)/i],
  ['placeholder recipient', /(?:[\w.+-]+@example\.(?:com|test)|owner@|person@|replace[-_]me|change[-_]?me)/i],
  ['credential/debug marker', /(?:AWS_ACCESS_KEY_ID|AWS_SECRET_ACCESS_KEY|GITHUB_TOKEN|BEGIN [A-Z ]*PRIVATE KEY|\bdebugger\b)/],
  ['private backend setting', /(?:CONTACT_RECIPIENT_EMAIL|CONTACT_DEDUPE_PEPPER|SUBSCRIBER_HASH_PEPPER)/],
];
const EMAIL_PATTERN = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;

export function validateTrackedPaths(paths) {
  const violations = [];
  for (const path of paths) {
    const name = basename(path);
    if (/^\.env(?:\..+)?$/.test(name) && name !== '.env.example') {
      violations.push({ path, policy: 'tracked environment file' });
    }
    if (/(?:^|[-_.])(?:credentials?|service[-_]?account|id_rsa)(?:$|[-_.])|\.(?:key|p12|pfx|pem)$/i.test(name)) {
      violations.push({ path, policy: 'credential-like tracked filename' });
    }
  }
  return violations;
}

export function inspectText(content, path) {
  const violations = [];
  for (const [policy, pattern] of FORBIDDEN_ARTIFACT_PATTERNS) {
    if (pattern.test(content)) violations.push({ path, policy });
  }
  for (const address of content.match(EMAIL_PATTERN) || []) {
    if (!PUBLIC_EMAILS.has(address.toLowerCase())) {
      violations.push({ path, policy: 'unapproved email address' });
    }
  }
  return violations;
}

export function inspectApprovedEmails(content, path) {
  const violations = [];
  for (const address of content.match(EMAIL_PATTERN) || []) {
    if (!PUBLIC_EMAILS.has(address.toLowerCase())) {
      violations.push({ path, policy: 'unapproved source email address' });
    }
  }
  return violations;
}

async function textFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(entries.map(async entry => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return textFiles(path);
    return entry.isFile() && TEXT_EXTENSIONS.has(extname(entry.name).toLowerCase()) ? [path] : [];
  }));
  return files.flat();
}

export async function scanArtifacts(artifactRoot = DEFAULT_ARTIFACT_ROOT) {
  if (!(await stat(artifactRoot).catch(() => null))?.isDirectory()) {
    throw new Error(`Production artifact directory is missing: ${artifactRoot}`);
  }
  const files = await textFiles(artifactRoot);
  if (!files.some(path => basename(path) === 'index.html')) {
    throw new Error('Production artifacts do not contain a prerendered index.html.');
  }
  const violations = [];
  for (const file of files) {
    violations.push(...inspectText(await readFile(file, 'utf8'), relative(artifactRoot, file)));
  }
  return { files: files.length, violations };
}

async function main() {
  const trackedManifest = process.env.TRACKED_FILES_MANIFEST;
  if (!trackedManifest) throw new Error('Tracked source manifest is required.');
  const tracked = (await readFile(trackedManifest, 'utf8')).split('\0').filter(Boolean);
  if (!tracked.length) throw new Error('Tracked source inventory is empty.');
  const violations = validateTrackedPaths(tracked);
  const productionSources = tracked.filter(path => {
    if (path === '.env.example') return true;
    if (!SOURCE_TEXT_EXTENSIONS.has(extname(path).toLowerCase())) return false;
    if (path.startsWith('src/')) return !path.endsWith('.spec.ts');
    return path.startsWith('public/') ||
      path.startsWith('infrastructure/functions/') ||
      path.startsWith('infrastructure/waitlist-backend/function/') ||
      path === 'infrastructure/template.yaml' ||
      path === 'infrastructure/waitlist-backend/template.yaml';
  });
  for (const path of productionSources) {
    violations.push(...inspectApprovedEmails(await readFile(join(ROOT, path), 'utf8'), path));
  }
  const artifactArgument = process.argv[2]?.trim();
  const result = await scanArtifacts(artifactArgument ? resolve(artifactArgument) : DEFAULT_ARTIFACT_ROOT);
  violations.push(...result.violations);
  if (violations.length) {
    for (const violation of violations) console.error(`${violation.policy}: ${violation.path}`);
    throw new Error(`Production artifact policy failed with ${violations.length} finding(s).`);
  }
  console.log(
    `Production artifact policy passed (${tracked.length} tracked paths; ` +
    `${productionSources.length} production source files; ${result.files} text artifacts).`,
  );
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main();
}
