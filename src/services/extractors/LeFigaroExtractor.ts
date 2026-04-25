import { Extractor } from './Extractor';
import { ExtractionResultSchema, type ExtractionContext, type ExtractionResult } from './schemas';

export class LeFigaroExtractor extends Extractor {
  readonly name = 'Le Figaro';
  protected readonly hostPattern = /(^|\.)lefigaro\.fr$/i;

  clean(doc: Document, ctx: ExtractionContext): ExtractionResult {
    this.removeShareButton(doc);
    const heroCaption = this.extractHeroCaption(doc);
    this.removeSponsorLists(doc);
    this.removePromoSections(doc);
    this.removePromoLinks(doc);
    this.removeTitleDuplicate(doc, ctx.title);
    return ExtractionResultSchema.parse({ heroCaption });
  }

  private removeShareButton(doc: Document): void {
    for (const p of Array.from(doc.querySelectorAll('p'))) {
      if (p.textContent?.trim() !== 'Lien copié') continue;
      // Climb up while the parent contains only this share button
      let node: Element = p;
      while (
        node.parentElement &&
        node.parentElement.textContent?.trim() === 'Lien copié'
      ) {
        node = node.parentElement;
      }
      node.remove();
    }
  }

  private extractHeroCaption(doc: Document): string | null {
    // Variant 1 — articles with breadcrumb starting with `Sujets`
    for (const p of Array.from(doc.querySelectorAll('p'))) {
      if (p.textContent?.trim() !== 'Sujets') continue;
      const block = p.parentElement;
      if (!block) continue;
      const caption = block.querySelector('figcaption')?.textContent?.trim() ?? null;
      block.remove();
      return caption;
    }
    // Variant 2 — first <figure> at the start of the content (e.g. Voyages section)
    const firstFigure = doc.querySelector('figure');
    if (firstFigure) {
      const caption = firstFigure.querySelector('figcaption')?.textContent?.trim() ?? null;
      firstFigure.remove();
      return caption;
    }
    return null;
  }

  private removeSponsorLists(doc: Document): void {
    const sponsorPatterns = [
      /(?:^|\.)affilae\.com/i,
      /[?&]utm_source=lefigaro/i,
      /[?&]aid=2292245/i,
      /[?&]partnerId=lefigaro/i,
    ];
    const isSponsor = (href: string) => sponsorPatterns.some((p) => p.test(href));

    for (const ul of Array.from(doc.querySelectorAll('ul'))) {
      const items = Array.from(ul.children).filter((c) => c.tagName === 'LI');
      if (items.length === 0) continue;
      const allSponsor = items.every((li) => {
        const a = li.querySelector('a[href]');
        return !!a && isSponsor(a.getAttribute('href') ?? '');
      });
      if (allSponsor) (ul.closest('div') ?? ul).remove();
    }
  }

  private removePromoSections(doc: Document): void {
    for (const p of Array.from(doc.querySelectorAll('p'))) {
      if (p.textContent?.trim() !== 'À découvrir') continue;
      p.parentElement?.remove();
    }
  }

  private removePromoLinks(doc: Document): void {
    for (const a of Array.from(doc.querySelectorAll('a[href]'))) {
      const href = a.getAttribute('href') ?? '';
      if (!/podcasts\.lefigaro\.fr|utm_campaign=tech_figaro/i.test(href)) continue;
      (a.closest('li, figure') ?? a.parentElement)?.remove();
    }
  }

  private removeTitleDuplicate(doc: Document, title: string): void {
    if (title.length < 10) return;
    const target = this.normalize(title);
    for (const p of Array.from(doc.querySelectorAll('p'))) {
      if (this.normalize(p.textContent ?? '') === target) p.remove();
    }
  }

  private normalize(s: string): string {
    return s.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
  }
}
