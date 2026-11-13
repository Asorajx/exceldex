import { describe, expect, it } from 'vitest';
import { entries as allEntries, functionEntries as entries } from '../../src/data/entries';
import { formatFormula, parseFormula } from '../../src/formula/parseFormula';

describe('formatFormula', () => {
  it('joins arguments with ", "', () => {
    expect(formatFormula('IF', ['A1>1', '"Y"', '"N"'])).toBe('=IF(A1>1, "Y", "N")');
  });

  it('drops trailing empty arguments but keeps the required ones', () => {
    expect(formatFormula('XLOOKUP', ['F2', 'A:A', 'B:B', '', ''], 3)).toBe('=XLOOKUP(F2, A:A, B:B)');
    expect(formatFormula('TRIM', [''], 1)).toBe('=TRIM()');
  });

  it('keeps an empty slot for a skipped argument in the middle', () => {
    expect(formatFormula('XLOOKUP', ['F2', 'A:A', 'B:B', '', '', '-1'], 3)).toBe('=XLOOKUP(F2, A:A, B:B,,, -1)');
  });
});

describe('entry examples', () => {
  it.each(entries.map((e) => [e.id, e] as const))('%s: the example matches its own arguments', (_id, entry) => {
    const example = entry.examples[0];
    const parsed = parseFormula(example.formula)!;
    const required = entry.arguments.filter((a) => !a.optional).length;

    expect(parsed.name.toUpperCase()).toBe(entry.title.toUpperCase());
    expect(parsed.args.length).toBeGreaterThanOrEqual(required);
    expect(parsed.args.length).toBeLessThanOrEqual(entry.arguments.length);
    /* Writing the parsed example back out gives the same text, so edits are lossless. */
    expect(formatFormula(entry.title, parsed.args, required)).toBe(example.formula);
  });

  it('records when and where each entry was verified', () => {
    for (const entry of allEntries) {
      expect(entry.lastVerified, entry.id).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(entry.sourceUrl, entry.id).toMatch(/^https:\/\/support\.microsoft\.com\//);
    }
  });

  it('gives every optional argument a default value to insert', () => {
    for (const entry of entries) {
      for (const a of entry.arguments.filter((x) => x.optional)) {
        expect(a.defaultValue, `${entry.id}.${a.name}`).toBeTruthy();
      }
    }
  });
});
