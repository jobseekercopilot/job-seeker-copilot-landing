import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ComparisonMatrixComponent } from '../comparison-matrix/comparison-matrix';
import {
  HOMEPAGE_FEATURE_IDS,
  HOMEPAGE_PLATFORM_IDS,
  comparisonFeatures,
  comparisonPlatforms,
} from '../../content/comparison-data';

@Component({
  selector: 'app-competitor-comparison-section',
  imports: [ComparisonMatrixComponent, RouterLink],
  templateUrl: './competitor-comparison-section.html',
  styleUrl: './competitor-comparison-section.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CompetitorComparisonSectionComponent {
  protected readonly features = comparisonFeatures(HOMEPAGE_FEATURE_IDS);
  protected readonly platforms = comparisonPlatforms(HOMEPAGE_PLATFORM_IDS);
}
