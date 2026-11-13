import { useMemo, useState } from 'react';
import { AnswerPanel } from './components/AnswerPanel';
import { Home } from './components/Home';
import { SearchBox } from './components/SearchBox';
import { ThemeToggle } from './components/ThemeToggle';
import { useTheme } from './theme/useTheme';
import { entries } from './data/entries';
import { searchEntries } from './search/searchEntries';
import type { ExcelEntry } from './types/excelEntry';

/* =========================
   App Shell
   ========================= */

const POPULAR_IDS = ['xlookup', 'sumifs', 'countif', 'iferror', 'textjoin'];

function findEntries(ids: string[]): ExcelEntry[] {
  return ids.map((id) => entries.find((e) => e.id === id)).filter((e) => e !== undefined);
}

export default function App() {
  const { theme, toggle: toggleTheme } = useTheme();
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  /* Changing this key remounts the search box, resetting it to its open, focused start state. */
  const [homeCount, setHomeCount] = useState(0);

  const results = useMemo(() => searchEntries(query, entries), [query]);
  const suggestions = useMemo(() => findEntries(POPULAR_IDS), []);

  const selected = entries.find((e) => e.id === selectedId) ?? null;
  const related = selected ? findEntries(selected.relatedEntryIds) : [];

  function goHome() {
    setQuery('');
    setSelectedId(null);
    setHomeCount((n) => n + 1);
  }

  return (
    <div className="app">
      <header className="hero">
        <div className="topbar">
          <ThemeToggle theme={theme} onToggle={toggleTheme} />
        </div>
        <h1 className="logo">
          <button type="button" className="logo__btn" aria-label="ExcelDex home" onClick={goHome}>
            Excel<span>Dex</span>
          </button>
        </h1>
        <p className="tagline">Find Excel functions, shortcuts &amp; solutions instantly.</p>
        <SearchBox
          key={homeCount}
          query={query}
          onQueryChange={setQuery}
          results={results}
          suggestions={suggestions}
          onSelect={setSelectedId}
        />
      </header>

      <main className="layout">
        {selected ? (
          <AnswerPanel key={selected.id} entry={selected} related={related} onSelect={setSelectedId} />
        ) : (
          <Home entries={entries} onSelect={setSelectedId} />
        )}
      </main>

      <footer className="site-footer">
        <p>
          ExcelDex is an independent project. It is not affiliated with, endorsed by or sponsored by Microsoft.
          Microsoft and Excel are trademarks of the Microsoft group of companies.
        </p>
      </footer>
    </div>
  );
}
