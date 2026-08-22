import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, PLATFORM_ID, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { filter } from 'rxjs';
import { FooterComponent } from '../../components/footer/footer';
import {PUBLIC_APP_CONFIG} from '../../config/public-app-config';
import {faqItemsForRelease, FaqItem} from '../../content/faq-items';

@Component({
  selector: 'app-faq-page',
  imports: [RouterLink, FooterComponent],
  templateUrl: './faq.html',
  styleUrl: './faq.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FaqPage {
  private readonly activatedRoute = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  private readonly document = inject(DOCUMENT);
  private readonly platformId = inject(PLATFORM_ID);
  protected readonly config = inject(PUBLIC_APP_CONFIG);

  protected readonly items = faqItemsForRelease(this.config.publicBetaEnabled);
  protected readonly openItemId = signal<string | null>(this.items[0].id);

  constructor() {
    this.activatedRoute.fragment
      .pipe(filter((fragment): fragment is string => Boolean(fragment)), takeUntilDestroyed(this.destroyRef))
      .subscribe(fragment => this.openAnchoredItem(fragment));
  }

  protected toggle(item: FaqItem): void {
    this.openItemId.update(current => current === item.id ? null : item.id);
  }

  private openAnchoredItem(fragment: string): void {
    if (!this.items.some(item => item.id === fragment)) return;
    this.openItemId.set(fragment);
    if (isPlatformBrowser(this.platformId)) {
      setTimeout(() => this.document.getElementById(fragment)?.scrollIntoView?.({ block: 'start' }));
    }
  }

}
