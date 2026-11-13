/* =========================
   Formula Parsing
   ========================= */

export interface ParsedCall {
  name: string;
  /* Top-level arguments of the outermost function call, trimmed. */
  args: string[];
}

/* Splits `=NAME(a, b, NESTED(c, d), "x, y")` into its function name and top-level arguments. */
/* Respects nested parentheses and quoted text, and accepts `,` or `;` as separators */
/* (some Excel locales use semicolons). Returns null if the formula is not a call we can read. */
export function parseFormula(formula: string): ParsedCall | null {
  const text = formula.trim().replace(/^=/, '');
  const open = text.indexOf('(');
  if (open <= 0) return null;

  const name = text.slice(0, open).trim();
  if (!/^[A-Za-z][A-Za-z0-9._]*$/.test(name)) return null;

  const args: string[] = [];
  let depth = 0;
  let inQuotes = false;
  let current = '';

  for (let i = open + 1; i < text.length; i++) {
    const ch = text[i];

    if (ch === '"') {
      inQuotes = !inQuotes; /* a doubled "" toggles twice, which keeps us inside the text */
      current += ch;
      continue;
    }
    if (inQuotes) {
      current += ch;
      continue;
    }

    if (ch === '(') depth++;
    if (ch === ')') {
      if (depth === 0) {
        const last = current.trim();
        if (last !== '' || args.length > 0) args.push(last);
        return args.length > 0 ? { name, args } : null;
      }
      depth--;
    }

    if ((ch === ',' || ch === ';') && depth === 0) {
      args.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }

  return null; /* unbalanced */
}

/* Writes a call back out as text: `=NAME(a, b, c)`. */
/* Trailing empty arguments are dropped (but never below `minArgs`). An empty argument in the */
/* middle stays as an empty slot (`,,`), which Excel reads as "use the default". */
export function formatFormula(name: string, args: string[], minArgs = 0): string {
  let end = args.length;
  while (end > minArgs && args[end - 1] === '') end--;

  let out = '';
  for (let i = 0; i < end; i++) {
    if (i > 0) out += ',';
    if (args[i] !== '') out += (i > 0 ? ' ' : '') + args[i];
  }
  return `=${name}(${out})`;
}
