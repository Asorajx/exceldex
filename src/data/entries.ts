import { isFunction, isTip } from '../types/excelEntry';
import type { ExcelEntry } from '../types/excelEntry';
import raw from './excelEntries.json';

/* =========================
   Entry Data
   ========================= */

/* Single typed entry point for content. The JSON is cast once, here. */
/* The JSON mixes two shapes (functions and tips), so TypeScript sees it as a loose union. */
/* The data tests check every entry against its kind. */
export const entries = raw as unknown as ExcelEntry[];

/* The same entries, split by kind so code can use kind-specific fields safely. */
export const functionEntries = entries.filter(isFunction);
export const tipEntries = entries.filter(isTip);
