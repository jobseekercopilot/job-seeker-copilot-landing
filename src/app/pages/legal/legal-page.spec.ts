import {TestBed} from '@angular/core/testing';
import {ActivatedRoute, provideRouter} from '@angular/router';
import {
  DEFAULT_PUBLIC_APP_CONFIG,
  PUBLIC_APP_CONFIG,
} from '../../config/public-app-config';
import type {PublicAppConfig} from '../../config/public-app-config';
import {LegalPage} from './legal-page';

describe('LegalPage public-beta policy', () => {
  const reviewed: PublicAppConfig = {
    ...DEFAULT_PUBLIC_APP_CONFIG,
    publicBetaEnabled: true,
    legalDocumentsReviewed: true,
    minimumUserAge: 18,
    legalEffectiveDate: '2026-09-01',
    legalVersion: 'beta-1',
    legalEntityType: 'SOLE_TRADER',
    taxStatus: 'NOT_VAT_REGISTERED',
    legalEntityName: 'Northstar Career Services',
    tradingName: 'Job Seeker Copilot',
    businessAddress: '10 High Street, London, SW1A 1AA',
    privacyEmail: 'privacy@example.test',
    supportEmail: 'support@example.test',
    icoRegistrationStatus: 'NOT_REQUIRED_CONFIRMED',
    accountDeletionCompletionDays: 30,
    documentDeletionCompletionDays: 14,
    securityLogRetentionDays: 30,
    supportRecordRetentionDays: 365,
    financialRecordRetentionYears: 6,
  };

  async function render(page: 'privacy' | 'terms', config = reviewed) {
    await TestBed.configureTestingModule({
      imports: [LegalPage],
      providers: [
        provideRouter([]),
        {provide: ActivatedRoute, useValue: {snapshot: {data: {page}}}},
        {provide: PUBLIC_APP_CONFIG, useValue: config},
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(LegalPage);
    fixture.detectChanges();
    return fixture;
  }

  it('publishes runtime identity and exact retention only for a reviewed beta', async () => {
    const fixture = await render('privacy');
    const text = fixture.nativeElement.textContent as string;

    expect(text).toContain('Effective 2026-09-01 · version beta-1');
    expect(text).toContain('Northstar Career Services');
    expect(text).toContain('account deletion is normally completed within 30 days');
    expect(text).toContain('documents is normally completed within 14 days');
    expect(text).toContain('retained for 6 years');
    expect(text).toContain('UK residents aged 18 or over');
    expect(text).not.toContain('under 16');
  });

  it('keeps pre-launch legal text visibly draft even if partial fields are present', async () => {
    const fixture = await render('terms', {...reviewed, publicBetaEnabled: false});
    const text = fixture.nativeElement.textContent as string;

    expect(text).toContain('Draft for legal review · not yet effective');
    expect(text).toContain('draft terms describe the intended website and public-beta rules but are not yet effective');
    expect(text).toContain('Product account access and payments remain disabled');
    expect(text).not.toContain('By using this website, you agree');
    expect(text).not.toContain('10 High Street, London, SW1A 1AA');
  });

  it('keeps pre-launch privacy retention visibly uncommitted', async () => {
    const fixture = await render('privacy', {...reviewed, publicBetaEnabled: false});
    const text = fixture.nativeElement.textContent as string;

    expect(text).toContain('Draft for legal review · not yet effective');
    expect(text).toContain('This draft does not invent those periods');
    expect(text).not.toContain('10 High Street, London, SW1A 1AA');
  });

  it('states the 18+ UK eligibility, exact credit and cancellation rules', async () => {
    const fixture = await render('terms');
    const text = fixture.nativeElement.textContent as string;

    expect(text).toContain('available only to UK residents aged 18 or over');
    expect(text).toContain('agreement with Northstar Career Services, trading as Job Seeker Copilot');
    expect(text).toContain('support@example.test');
    expect(text).toContain('a pair uses two');
    expect(text).toContain('no subscription or automatic renewal');
    expect(text).toContain('14-day cancellation right');
    expect(text).toContain('may require manual review');
    expect(text).not.toContain('not being offered as a fully available public service');
    expect(text).not.toContain('VAT is described');
  });
});
