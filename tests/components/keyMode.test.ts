import { describe, expect, it } from 'vitest';
import { tipEntries } from '../../src/data/entries';
import { keyMode, keyModeLabel } from '../../src/components/keyMode';

describe('keyMode', () => {
  it('treats " + " as keys held together', () => {
    expect(keyMode('Ctrl + D')).toBe('hold');
    expect(keyMode('Shift + Cmd + T')).toBe('hold');
    expect(keyModeLabel('Alt + =')).toBe('Hold together');
  });

  it('treats " then " as keys pressed one after another', () => {
    expect(keyMode('Alt then W then V then G')).toBe('sequence');
    expect(keyModeLabel('Alt then H then B then A')).toMatch(/one at a time/i);
  });

  it('treats a lone key as pressed once', () => {
    expect(keyMode('F4')).toBe('single');
    expect(keyModeLabel('F4')).toBe('Press once');
  });

  it('recognises a mix of both', () => {
    expect(keyMode('Ctrl + K then Ctrl + C')).toBe('mixed');
    expect(keyModeLabel('Ctrl + K then Ctrl + C')).toMatch(/hold/i);
  });

  it('classifies every key combination in the data, with no empty keys', () => {
    for (const tip of tipEntries) {
      for (const group of tip.keys ?? []) {
        for (const combo of [group.windows, group.mac]) {
          if (!combo) continue;
          expect(['hold', 'sequence', 'mixed', 'single']).toContain(keyMode(combo));
          expect(keyModeLabel(combo), `${tip.id}: ${combo}`).not.toBe('');
        }
      }
    }
  });

  it('writes every Alt-menu shortcut as a sequence, never as keys held together', () => {
    /* Ribbon "Key Tip" shortcuts (Alt, then letters) are pressed one at a time. A "+" here would */
    /* tell the reader to hold Alt while typing the letters, which does not work. */
    for (const tip of tipEntries) {
      for (const group of tip.keys ?? []) {
        const combo = group.windows;
        if (combo && /^Alt then /.test(combo)) expect(keyMode(combo), `${tip.id}: ${combo}`).toBe('sequence');
      }
    }
  });
});
