import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FooterComponent } from '../../components/footer/footer';
import { JourneyNavigationComponent } from '../../components/journey-navigation/journey-navigation';
import { JOURNEY_ARTICLES } from '../../content/journey-articles';
import { LABOUR_MARKET_CONTENT } from '../../content/labour-market-content';
import { UK_JOB_MARKET_RESEARCH } from '../../content/uk-job-market-research';

export const JOB_MARKET_STATISTICS_ARTICLE_PATH = '/the-journey-so-far/uk-job-search-statistics';

@Component({
  selector: 'app-job-market-statistics-page',
  imports: [RouterLink, FooterComponent, JourneyNavigationComponent],
  templateUrl: './job-market-statistics.html',
  styleUrl: './job-market-statistics.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class JobMarketStatisticsPage {
  protected readonly articlePath = JOB_MARKET_STATISTICS_ARTICLE_PATH;
  protected readonly journeyArticles = JOURNEY_ARTICLES;
  protected readonly labourMarket = LABOUR_MARKET_CONTENT;
  protected readonly research = UK_JOB_MARKET_RESEARCH;
}
