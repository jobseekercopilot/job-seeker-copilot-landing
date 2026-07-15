import { ChangeDetectionStrategy, Component, OnDestroy, inject } from '@angular/core';
import { Meta } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';
import { FooterComponent } from '../../components/footer/footer';
import { FounderTimelineComponent } from '../../components/founder-timeline/founder-timeline';
import { JourneyNavigationComponent } from '../../components/journey-navigation/journey-navigation';
import { JOURNEY_ARTICLES } from '../../content/journey-articles';

const ABOUT_DESCRIPTION = 'Read the story behind Job Seeker Copilot, why Bernard McGeever began building it, and the milestones that shaped the project’s journey so far.';
const DEFAULT_DESCRIPTION = 'Find roles across multiple sources, prepare job-specific CVs and cover letters, organise documents and track applications in one calm workspace.';

@Component({
  selector: 'app-about-page',
  imports: [RouterLink, FooterComponent, FounderTimelineComponent, JourneyNavigationComponent],
  templateUrl: './about.html',
  styleUrl: './about.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AboutPage implements OnDestroy {
  private readonly meta = inject(Meta);
  protected readonly journeyArticles = JOURNEY_ARTICLES;
  protected readonly currentArticlePath = '/about';

  constructor() {
    this.meta.updateTag({ name: 'description', content: ABOUT_DESCRIPTION });
  }

  ngOnDestroy(): void {
    this.meta.updateTag({ name: 'description', content: DEFAULT_DESCRIPTION });
  }
}
