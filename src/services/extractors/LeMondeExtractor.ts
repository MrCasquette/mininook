import { Extractor } from './Extractor';
import { ExtractionResultSchema, type ExtractionContext, type ExtractionResult } from './schemas';

export class LeMondeExtractor extends Extractor {
  readonly name = 'Le Monde';
  protected readonly hostPattern = /(^|\.)lemonde\.fr$/i;

  clean(doc: Document, _ctx: ExtractionContext): ExtractionResult {
    this.removeReadAlsoLinks(doc);
    return ExtractionResultSchema.parse({ heroCaption: null });
  }

  private removeReadAlsoLinks(doc: Document): void {
    for (const p of Array.from(doc.querySelectorAll('p'))) {
      const text = p.textContent?.trim() ?? '';
      if (/^Lire aussi\s*\|/i.test(text)) p.remove();
    }
  }
}
