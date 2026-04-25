import { Extractor } from './Extractor';
import { ExtractionResultSchema, type ExtractionContext, type ExtractionResult } from './schemas';

export class NextExtractor extends Extractor {
  readonly name = 'Next';
  protected readonly hostPattern = /(^|\.)next\.ink$/i;

  clean(doc: Document, _ctx: ExtractionContext): ExtractionResult {
    // Strip everything after the paywall marker first (catches the lock image,
    // "Soutenez un journalisme..." h3, advantage <p>, etc.).
    this.removeContentAfterPaywallMarker(doc);
    this.removeRelatedArticleTeasers(doc);
    this.removeArticleDirectParagraphs(doc);
    this.removeAuthorBlocks(doc);
    this.removeDateLines(doc);
    this.removeReadingTime(doc);
    this.removeCommentsLink(doc);
    return ExtractionResultSchema.parse({ heroCaption: null });
  }

  /**
   * Find "Il reste X% … à découvrir" and remove every node that comes after
   * it in document order (walking up the DOM tree, slicing siblings at each
   * level). Useful because Next's paywall block (lock image, prompt h3,
   * advantage <p>) is a flat sequence, not wrapped in an identifiable container.
   */
  private removeContentAfterPaywallMarker(doc: Document): void {
    const marker = Array.from(doc.querySelectorAll('p')).find((p) =>
      /il\s+(?:vous\s+)?reste\s+[\d.,]+\s*%[\s\S]{0,80}(?:à\s+(?:lire|découvrir)|article)/i.test(
        p.textContent?.trim() ?? '',
      ),
    );
    if (!marker) return;

    let node: Element = marker;
    while (node.parentElement && node.parentElement !== doc.body) {
      let next = node.nextElementSibling;
      while (next) {
        const toRemove = next;
        next = next.nextElementSibling;
        toRemove.remove();
      }
      node = node.parentElement;
    }
    // Top level: also slice after the topmost ancestor that contains the marker
    let next = node.nextElementSibling;
    while (next) {
      const toRemove = next;
      next = next.nextElementSibling;
      toRemove.remove();
    }
    marker.remove();
  }

  /**
   * <ul> whose <li> are teasers towards related articles — they contain a
   * link to a Next category (`/category/...`). Drop the whole list.
   */
  private removeRelatedArticleTeasers(doc: Document): void {
    for (const ul of Array.from(doc.querySelectorAll('ul'))) {
      const items = Array.from(ul.children).filter((c) => c.tagName === 'LI');
      if (items.length === 0) continue;
      const allTeasers = items.every(
        (li) => li.querySelector('a[href*="next.ink/category/"]') !== null,
      );
      if (allTeasers) ul.remove();
    }
  }

  /**
   * Next.ink wraps its meta lines (author / date / reading time / categories /
   * comments) as <p> elements that are *direct* children of <article>, while
   * the actual prose lives inside a wrapper <div>. So we can safely strip
   * every <p> sitting at the article root.
   */
  private removeArticleDirectParagraphs(doc: Document): void {
    for (const article of Array.from(doc.querySelectorAll('article'))) {
      for (const child of Array.from(article.children)) {
        if (child.tagName === 'P') child.remove();
      }
    }
  }

  /** <p> wrapping a link to /public-profile/ — the author byline (top + bottom). */
  private removeAuthorBlocks(doc: Document): void {
    for (const a of Array.from(doc.querySelectorAll('a[href*="/public-profile/"]'))) {
      a.closest('p')?.remove();
    }
  }

  /** Lines like "Le 20 avril à 09h45" — appear at the top and bottom. */
  private removeDateLines(doc: Document): void {
    const re = /^Le\s+\d{1,2}\s+\S+(?:\s+\d{4})?\s+à\s+\d{1,2}h\d{2}$/i;
    for (const p of Array.from(doc.querySelectorAll('p'))) {
      if (re.test(p.textContent?.trim() ?? '')) p.remove();
    }
  }

  /** Standalone reading time "<N> min" near the article header. */
  private removeReadingTime(doc: Document): void {
    for (const p of Array.from(doc.querySelectorAll('p'))) {
      if (/^\d+\s*min$/i.test(p.textContent?.trim() ?? '')) p.remove();
    }
  }

  /** <p> whose only content is a link to "...#comments" (footer comment count). */
  private removeCommentsLink(doc: Document): void {
    for (const a of Array.from(doc.querySelectorAll('a[href*="#comments"]'))) {
      const p = a.closest('p');
      if (!p) continue;
      const linkText = a.textContent?.trim() ?? '';
      if (linkText === (p.textContent?.trim() ?? '')) p.remove();
    }
  }
}
