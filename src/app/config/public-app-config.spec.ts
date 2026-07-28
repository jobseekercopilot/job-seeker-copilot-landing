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

describe('public analytics configuration', () => {
  afterEach(() => setPublicAppConfig(DEFAULT_PUBLIC_APP_CONFIG));

  it('fails closed without canonical production and an approved endpoint', () => {
    setPublicAppConfig({
      ...DEFAULT_PUBLIC_APP_CONFIG,
      environmentName: 'development',
      publicWebsiteUrl: 'https://www.jobseekercopilot.com',
      analyticsEnabled: true,
      analyticsEndpointUrl: 'https://api.example.test/analytics',
      waitlistApiUrl: 'https://api.example.test/waitlist',
    });
    expect(TestBed.inject(PUBLIC_APP_CONFIG).analyticsEnabled).toBe(false);

    TestBed.resetTestingModule();
    setPublicAppConfig({
      ...DEFAULT_PUBLIC_APP_CONFIG,
      environmentName: 'production',
      publicWebsiteUrl: 'https://www.jobseekercopilot.com',
      analyticsEnabled: true,
      analyticsEndpointUrl: 'https://api.example.test/analytics?identifier=value',
      waitlistApiUrl: 'https://api.example.test/waitlist',
    });
    expect(TestBed.inject(PUBLIC_APP_CONFIG).analyticsEnabled).toBe(false);
  });

  it('accepts canonical production and the bounded HTTPS endpoint', () => {
    setPublicAppConfig({
      ...DEFAULT_PUBLIC_APP_CONFIG,
      environmentName: 'production',
      publicWebsiteUrl: 'https://www.jobseekercopilot.com',
      analyticsEnabled: true,
      analyticsEndpointUrl: 'https://api.example.test/analytics',
      waitlistApiUrl: 'https://api.example.test/waitlist',
    });
    expect(TestBed.inject(PUBLIC_APP_CONFIG).analyticsEnabled).toBe(true);
  });

  it('rejects an analytics collector on a different API origin', () => {
    setPublicAppConfig({
      ...DEFAULT_PUBLIC_APP_CONFIG,
      environmentName: 'production',
      publicWebsiteUrl: 'https://www.jobseekercopilot.com',
      analyticsEnabled: true,
      analyticsEndpointUrl: 'https://other.example.test/analytics',
      waitlistApiUrl: 'https://api.example.test/waitlist',
    });
    expect(TestBed.inject(PUBLIC_APP_CONFIG).analyticsEnabled).toBe(false);
  });
});

describe('public application entrance configuration', () => {
  afterEach(() => {
    TestBed.resetTestingModule();
    setPublicAppConfig(DEFAULT_PUBLIC_APP_CONFIG);
  });

  it('accepts only the approved hosted application routes in production', () => {
    setPublicAppConfig({
      ...DEFAULT_PUBLIC_APP_CONFIG,
      environmentName: 'production',
      mainApplicationUrl: 'https://app.jobseekercopilot.com',
      registrationUrl: 'https://app.jobseekercopilot.com/register',
      signInUrl: 'https://app.jobseekercopilot.com/sign-in',
    });

    const config = TestBed.inject(PUBLIC_APP_CONFIG);
    expect(config.mainApplicationUrl).toBe('https://app.jobseekercopilot.com/');
    expect(config.registrationUrl).toBe('https://app.jobseekercopilot.com/register');
    expect(config.signInUrl).toBe('https://app.jobseekercopilot.com/sign-in');
  });

  it('fails closed for an unexpected production origin or token-bearing URL', () => {
    setPublicAppConfig({
      ...DEFAULT_PUBLIC_APP_CONFIG,
      environmentName: 'production',
      mainApplicationUrl: 'https://example.test',
      registrationUrl: 'https://app.jobseekercopilot.com/register?token=secret',
      signInUrl: 'https://app.jobseekercopilot.com/sign-in#fragment',
    });

    const config = TestBed.inject(PUBLIC_APP_CONFIG);
    expect(config.mainApplicationUrl).toBe('');
    expect(config.registrationUrl).toBe('');
    expect(config.signInUrl).toBe('');
  });

  it('allows explicit localhost routes outside production', () => {
    setPublicAppConfig({
      ...DEFAULT_PUBLIC_APP_CONFIG,
      environmentName: 'development',
      mainApplicationUrl: 'http://localhost:4200',
      registrationUrl: 'http://localhost:4200/register',
      signInUrl: 'http://localhost:4200/sign-in',
    });

    const config = TestBed.inject(PUBLIC_APP_CONFIG);
    expect(config.mainApplicationUrl).toBe('http://localhost:4200/');
    expect(config.registrationUrl).toBe('http://localhost:4200/register');
    expect(config.signInUrl).toBe('http://localhost:4200/sign-in');
  });
});
