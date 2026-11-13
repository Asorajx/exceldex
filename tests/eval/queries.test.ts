import { describe, expect, it } from 'vitest';
import { entries } from '../../src/data/entries';
import { CATEGORIES, type EvalQuery } from '../../eval/metrics';
import queryFile from '../../eval/queries.json';

const queries = queryFile as EvalQuery[];
const ids = new Set(entries.map((e) => e.id));

describe('the evaluation query file', () => {
  it('only names entries that exist', () => {
    for (const q of queries) {
      for (const id of q.acceptable) expect(ids.has(id), `"${q.query}" -> ${id}`).toBe(true);
    }
  });

  it('uses known categories, and gives every answerable query at least one right answer', () => {
    for (const q of queries) {
      expect(CATEGORIES, q.query).toContain(q.category);
      if (q.category === 'no-result') expect(q.acceptable, q.query).toEqual([]);
      else expect(q.acceptable.length, q.query).toBeGreaterThan(0);
      expect(new Set(q.acceptable).size, `${q.query}: repeated answer`).toBe(q.acceptable.length);
    }
  });

  it('has no repeated queries', () => {
    const seen = queries.map((q) => q.query.trim().toLowerCase());
    expect(new Set(seen).size).toBe(seen.length);
  });

  it('covers every category in both the dev and held-out sets', () => {
    for (const category of CATEGORIES) {
      const inCategory = queries.filter((q) => q.category === category);
      expect(inCategory.filter((q) => !q.heldOut).length, `${category}: dev`).toBeGreaterThanOrEqual(4);
      expect(inCategory.filter((q) => q.heldOut).length, `${category}: held-out`).toBeGreaterThanOrEqual(2);
    }
  });

  it('keeps a sensible share held out', () => {
    const share = queries.filter((q) => q.heldOut).length / queries.length;
    expect(share).toBeGreaterThan(0.25);
    expect(share).toBeLessThan(0.45);
  });

  it('is big enough to mean something', () => {
    expect(queries.length).toBeGreaterThanOrEqual(80);
  });
});
