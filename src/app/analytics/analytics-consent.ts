import { ChangeDetectionStrategy, Component, ElementRef, effect, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AnalyticsService } from './analytics.service';

@Component({
  selector: 'app-analytics-consent',
  imports: [RouterLink],
  templateUrl: './analytics-consent.html',
  styleUrl: './analytics-consent.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AnalyticsConsentComponent {
  protected readonly analytics = inject(AnalyticsService);
  private readonly host: ElementRef<HTMLElement> = inject(ElementRef);

  constructor() {
    effect(() => {
      if (this.analytics.consent.shouldShow()) {
        queueMicrotask(() => this.host.nativeElement.querySelector<HTMLElement>('.consent-heading')?.focus());
      }
    });
  }
}
