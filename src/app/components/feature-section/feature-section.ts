import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { ScreenshotFrameComponent } from '../screenshot-frame/screenshot-frame';

export interface LandingFeature {
  id: string;
  number: string;
  eyebrow: string;
  title: string;
  copy: string;
  points: string[];
  imageSrc: string;
  imageAlt: string;
  imageLabel: string;
  tone: 'blue' | 'teal' | 'purple' | 'amber';
}

@Component({
  selector: 'app-feature-section',
  imports: [ScreenshotFrameComponent],
  templateUrl: './feature-section.html',
  styleUrl: './feature-section.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FeatureSectionComponent {
  readonly feature = input.required<LandingFeature>();
  readonly reversed = input(false);
}
