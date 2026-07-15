import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, OnDestroy, PLATFORM_ID, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Meta } from '@angular/platform-browser';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { filter } from 'rxjs';
import { FooterComponent } from '../../components/footer/footer';
import { FAQ_ITEMS, FaqItem, faqAnswerText } from '../../content/faq-items';

const FAQ_DESCRIPTION = 'Answers about Job Seeker Copilot, supported job sources, tailored application documents, private beta access and planned work-search reporting.';
const FAQ_URL = 'https://www.jobseekercopilot.com/faq';
const DEFAULT_DESCRIPTION = 'Find roles, prepare job-specific documents, track applications and compare how Job Seeker Copilot fits alongside today’s job-search platforms.';

@Component({
  selector: 'app-faq-page',
  imports: [RouterLink, FooterComponent],
  templateUrl: './faq.html',
  styleUrl: './faq.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FaqPage implements OnDestroy {
  private readonly activatedRoute = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  private readonly document = inject(DOCUMENT);
  private readonly meta = inject(Meta);
  private readonly platformId = inject(PLATFORM_ID);

  protected readonly items = FAQ_ITEMS;
  protected readonly openItemId = signal<string | null>(FAQ_ITEMS[0].id);

  constructor() {
    this.setMetadata();
    this.activatedRoute.fragment
      .pipe(filter((fragment): fragment is string => Boolean(fragment)), takeUntilDestroyed(this.destroyRef))
      .subscribe(fragment => this.openAnchoredItem(fragment));
  }

  protected toggle(item: FaqItem): void {
    this.openItemId.update(current => current === item.id ? null : item.id);
  }

  ngOnDestroy(): void {
    this.meta.updateTag({ name: 'description', content: DEFAULT_DESCRIPTION });
    this.meta.updateTag({ property: 'og:type', content: 'website' });
    this.meta.updateTag({ property: 'og:title', content: 'Job Seeker Copilot | Your job search, organised' });
    this.meta.updateTag({ property: 'og:description', content: 'Find roles, prepare job-specific documents and keep every application moving in one workspace.' });
    this.meta.removeTag("property='og:url'");
    this.document.getElementById('faq-canonical')?.remove();
    this.document.getElementById('faq-structured-data')?.remove();
  }

  private openAnchoredItem(fragment: string): void {
    if (!this.items.some(item => item.id === fragment)) return;
    this.openItemId.set(fragment);
    if (isPlatformBrowser(this.platformId)) {
      setTimeout(() => this.document.getElementById(fragment)?.scrollIntoView?.({ block: 'start' }));
    }
  }

  private setMetadata(): void {
    this.meta.updateTag({ name: 'description', content: FAQ_DESCRIPTION });
    this.meta.updateTag({ property: 'og:type', content: 'website' });
    this.meta.updateTag({ property: 'og:title', content: 'Frequently Asked Questions | Job Seeker Copilot' });
    this.meta.updateTag({ property: 'og:description', content: FAQ_DESCRIPTION });
    this.meta.updateTag({ property: 'og:url', content: FAQ_URL });

    this.document.getElementById('faq-canonical')?.remove();
    const canonical = this.document.createElement('link');
    canonical.id = 'faq-canonical';
    canonical.rel = 'canonical';
    canonical.href = FAQ_URL;
    this.document.head.appendChild(canonical);

    this.document.getElementById('faq-structured-data')?.remove();
    const structuredData = this.document.createElement('script');
    structuredData.id = 'faq-structured-data';
    structuredData.type = 'application/ld+json';
    structuredData.textContent = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: this.items.map(item => ({
        '@type': 'Question',
        name: item.question,
        acceptedAnswer: { '@type': 'Answer', text: faqAnswerText(item) },
      })),
    });
    this.document.head.appendChild(structuredData);
  }
}
