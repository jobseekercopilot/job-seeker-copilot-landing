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

describe('public beta configuration', () => {
  afterEach(() => setPublicAppConfig(DEFAULT_PUBLIC_APP_CONFIG));

  const beta = {
    ...DEFAULT_PUBLIC_APP_CONFIG,
    publicBetaEnabled: true,
    environmentName: 'production' as const,
    publicWebsiteUrl: 'https://www.jobseekercopilot.com',
    mainApplicationUrl: 'https://app.jobseekercopilot.com',
    registrationUrl: 'https://app.jobseekercopilot.com/register',
    signInUrl: 'https://app.jobseekercopilot.com/sign-in',
    pricingUrl: 'https://app.jobseekercopilot.com/payment',
    legalDocumentsReviewed: true,
    legalEffectiveDate: '2026-09-01',
    legalVersion: 'beta-1',
    legalEntityType: 'SOLE_TRADER' as const,
    taxStatus: 'NOT_VAT_REGISTERED' as const,
    legalEntityName: 'Northstar Career Services',
    tradingName: 'Job Seeker Copilot',
    businessAddress: '10 High Street, London, SW1A 1AA',
    privacyEmail: 'privacy@jobseekercopilot.com',
    supportEmail: 'support@jobseekercopilot.com',
    icoRegistrationStatus: 'NOT_REQUIRED_CONFIRMED',
    icoRegistrationReference: '',
    accountDeletionCompletionDays: 30,
    documentDeletionCompletionDays: 30,
    securityLogRetentionDays: 30,
    supportRecordRetentionDays: 365,
    financialRecordRetentionYears: 6,
  };

  it('enables beta links only for the canonical production configuration', () => {
    setPublicAppConfig(beta);
    expect(TestBed.inject(PUBLIC_APP_CONFIG).publicBetaEnabled).toBe(true);
  });

  it('fails closed for a development build or mismatched app origin', () => {
    setPublicAppConfig({...beta, environmentName: 'development'});
    expect(TestBed.inject(PUBLIC_APP_CONFIG).publicBetaEnabled).toBe(false);

    TestBed.resetTestingModule();
    setPublicAppConfig({...beta, pricingUrl: 'https://other.example/payment'});
    expect(TestBed.inject(PUBLIC_APP_CONFIG).publicBetaEnabled).toBe(false);
  });

  it('fails closed if runtime configuration attempts to broaden beta access below 18', () => {
    setPublicAppConfig({...beta, minimumUserAge: 16});
    expect(TestBed.inject(PUBLIC_APP_CONFIG).publicBetaEnabled).toBe(false);
    expect(TestBed.inject(PUBLIC_APP_CONFIG).minimumUserAge).toBe(18);
  });

  it('fails closed until seller form and tax status are explicitly configured', () => {
    setPublicAppConfig({...beta, legalEntityType: 'NOT_CONFIGURED'});
    expect(TestBed.inject(PUBLIC_APP_CONFIG).publicBetaEnabled).toBe(false);

    TestBed.resetTestingModule();
    setPublicAppConfig({...beta, taxStatus: 'NOT_CONFIGURED'});
    expect(TestBed.inject(PUBLIC_APP_CONFIG).publicBetaEnabled).toBe(false);
  });

  it('fails closed for impossible dates and release placeholders', () => {
    setPublicAppConfig({...beta, legalEffectiveDate: '2026-09-31'});
    expect(TestBed.inject(PUBLIC_APP_CONFIG).publicBetaEnabled).toBe(false);

    TestBed.resetTestingModule();
    setPublicAppConfig({...beta, legalEntityName: 'Example Legal Entity'});
    expect(TestBed.inject(PUBLIC_APP_CONFIG).publicBetaEnabled).toBe(false);

    TestBed.resetTestingModule();
    setPublicAppConfig({...beta, businessAddress: 'Address supplied at release'});
    expect(TestBed.inject(PUBLIC_APP_CONFIG).publicBetaEnabled).toBe(false);
  });
});
