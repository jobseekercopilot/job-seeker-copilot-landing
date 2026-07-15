import { ChangeDetectionStrategy, Component, OnDestroy, inject } from '@angular/core';
import { Meta } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';
import { FooterComponent } from '../../components/footer/footer';
import { FounderTimelineComponent } from '../../components/founder-timeline/founder-timeline';

const ABOUT_DESCRIPTION = 'Learn why Bernard McGeever created Job Seeker Copilot, the story behind the project, and the mission to make job searching less stressful and more effective.';
const DEFAULT_DESCRIPTION = 'Find roles across multiple sources, prepare job-specific CVs and cover letters, organise documents and track applications in one calm workspace.';

@Component({
  selector: 'app-about-page',
  imports: [RouterLink, FooterComponent, FounderTimelineComponent],
  templateUrl: './about.html',
  styleUrl: './about.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AboutPage implements OnDestroy {
  private readonly meta = inject(Meta);

  constructor() {
    this.meta.updateTag({ name: 'description', content: ABOUT_DESCRIPTION });
  }

  ngOnDestroy(): void {
    this.meta.updateTag({ name: 'description', content: DEFAULT_DESCRIPTION });
  }
}
