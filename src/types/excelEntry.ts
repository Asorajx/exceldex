/* =========================
   Entry Types
   ========================= */

/* What kind of entry this is. Shortcuts and how-tos are all "tip"s: no formula, just keys and steps. */
export type EntryCategory = 'function' | 'tip';

export interface ExcelExample {
  /* The starting formula. Its cell references must point inside `sheet`. */
  formula: string;
  /* What the formula gives with the sample data (shown only while the formula is unedited). */
  result: string;
  /* Sample data the formula works on. Row 1 is the header row; column A is the first column. */
  sheet: string[][];
}

/* Fields every entry has, whatever its kind. Search and the home page only need these. */
interface BaseEntry {
  id: string;
  title: string;
  /* Subject area, used for the pill filters on the home page (for example "Lookup" or "Navigation"). */
  topic: string;
  /* One-sentence purpose, shown in the results list. */
  description: string;
  /* Short words people might type: "lookup", "spaces". */
  keywords: string[];
  /* Plain-language phrases describing the task: "find employee by id". */
  taskPhrases: string[];
  /* Common mistakes and caveats. */
  notes: string[];
  relatedEntryIds: string[];
  /* ISO date (YYYY-MM-DD) this entry was last checked against its source. */
  lastVerified: string;
  /* The official page the content was checked against. */
  sourceUrl: string;
}

export interface FunctionEntry extends BaseEntry {
  category: 'function';
  syntax: string;
  /* Plain-English sentence describing the formula, with {argument_name} placeholders that are */
  /* filled from whatever is in the formula box, so it follows the user's edits. */
  explanation: string;
  arguments: Array<{
    name: string;
    description: string;
    optional: boolean;
    /* Value inserted when the user adds this optional argument. Every optional argument needs one. */
    defaultValue?: string;
    /* Sentence added to the explanation when this optional argument is in the formula. */
    /* Uses {argument_name} placeholders. Left out if any placeholder has no value. */
    clause?: string;
  }>;
  examples: ExcelExample[];
}

export interface KeyGroup {
  /* Shown above the keys when a tip has more than one group, such as "Select a row". */
  label?: string;
  windows?: string;
  mac?: string;
}

export interface TipEntry extends BaseEntry {
  category: 'tip';
  /* Key combinations, shown as keycaps. A tip can have several groups (for example one to select */
  /* a row and one to select a column), each with an optional label. Per platform, keys joined by */
  /* " + " are pressed together ("Alt + ="), and keys joined by " then " are pressed in turn. */
  keys?: KeyGroup[];
  /* What to do, in order. */
  steps: string[];
  /* An optional list explaining each choice in a dialog, shown under the steps. */
  options?: { name: string; text: string }[];
  /* Set when part of the tip is not in the official documentation. Shown to the reader as a note. */
  unofficial?: string;
}

export type ExcelEntry = FunctionEntry | TipEntry;

export function isFunction(entry: ExcelEntry): entry is FunctionEntry {
  return entry.category === 'function';
}

export function isTip(entry: ExcelEntry): entry is TipEntry {
  return entry.category === 'tip';
}
