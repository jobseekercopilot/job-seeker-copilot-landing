import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';
import { setPublicAppConfig } from './app/config/public-app-config';

async function start(): Promise<void> {
  try {
    const response = await fetch('/config/app-config.json', { cache: 'no-store' });
    if (response.ok) setPublicAppConfig(await response.json());
  } catch {
    // Safe defaults keep forms disconnected when runtime configuration is unavailable.
  }

  await bootstrapApplication(App, appConfig);
}

start().catch(error => console.error(error));
