import { describe, expect, it } from 'vitest';
import { evaluateQuery, type EvalQuery } from '../../eval/metrics';
import { buildReport } from '../../eval/report';

const queries: EvalQuery[] = [
  { query: 'dev hit', category: 'task', acceptable: ['a'] },
  { query: 'dev miss', category: 'task', acceptable: ['a'] },
  { query: 'secret held-out miss', category: 'task', acceptable: ['a'], heldOut: true },
  { query: 'held-out hit', category: 'task', acceptable: ['a'], heldOut: true }
];

/* An engine that finds "a" for queries containing "hit" and nothing otherwise. */
const engine = (text: string) => (text.includes('hit') ? ['a'] : []);
const results = queries.map((q) => evaluateQuery(q, engine));

const base = { stageA: results, before: null, current: results, verbatim: new Set<string>(), generated: '2026-01-01' };

describe('buildReport', () => {
  it('lists dev failures', () => {
    expect(buildReport({ ...base, revealHeldOut: false })).toContain('dev miss');
  });

  it('hides held-out failures until they are revealed, so tuning cannot peek', () => {
    expect(buildReport({ ...base, revealHeldOut: false })).not.toContain('secret held-out miss');
    expect(buildReport({ ...base, revealHeldOut: true })).toContain('secret held-out miss');
  });

  it('always shows held-out totals, which do not give away individual queries', () => {
    const report = buildReport({ ...base, revealHeldOut: false });
    expect(report).toContain('Held-out queries');
    expect(report).toContain('50%'); /* one of two held-out queries found */
  });

  it('shows a Before column only when a snapshot exists', () => {
    expect(buildReport({ ...base, revealHeldOut: false })).not.toContain('| Before |');
    expect(buildReport({ ...base, before: results, revealHeldOut: false })).toContain('| Before |');
  });

  it('reports how many queries were copied word-for-word from the content', () => {
    const report = buildReport({ ...base, verbatim: new Set(['dev hit']), revealHeldOut: false });
    expect(report).toContain('1 of the 4 queries are word-for-word copies');
  });

  it('lists what changed against the snapshot', () => {
    const worse = queries.map((q) => evaluateQuery(q, () => []));
    const report = buildReport({ ...base, before: results, current: worse, revealHeldOut: false });
    expect(report).toContain('Got worse (1)'); /* "dev hit" was found before and is missed now */
  });
});
