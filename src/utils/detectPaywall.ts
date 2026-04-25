import { isAdvertising, isSocialCTA, isNavigation, isAuthorLine } from '@/utils/contentFilters';

/**
 * Paywall signals must be 100% unambiguous truncation indicators.
 * Login prompts, marketing CTAs, "réservé aux abonnés" labels etc. appear
 * on FREE articles too (login box, cross-promo) — they CANNOT be trusted.
 *
 * Only keep signals that only appear when content is actually cut.
 */
const PAYWALL_PATTERNS = [
  // Explicit percentage remaining — the only fully reliable signal
  /il vous reste [\d.,]+\s*%\s*(de cet article|à (lire|découvrir))/i,
  /[\d.,]+\s*%\s*(à\s*lire|à\s*découvrir|remaining)/i,
];

const PAYWALL_CTA_SELECTORS = [
  '.paywall',
  '.premium-wall',
  '.subscriber-wall',
  '[data-paywall]',
  '.article-premium',
  '.piano-offer',
  '.offer-block',
];

export interface PaywallInfo {
  isPaywalled: boolean;
  truncatedPercent: number | null;
}

/** Tolerant variant: matches "Il (vous) reste X% … (article|à lire|à découvrir)"
 *  anywhere in a string. Used to catch paywall banners that Defuddle strips. */
const RAW_PAYWALL_PATTERN =
  /il\s+(?:vous\s+)?reste\s+[\d.,]+\s*%[\s\S]{0,80}(?:à\s+(?:lire|découvrir)|article)/i;

const PERCENT_PATTERN = /il\s+(?:vous\s+)?reste\s+([\d.,]+)\s*%/i;

export function detectPaywall(content: string, rawHtml?: string): PaywallInfo {
  // 1. Strict scan of parsed content tail (last 20%) — avoids false positives
  const text = content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  const tail = text.slice(Math.floor(text.length * 0.8));

  let isPaywalled = false;
  for (const pattern of PAYWALL_PATTERNS) {
    if (pattern.test(tail)) {
      isPaywalled = true;
      break;
    }
  }

  // 2. Fallback: scan the raw HTML for stripped paywall banners
  if (!isPaywalled && rawHtml && RAW_PAYWALL_PATTERN.test(rawHtml)) {
    isPaywalled = true;
  }

  // 3. Extract truncated % — try content first, then rawHtml
  let truncatedPercent: number | null = null;
  const m1 = content.match(PERCENT_PATTERN);
  if (m1) {
    truncatedPercent = Math.round(parseFloat(m1[1].replace(',', '.')));
  } else if (rawHtml) {
    const m2 = rawHtml.match(PERCENT_PATTERN);
    if (m2) truncatedPercent = Math.round(parseFloat(m2[1].replace(',', '.')));
  }

  return { isPaywalled, truncatedPercent };
}

/**
 * CTA patterns specific to paywall / subscription prompts.
 * Social, advertising, navigation and author-line patterns live in contentFilters.ts
 * and are NOT duplicated here.
 */
const CTA_PATTERNS = [
  /réservé aux abonnés/i,
  /passer la publicité/i,
  /il vous reste [\d.,]+\s*%/i,
  /la suite est réservée aux abonnés/i,
  /de cet article à lire/i,
  /cet article est réservé/i,
  /cet article vous est offert/i,
  /débloquez tous les articles/i,
  /déjà abonné/i,
  /vous avez envie de lire la suite/i,
  /subscribe to (read|continue)/i,
  /already a (subscriber|member)/i,
  /unlock (this|all) article/i,
  /contenu réservé/i,
  /accès réservé/i,
  /abonnez-vous/i,
  /créer un compte/i,
  /lire la suite de cet article/i,
  /offre (spéciale|découverte|premium)/i,
  /se connecter$/i,
  /vous n.?êtes pas inscrit/i,
  /inscrivez-vous gratuitement/i,
  /pour lire gratuitement/i,
  /read in english$/i,
  /on peut (le|la) (voir|retrouver|suivre)/i,
  /en partenariat avec/i,
];

const REPEATED_SECTION_PATTERN = /^(.{3,30})\s+\1(\s+\1)*$/;


export function cleanPaywallCTA(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html');

  // Remove by CSS selectors
  for (const selector of PAYWALL_CTA_SELECTORS) {
    for (const el of doc.querySelectorAll(selector)) {
      el.remove();
    }
  }

  // Remove tracking elements and inline SVGs
  for (const el of doc.querySelectorAll('[data-tracking], svg:not(img svg)')) {
    if (el.tagName === 'svg' && el.closest('figure, picture')) continue;
    el.remove();
  }

  // Remove everything after the last <hr>
  const hrs = doc.querySelectorAll('hr');
  if (hrs.length > 0) {
    const lastHr = hrs[hrs.length - 1];
    let sibling = lastHr.nextSibling;
    while (sibling) {
      const next = sibling.nextSibling;
      sibling.parentNode?.removeChild(sibling);
      sibling = next;
    }
    lastHr.remove();
  }

  // Remove CTA patterns + repeated text
  const allElements = [...doc.body.querySelectorAll('*')];
  for (let i = allElements.length - 1; i >= 0; i--) {
    const el = allElements[i];
    if (el.children.length > 3) continue;
    const text = (el.textContent ?? '').trim();
    if (text.length === 0 || text.length > 500) continue;
    const isCtaNoise =
      CTA_PATTERNS.some((p) => p.test(text)) ||
      REPEATED_SECTION_PATTERN.test(text) ||
      isAdvertising(el) ||
      isSocialCTA(el) ||
      isNavigation(el) ||
      isAuthorLine(el);
    if (isCtaNoise) {
      el.remove();
    }
  }

  // Clean empty containers
  for (const el of doc.querySelectorAll('ul, ol, div, p, span, li')) {
    if ((el.textContent ?? '').trim() === '' && !el.querySelector('img, video, iframe')) {
      el.remove();
    }
  }

  return doc.body.innerHTML;
}
