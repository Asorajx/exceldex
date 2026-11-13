import { describe, expect, it } from 'vitest';
import { stageASearch } from '../../eval/baseline';
import { entries } from '../../src/data/entries';
import { CATEGORIES, byCategory, evaluateQuery, pct, summarize, verbatimQueries, type EvalQuery } from '../../eval/metrics';

/* An engine that always answers with the same IDs, so each case controls exactly what came back. */
const returning =
  (...ids: string[]) =>
  () =>
    ids;
const q = (partial: Partial<EvalQuery> & Pick<EvalQuery, 'acceptable'>): EvalQuery => ({
  query: 'q',
  category: 'task',
  ...partial
});

describe('evaluateQuery', () => {
  it('scores a first-place answer as top-1, top-3 and a reciprocal rank of 1', () => {
    const r = evaluateQuery(q({ acceptable: ['a'] }), returning('a', 'b', 'c'));
    expect(r).toMatchObject({ rank: 1, top1: true, top3: true, rr: 1, ok: true });
  });

  it('scores a third-place answer as top-3 but not top-1', () => {
    const r = evaluateQuery(q({ acceptable: ['c'] }), returning('a', 'b', 'c', 'd'));
    expect(r).toMatchObject({ rank: 3, top1: false, top3: true, ok: true });
    expect(r.rr).toBeCloseTo(1 / 3);
  });

  it('does not count a fourth-place answer as top-3', () => {
    const r = evaluateQuery(q({ acceptable: ['d'] }), returning('a', 'b', 'c', 'd'));
    expect(r).toMatchObject({ rank: 4, top1: false, top3: false, ok: false });
    expect(r.rr).toBeCloseTo(1 / 4);
  });

  it('uses the best-placed of several acceptable answers', () => {
    const r = evaluateQuery(q({ acceptable: ['d', 'b'] }), returning('a', 'b', 'c', 'd'));
    expect(r.rank).toBe(2);
  });

  it('scores a missing answer as zero', () => {
    const r = evaluateQuery(q({ acceptable: ['z'] }), returning('a', 'b'));
    expect(r).toMatchObject({ rank: null, top1: false, top3: false, rr: 0, ok: false });
  });

  it('for a no-result query, success means returning nothing', () => {
    const none = q({ category: 'no-result', acceptable: [] });
    expect(evaluateQuery(none, returning()).ok).toBe(true);
    expect(evaluateQuery(none, returning('a')).ok).toBe(false);
  });

  it('remembers whether a query was held out', () => {
    expect(evaluateQuery(q({ acceptable: ['a'], heldOut: true }), returning('a')).heldOut).toBe(true);
    expect(evaluateQuery(q({ acceptable: ['a'] }), returning('a')).heldOut).toBe(false);
  });
});

describe('summarize and grouping', () => {
  it('averages top-1, top-3 and MRR', () => {
    const results = [
      evaluateQuery(q({ query: '1', acceptable: ['a'] }), returning('a')) /* first */,
      evaluateQuery(q({ query: '2', acceptable: ['b'] }), returning('a', 'b')) /* second */,
      evaluateQuery(q({ query: '3', acceptable: ['z'] }), returning('a')) /* missed */,
      evaluateQuery(q({ query: '4', acceptable: ['a'] }), returning('a')) /* first */
    ];
    const s = summarize(results);
    expect(s.n).toBe(4);
    expect(s.top1).toBeCloseTo(2 / 4);
    expect(s.top3).toBeCloseTo(3 / 4);
    expect(s.mrr).toBeCloseTo((1 + 0.5 + 0 + 1) / 4);
  });

  it('handles an empty group without dividing by zero', () => {
    expect(summarize([])).toEqual({ n: 0, top1: 0, top3: 0, mrr: 0 });
  });

  it('groups results by category, including empty ones', () => {
    const groups = byCategory([evaluateQuery(q({ category: 'typo', acceptable: ['a'] }), returning('a'))]);
    expect([...groups.keys()]).toEqual([...CATEGORIES]);
    expect(groups.get('typo')).toHaveLength(1);
    expect(groups.get('exact')).toHaveLength(0);
  });

  it('formats percentages as whole numbers', () => {
    expect(pct(0.8333)).toBe('83%');
    expect(pct(1)).toBe('100%');
    expect(pct(0)).toBe('0%');
  });
});

describe('verbatimQueries', () => {
  const content = [{ keywords: ['Lookup'], taskPhrases: ['count the characters in a cell'] }];

  it('flags a query copied word-for-word, ignoring case and spacing', () => {
    const queries = [q({ query: '  Count the   characters in a CELL ', acceptable: ['len'] })];
    expect(verbatimQueries(queries, content).size).toBe(1);
  });

  it('does not flag a query that only resembles a phrase', () => {
    const queries = [q({ query: 'count characters in a cell', acceptable: ['len'] })];
    expect(verbatimQueries(queries, content).size).toBe(0);
  });

  it('never flags exact-name queries, which copy a title on purpose', () => {
    const queries = [q({ query: 'lookup', category: 'exact', acceptable: ['xlookup'] })];
    expect(verbatimQueries(queries, content).size).toBe(0);
  });
});

describe('Stage A baseline', () => {
  it('finds an exact name and an empty query returns nothing', () => {
    expect(stageASearch('xlookup', entries)[0]).toBe('xlookup');
    expect(stageASearch('   ', entries)).toEqual([]);
  });

  it('has no typo tolerance, which is the gap the later versions close', () => {
    expect(stageASearch('xlokup', entries)).not.toContain('xlookup');
  });

  it('does not read steps or notes, only keywords, phrases and descriptions', () => {
    /* "Quick Access Toolbar" appears only in the Data entry form tip's steps. */
    expect(stageASearch('quick access toolbar', entries)).not.toContain('data-form');
  });
});
