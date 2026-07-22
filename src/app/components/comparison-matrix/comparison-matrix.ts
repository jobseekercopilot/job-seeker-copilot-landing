import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import {
  ComparisonFeature,
  ComparisonPlatform,
  FeatureStatus,
} from '../../content/comparison-data';

interface StatusPresentation {
  readonly icon: string;
  readonly label: string;
}

const STATUS_PRESENTATION: Readonly<Record<FeatureStatus, StatusPresentation>> = {
  confirmed: { icon: '✓', label: 'Confirmed in official product documentation' },
  limited: { icon: '◐', label: 'Limited or partially available' },
  'not-confirmed': { icon: '—', label: 'Not publicly confirmed' },
  planned: { icon: '○', label: 'Planned, not currently available' },
};

@Component({
  selector: 'app-comparison-matrix',
  templateUrl: './comparison-matrix.html',
  styleUrl: './comparison-matrix.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ComparisonMatrixComponent {
  readonly platforms = input.required<readonly ComparisonPlatform[]>();
  readonly features = input.required<readonly ComparisonFeature[]>();
  readonly showPlanned = input(false);
  protected readonly legendStatuses: readonly FeatureStatus[] = ['confirmed', 'limited', 'not-confirmed'];

  protected statusPresentation(status: FeatureStatus): StatusPresentation {
    return STATUS_PRESENTATION[status];
  }
}
