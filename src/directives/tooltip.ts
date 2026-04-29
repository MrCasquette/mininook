import type { Directive } from 'vue';

/**
 * Lightweight tooltip directive. Replaces the native `title` attribute.
 *
 * Usage:
 *   <button v-tooltip="'Save'">…</button>
 *   <button v-tooltip="t('common.save')">…</button>
 *
 * Features:
 *   - 150 ms show delay, 80 ms hide grace
 *   - Triggers on mouseenter and focus (keyboard-accessible)
 *   - Single shared tooltip element appended to <body>
 *   - Auto-flips above target if it would overflow the viewport bottom
 *   - Hides on window scroll / resize
 *   - Sets aria-label on the host if not already set
 *   - Strips any native `title` to avoid double tooltip
 */

const SHOW_DELAY = 150;
const HIDE_DELAY = 80;
const MARGIN = 8;

let tooltipEl: HTMLElement | null = null;
let showTimer: number | null = null;
let hideTimer: number | null = null;
let activeTarget: HTMLElement | null = null;
let scrollListenerAttached = false;

function ensureTooltipEl(): HTMLElement {
  if (tooltipEl) return tooltipEl;
  const el = document.createElement('div');
  el.className = 'mn-tooltip';
  el.setAttribute('role', 'tooltip');
  document.body.appendChild(el);
  tooltipEl = el;
  return el;
}

function ensureScrollListener() {
  if (scrollListenerAttached) return;
  window.addEventListener('scroll', hideTooltip, true);
  window.addEventListener('resize', hideTooltip);
  scrollListenerAttached = true;
}

function position(target: HTMLElement) {
  const tt = ensureTooltipEl();
  const r = target.getBoundingClientRect();
  const tr = tt.getBoundingClientRect();

  let top = r.bottom + MARGIN;
  let left = r.left + r.width / 2 - tr.width / 2;

  // Flip above if overflowing the viewport bottom
  if (top + tr.height > window.innerHeight - MARGIN) {
    top = r.top - tr.height - MARGIN;
  }
  // Clamp horizontally
  if (left < MARGIN) left = MARGIN;
  if (left + tr.width > window.innerWidth - MARGIN) {
    left = window.innerWidth - tr.width - MARGIN;
  }

  tt.style.transform = `translate(${Math.round(left)}px, ${Math.round(top)}px)`;
}

function showTooltip(target: HTMLElement, text: string) {
  const tt = ensureTooltipEl();
  tt.textContent = text;
  ensureScrollListener();
  // Two-phase: render content first to measure size, then position
  requestAnimationFrame(() => {
    if (activeTarget !== target) return;
    position(target);
    tt.classList.add('is-visible');
  });
}

function hideTooltip() {
  if (!tooltipEl) return;
  tooltipEl.classList.remove('is-visible');
  activeTarget = null;
}

function onEnter(this: HTMLElement) {
  const text = this.dataset.tooltip;
  if (!text) return;
  activeTarget = this;
  if (hideTimer) {
    window.clearTimeout(hideTimer);
    hideTimer = null;
  }
  if (showTimer) window.clearTimeout(showTimer);
  showTimer = window.setTimeout(() => {
    if (activeTarget === this) showTooltip(this, text);
  }, SHOW_DELAY);
}

function onLeave() {
  if (showTimer) {
    window.clearTimeout(showTimer);
    showTimer = null;
  }
  hideTimer = window.setTimeout(hideTooltip, HIDE_DELAY);
}

function attach(el: HTMLElement) {
  if (el.dataset.tooltipBound) return;
  el.addEventListener('mouseenter', onEnter as EventListener);
  el.addEventListener('mouseleave', onLeave);
  el.addEventListener('focus', onEnter as EventListener);
  el.addEventListener('blur', onLeave);
  el.dataset.tooltipBound = 'true';
}

function detach(el: HTMLElement) {
  if (!el.dataset.tooltipBound) return;
  el.removeEventListener('mouseenter', onEnter as EventListener);
  el.removeEventListener('mouseleave', onLeave);
  el.removeEventListener('focus', onEnter as EventListener);
  el.removeEventListener('blur', onLeave);
  delete el.dataset.tooltipBound;
  delete el.dataset.tooltip;
}

function apply(el: HTMLElement, value: string | undefined | null | false) {
  if (!value) {
    detach(el);
    return;
  }
  el.dataset.tooltip = value;
  if (!el.hasAttribute('aria-label')) {
    el.setAttribute('aria-label', value);
  }
  if (el.hasAttribute('title')) el.removeAttribute('title');
  attach(el);
}

export const vTooltip: Directive<HTMLElement, string | undefined | null | false> = {
  mounted(el, binding) {
    apply(el, binding.value ?? null);
  },
  updated(el, binding) {
    apply(el, binding.value ?? null);
  },
  beforeUnmount(el) {
    detach(el);
  },
};
