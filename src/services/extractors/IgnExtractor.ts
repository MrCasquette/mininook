import { Extractor } from './Extractor';
import { ExtractionResultSchema, type ExtractionContext, type ExtractionResult } from './schemas';

export class IgnExtractor extends Extractor {
  readonly name = 'IGN';
  protected readonly hostPattern = /(^|\.)ign\.(com|fr)$/i;

  clean(doc: Document, _ctx: ExtractionContext): ExtractionResult {
    this.removeBrokenSrcsets(doc);
    return ExtractionResultSchema.parse({ heroCaption: null });
  }

  private removeBrokenSrcsets(doc: Document): void {
    for (const img of Array.from(doc.querySelectorAll('img[srcset]'))) {
      const srcset = img.getAttribute('srcset') ?? '';
      if (/%20/.test(srcset)) img.removeAttribute('srcset');
    }
  }
}
