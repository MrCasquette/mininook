import { Extractor } from './Extractor';
import { ExtractionResultSchema, type ExtractionContext, type ExtractionResult } from './schemas';

export class FranceInfoExtractor extends Extractor {
  readonly name = 'France Info';
  protected readonly hostPattern = /(^|\.)franceinfo\.fr$/i;

  clean(doc: Document, _ctx: ExtractionContext): ExtractionResult {
    this.removeRedundantPictures(doc);
    const heroCaption = this.extractHeroFigureCaptionAndRemoveBlock(doc);
    this.removeAuthorAndMetadata(doc);
    this.removeRelatedLinks(doc);
    this.removeReadAlsoTextNodes(doc);
    this.removeWatchSection(doc);
    return ExtractionResultSchema.parse({ heroCaption });
  }

  /**
   * Remove bare text nodes "À lire aussi" / "A lire aussi" that often dangle
   * before a related-link <p> (which is removed by removeRelatedLinks).
   */
  private removeReadAlsoTextNodes(doc: Document): void {
    const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT);
    const targets: Text[] = [];
    let node: Node | null;
    while ((node = walker.nextNode())) {
      const t = (node as Text).textContent?.trim() ?? '';
      if (/^[àa]\s+lire\s+aussi\s*[:.]?$/i.test(t)) targets.push(node as Text);
    }
    for (const t of targets) t.remove();
  }

  /**
   * Remove pictures that are pure noise:
   *   - all <img> share the "placeholder" URL pattern, OR
   *   - all <img> point to the same src (avatar duplication / render glitch).
   */
  private removeRedundantPictures(doc: Document): void {
    for (const picture of Array.from(doc.querySelectorAll('picture'))) {
      const imgs = Array.from(picture.querySelectorAll('img'));
      if (imgs.length === 0) continue;
      const firstSrc = imgs[0].getAttribute('src') ?? '';
      const allPlaceholder = imgs.every((img) =>
        /placeholder/i.test(img.getAttribute('src') ?? ''),
      );
      const allSameDuplicate =
        imgs.length > 1 &&
        imgs.every((img) => (img.getAttribute('src') ?? '') === firstSrc);
      if (allPlaceholder || allSameDuplicate) {
        (picture.closest('figure, div') ?? picture).remove();
      }
    }
  }

  private extractHeroFigureCaptionAndRemoveBlock(doc: Document): string | null {
    const figure = doc.querySelector('figure');
    if (!figure) return null;
    const caption = figure.querySelector('figcaption')?.textContent?.trim() ?? null;
    (figure.closest('div') ?? figure).remove();
    return caption;
  }

  private removeAuthorAndMetadata(doc: Document): void {
    const patterns = [
      /^Article rédigé par/i,
      /^Publié\s+le/i,
      /^Mis à jour/i,
      /^Temps de lecture\s*:/i,
      /^France Télévisions$/i,
      /^Radio France$/i,
    ];
    for (const p of Array.from(doc.querySelectorAll('p'))) {
      const text = p.textContent?.trim() ?? '';
      if (patterns.some((pat) => pat.test(text))) {
        p.remove();
        continue;
      }
      const link = p.querySelector('a[href*="/redaction/"]');
      if (link && link.textContent?.trim() === text) p.remove();
    }
  }

  /**
   * Remove editorial cross-promo links: <p> whose only content is an <a>
   * pointing to another franceinfo.fr article. These are sprinkled between
   * paragraphs without any "À lire aussi" prefix.
   */
  private removeRelatedLinks(doc: Document): void {
    for (const p of Array.from(doc.querySelectorAll('p'))) {
      const link = p.querySelector('a[href]');
      if (!link) continue;
      const linkText = link.textContent?.trim() ?? '';
      const pText = p.textContent?.trim() ?? '';
      if (linkText !== pText) continue;
      const href = link.getAttribute('href') ?? '';
      if (/(?:^|\.)franceinfo\.fr/i.test(href)) p.remove();
    }
  }

  private removeWatchSection(doc: Document): void {
    for (const section of Array.from(doc.querySelectorAll('section'))) {
      const heading = section.querySelector('p[role="heading"]');
      if (heading?.textContent?.trim() === 'À regarder') section.remove();
    }
  }
}
