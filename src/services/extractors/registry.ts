import type { Extractor } from './Extractor';
import { FranceInfoExtractor } from './FranceInfoExtractor';
import { FuturaExtractor } from './FuturaExtractor';
import { IgnExtractor } from './IgnExtractor';
import { LeFigaroExtractor } from './LeFigaroExtractor';
import { LeMondeExtractor } from './LeMondeExtractor';
import { NextExtractor } from './NextExtractor';

const extractors: readonly Extractor[] = [
  new FranceInfoExtractor(),
  new FuturaExtractor(),
  new IgnExtractor(),
  new LeFigaroExtractor(),
  new LeMondeExtractor(),
  new NextExtractor(),
];

export function getExtractor(url: string): Extractor | null {
  return extractors.find((e) => e.matches(url)) ?? null;
}
