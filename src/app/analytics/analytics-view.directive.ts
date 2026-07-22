import { isPlatformBrowser } from '@angular/common';
import {
  AfterViewInit,
  Directive,
  ElementRef,
  OnDestroy,
  PLATFORM_ID,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { AnalyticsContext, AnalyticsEventName } from './analytics-event';
import { AnalyticsService } from './analytics.service';

@Directive({ selector: '[appAnalyticsView]' })
export class AnalyticsViewDirective implements AfterViewInit, OnDestroy {
  private readonly analytics = inject(AnalyticsService);
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly element = inject(ElementRef<HTMLElement>);
  private readonly visible = signal(false);
  private observer: IntersectionObserver | null = null;
  private sent = false;
  readonly appAnalyticsView = input.required<Exclude<AnalyticsEventName, 'visit' | 'page_view'>>();
  readonly analyticsContext = input<AnalyticsContext>();

  constructor() {
    effect(() => {
      if (!this.sent && this.visible() && this.analytics.consent.canCollect()) {
        this.sent = this.analytics.track(this.appAnalyticsView(), this.analyticsContext());
        if (this.sent) this.observer?.disconnect();
      }
    });
  }

  ngAfterViewInit(): void {
    if (!this.browser) return;
    if (!('IntersectionObserver' in window)) {
      this.visible.set(true);
      return;
    }
    this.observer = new IntersectionObserver(entries => {
      this.visible.set(entries.some(entry => entry.isIntersecting));
    }, { threshold: 0.25 });
    this.observer.observe(this.element.nativeElement);
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
  }
}
