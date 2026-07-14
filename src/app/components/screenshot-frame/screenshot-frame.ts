import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-screenshot-frame',
  templateUrl: './screenshot-frame.html',
  styleUrl: './screenshot-frame.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ScreenshotFrameComponent {
  readonly src = input.required<string>();
  readonly alt = input.required<string>();
  readonly label = input<string>('Product preview');
  readonly eager = input(false);
}
