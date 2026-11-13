import { CATEGORIES, byCategory, pct, summarize, type QueryResult } from './metrics';

/* =========================
   Evaluation Report
   ========================= */

export interface ReportInput {
  /* The original simple matcher, run on today's queries and entries. */
  stageA: QueryResult[];
  /* A saved snapshot of the engine before it was changed, or null if none was saved. */
  before: QueryResult[] | null;
  /* The engine as it is now. */
  current: QueryResult[];
  /* Queries copied word-for-word from the content (see `verbatimQueries`). */
  verbatim: Set<string>;
  /* If false, held-out failures are left out, so tuning cannot peek at them. */
  revealHeldOut: boolean;
  generated: string;
}

/* Answerable queries are scored on rank. "No-result" queries are scored on returning nothing. */
const answerable = (r: QueryResult) => r.category !== 'no-result';

const dev = (results: QueryResult[]) => results.filter((r) => !r.heldOut);
const held = (results: QueryResult[]) => results.filter((r) => r.heldOut);

function row(cells: string[]): string {
  return `| ${cells.join(' | ')} |`;
}

function table(header: string[], rows: string[][]): string {
  return [row(header), row(header.map(() => '---')), ...rows.map(row)].join('\n');
}

/* "62% / 88%" for top-1 / top-3, or "n/a" when a group is empty. */
function topPair(results: QueryResult[]): string {
  if (results.length === 0) return 'n/a';
  const s = summarize(results);
  return `${pct(s.top1)} / ${pct(s.top3)}`;
}

function emptyCorrect(results: QueryResult[]): string {
  const noResult = results.filter((r) => r.category === 'no-result');
  if (noResult.length === 0) return 'n/a';
  return `${noResult.filter((r) => r.ok).length}/${noResult.length}`;
}

function overallTable(sets: Array<[string, QueryResult[]]>): string {
  const header = ['Version', 'Top-1', 'Top-3', 'MRR', 'Nothing-to-find handled'];
  const rows = sets.map(([name, results]) => {
    const s = summarize(results.filter(answerable));
    return [name, pct(s.top1), pct(s.top3), s.mrr.toFixed(2), emptyCorrect(results)];
  });
  return table(header, rows);
}

function categoryTable(sets: Array<[string, QueryResult[]]>): string {
  const header = ['Category', 'Queries', ...sets.map(([name]) => `${name} (top-1 / top-3)`)];
  const grouped = sets.map(([, results]) => byCategory(results));
  const rows: string[][] = [];
  for (const category of CATEGORIES) {
    const count = grouped[0].get(category)!.length;
    if (count === 0) continue;
    const cells = grouped.map((g) => {
      const items = g.get(category)!;
      /* For "no-result", the pair is the same number twice: the share that correctly returned nothing. */
      return category === 'no-result' ? `${pct(summarize(items).top3)} empty` : topPair(items);
    });
    rows.push([category, String(count), ...cells]);
  }
  return table(header, rows);
}

const ids = (list: string[]) => (list.length ? list.join(', ') : '(none)');

function describeMiss(r: QueryResult, baseline: QueryResult | undefined): string[] {
  const expected = r.category === 'no-result' ? 'nothing' : ids(r.acceptable);
  const got = r.returned.length
    ? ids(r.returned.slice(0, 3)) + (r.returned.length > 3 ? ` (+${r.returned.length - 3} more)` : '')
    : '(no results)';
  const where =
    r.category === 'no-result'
      ? `returned ${r.returned.length} result(s)`
      : r.rank === null
        ? 'not returned at all'
        : `found at position ${r.rank}`;
  const base = baseline ? (baseline.ok ? 'Stage A got it' : 'Stage A missed too') : '';
  return [r.query, r.category, expected, got, where, base];
}

function failureLog(current: QueryResult[], stageA: QueryResult[], includeHeld: boolean): string {
  const baselineFor = new Map(stageA.map((r) => [r.query, r]));
  const misses = current.filter((r) => !r.ok && (includeHeld || !r.heldOut));
  if (misses.length === 0) return '_No misses._';
  const header = ['Query', 'Category', 'Wanted', 'Returned (top 3)', 'Result', 'vs Stage A'];
  const rows = misses.map((r) => {
    const cells = describeMiss(r, baselineFor.get(r.query));
    if (r.heldOut) cells[0] += ' (held-out)';
    return cells;
  });
  return table(header, rows);
}

/* Right answer present but not first. These are the ranking problems, as opposed to coverage problems. */
function nearMisses(current: QueryResult[], includeHeld: boolean): string {
  const items = current.filter(
    (r) => r.category !== 'no-result' && r.ok && r.rank !== 1 && (includeHeld || !r.heldOut)
  );
  if (items.length === 0) return '_None: every correct answer was first._';
  const rows = items.map((r) => [
    r.query + (r.heldOut ? ' (held-out)' : ''),
    r.category,
    ids(r.acceptable),
    ids(r.returned.slice(0, 3)),
    `position ${r.rank}`
  ]);
  return table(['Query', 'Category', 'Wanted', 'Returned (top 3)', 'Result'], rows);
}

function changesSince(before: QueryResult[], current: QueryResult[], includeHeld: boolean): string {
  const was = new Map(before.map((r) => [r.query, r]));
  const better: string[][] = [];
  const worse: string[][] = [];
  for (const now of current) {
    if (now.heldOut && !includeHeld) continue;
    const prev = was.get(now.query);
    if (!prev) continue;
    const rankValue = (r: QueryResult) => (r.category === 'no-result' ? (r.ok ? 1 : 99) : (r.rank ?? 99));
    const a = rankValue(prev);
    const b = rankValue(now);
    const label = (r: QueryResult) =>
      r.category === 'no-result' ? (r.ok ? 'empty' : 'noise') : r.rank === null ? 'missed' : `#${r.rank}`;
    if (b < a) better.push([now.query + (now.heldOut ? ' (held-out)' : ''), now.category, label(prev), label(now)]);
    if (b > a) worse.push([now.query + (now.heldOut ? ' (held-out)' : ''), now.category, label(prev), label(now)]);
  }
  const parts: string[] = [];
  parts.push(
    `**Improved (${better.length})**\n\n${better.length ? table(['Query', 'Category', 'Before', 'Now'], better) : '_None._'}`
  );
  parts.push(
    `**Got worse (${worse.length})**\n\n${worse.length ? table(['Query', 'Category', 'Before', 'Now'], worse) : '_None._'}`
  );
  return parts.join('\n\n');
}

export function buildReport(input: ReportInput): string {
  const { stageA, before, current, verbatim, revealHeldOut, generated } = input;
  const original = (results: QueryResult[]) => results.filter((r) => !verbatim.has(r.query));
  /* `sets` and the `dev`/`held` helpers take a function so a table can be built from any slice. */
  const sets = (pick: (r: QueryResult[]) => QueryResult[]): Array<[string, QueryResult[]]> => {
    const list: Array<[string, QueryResult[]]> = [['Stage A', pick(stageA)]];
    if (before) list.push(['Before', pick(before)]);
    list.push([before ? 'After' : 'Current', pick(current)]);
    return list;
  };

  const out: string[] = [];
  out.push('# Search evaluation');
  out.push(`_Generated ${generated}._`);
  out.push(
    [
      `${current.length} queries: ${dev(current).length} used for tuning ("dev") and ${held(current).length} held out.`,
      'Top-1 is how often a correct answer came first, top-3 how often one was in the first three, and MRR (mean reciprocal rank) how high the right answer sits on average, where 1.00 is always first.',
      '"Nothing-to-find handled" counts queries that have no right answer, where the correct response is to return nothing.'
    ].join(' ')
  );

  const verbatimCount = current.filter((r) => verbatim.has(r.query)).length;
  out.push(
    `**A caution about easy queries.** ${verbatimCount} of the ${current.length} queries are word-for-word copies of a keyword or task phrase in the content, so finding them is close to a lookup. The tables below show every query, and then the same totals without those copies, which is the fairer measure.`
  );

  out.push('## Dev queries (used for tuning)');
  out.push(overallTable(sets(dev)));
  out.push(`### Dev, without the word-for-word copies (${original(dev(current)).length} queries)`);
  out.push(overallTable(sets((r) => original(dev(r)))));
  out.push('### By category');
  out.push(categoryTable(sets(dev)));

  out.push('## Held-out queries (never used for tuning)');
  out.push(
    'These were written before any results were seen. Only the totals are shown here, so improvements cannot be tuned to them.'
  );
  out.push(overallTable(sets(held)));
  out.push(`### Held-out, without the word-for-word copies (${original(held(current)).length} queries)`);
  out.push(overallTable(sets((r) => original(held(r)))));
  out.push('### By category');
  out.push(categoryTable(sets(held)));

  out.push('## Failure log');
  out.push(
    'A miss is a query where no correct answer appeared in the top three, or where a no-result query still returned something.'
  );
  out.push(failureLog(current, stageA, revealHeldOut));

  out.push('## Right answer, wrong place');
  out.push('The correct entry was in the top three but not first. These are ranking problems.');
  out.push(nearMisses(current, revealHeldOut));

  if (before) {
    out.push('## Changes since the saved "before" snapshot');
    out.push(changesSince(before, current, revealHeldOut));
  }

  return out.join('\n\n') + '\n';
}
