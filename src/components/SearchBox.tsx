import { useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import type { ExcelEntry } from '../types/excelEntry';

/* =========================
   Search Box
   ========================= */

/* How many results the expanded search box shows at once. */
const MAX_RESULTS = 6;
const LISTBOX_ID = 'search-listbox';

interface Props {
  query: string;
  onQueryChange: (value: string) => void;
  results: ExcelEntry[];
  /* Shown when the box is open but empty. */
  suggestions: ExcelEntry[];
  onSelect: (id: string) => void;
}

/* A single search box that expands downward to show results (the ARIA "combobox" pattern). */
/* The wrapper keeps a fixed height, so opening the box never pushes the page content. */
export function SearchBox({ query, onQueryChange, results, suggestions, onSelect }: Props) {
  /* Starts closed so the home page below is visible; focusing the box opens it. */
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  const hasQuery = query.trim() !== '';
  const items = hasQuery ? results.slice(0, MAX_RESULTS) : suggestions;
  /* The list of options only exists when there is something to list. With no matches the panel shows */
  /* a message instead, so the box must not claim to control a list that is not on the page. */
  const listboxShown = open && !(hasQuery && results.length === 0);

  function choose(id: string) {
    onSelect(id);
    setOpen(false);
    setActive(-1);
    inputRef.current?.blur();
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        if (!open) setOpen(true);
        else if (items.length > 0) setActive((i) => (i + 1) % items.length);
        break;
      case 'ArrowUp':
        e.preventDefault();
        if (items.length > 0) setActive((i) => (i <= 0 ? items.length - 1 : i - 1));
        break;
      case 'Enter': {
        /* With a query, Enter picks the highlighted result, or the top one. */
        const target = active >= 0 ? items[active] : hasQuery ? items[0] : undefined;
        if (open && target) {
          e.preventDefault();
          choose(target.id);
        }
        break;
      }
      case 'Escape':
        if (open) {
          e.preventDefault(); /* stops the browser clearing the field */
          setOpen(false);
          setActive(-1);
        }
        break;
    }
  }

  function onBlur(e: React.FocusEvent<HTMLDivElement>) {
    if (!rootRef.current?.contains(e.relatedTarget as Node | null)) {
      setOpen(false);
      setActive(-1);
    }
  }

  const heading = hasQuery ? `${results.length} ${results.length === 1 ? 'result' : 'results'}` : 'Popular lookups';

  return (
    <div className="search" ref={rootRef} onBlur={onBlur}>
      {open && (
        <div
          className="scrim"
          aria-hidden="true"
          /* Keep focus in the input; a click on the dim just closes the box. */
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => {
            setOpen(false);
            setActive(-1);
          }}
        />
      )}
      <div className={open ? 'search__box is-open' : 'search__box'}>
        <div className="search__row">
          <svg className="search__icon" viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
          <input
            ref={inputRef}
            className="search__input"
            type="text"
            role="combobox"
            aria-label="Search Excel functions or describe a problem"
            aria-expanded={listboxShown}
            aria-controls={listboxShown ? LISTBOX_ID : undefined}
            aria-autocomplete="list"
            aria-activedescendant={listboxShown && active >= 0 ? `option-${items[active]?.id}` : undefined}
            autoComplete="off"
            spellCheck={false}
            enterKeyHint="search"
            placeholder="Search a function or task"
            value={query}
            onChange={(e) => {
              onQueryChange(e.target.value);
              setOpen(true);
              setActive(-1);
            }}
            onFocus={() => setOpen(true)}
            onClick={() => setOpen(true)}
            onKeyDown={onKeyDown}
          />
        </div>

        {open && (
          <div className="search__panel">
            <p className="search__heading" aria-live="polite">
              {heading}
            </p>
            {hasQuery && results.length === 0 ? (
              <p className="search__empty">
                No matches for <strong>“{query.trim()}”</strong>. Try a function name (like <code>SUMIFS</code>) or
                describe the task (like “remove duplicates”).
              </p>
            ) : (
              <ul className="options" role="listbox" id={LISTBOX_ID} aria-label={heading}>
                {items.map((entry, i) => (
                  <li
                    key={entry.id}
                    id={`option-${entry.id}`}
                    role="option"
                    aria-selected={i === active}
                    className="option"
                    /* Keep focus in the input so the box doesn't close before the click lands. */
                    onMouseDown={(e) => e.preventDefault()}
                    onMouseEnter={() => setActive(i)}
                    onClick={() => choose(entry.id)}
                  >
                    <span className="option__title">{entry.title}</span>
                    <span className={`badge badge--${entry.category}`}>{entry.category}</span>
                    <span className="option__desc">{entry.description}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
