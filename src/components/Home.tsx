import { useMemo, useState } from 'react';
import type { EntryCategory, ExcelEntry } from '../types/excelEntry';

/* =========================
   Home Page
   ========================= */

interface Props {
  entries: ExcelEntry[];
  onSelect: (id: string) => void;
}

/* The first two pills: filter by kind of entry. */
const TYPE_PILLS: Array<{ value: EntryCategory; label: string }> = [
  { value: 'function', label: 'Functions' },
  { value: 'tip', label: 'Tips' }
];

/* Adds the value if it is missing, removes it if it is there. */
function toggled<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

/* The home page: every entry as a card, with multi-select pill filters. */
/*  - The first two pills pick the kind of entry (functions, tips). */
/*  - The rest are topics, built from the entries so a new topic adds a pill. */
/* Within one row of pills, picking several shows entries matching ANY of them. Between the two */
/* rows, an entry must match both: "Tips" + "Data" shows tips about data. */
/* With nothing picked in a row, that row does not filter anything. */
export function Home({ entries, onSelect }: Props) {
  const [types, setTypes] = useState<EntryCategory[]>([]);
  const [topics, setTopics] = useState<string[]>([]);

  /* Topics in the order they first appear in the data. */
  const allTopics = useMemo(() => [...new Set(entries.map((e) => e.topic))], [entries]);
  /* Entries grouped by topic, so the list reads in sections even if the data is not in that order. */
  const grouped = useMemo(() => allTopics.flatMap((t) => entries.filter((e) => e.topic === t)), [allTopics, entries]);

  const shown = grouped.filter(
    (e) => (types.length === 0 || types.includes(e.category)) && (topics.length === 0 || topics.includes(e.topic))
  );
  const filtering = types.length + topics.length > 0;
  const clear = () => {
    setTypes([]);
    setTopics([]);
  };

  return (
    <section className="home" aria-label="All functions and tips">
      <div className="pills">
        <div className="pills__group" role="group" aria-label="Filter by type">
          {TYPE_PILLS.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              className={`pill pill--${value}`}
              aria-pressed={types.includes(value)}
              onClick={() => setTypes((prev) => toggled(prev, value))}
            >
              {label} <span className="pill__count">{entries.filter((e) => e.category === value).length}</span>
            </button>
          ))}
        </div>

        <div className="pills__group" role="group" aria-label="Filter by topic">
          {allTopics.map((t) => (
            <button
              key={t}
              type="button"
              className="pill"
              aria-pressed={topics.includes(t)}
              onClick={() => setTopics((prev) => toggled(prev, t))}
            >
              {t} <span className="pill__count">{entries.filter((e) => e.topic === t).length}</span>
            </button>
          ))}
        </div>

        {filtering && (
          <button type="button" className="pills__clear" onClick={clear}>
            Clear filters
          </button>
        )}
      </div>

      {/* Announces the result of a filter change to screen readers without adding visible clutter. */}
      <p className="sr-only" role="status">
        {shown.length} of {entries.length} shown
      </p>

      {shown.length === 0 ? (
        <p className="home__empty">
          Nothing matches those filters.{' '}
          <button type="button" className="pills__clear" onClick={clear}>
            Clear filters
          </button>
        </p>
      ) : (
        <ul className="cards">
          {shown.map((entry) => (
            <li key={entry.id}>
              <button type="button" className={`card card--${entry.category}`} onClick={() => onSelect(entry.id)}>
                <span className="card__top">
                  <span className="card__title">{entry.title}</span>
                  <span className={`badge badge--${entry.category}`}>{entry.category}</span>
                </span>
                <span className="card__desc">{entry.description}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
