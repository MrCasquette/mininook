import { Extractor } from './Extractor';
import { ExtractionResultSchema, type ExtractionContext, type ExtractionResult } from './schemas';

export class FuturaExtractor extends Extractor {
  readonly name = 'Futura';
  protected readonly hostPattern = /(^|\.)futura-sciences\.com$/i;

  clean(doc: Document, _ctx: ExtractionContext): ExtractionResult {
    this.removeAuthorBlock(doc);
    this.removeMetadataParagraphs(doc);
    const heroCaption = this.extractAndRemoveHeroFigure(doc);
    this.removeRecommendationSections(doc);
    this.removeRecommendationArticles(doc);
    return ExtractionResultSchema.parse({ heroCaption });
  }

  private removeAuthorBlock(doc: Document): void {
    for (const p of Array.from(doc.querySelectorAll('p'))) {
      if (!/^Article rédigé par/i.test(p.textContent?.trim() ?? '')) continue;
      p.parentElement?.remove();
      return;
    }
  }

  private removeMetadataParagraphs(doc: Document): void {
    const patterns = [
      /^\d+\s*min\.?$/i,
      /^Publié le/i,
      /^Mis à jour le/i,
    ];
    for (const p of Array.from(doc.querySelectorAll('p'))) {
      const text = p.textContent?.trim() ?? '';
      if (patterns.some((pat) => pat.test(text))) p.remove();
    }
  }

  private extractAndRemoveHeroFigure(doc: Document): string | null {
    const firstFigure = doc.querySelector('figure');
    if (!firstFigure) return null;
    const caption = firstFigure.querySelector('figcaption')?.textContent?.trim() ?? null;
    (firstFigure.closest('div') ?? firstFigure).remove();
    return caption;
  }

  private removeRecommendationSections(doc: Document): void {
    const patterns = [
      /^Cela vous intéressera aussi/i,
      /^Bons plans$/i,
      /^A lire aussi$/i,
      /^Explorez les articles/i,
      /^#/,
    ];
    const matches = (text: string) => patterns.some((pat) => pat.test(text));

    for (const h2 of Array.from(doc.querySelectorAll('h2'))) {
      if (!matches(h2.textContent?.trim() ?? '')) continue;

      let node: Element | null = h2.nextElementSibling;
      while (node) {
        const next: Element | null = node.nextElementSibling;
        const tag = node.tagName;
        const text = (node.textContent ?? '').trim();

        if (tag === 'H2' && !matches(text)) break;
        if (tag === 'P' && text.length > 40) break;

        node.remove();
        node = next;
      }
      h2.remove();
    }
  }

  private removeRecommendationArticles(doc: Document): void {
    for (const article of Array.from(doc.querySelectorAll('article'))) {
      if (!article.querySelector('figure, picture')) continue;
      const hasProse = Array.from(article.querySelectorAll('p')).some(
        (p) => (p.textContent ?? '').trim().length > 80,
      );
      if (!hasProse) article.remove();
    }
  }
}
