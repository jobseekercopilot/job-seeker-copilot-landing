import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AnalyticsConsentComponent } from './analytics/analytics-consent';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, AnalyticsConsentComponent],
  template: '<router-outlet /><app-analytics-consent />',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {}
