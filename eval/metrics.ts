/* =========================
   Evaluation Metrics
   ========================= */

/* The kinds of query that are measured separately. */
export const CATEGORIES = [
  'exact',
  'partial',
  'task',
  'synonym',
  'typo',
  'word-form',
  'body-text',
  'tip',
  'ambiguous',
  'no-result'
] as const;

export type Category = (typeof CATEGORIES)[number];

export interface EvalQuery {
  query: string;
  category: Category;
  /* Entry IDs that are a correct answer. Empty only for "no-result" queries. */
  acceptable: string[];
  /* True for held-out queries: ones not used to tune the search. */
  heldOut?: boolean;
}

/* An engine takes a query and returns entry IDs, best first. */
export type Engine = (query: string) => string[];

export interface QueryResult {
  query: string;
  category: Category;
  heldOut: boolean;
  acceptable: string[];
  /* Everything the engine returned, best first. */
  returned: string[];
  /* 1-based position of the best-placed correct answer, or null if none was returned. */
  rank: number | null;
  top1: boolean;
  top3: boolean;
  /* Reciprocal rank: 1 for first place, 0.5 for second, and so on. 0 if not returned at all. */
  rr: number;
  /* For "no-result" queries, success means returning nothing. For the rest, success means top 3. */
  ok: boolean;
}

export function evaluateQuery(q: EvalQuery, engine: Engine): QueryResult {
  const returned = engine(q.query);
  const heldOut = q.heldOut === true;

  if (q.category === 'no-result') {
    const empty = returned.length === 0;
    return {
      query: q.query,
      category: q.category,
      heldOut,
      acceptable: [],
      returned,
      rank: null,
      top1: empty,
      top3: empty,
      rr: empty ? 1 : 0,
      ok: empty
    };
  }

  const index = returned.findIndex((id) => q.acceptable.includes(id));
  const rank = index === -1 ? null : index + 1;
  return {
    query: q.query,
    category: q.category,
    heldOut,
    acceptable: q.acceptable,
    returned,
    rank,
    top1: rank === 1,
    top3: rank !== null && rank <= 3,
    rr: rank === null ? 0 : 1 / rank,
    ok: rank !== null && rank <= 3
  };
}

export interface Summary {
  n: number;
  /* Share of queries whose correct answer came first (0 to 1). */
  top1: number;
  /* Share with a correct answer in the top three. */
  top3: number;
  /* Mean reciprocal rank: how high the right answer sits on average. 1 is perfect. */
  mrr: number;
}

/* Averages the results. For "no-result" queries top1/top3 both mean "correctly returned nothing". */
export function summarize(results: QueryResult[]): Summary {
  const n = results.length;
  if (n === 0) return { n: 0, top1: 0, top3: 0, mrr: 0 };
  const sum = (pick: (r: QueryResult) => number) => results.reduce((total, r) => total + pick(r), 0);
  return {
    n,
    top1: sum((r) => (r.top1 ? 1 : 0)) / n,
    top3: sum((r) => (r.top3 ? 1 : 0)) / n,
    mrr: sum((r) => r.rr) / n
  };
}

export function byCategory(results: QueryResult[]): Map<Category, QueryResult[]> {
  const groups = new Map<Category, QueryResult[]>();
  for (const category of CATEGORIES) groups.set(category, []);
  for (const r of results) groups.get(r.category)!.push(r);
  return groups;
}

const normalizeText = (text: string) => text.trim().toLowerCase().replace(/\s+/g, ' ');

/* Queries that are word-for-word copies of some entry's keyword or task phrase. */
/* "Exact" queries are excluded. */
export function verbatimQueries(
  queries: EvalQuery[],
  entries: Array<{ keywords: string[]; taskPhrases: string[] }>
): Set<string> {
  const known = new Set<string>();
  for (const entry of entries) {
    for (const text of [...entry.keywords, ...entry.taskPhrases]) known.add(normalizeText(text));
  }
  return new Set(
    queries.filter((q) => q.category !== 'exact' && known.has(normalizeText(q.query))).map((q) => q.query)
  );
}

/* Formats 0.8333 as "83%". */
export function pct(value: number): string {
  return `${Math.round(value * 100)}%`;
}
