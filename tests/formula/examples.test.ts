import { describe, expect, it } from 'vitest';
import { functionEntries as entries } from '../../src/data/entries';
import { explainFormula } from '../../src/formula/explainFormula';
import { parseFormula } from '../../src/formula/parseFormula';

const get = (id: string) => entries.find((e) => e.id === id)!;

describe.each(entries.map((e) => [e.id, e] as const))('%s example', (_id, entry) => {
  const example = entry.examples[0];

  it('only refers to cells that exist in its sample sheet', () => {
    const width = Math.max(...example.sheet.map((r) => r.length));
    const height = example.sheet.length;
    /* Ignore text in quotes, then look at every cell reference like A2 or $B$5. */
    const refs = example.formula.replace(/"[^"]*"/g, '').match(/\$?[A-Z]{1,2}\$?\d+/g) ?? [];

    expect(refs.length, 'has at least one reference').toBeGreaterThan(0);
    for (const ref of refs) {
      const [, letters, row] = ref.replace(/\$/g, '').match(/^([A-Z]+)(\d+)$/)!;
      const column = letters.charCodeAt(0) - 64; /* A = 1 */
      expect(column, ref).toBeLessThanOrEqual(width);
      expect(Number(row), ref).toBeLessThanOrEqual(height);
    }
  });

  it('has a result and a header row', () => {
    expect(example.result).not.toBe('');
    expect(example.sheet.length).toBeGreaterThan(1);
  });

  it('can be explained in plain English', () => {
    const parsed = parseFormula(example.formula)!;
    const sentence = explainFormula(entry, parsed.args);
    expect(sentence).toBeTruthy();
    expect(sentence).not.toMatch(/[{}]/); /* no unfilled placeholders */
    expect(sentence).toContain(parsed.args[0]);
  });
});

describe('stated results are right', () => {
  const byId = (id: string) => entries.find((e) => e.id === id)!;

  /* Counts Monday to Friday between two ISO dates, both included. Done here independently of Excel. */
  function weekdays(start: string, end: string, skip: string[] = []): number {
    let count = 0;
    for (
      let d = new Date(`${start}T00:00:00Z`);
      d <= new Date(`${end}T00:00:00Z`);
      d = new Date(d.getTime() + 86400000)
    ) {
      const day = d.getUTCDay(); /* 0 = Sunday, 6 = Saturday */
      if (day !== 0 && day !== 6 && !skip.includes(d.toISOString().slice(0, 10))) count++;
    }
    return count;
  }

  it('NETWORKDAYS: the sample dates give the stated count, with and without the holiday', () => {
    const example = byId('networkdays').examples[0];
    const [, start, end, holiday] = example.sheet[1];
    expect(weekdays(start, end)).toBe(Number(example.result));
    /* The note says adding the holiday makes it one fewer. */
    expect(weekdays(start, end, [holiday])).toBe(Number(example.result) - 1);
  });

  it('SUMIF: the sample gives the same total as SUMIFS with one condition', () => {
    const { sheet, result } = byId('sumif').examples[0];
    const total = sheet
      .slice(1)
      .filter((row) => row[0] === 'North')
      .reduce((sum, row) => sum + Number(row[2]), 0);
    expect(total).toBe(Number(result));
  });

  it('MIN and MAX: the stated results come from the sample column', () => {
    for (const [id, pick] of [
      ['min', Math.min],
      ['max', Math.max]
    ] as const) {
      const { sheet, result } = byId(id).examples[0];
      expect(pick(...sheet.slice(1).map((row) => Number(row[1])))).toBe(Number(result));
    }
  });

  it('COUNTA and LEN: the stated results come from the sample cells', () => {
    const counta = byId('counta').examples[0];
    expect(counta.sheet.slice(1).filter((row) => (row[1] ?? '') !== '').length).toBe(Number(counta.result));
    const len = byId('len').examples[0];
    expect(len.sheet[1][0].length).toBe(Number(len.result));
  });

  it('LEFT, RIGHT and MID: the stated results come from the sample code', () => {
    const code = byId('right').examples[0].sheet[1][0]; /* NYC-1042 */
    expect(code.slice(0, 3)).toBe(byId('left').examples[0].result);
    expect(code.slice(-4)).toBe(byId('right').examples[0].result);
    expect(code.slice(4, 8)).toBe(byId('mid').examples[0].result); /* MID(A2, 5, 4): 1-based position 5 */
  });
});

describe('explainFormula', () => {
  const xlookup = get('xlookup');
  const argsOf = (formula: string) => parseFormula(formula)!.args;

  it('fills the sentence from the formula text', () => {
    const sentence = explainFormula(xlookup, argsOf('=XLOOKUP(E2, A2:A5, B2:B5)'));
    expect(sentence).toBe('Looks for E2 in A2:A5 and returns the value in the same position from B2:B5.');
  });

  it('adds a sentence for each optional argument that is present', () => {
    const sentence = explainFormula(xlookup, argsOf('=XLOOKUP(E2, A2:A5, B2:B5, "None")'));
    expect(sentence).toContain('If there is no match, it shows "None" instead of #N/A.');
    expect(sentence).not.toContain('match_mode');
  });

  it('follows edits to the references', () => {
    const sentence = explainFormula(xlookup, argsOf('=XLOOKUP(H7, D2:D9, F2:F9)'));
    expect(sentence).toContain('H7');
    expect(sentence).toContain('D2:D9');
    expect(sentence).toContain('F2:F9');
  });

  it('leaves out a clause whose other value is missing', () => {
    const sumifs = get('sumifs');
    const sentence = explainFormula(sumifs, argsOf('=SUMIFS(C2:C5, A2:A5, "North", B2:B5)'));
    expect(sentence).not.toContain('also requires');
  });

  it('returns null when a required value is blank', () => {
    expect(explainFormula(xlookup, ['', 'A2:A5', 'B2:B5'])).toBeNull();
  });
});
