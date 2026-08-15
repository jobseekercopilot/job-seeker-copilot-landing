import {ChangeDetectionStrategy, Component, inject} from '@angular/core';
import { RouterLink } from '@angular/router';
import { AccessibilitySectionComponent } from '../../components/accessibility-section/accessibility-section';
import { CompetitorComparisonSectionComponent } from '../../components/competitor-comparison-section/competitor-comparison-section';
import { EmailSignupFormComponent } from '../../components/email-signup-form/email-signup-form';
import { FeatureSectionComponent, LandingFeature } from '../../components/feature-section/feature-section';
import { FooterComponent } from '../../components/footer/footer';
import { HeaderComponent } from '../../components/header/header';
import { HowItWorksComponent } from '../../components/how-it-works/how-it-works';
import { LabourMarketSectionComponent } from '../../components/labour-market-section/labour-market-section';
import { PricingSectionComponent } from '../../components/pricing-section/pricing-section';
import { RoadmapSectionComponent } from '../../components/roadmap-section/roadmap-section';
import { ScreenshotFrameComponent } from '../../components/screenshot-frame/screenshot-frame';
import {PUBLIC_APP_CONFIG} from '../../config/public-app-config';

@Component({
  selector: 'app-home-page',
  imports: [
    HeaderComponent,
    EmailSignupFormComponent,
    ScreenshotFrameComponent,
    HowItWorksComponent,
    FeatureSectionComponent,
    PricingSectionComponent,
    RoadmapSectionComponent,
    LabourMarketSectionComponent,
    AccessibilitySectionComponent,
    CompetitorComparisonSectionComponent,
    FooterComponent,
    RouterLink,
  ],
  templateUrl: './home.html',
  styleUrl: './home.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomePage {
  protected readonly config = inject(PUBLIC_APP_CONFIG);
  protected readonly features: LandingFeature[] = [
    {
      id: 'multi-source-search',
      number: '01',
      eyebrow: 'Find opportunities',
      title: 'Bring roles from multiple supported job sites into one view.',
      copy: 'Review relevant vacancies without rebuilding the same search across separate tabs. Your profile and preferences help keep the workspace focused on the roles that suit you.',
      points: [
        'Search supported sources from one workspace',
        'Compare role, location, salary and working pattern',
        'Keep promising opportunities ready for the next step',
      ],
      imageSrc: '/screenshots/job-search.webp',
      imageAlt: 'Job Seeker Copilot search results with a concise Software Developer vacancy expanded inside the page',
      imageLabel: 'Search results',
      tone: 'blue',
    },
    {
      id: 'tailored-documents',
      number: '02',
      eyebrow: 'Tailored application documents',
      title: 'Generate a tailored CV and cover letter together for one job.',
      copy: 'Select a role and Job Seeker Copilot creates the document pair for that application. Download both files, edit them locally if you wish, then upload revised versions. The latest CV and cover letter replace the earlier versions while staying linked to that specific job.',
      points: [
        'Generate the CV and cover letter together for a selected role',
        'Download both documents to review or edit locally',
        'Upload revised DOCX files before marking the application as applied',
        'Keep the latest versions linked to the correct application',
      ],
      imageSrc: '/screenshots/documents-generated.webp',
      imageAlt: 'A selected job showing its tailored CV and cover letter with download and replacement controls',
      imageLabel: 'Documents for this role',
      tone: 'teal',
    },
    {
      id: 'application-tracking',
      number: '03',
      eyebrow: 'Application tracking',
      title: 'See where every saved job stands at a glance.',
      copy: 'Follow each opportunity from generated documents through applied, interview and offer. Clear filters and a visual timeline replace the spreadsheet tabs and manual notes that make applications difficult to follow.',
      points: [
        'Track every saved job through the recruitment process',
        'Filter applications by the stage they have reached',
        'See document and application milestones together',
        'Keep unsuccessful outcomes recorded, not forgotten',
      ],
      imageSrc: '/screenshots/application-tracking.webp',
      imageAlt: 'Application tracking view with document, applied, interview and offer milestones',
      imageLabel: 'My applications',
      tone: 'purple',
    },
  ];
}
