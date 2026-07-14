import { ChangeDetectionStrategy, Component } from '@angular/core';
import { LABOUR_MARKET_CONTENT } from '../../content/labour-market-content';

@Component({
  selector: 'app-labour-market-section',
  templateUrl: './labour-market-section.html',
  styleUrl: './labour-market-section.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LabourMarketSectionComponent {
  protected readonly content = LABOUR_MARKET_CONTENT;
}
