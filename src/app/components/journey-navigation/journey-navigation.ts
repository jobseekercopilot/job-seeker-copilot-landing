import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { JourneyArticle } from '../../content/journey-articles';

@Component({
  selector: 'app-journey-navigation',
  imports: [RouterLink],
  templateUrl: './journey-navigation.html',
  styleUrl: './journey-navigation.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class JourneyNavigationComponent {
  readonly articles = input.required<readonly JourneyArticle[]>();
  readonly currentPath = input.required<string>();
}
