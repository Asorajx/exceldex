import { describe, expect, it } from 'vitest';
import { entries } from '../../src/data/entries';
import { searchEntries } from '../../src/search/searchEntries';
import { stageASearch } from '../../eval/baseline';
import { byCategory, evaluateQuery, summarize, type EvalQuery } from '../../eval/metrics';
import queryFile from '../../eval/queries.json';

const queries = queryFile as EvalQuery[];
const run = (engine: (q: string) => string[]) => queries.map((q) => evaluateQuery(q, engine));
const current = run((text) => searchEntries(text, entries).map((e) => e.id));
const stageA = run((text) => stageASearch(text, entries));

const answerable = (results: typeof current) => results.filter((r) => r.category !== 'no-result');
const dev = (results: typeof current) => answerable(results).filter((r) => !r.heldOut);
const held = (results: typeof current) => answerable(results).filter((r) => r.heldOut);

/* Minimum scores, set a little below the current results. A clearly worse search fails here. */
describe('search quality floors', () => {
  it('finds the right answer first for most dev queries, and in the top three for nearly all', () => {
    const s = summarize(dev(current));
    expect(s.top1).toBeGreaterThanOrEqual(0.9);
    expect(s.top3).toBeGreaterThanOrEqual(0.95);
  });

  it('holds up on queries the tuning never saw', () => {
    const s = summarize(held(current));
    expect(s.top1).toBeGreaterThanOrEqual(0.8);
    expect(s.top3).toBeGreaterThanOrEqual(0.9);
  });

  it('stays clearly ahead of the original matcher on both sets', () => {
    for (const pick of [dev, held]) {
      const now = summarize(pick(current));
      const before = summarize(pick(stageA));
      expect(now.top3).toBeGreaterThan(before.top3 + 0.1);
      expect(now.mrr).toBeGreaterThan(before.mrr + 0.1);
    }
  });

  it('never loses typos and word forms, the categories the later versions were built for', () => {
    const groups = byCategory(current);
    for (const category of ['typo', 'word-form'] as const) {
      expect(summarize(groups.get(category)!).top3, category).toBe(1);
    }
  });
});
