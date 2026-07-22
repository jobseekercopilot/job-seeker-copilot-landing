import { TestBed } from '@angular/core/testing';
import {
  DEFAULT_PUBLIC_APP_CONFIG,
  PUBLIC_APP_CONFIG,
  setPublicAppConfig,
} from './public-app-config';

describe('public search indexing configuration', () => {
  afterEach(() => setPublicAppConfig(DEFAULT_PUBLIC_APP_CONFIG));

  it('fails closed for development and the non-canonical production host', () => {
    setPublicAppConfig({
      ...DEFAULT_PUBLIC_APP_CONFIG,
      environmentName: 'development',
      publicWebsiteUrl: 'https://www.jobseekercopilot.com',
      searchIndexingEnabled: true,
    });
    expect(TestBed.inject(PUBLIC_APP_CONFIG).searchIndexingEnabled).toBe(false);

    TestBed.resetTestingModule();
    setPublicAppConfig({
      ...DEFAULT_PUBLIC_APP_CONFIG,
      environmentName: 'production',
      publicWebsiteUrl: 'https://jobseekercopilot.com',
      searchIndexingEnabled: true,
    });
    expect(TestBed.inject(PUBLIC_APP_CONFIG).searchIndexingEnabled).toBe(false);
  });

  it('accepts the approved production canonical configuration', () => {
    setPublicAppConfig({
      ...DEFAULT_PUBLIC_APP_CONFIG,
      environmentName: 'production',
      publicWebsiteUrl: 'https://www.jobseekercopilot.com',
      searchIndexingEnabled: true,
    });

    expect(TestBed.inject(PUBLIC_APP_CONFIG).searchIndexingEnabled).toBe(true);
  });
});
