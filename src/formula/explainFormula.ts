import type { FunctionEntry } from '../types/excelEntry';

/* =========================
   Formula Explanation
   ========================= */

/* Replaces {name} placeholders. Returns null if any placeholder has no value. */
function fill(template: string, values: Map<string, string>): string | null {
  let missing = false;
  const text = template.replace(/\{(\w+)\}/g, (_, name: string) => {
    const value = values.get(name);
    if (!value) missing = true;
    return value ?? '';
  });
  return missing ? null : text;
}

/* Builds a plain-English sentence for a formula from its parsed arguments, using the entry's */
/* explanation template. Optional arguments that are present add their own sentence. */
/* Returns null if the main sentence cannot be filled (for example, a required value is blank). */
export function explainFormula(entry: FunctionEntry, args: string[]): string | null {
  const values = new Map<string, string>();
  entry.arguments.forEach((a, i) => {
    if (args[i]) values.set(a.name, args[i]);
  });

  const main = fill(entry.explanation, values);
  if (main === null) return null;

  const extras = entry.arguments
    .filter((a) => a.optional && a.clause && values.has(a.name))
    .map((a) => fill(a.clause!, values))
    .filter((s) => s !== null);

  return [main, ...extras].join(' ');
}
