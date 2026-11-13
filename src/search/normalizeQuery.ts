/* =========================
   Query Normalising
   ========================= */

/* Lowercase, trim, and collapse repeated whitespace. */
export function normalizeQuery(query: string): string {
  return query.trim().toLowerCase().replace(/\s+/g, ' ');
}

/* Words too common to help ranking in natural-language queries or in entry text. */
const STOPWORDS = new Set([
  'a',
  'an',
  'and',
  'any',
  'are',
  'as',
  'at',
  'be',
  'between',
  'by',
  'can',
  'do',
  'does',
  'for',
  'from',
  'how',
  'i',
  'in',
  'into',
  'is',
  'it',
  'its',
  'my',
  'of',
  'on',
  'or',
  'that',
  'the',
  'then',
  'this',
  'to',
  'using',
  'what',
  'when',
  'where',
  'which',
  'with',
  'you',
  'your'
]);

/* A deliberately small stemmer: it makes "references", "referenced" and "reference" the same word, */
/* and "lookups" the same as "lookup". It is not a full linguistic stemmer. It only trims common */
/* endings, and the same function is applied to the query and to the entry text, so even when a stem */
/* is not a real word, both sides agree on it. */
export function stem(word: string): string {
  let w = word;
  if (w.length > 4 && w.endsWith('ies')) w = w.slice(0, -3) + 'y';
  else if (w.length > 4 && /(ch|sh|x|z|ss)es$/.test(w)) w = w.slice(0, -2);
  else if (w.length > 3 && w.endsWith('s') && !w.endsWith('ss')) w = w.slice(0, -1);

  if (w.length > 5 && w.endsWith('ing')) w = w.slice(0, -3);
  else if (w.length > 4 && w.endsWith('ed')) w = w.slice(0, -2);

  if (w.length > 3 && w.endsWith('e')) w = w.slice(0, -1);
  return w;
}

/* The meaningful words in a piece of text, stemmed. Splits on anything that is not a letter or */
/* digit (so "Ctrl + [" gives "ctrl"), and drops filler words. Unicode letters are kept, so the */
/* same code can handle other languages later. */
export function wordsOf(text: string): string[] {
  const all = text.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [];
  return all.filter((w) => !STOPWORDS.has(w)).map(stem);
}

/* Split a normalised query into meaningful, stemmed words. */
export function tokenize(normalized: string): string[] {
  const meaningful = wordsOf(normalized);
  /* If the query was only filler words, fall back to the raw words. */
  if (meaningful.length > 0) return meaningful;
  return (normalized.match(/[\p{L}\p{N}]+/gu) ?? []).map(stem);
}
