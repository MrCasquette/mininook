import type { ExtractionContext, ExtractionResult } from './schemas';

export abstract class Extractor {
  abstract readonly name: string;
  protected abstract readonly hostPattern: RegExp;

  matches(url: string): boolean {
    try {
      return this.hostPattern.test(new URL(url).hostname);
    } catch {
      return false;
    }
  }

  abstract clean(doc: Document, ctx: ExtractionContext): ExtractionResult;
}
