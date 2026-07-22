import { copyFile } from 'node:fs/promises';
import { join } from 'node:path';

const output = join('dist', 'job-seeker-copilot-landing', 'browser');
await copyFile(join(output, '404', 'index.html'), join(output, '404.html'));
console.log('Prepared the static 404 fallback.');
