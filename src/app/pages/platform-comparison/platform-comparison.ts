import { DOCUMENT } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnDestroy, inject } from '@angular/core';
import { Meta } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';
import { ComparisonMatrixComponent } from '../../components/comparison-matrix/comparison-matrix';
import { FooterComponent } from '../../components/footer/footer';
import { JourneyNavigationComponent } from '../../components/journey-navigation/journey-navigation';
import {
  ARTICLE_FEATURE_IDS,
  COMPARISON_PLATFORMS,
  ComparisonPlatform,
  comparisonFeatures,
} from '../../content/comparison-data';
import { JOURNEY_ARTICLES } from '../../content/journey-articles';
import { PLATFORM_RESEARCH, PlatformCategory, PlatformResearch } from '../../content/platform-research';

const ARTICLE_PATH = '/the-journey-so-far/job-search-platform-comparison';
const CANONICAL_URL = `https://jobseekercopilot.com${ARTICLE_PATH}`;
const ARTICLE_TITLE = 'How Job Seeker Copilot Compares with Today’s Job Search Platforms';
const ARTICLE_DESCRIPTION = 'An official-source comparison of Job Seeker Copilot with UK job boards and specialist job-search platforms, covering discovery, tailored documents, tracking and application support.';
const DEFAULT_DESCRIPTION = 'Find roles across multiple sources, prepare job-specific CVs and cover letters, organise documents and track applications in one calm workspace.';

@Component({
  selector: 'app-platform-comparison-page',
  imports: [RouterLink, ComparisonMatrixComponent, FooterComponent, JourneyNavigationComponent],
  templateUrl: './platform-comparison.html',
  styleUrl: './platform-comparison.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlatformComparisonPage implements OnDestroy {
  private readonly document = inject(DOCUMENT);
  private readonly meta = inject(Meta);

  protected readonly articlePath = ARTICLE_PATH;
  protected readonly journeyArticles = JOURNEY_ARTICLES;
  protected readonly features = comparisonFeatures(ARTICLE_FEATURE_IDS);
  protected readonly platforms = COMPARISON_PLATFORMS;
  protected readonly traditionalPlatforms = this.researchByCategory('traditional');
  protected readonly specialistPlatforms = this.researchByCategory('specialist');

  constructor() {
    this.setMetadata();
  }

  protected platformFor(research: PlatformResearch): ComparisonPlatform {
    const platform = this.platforms.find(item => item.id === research.platformId);
    if (!platform) throw new Error(`Missing platform configuration: ${research.platformId}`);
    return platform;
  }

  ngOnDestroy(): void {
    this.meta.updateTag({ name: 'description', content: DEFAULT_DESCRIPTION });
    this.meta.removeTag("property='article:published_time'");
    this.document.getElementById('platform-comparison-canonical')?.remove();
    this.document.getElementById('platform-comparison-structured-data')?.remove();
  }

  private researchByCategory(category: PlatformCategory): readonly PlatformResearch[] {
    return PLATFORM_RESEARCH.filter(platform => platform.category === category);
  }

  private setMetadata(): void {
    this.meta.updateTag({ name: 'description', content: ARTICLE_DESCRIPTION });
    this.meta.updateTag({ property: 'og:type', content: 'article' });
    this.meta.updateTag({ property: 'og:title', content: `${ARTICLE_TITLE} | The Journey So Far` });
    this.meta.updateTag({ property: 'og:description', content: ARTICLE_DESCRIPTION });
    this.meta.updateTag({ property: 'og:url', content: CANONICAL_URL });
    this.meta.updateTag({ property: 'og:image', content: 'https://jobseekercopilot.com/images/bernard-mcgeever.webp' });
    this.meta.updateTag({ property: 'article:published_time', content: '2026-07-16' });
    this.meta.updateTag({ name: 'twitter:card', content: 'summary_large_image' });
    this.meta.updateTag({ name: 'twitter:title', content: ARTICLE_TITLE });
    this.meta.updateTag({ name: 'twitter:description', content: ARTICLE_DESCRIPTION });

    const canonical = this.document.createElement('link');
    canonical.id = 'platform-comparison-canonical';
    canonical.rel = 'canonical';
    canonical.href = CANONICAL_URL;
    this.document.head.appendChild(canonical);

    const structuredData = this.document.createElement('script');
    structuredData.id = 'platform-comparison-structured-data';
    structuredData.type = 'application/ld+json';
    structuredData.textContent = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'BlogPosting',
      headline: ARTICLE_TITLE,
      description: ARTICLE_DESCRIPTION,
      datePublished: '2026-07-16',
      dateModified: '2026-07-16',
      mainEntityOfPage: CANONICAL_URL,
      author: { '@type': 'Person', name: 'Bernard McGeever' },
      publisher: { '@type': 'Organization', name: 'Job Seeker Copilot', url: 'https://jobseekercopilot.com' },
      image: 'https://jobseekercopilot.com/images/bernard-mcgeever.webp',
    });
    this.document.head.appendChild(structuredData);
  }
}
