import type { ExcelExample, FunctionEntry } from '../types/excelEntry';
import { formatFormula, parseFormula } from './parseFormula';

/* =========================
   Formula State
   ========================= */

/* What the user has chosen. Only argument values and which optional arguments are included */
/* can change; the function name, brackets and separators are always written by `buildFormula`. */
export interface FormulaState {
  values: string[];
  included: boolean[];
}

/* Starts from the entry's example: its values filled in, optional arguments on only if the example uses them. */
export function initialState(entry: FunctionEntry, example: ExcelExample): FormulaState {
  const parsed = parseFormula(example.formula);
  const usable = parsed !== null && parsed.name.toUpperCase() === entry.title.toUpperCase();
  const given = usable ? parsed.args : [];

  return {
    values: entry.arguments.map((_, i) => given[i] ?? ''),
    included: entry.arguments.map((a, i) => !a.optional || (given[i] ?? '') !== '')
  };
}

/* The formula text to copy. Excluded and trailing-empty optional arguments are left out. */
export function buildFormula(entry: FunctionEntry, { values, included }: FormulaState): string {
  const required = entry.arguments.filter((a) => !a.optional).length;
  const args = entry.arguments.map((_, i) => (included[i] ? values[i].trim() : ''));
  return formatFormula(entry.title, args, required);
}
