import { ChangeDetectionStrategy, Component } from '@angular/core';
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
@Component({
  selector: 'app-platform-comparison-page',
  imports: [RouterLink, ComparisonMatrixComponent, FooterComponent, JourneyNavigationComponent],
  templateUrl: './platform-comparison.html',
  styleUrl: './platform-comparison.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlatformComparisonPage {
  protected readonly articlePath = ARTICLE_PATH;
  protected readonly journeyArticles = JOURNEY_ARTICLES;
  protected readonly features = comparisonFeatures(ARTICLE_FEATURE_IDS);
  protected readonly platforms = COMPARISON_PLATFORMS;
  protected readonly traditionalPlatforms = this.researchByCategory('traditional');
  protected readonly specialistPlatforms = this.researchByCategory('specialist');

  protected platformFor(research: PlatformResearch): ComparisonPlatform {
    const platform = this.platforms.find(item => item.id === research.platformId);
    if (!platform) throw new Error(`Missing platform configuration: ${research.platformId}`);
    return platform;
  }

  private researchByCategory(category: PlatformCategory): readonly PlatformResearch[] {
    return PLATFORM_RESEARCH.filter(platform => platform.category === category);
  }
}
