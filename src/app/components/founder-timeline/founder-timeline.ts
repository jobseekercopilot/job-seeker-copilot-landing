import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { PUBLIC_APP_CONFIG } from '../../config/public-app-config';

@Component({
  selector: 'app-founder-timeline',
  templateUrl: './founder-timeline.html',
  styleUrl: './founder-timeline.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FounderTimelineComponent {
  protected readonly config = inject(PUBLIC_APP_CONFIG);
}
