import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/* Colour contrast, from the design tokens in src/index.css (WCAG 2.2 AA: 4.5:1 for normal text, */
/* 3:1 for large text). axe-core cannot measure this in jsdom, so it is checked here instead. */
const css = readFileSync('src/index.css', 'utf8');

/* The text between the braces that follow `selector`. */
function blockAfter(selector: string, from = 0): string {
  const start = css.indexOf(selector, from);
  if (start < 0) throw new Error(`Selector not found: ${selector}`);
  const open = css.indexOf('{', start);
  return css.slice(open + 1, css.indexOf('}', open));
}

function tokens(text: string): Record<string, string> {
  const found: Record<string, string> = {};
  for (const m of text.matchAll(/--([\w-]+):\s*(#[0-9a-fA-F]{6})/g)) found[m[1]] = m[2];
  return found;
}

const lightBlock = blockAfter(':root {');
const darkBlock = blockAfter(':root[data-theme="dark"]');
const light = tokens(lightBlock);
const dark = { ...light, ...tokens(darkBlock) };

const channels = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
function luminance(hex: string): number {
  const [r, g, b] = channels(hex).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function ratio(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}
/* A colour at some opacity, drawn over a background. */
function blend(fg: string, bg: string, alpha: number): string {
  const mixed = channels(fg).map((v, i) => Math.round(v * alpha + channels(bg)[i] * (1 - alpha)));
  return '#' + mixed.map((v) => v.toString(16).padStart(2, '0')).join('');
}

/* [text token, background token, what it is, minimum ratio] */
const PAIRS: Array<[string, string, string, number]> = [
  ['text', 'bg', 'body text on the page', 4.5],
  ['text', 'surface', 'body text on cards', 4.5],
  ['text', 'surface-2', 'text on the formula panel', 4.5],
  ['text-muted', 'bg', 'muted text on the page', 4.5],
  ['text-muted', 'surface', 'muted descriptions on cards', 4.5],
  ['text-muted', 'surface-2', 'muted syntax and hints on panels', 4.5],
  ['text-muted', 'surface-3', 'the Optional tag', 4.5],
  ['green-text', 'green-soft', 'the FUNCTION pill and + Add button', 4.5],
  ['blue-text', 'blue-soft', 'the TIP pill', 4.5],
  ['yellow-text', 'yellow-soft', 'the Required tag and warning note', 4.5],
  ['red-text', 'red-soft', 'the Remove button', 4.5],
  ['on-green', 'green', 'the Copy button', 4.5],
  ['on-accent', 'accent', 'a selected topic pill', 4.5],
  ['on-blue', 'blue', 'the selected Tips pill', 4.5],
  ['brand', 'bg', 'the green "Dex" in the title (large text)', 3]
];

describe.each([
  ['light', light],
  ['dark', dark]
] as const)('contrast in the %s theme', (_name, theme) => {
  it.each(PAIRS)('%s on %s: %s', (fg, bg, _what, minimum) => {
    expect(ratio(theme[fg], theme[bg])).toBeGreaterThanOrEqual(minimum);
  });

  it('keeps the count beside a pill readable at 60% opacity', () => {
    const faded = blend(theme.text, theme['surface-2'], 0.6);
    expect(ratio(faded, theme['surface-2'])).toBeGreaterThanOrEqual(4.5);
  });
});

describe('the two copies of the dark theme', () => {
  it('stay identical, so following the system and choosing dark look the same', () => {
    /* One block applies when the user picks dark; the other when they have not picked and their */
    /* system is dark. If they drift apart, the same person sees two different dark themes. */
    const mediaStart = css.indexOf('@media (prefers-color-scheme: dark)');
    const system = tokens(blockAfter(':root:not([data-theme="light"])', mediaStart));
    const chosen = tokens(darkBlock);
    expect(system).toEqual(chosen);
    expect(Object.keys(chosen).length).toBeGreaterThan(15);
  });
});
