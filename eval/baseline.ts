import type { ExcelEntry } from '../src/types/excelEntry';

/* =========================
   Stage A Baseline
   ========================= */

/* "Stage A": the first, simplest search. It normalises the query, gives exact and partial */
/* title matches priority, then look for the query's words in keywords, task phrases and the */
/* description. It has no stemming, no typo tolerance, and it never reads steps, notes or arguments. */


const SCORE = {
  exactTitle: 100,
  titlePrefix: 80,
  titleContains: 60,
  taskPhraseContains: 50,
  keywordExact: 40,
  keywordContains: 20,
  taskPhraseToken: 15,
  descriptionToken: 5
} as const;

const STOPWORDS = new Set([
  'a',
  'an',
  'and',
  'by',
  'for',
  'from',
  'in',
  'is',
  'it',
  'of',
  'on',
  'or',
  'the',
  'to',
  'using',
  'with'
]);

function normalize(query: string): string {
  return query.trim().toLowerCase().replace(/\s+/g, ' ');
}

function tokenize(normalized: string): string[] {
  const words = normalized.split(' ').filter(Boolean);
  const meaningful = words.filter((w) => !STOPWORDS.has(w));
  return meaningful.length > 0 ? meaningful : words;
}

function scoreEntry(entry: ExcelEntry, query: string, tokens: string[]): number {
  const title = entry.title.toLowerCase();
  const keywords = entry.keywords.map((k) => k.toLowerCase());
  const phrases = entry.taskPhrases.map((p) => p.toLowerCase());
  const description = entry.description.toLowerCase();

  let score = 0;
  if (title === query) score += SCORE.exactTitle;
  else if (title.startsWith(query)) score += SCORE.titlePrefix;
  else if (title.includes(query)) score += SCORE.titleContains;

  if (phrases.some((p) => p.includes(query))) score += SCORE.taskPhraseContains;
  if (keywords.includes(query)) score += SCORE.keywordExact;
  else if (keywords.some((k) => k.includes(query))) score += SCORE.keywordContains;

  for (const token of tokens) {
    if (keywords.some((k) => k.split(' ').includes(token))) score += SCORE.keywordContains / 2;
    if (phrases.some((p) => p.split(' ').includes(token))) score += SCORE.taskPhraseToken;
    if (description.includes(token)) score += SCORE.descriptionToken;
  }
  return score;
}

/* Returns entry IDs, best first. */
export function stageASearch(rawQuery: string, entries: ExcelEntry[]): string[] {
  const query = normalize(rawQuery);
  if (query === '') return [];
  const tokens = tokenize(query);

  return entries
    .map((entry) => ({ entry, score: scoreEntry(entry, query, tokens) }))
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score || a.entry.title.localeCompare(b.entry.title))
    .map((r) => r.entry.id);
}
