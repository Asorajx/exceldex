import { describe, expect, it } from 'vitest';
import { entries } from '../../src/data/entries';
import { editDistance } from '../../src/search/editDistance';
import { stem, tokenize } from '../../src/search/normalizeQuery';
import { searchEntries } from '../../src/search/searchEntries';

const top = (q: string) => searchEntries(q, entries)[0]?.id;
const topThree = (q: string) =>
  searchEntries(q, entries)
    .slice(0, 3)
    .map((e) => e.id);

describe('searchEntries', () => {
  it('returns nothing for empty or whitespace queries', () => {
    expect(searchEntries('', entries)).toEqual([]);
    expect(searchEntries('   ', entries)).toEqual([]);
  });

  it('returns nothing when nothing matches', () => {
    expect(searchEntries('zzzzqqq', entries)).toEqual([]);
  });

  it('is case-insensitive and ignores surrounding spaces', () => {
    expect(top('  xlookup ')).toBe('xlookup');
    expect(top('XLookup')).toBe('xlookup');
  });

  it('ranks an exact function name first', () => {
    expect(top('IF')).toBe('if');
    expect(top('vlookup')).toBe('vlookup');
  });

  it('matches partial names', () => {
    /* SUMIF and SUMIFS both start with "sumi", so both should lead the results. */
    expect(topThree('sumi').slice(0, 2).sort()).toEqual(['sumif', 'sumifs']);
    expect(top('textj')).toBe('textjoin');
  });

  it.each([
    ['find employee by id', ['xlookup', 'vlookup', 'index']],
    ['remove extra spaces', ['trim']],
    ['hide error', ['iferror']],
    ['count completed tasks', ['countif']],
    ['combine first and last name', ['textjoin']],
    ['remove duplicates', ['unique', 'countif']],
    /* Tips: people use different verbs for the same idea ("switch", "jump", "toggle"). */
    ['switch', ['trace-references']],
    ['toggle between a formula and its source cells', ['trace-references']],
    ['switch between a formula and its references', ['trace-references']],
    ['jump between a formula and its references', ['trace-references']],
    ['jump to the bottom of a column', ['jump-to-edge']],
    ['select a whole row', ['select-row-column']],
    ['sum shortcut', ['autosum']],
    ['remove grid lines', ['toggle-gridlines']],
    ['hide gridlines', ['toggle-gridlines']],
    ['add borders', ['borders']],
    ['remove borders', ['borders']],
    ['highlight duplicates', ['highlight-duplicates']],
    ['colour repeated values', ['highlight-duplicates']],
    /* More functions */
    ['lowest value', ['min']],
    ['smallest number in a column', ['min']],
    ['round to 2 decimal places', ['round']],
    ['working days between two dates', ['networkdays']],
    ['last 4 characters', ['right']],
    ['characters from the middle of a cell', ['mid']],
    ['count characters', ['len']],
    ['count cells that are not empty', ['counta']],
    ['assign a grade based on a score', ['ifs']],
    ['replace #n/a with a message', ['ifna']],
    ['sum if one condition', ['sumif']]
  ])('finds "%s" within the top three', (query, expected) => {
    const result = topThree(query);
    expect(result.some((id) => expected.includes(id))).toBe(true);
  });
});

describe('searching an entry’s own text, not only its keywords', () => {
  /* These words appear only in steps, notes or argument descriptions, never in a keyword or title. */
  it.each([
    ['quick access toolbar', ['data-form']] /* a step */,
    ['arrows', ['trace-references']] /* a step */,
    ['wildcards', ['match', 'xlookup']] /* a note and an argument description */,
    ['non-breaking space', ['trim']] /* a note */,
    ['approximate match', ['vlookup', 'xlookup', 'match']] /* argument descriptions */
  ])('finds "%s" through the body text', (query, expected) => {
    expect(topThree(query).some((id) => expected.includes(id))).toBe(true);
  });

  it('ranks a keyword hit above a body-only mention', () => {
    /* "duplicates" is a keyword of UNIQUE and COUNTIF; it is only mentioned in passing elsewhere. */
    expect(topThree('duplicates')).toEqual(expect.arrayContaining(['unique']));
  });
});

describe('ranking: rare words and coverage', () => {
  it('lets a rare word beat a common one', () => {
    /* "item" appears in several entries and says little. "cheapest" appears only in MIN. */
    expect(top('cheapest item')).toBe('min');
  });

  it('prefers the entry that matches more of the query’s words', () => {
    /* UNIQUE matches "each", "only" and "once"; FILTER matches "only" and "department". */
    expect(top('list each department only once')).toBe('unique');
  });

  it('does not let one generic word that sits in a title outrank real matches', () => {
    /* "Create a table" contains "table", but XLOOKUP and its relatives match far more of this query. */
    expect(top('bring back a value from another table')).not.toBe('create-table');
    expect(topThree('bring back a value from another table')).toEqual(expect.arrayContaining(['xlookup']));
  });

  it('does not scale down one-word queries, which have nothing else to cover', () => {
    expect(top('xlookup')).toBe('xlookup');
    expect(top('spill')).toBeTruthy();
  });

  it('finds MAX by a word that only the keywords added for it contain', () => {
    expect(topThree('most expensive item')).toContain('max');
  });
});

describe('word forms', () => {
  it('treats plurals and endings as the same word', () => {
    expect(stem('references')).toBe(stem('reference'));
    expect(stem('referenced')).toBe(stem('reference'));
    expect(stem('lookups')).toBe(stem('lookup'));
    expect(stem('copying')).toBe(stem('copy'));
    expect(stem('copies')).toBe(stem('copy'));
    expect(stem('sorted')).toBe(stem('sort'));
  });

  it('does not merge unrelated words', () => {
    expect(stem('sum')).not.toBe(stem('summary'));
    expect(stem('process')).toBe('process'); /* "ss" is not a plural */
  });

  it('drops filler words and punctuation from a query', () => {
    expect(tokenize('switch between a formula and its references')).toEqual(['switch', 'formula', stem('references')]);
    expect(tokenize('ctrl + [')).toEqual(['ctrl']);
  });

  it.each([
    ['lookups', ['xlookup', 'vlookup']],
    ['sorting a list', ['sort']],
    ['copying a formula down', ['fill-down']],
    ['summing numbers', ['sum', 'autosum']]
  ])('finds "%s" even though the entry uses a different word form', (query, expected) => {
    expect(topThree(query).some((id) => expected.includes(id))).toBe(true);
  });
});

describe('typos', () => {
  it('measures edits, counting a swapped pair as one', () => {
    expect(editDistance('xlookup', 'xlokup', 2)).toBe(1); /* a missing letter */
    expect(editDistance('trim', 'trmi', 2)).toBe(1); /* two neighbours swapped */
    expect(editDistance('sort', 'sum', 1)).toBeGreaterThan(1);
  });

  it.each([
    ['xlokup', 'xlookup'],
    ['vlokup', 'vlookup'],
    ['textjion', 'textjoin']
  ])('finds "%s" as %s', (typo, expected) => {
    expect(top(typo)).toBe(expected);
  });

  it('treats a typo that fits two similar names as either of them', () => {
    /* "sumfs" is one edit from SUMIFS, and SUMIF is its close sibling: both are fair answers. */
    expect(topThree('sumfs').slice(0, 2).sort()).toEqual(['sumif', 'sumifs']);
  });

  it('does not guess at very short or unrelated words', () => {
    expect(searchEntries('qzx', entries)).toEqual([]);
    expect(searchEntries('zzzzqqq', entries)).toEqual([]);
  });
});
