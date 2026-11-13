import type { ExcelEntry } from '../types/excelEntry';
import { editDistance } from './editDistance';
import { normalizeQuery, tokenize, wordsOf } from './normalizeQuery';

/* =========================
   Search Scoring
   ========================= */

/* Score weights. Fields that say what an entry is (title, keywords, task phrases) count for more */
/* than text that only mentions a word (steps, notes, argument descriptions). */
const SCORE = {
  /* The whole query against one field */
  exactTitle: 100,
  titlePrefix: 80,
  titleContains: 60,
  taskPhraseContains: 50 /* the whole query appears inside a task phrase */,
  keywordExact: 40,
  keywordContains: 20,
  /* One query word against a field (words are stemmed, so "references" matches "reference") */
  titleWord: 25,
  titleInside: 30 /* a query word hidden inside a compound title: "lookup" in XLOOKUP, "count" in COUNTIFS */,
  taskPhraseWord: 15,
  keywordWord: 10,
  descriptionWord: 6,
  bodyWord: 2 /* steps, notes, argument descriptions: a weak hint */,
  bodyCap: 8 /* so long entries cannot win just by having more text */,
  typo: 8 /* within one or two edits of a title, keyword or task-phrase word */,
  /* Word-level points are multiplied by how rare the word is across all entries, within this range. */
  rarityMin: 0.3,
  rarityMax: 1.8,
  /* Word-level points are scaled by (floor + (1 - floor) x share of the query's words matched). */
  coverageFloor: 0.25
} as const;

/* Everything searchable about an entry, split into stemmed words once and reused. */
interface EntryIndex {
  title: Set<string>;
  keywords: Set<string>;
  phrases: Set<string>;
  description: Set<string>;
  /* The rest of the entry's own text: steps or arguments, notes, explanation. */
  body: Set<string>;
  /* Words a typo can be compared against. */
  pool: string[];
}

function bodyText(entry: ExcelEntry): string {
  const parts = [...entry.notes];
  if (entry.category === 'function') {
    parts.push(entry.explanation.replace(/\{\w+\}/g, ' '));
    for (const a of entry.arguments) parts.push(a.name.replace(/_/g, ' '), a.description);
  } else {
    parts.push(...entry.steps);
  }
  return parts.join(' ');
}

const indexes = new WeakMap<ExcelEntry, EntryIndex>();

function indexOf(entry: ExcelEntry): EntryIndex {
  const cached = indexes.get(entry);
  if (cached) return cached;

  const title = new Set(wordsOf(entry.title));
  const keywords = new Set(entry.keywords.flatMap(wordsOf));
  const phrases = new Set(entry.taskPhrases.flatMap(wordsOf));
  const index: EntryIndex = {
    title,
    keywords,
    phrases,
    description: new Set(wordsOf(entry.description)),
    body: new Set(wordsOf(bodyText(entry))),
    pool: [...new Set([...title, ...keywords, ...phrases])].filter((w) => w.length >= 4)
  };
  indexes.set(entry, index);
  return index;
}

/* True if `token` is a near miss of a word in the pool: one edit for short words, two for long ones. */
function isTypo(token: string, pool: string[]): boolean {
  const max = token.length >= 8 ? 2 : 1;
  return pool.some((word) => editDistance(token, word, max) <= max);
}

/* How many entries use each word somewhere in their searchable text. Computed once per entry list. */
const docFreqCache = new WeakMap<ExcelEntry[], Map<string, number>>();

function docFreq(entries: ExcelEntry[]): Map<string, number> {
  const cached = docFreqCache.get(entries);
  if (cached) return cached;

  const counts = new Map<string, number>();
  for (const entry of entries) {
    const index = indexOf(entry);
    const words = new Set([...index.title, ...index.keywords, ...index.phrases, ...index.description, ...index.body]);
    for (const word of words) counts.set(word, (counts.get(word) ?? 0) + 1);
  }
  docFreqCache.set(entries, counts);
  return counts;
}

/* How much a query word is worth, from how many entries use it (inverse document frequency). */
/* A word found in one entry, like "cheapest", is strong evidence. A word found in a third of them, */
/* like "item" or "table", says little. The range is kept narrow so no word dominates or vanishes. */
function rarityWeight(token: string, counts: Map<string, number>, total: number): number {
  const n = counts.get(token) ?? 0;
  const idf = Math.log(1 + (total - n + 0.5) / (n + 0.5));
  return Math.min(SCORE.rarityMax, Math.max(SCORE.rarityMin, idf / 2));
}

function scoreEntry(entry: ExcelEntry, query: string, tokens: string[], weightOf: (token: string) => number): number {
  const title = entry.title.toLowerCase();
  const keywords = entry.keywords.map((k) => k.toLowerCase());
  const phrases = entry.taskPhrases.map((p) => p.toLowerCase());
  const index = indexOf(entry);

  /* Whole-query matches: the entire query appears in a field. These are strong and kept as they are. */
  let whole = 0;
  if (title === query) whole += SCORE.exactTitle;
  else if (title.startsWith(query)) whole += SCORE.titlePrefix;
  else if (title.includes(query)) whole += SCORE.titleContains;

  if (phrases.some((p) => p.includes(query))) whole += SCORE.taskPhraseContains;
  if (keywords.includes(query)) whole += SCORE.keywordExact;
  else if (keywords.some((k) => k.includes(query))) whole += SCORE.keywordContains;

  /* Word-level matches are added up separately, because they are scaled by coverage below. */
  let score = 0;
  let matchedWords = 0;

  /* Per-word matches, so "find employee by id" can match on "find", "employee", "id" */
  const fieldWords: Array<[Set<string>, number]> = [
    [index.title, SCORE.titleWord],
    [index.phrases, SCORE.taskPhraseWord],
    [index.keywords, SCORE.keywordWord],
    [index.description, SCORE.descriptionWord]
  ];
  let body = 0;
  for (const token of tokens) {
    const weight = weightOf(token);
    let matched = false;
    for (const [words, points] of fieldWords) {
      if (words.has(token)) {
        score += points * weight;
        matched = true;
      }
    }

    /* Function names are often compounds (XLOOKUP, COUNTIFS), so a longer word can sit inside a title. */
    /* Short words are skipped, because "if" or "sum" would match half the titles by accident. */
    if (!index.title.has(token) && token.length >= 4 && title.includes(token)) {
      score += SCORE.titleInside * weight;
      matched = true;
    }

    /* Only if no main field had the word: weaker evidence from the body text, then a typo check. */
    /* A mistyped word is not in any entry, so rarity does not apply to it. */
    if (!matched) {
      if (index.body.has(token)) {
        body += SCORE.bodyWord * weight;
        matched = true;
      } else if (token.length >= 4 && isTypo(token, index.pool)) {
        score += SCORE.typo;
        matched = true;
      }
    }
    if (matched) matchedWords++;
  }

  /* Coverage: an entry that matches most of the query's words beats one that matches a single word, */
  /* however strongly. A one-word query is not scaled, since there is nothing else to cover. */
  const coverage = tokens.length > 1 ? matchedWords / tokens.length : 1;
  const coverageFactor = SCORE.coverageFloor + (1 - SCORE.coverageFloor) * coverage;

  return whole + (score + Math.min(body, SCORE.bodyCap)) * coverageFactor;
}

/* Returns entries that match the query, best match first. */
/* An empty or whitespace-only query returns an empty list. */
export function searchEntries(rawQuery: string, entries: ExcelEntry[]): ExcelEntry[] {
  const query = normalizeQuery(rawQuery);
  if (query === '') return [];

  const tokens = tokenize(query);
  const counts = docFreq(entries);
  const weightOf = (token: string) => rarityWeight(token, counts, entries.length);

  return entries
    .map((entry) => ({ entry, score: scoreEntry(entry, query, tokens, weightOf) }))
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score || a.entry.title.localeCompare(b.entry.title))
    .map((r) => r.entry);
}
