import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { it } from 'vitest';
import { entries } from '../src/data/entries';
import { searchEntries } from '../src/search/searchEntries';
import { stageASearch } from './baseline';
import { evaluateQuery, verbatimQueries, type EvalQuery, type QueryResult } from './metrics';
import queryFile from './queries.json';
import { buildReport } from './report';

const resultsDir = fileURLToPath(new URL('./results/', import.meta.url));
const path = (name: string) => resultsDir + name;

/* Runs every query through the original matcher and the current search, and writes the report. */

/*   npm run eval          -> eval/results/latest.md       (held-out failures hidden, for tuning) */
/*                            eval/results/latest.full.md  (everything, read only when finished) */
/*                            eval/results/latest.json     (per-query results) */
/*   npm run eval:freeze   -> copies latest.json to before.json, the snapshot later runs compare with */

/* This only writes reports; it does not assert on the numbers. */
it('writes the evaluation report', () => {
  const queries = queryFile as EvalQuery[];

  const current = queries.map((q) => evaluateQuery(q, (text) => searchEntries(text, entries).map((e) => e.id)));
  const stageA = queries.map((q) => evaluateQuery(q, (text) => stageASearch(text, entries)));
  const before: QueryResult[] | null = existsSync(path('before.json'))
    ? JSON.parse(readFileSync(path('before.json'), 'utf8'))
    : null;

  const generated = new Date().toISOString().slice(0, 10);
  mkdirSync(resultsDir, { recursive: true });
  const verbatim = verbatimQueries(queries, entries);
  writeFileSync(path('latest.md'), buildReport({ stageA, before, current, verbatim, revealHeldOut: false, generated }));
  writeFileSync(
    path('latest.full.md'),
    buildReport({ stageA, before, current, verbatim, revealHeldOut: true, generated })
  );
  writeFileSync(path('latest.json'), JSON.stringify(current, null, 2) + '\n');
});
