import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-founder-timeline',
  templateUrl: './founder-timeline.html',
  styleUrl: './founder-timeline.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FounderTimelineComponent {}
