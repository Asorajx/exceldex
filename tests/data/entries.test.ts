import { describe, expect, it } from 'vitest';
import { entries, functionEntries, tipEntries } from '../../src/data/entries';

describe('entries', () => {
  it('has unique IDs', () => {
    const ids = entries.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('splits cleanly into functions and tips', () => {
    expect(functionEntries.length + tipEntries.length).toBe(entries.length);
    expect(functionEntries.length).toBeGreaterThanOrEqual(20);
    expect(tipEntries.length).toBeGreaterThanOrEqual(1);
  });

  it('only links to entries that exist, and not to itself', () => {
    const ids = new Set(entries.map((e) => e.id));
    for (const entry of entries) {
      for (const related of entry.relatedEntryIds) {
        expect(ids.has(related), `${entry.id} -> ${related}`).toBe(true);
        expect(related, `${entry.id} links to itself`).not.toBe(entry.id);
      }
    }
  });

  it('gives every entry a topic, description and search terms', () => {
    for (const entry of entries) {
      expect(entry.topic, entry.id).not.toBe('');
      expect(entry.description, entry.id).not.toBe('');
      expect(entry.keywords.length, `${entry.id} keywords`).toBeGreaterThan(0);
      expect(entry.taskPhrases.length, `${entry.id} task phrases`).toBeGreaterThan(0);
    }
  });
});

describe('tips', () => {
  it.each(tipEntries.map((t) => [t.id, t] as const))('%s has steps and valid keys', (_id, tip) => {
    expect(tip.steps.length).toBeGreaterThan(0);
    for (const step of tip.steps) expect(step.trim()).not.toBe('');

    /* Each key group must show keys for at least one platform, with no empty keycaps. */
    for (const group of tip.keys ?? []) {
      const combos = [group.windows, group.mac].filter((c): c is string => Boolean(c));
      expect(combos.length, group.label).toBeGreaterThan(0);
      for (const combo of combos) {
        for (const key of combo.split(/ \+ | then /)) expect(key.trim(), combo).not.toBe('');
      }
    }

    /* A tip with several key groups needs a label on each, so the reader can tell them apart. */
    if ((tip.keys?.length ?? 0) > 1) {
      for (const group of tip.keys!) expect(group.label, tip.id).toBeTruthy();
    }
  });

  it('explains each Go To Special option', () => {
    const options = tipEntries.find((t) => t.id === 'go-to-special')!.options!;
    expect(options.length).toBeGreaterThan(10);
    for (const option of options) {
      expect(option.name.trim(), option.name).not.toBe('');
      expect(option.text.trim(), option.name).not.toBe('');
    }
  });

  it('combines the row and column shortcuts into one tip', () => {
    const select = tipEntries.find((t) => t.id === 'select-row-column')!;
    expect(select.keys).toHaveLength(2);
    expect(select.keys!.map((g) => g.windows)).toEqual(['Shift + Space', 'Ctrl + Space']);
  });

  it('flags the parts of a tip that are not in the official documentation', () => {
    const flagged = tipEntries.filter((t) => t.unofficial).map((t) => t.id);
    expect(flagged.sort()).toEqual([
      'borders',
      'data-form',
      'go-to-special',
      'highlight-duplicates',
      'paste-linked-picture',
      'paste-values',
      'select-row-column',
      'toggle-filter',
      'toggle-gridlines',
      'trace-references'
    ]);
    for (const tip of tipEntries.filter((t) => t.unofficial)) {
      expect(tip.unofficial, tip.id).toMatch(/not (say|listed)/i);
    }
  });
});
