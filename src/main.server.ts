import { BootstrapContext, bootstrapApplication } from '@angular/platform-browser';
import runtimeConfig from '../public/config/app-config.json';
import { App } from './app/app';
import { config } from './app/app.config.server';
import { setPublicAppConfig } from './app/config/public-app-config';

setPublicAppConfig(runtimeConfig);

const bootstrap = (context: BootstrapContext) => bootstrapApplication(App, config, context);

export default bootstrap;
