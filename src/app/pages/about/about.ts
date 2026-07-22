import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FooterComponent } from '../../components/footer/footer';
import { FounderTimelineComponent } from '../../components/founder-timeline/founder-timeline';
import { JourneyNavigationComponent } from '../../components/journey-navigation/journey-navigation';
import { JOURNEY_ARTICLES } from '../../content/journey-articles';

@Component({
  selector: 'app-about-page',
  imports: [RouterLink, FooterComponent, FounderTimelineComponent, JourneyNavigationComponent],
  templateUrl: './about.html',
  styleUrl: './about.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AboutPage {
  protected readonly journeyArticles = JOURNEY_ARTICLES;
  protected readonly currentArticlePath = '/about';

}
