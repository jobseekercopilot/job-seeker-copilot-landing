import { DOCUMENT } from '@angular/common';
import { Injectable, inject } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { RouterStateSnapshot, TitleStrategy } from '@angular/router';
import { PUBLIC_APP_CONFIG } from '../config/public-app-config';
import { FAQ_ITEMS, faqAnswerText } from '../content/faq-items';
import {
  CANONICAL_ORIGIN,
  SOCIAL_IMAGE_ALT,
  SOCIAL_IMAGE_URL,
  SeoRouteData,
  SeoSchemaKind,
  canonicalPublicUrl,
} from './seo-route-data';

const INDEX_ROBOTS = 'index, follow, max-image-preview:large';
const NOINDEX_ROBOTS = 'noindex, nofollow, noarchive';

@Injectable()
export class SeoTitleStrategy extends TitleStrategy {
  private readonly config = inject(PUBLIC_APP_CONFIG);
  private readonly document = inject(DOCUMENT);
  private readonly meta = inject(Meta);
  private readonly title = inject(Title);

  override updateTitle(snapshot: RouterStateSnapshot): void {
    const seo = this.deepestSeoData(snapshot);
    if (!seo) {
      this.title.setTitle('Page Not Found | Job Seeker Copilot');
      this.meta.updateTag({ name: 'robots', content: NOINDEX_ROBOTS });
      this.removeCanonicalAndStructuredData();
      this.removeSocialTags();
      return;
    }

    const canonicalUrl = canonicalPublicUrl(seo.path);
    this.title.setTitle(seo.title);
    this.meta.updateTag({ name: 'description', content: seo.description });
    this.meta.updateTag({
      name: 'robots',
      content: this.config.searchIndexingEnabled && seo.indexable ? INDEX_ROBOTS : NOINDEX_ROBOTS,
    });

    this.removeCanonicalAndStructuredData();
    if (!seo.indexable) {
      this.removeSocialTags();
      return;
    }

    this.setCanonical(canonicalUrl);
    this.setSocialTags(seo, canonicalUrl);
    if (seo.schema) this.setStructuredData(seo.schema, seo, canonicalUrl);
  }

  private deepestSeoData(snapshot: RouterStateSnapshot): SeoRouteData | null {
    let route = snapshot.root;
    while (route.firstChild) route = route.firstChild;
    const value = route.data['seo'];
    return isSeoRouteData(value) ? value : null;
  }

  private setCanonical(url: string): void {
    const canonical = this.document.createElement('link');
    canonical.id = 'seo-canonical';
    canonical.rel = 'canonical';
    canonical.href = url;
    this.document.head.appendChild(canonical);
  }

  private setSocialTags(seo: SeoRouteData, canonicalUrl: string): void {
    const propertyTags: Record<string, string> = {
      'og:type': seo.socialType,
      'og:site_name': 'Job Seeker Copilot',
      'og:locale': 'en_GB',
      'og:title': seo.title,
      'og:description': seo.description,
      'og:url': canonicalUrl,
      'og:image': SOCIAL_IMAGE_URL,
      'og:image:secure_url': SOCIAL_IMAGE_URL,
      'og:image:type': 'image/png',
      'og:image:width': '1200',
      'og:image:height': '630',
      'og:image:alt': SOCIAL_IMAGE_ALT,
    };
    for (const [property, content] of Object.entries(propertyTags)) {
      this.meta.updateTag({ property, content });
    }

    const nameTags: Record<string, string> = {
      'twitter:card': 'summary_large_image',
      'twitter:title': seo.title,
      'twitter:description': seo.description,
      'twitter:image': SOCIAL_IMAGE_URL,
      'twitter:image:alt': SOCIAL_IMAGE_ALT,
    };
    for (const [name, content] of Object.entries(nameTags)) this.meta.updateTag({ name, content });

    if (seo.socialType === 'article' && seo.article) {
      this.meta.updateTag({ property: 'article:published_time', content: seo.article.publishedDate });
      this.meta.updateTag({ property: 'article:modified_time', content: seo.article.modifiedDate });
    } else {
      this.meta.removeTag("property='article:published_time'");
      this.meta.removeTag("property='article:modified_time'");
    }
  }

  private setStructuredData(kind: SeoSchemaKind, seo: SeoRouteData, canonicalUrl: string): void {
    const script = this.document.createElement('script');
    script.id = 'seo-structured-data';
    script.type = 'application/ld+json';
    script.textContent = JSON.stringify(schemaFor(kind, seo, canonicalUrl)).replaceAll('<', '\\u003c');
    this.document.head.appendChild(script);
  }

  private removeCanonicalAndStructuredData(): void {
    for (const canonical of Array.from(this.document.head.querySelectorAll('link[rel="canonical"]'))) {
      canonical.remove();
    }
    for (const script of Array.from(this.document.head.querySelectorAll('script[type="application/ld+json"]'))) {
      script.remove();
    }
  }

  private removeSocialTags(): void {
    for (const tag of Array.from(this.document.head.querySelectorAll('meta[property^="og:"], meta[property^="article:"]'))) {
      tag.remove();
    }
    for (const tag of Array.from(this.document.head.querySelectorAll('meta[name^="twitter:"]'))) tag.remove();
  }
}

function schemaFor(kind: SeoSchemaKind, seo: SeoRouteData, canonicalUrl: string): object {
  if (kind === 'home') {
    return {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'Organization',
          '@id': `${CANONICAL_ORIGIN}/#organization`,
          name: 'Job Seeker Copilot',
          url: `${CANONICAL_ORIGIN}/`,
          logo: `${CANONICAL_ORIGIN}/brand/jobseeker-copilot-logo.svg`,
        },
        {
          '@type': 'WebSite',
          '@id': `${CANONICAL_ORIGIN}/#website`,
          name: 'Job Seeker Copilot',
          url: `${CANONICAL_ORIGIN}/`,
          inLanguage: 'en-GB',
          publisher: { '@id': `${CANONICAL_ORIGIN}/#organization` },
        },
      ],
    };
  }
  if (kind === 'faq') {
    return {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: FAQ_ITEMS.map(item => ({
        '@type': 'Question',
        name: item.question,
        acceptedAnswer: { '@type': 'Answer', text: faqAnswerText(item) },
      })),
    };
  }
  return {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: seo.article?.headline ?? seo.title,
    description: seo.description,
    datePublished: seo.article?.publishedDate,
    dateModified: seo.article?.modifiedDate,
    mainEntityOfPage: canonicalUrl,
    inLanguage: 'en-GB',
    author: { '@type': 'Person', name: seo.article?.author },
    publisher: { '@id': `${CANONICAL_ORIGIN}/#organization`, '@type': 'Organization', name: 'Job Seeker Copilot' },
    image: SOCIAL_IMAGE_URL,
  };
}

function isSeoRouteData(value: unknown): value is SeoRouteData {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const candidate = value as Partial<SeoRouteData>;
  const commonFieldsAreValid = typeof candidate.path === 'string' &&
    typeof candidate.title === 'string' &&
    typeof candidate.description === 'string' &&
    typeof candidate.indexable === 'boolean' &&
    (candidate.socialType === 'website' || candidate.socialType === 'article');
  if (!commonFieldsAreValid) return false;
  if (candidate.socialType !== 'article') return true;
  const article = candidate.article;
  return !!article &&
    typeof article.headline === 'string' &&
    typeof article.publishedDate === 'string' &&
    typeof article.modifiedDate === 'string' &&
    typeof article.author === 'string';
}
