/* =========================
   Key Mode
   ========================= */

/* How a key combination is pressed. Excel's own notation: a "+" means keys held at the same time, */
/* and a comma (we write "then") means keys pressed one after another. */
export type KeyMode = 'hold' | 'sequence' | 'mixed' | 'single';

export function keyMode(combo: string): KeyMode {
  const hasThen = combo.includes(' then ');
  const hasPlus = combo.includes(' + ');
  if (!hasThen && !hasPlus) return 'single';
  if (hasThen && hasPlus) return 'mixed';
  return hasThen ? 'sequence' : 'hold';
}

/* A short instruction shown beside the keycaps, so nobody has to guess how to press them. */
export function keyModeLabel(combo: string): string {
  switch (keyMode(combo)) {
    case 'single':
      return 'Press once';
    case 'hold':
      return 'Hold together';
    case 'sequence':
      return 'Press and release one at a time, in order';
    case 'mixed':
      return 'Hold keys joined by +, then press the next keys in order';
  }
}
