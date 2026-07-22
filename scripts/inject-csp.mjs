import { createHash } from 'node:crypto';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const output = join('dist', 'job-seeker-copilot-landing', 'browser');
const htmlFiles = await findHtmlFiles(output);

for (const file of htmlFiles) {
  const html = await readFile(file, 'utf8');
  const hashes = [...html.matchAll(/<script\b(?![^>]*\bsrc\s*=)[^>]*>([\s\S]*?)<\/script>/gi)]
    .map(match => `'sha256-${createHash('sha256').update(match[1], 'utf8').digest('base64')}'`);
  const policy = [
    `script-src 'self' ${[...new Set(hashes)].join(' ')}`.trim(),
    "object-src 'none'",
    "base-uri 'self'",
  ].join('; ');
  const meta = `<meta http-equiv="Content-Security-Policy" content="${policy}">`;
  if (!html.includes('<head>')) throw new Error(`Cannot inject CSP into ${file}.`);
  const secured = html.replace('<head>', `<head>${meta}`);
  await writeFile(file, secured, 'utf8');
}

console.log(`Injected route-specific hash CSP into ${htmlFiles.length} prerendered HTML files.`);

async function findHtmlFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map(entry => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return findHtmlFiles(path);
    return entry.isFile() && entry.name.endsWith('.html') ? [path] : [];
  }));
  return nested.flat();
}
