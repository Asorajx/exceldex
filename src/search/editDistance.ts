/* =========================
   Typo Tolerance
   ========================= */

/* Number of single-character edits (insert, delete, replace, or swap two neighbouring letters) */
/* needed to turn `a` into `b`. Returns `max + 1` as soon as it is clear the answer exceeds `max`, */
/* so comparing against many words stays cheap. */
export function editDistance(a: string, b: string, max: number): number {
  if (Math.abs(a.length - b.length) > max) return max + 1;

  /* rows[i][j] = distance between the first i letters of a and the first j letters of b */
  const rows: number[][] = Array.from({ length: a.length + 1 }, (_, i) => {
    const row = new Array<number>(b.length + 1).fill(0);
    row[0] = i;
    return row;
  });
  for (let j = 0; j <= b.length; j++) rows[0][j] = j;

  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      rows[i][j] = Math.min(rows[i - 1][j] + 1, rows[i][j - 1] + 1, rows[i - 1][j - 1] + cost);
      /* A swapped pair ("teh" for "the") counts as one edit, not two. */
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        rows[i][j] = Math.min(rows[i][j], rows[i - 2][j - 2] + 1);
      }
    }
  }
  return rows[a.length][b.length];
}
