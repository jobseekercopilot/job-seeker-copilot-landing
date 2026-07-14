import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-accessibility-section',
  imports: [RouterLink],
  templateUrl: './accessibility-section.html',
  styleUrl: './accessibility-section.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccessibilitySectionComponent {}
