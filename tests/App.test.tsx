import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import App from '../src/App';
import { entries } from '../src/data/entries';

const searchBox = () => screen.getByRole('combobox');
const formulaGroup = () => screen.getByRole('group', { name: 'Formula' });

async function open(user: ReturnType<typeof userEvent.setup>, query: string, name: RegExp) {
  await user.type(searchBox(), query);
  await user.click(screen.getByRole('option', { name }));
}

/* What Copy puts on the clipboard. */
async function copied(user: ReturnType<typeof userEvent.setup>) {
  /* The button reads "Copied" for a moment after a click, so match both labels. */
  await user.click(screen.getByRole('button', { name: /cop(y|ied)/i }));
  return navigator.clipboard.readText();
}

describe('App', () => {
  it('starts with the search box closed, and opens it with popular lookups when clicked', async () => {
    const user = userEvent.setup();
    render(<App />);

    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    await user.click(searchBox());
    expect(screen.getByText('Popular lookups')).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /^XLOOKUP/ })).toBeInTheDocument();
  });

  it('lists every entry on the home page', () => {
    render(<App />);

    const home = screen.getByRole('region', { name: 'All functions and tips' });
    expect(within(home).getAllByRole('listitem')).toHaveLength(entries.length);
    for (const entry of entries) {
      /* Title followed by its type badge, so "IF" does not also match "IFERROR". */
      const card = new RegExp(`^${entry.title}\\s*${entry.category}`, 'i');
      expect(within(home).getByRole('button', { name: card })).toBeInTheDocument();
    }
  });

  describe('home filters', () => {
    const typeGroup = () => screen.getByRole('group', { name: 'Filter by type' });
    const topicGroup = () => screen.getByRole('group', { name: 'Filter by topic' });
    const home = () => screen.getByRole('region', { name: 'All functions and tips' });
    const shownCount = () => within(home()).getAllByRole('listitem').length;

    it('has Functions and Tips as the first two pills, then one pill per topic', () => {
      render(<App />);

      const typePills = within(typeGroup()).getAllByRole('button');
      expect(typePills.map((p) => p.textContent?.replace(/\d+/g, '').trim())).toEqual(['Functions', 'Tips']);

      const topics = [...new Set(entries.map((e) => e.topic))];
      expect(within(topicGroup()).getAllByRole('button')).toHaveLength(topics.length);

      /* The type pills come before the topic pills in the page. */
      expect(typeGroup().compareDocumentPosition(topicGroup()) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    });

    it('filters by type', async () => {
      const user = userEvent.setup();
      render(<App />);

      await user.click(within(typeGroup()).getByRole('button', { name: /^Tips/ }));
      expect(shownCount()).toBe(entries.filter((e) => e.category === 'tip').length);
      expect(within(home()).queryByRole('button', { name: /^XLOOKUP/ })).not.toBeInTheDocument();
      expect(within(typeGroup()).getByRole('button', { name: /^Tips/ })).toHaveAttribute('aria-pressed', 'true');

      /* Selecting both types shows everything again; each pill still toggles on its own. */
      await user.click(within(typeGroup()).getByRole('button', { name: /^Functions/ }));
      expect(shownCount()).toBe(entries.length);
      await user.click(within(typeGroup()).getByRole('button', { name: /^Tips/ }));
      expect(shownCount()).toBe(entries.filter((e) => e.category === 'function').length);
    });

    it('allows several topics at once, showing entries from any of them', async () => {
      const user = userEvent.setup();
      render(<App />);

      await user.click(within(topicGroup()).getByRole('button', { name: /^Text/ }));
      await user.click(within(topicGroup()).getByRole('button', { name: /^Logic/ }));

      const expected = entries.filter((e) => e.topic === 'Text' || e.topic === 'Logic');
      expect(shownCount()).toBe(expected.length);
      expect(within(home()).getByRole('button', { name: /^TRIM/ })).toBeInTheDocument();
      expect(within(home()).getByRole('button', { name: /^IFERROR/ })).toBeInTheDocument();
      expect(within(home()).queryByRole('button', { name: /^XLOOKUP/ })).not.toBeInTheDocument();
    });

    it('combines a type with topics: both must match', async () => {
      const user = userEvent.setup();
      render(<App />);

      await user.click(within(typeGroup()).getByRole('button', { name: /^Tips/ }));
      await user.click(within(topicGroup()).getByRole('button', { name: /^Data/ }));

      const expected = entries.filter((e) => e.category === 'tip' && e.topic === 'Data');
      expect(expected.length).toBeGreaterThan(0);
      expect(shownCount()).toBe(expected.length);
      /* Functions about data (FILTER, SORT...) are excluded because the Tips pill is on. */
      expect(within(home()).queryByRole('button', { name: /^FILTER/ })).not.toBeInTheDocument();
    });

    it('clears every filter, and explains an empty result', async () => {
      const user = userEvent.setup();
      render(<App />);

      expect(screen.queryByRole('button', { name: 'Clear filters' })).not.toBeInTheDocument();

      /* There are no functions about Navigation, so nothing matches. */
      await user.click(within(typeGroup()).getByRole('button', { name: /^Functions/ }));
      await user.click(within(topicGroup()).getByRole('button', { name: /^Navigation/ }));
      expect(screen.getByText(/Nothing matches those filters/)).toBeInTheDocument();

      await user.click(screen.getAllByRole('button', { name: 'Clear filters' })[0]);
      expect(shownCount()).toBe(entries.length);
      expect(screen.queryByRole('button', { name: 'Clear filters' })).not.toBeInTheDocument();
    });
  });

  it('opens an answer from a home card and hides the home list', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: /^COUNTIF\s*function/i }));
    expect(screen.getByRole('article')).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'All functions and tips' })).not.toBeInTheDocument();
  });

  it('searches, opens an answer, and copies the full formula', async () => {
    const user = userEvent.setup();
    render(<App />);

    await open(user, 'xlookup', /^XLOOKUP/);

    expect(screen.getByRole('article')).toBeInTheDocument();
    expect(screen.getByLabelText('lookup_value')).toHaveValue('E2');
    expect(await copied(user)).toBe('=XLOOKUP(E2, A2:A5, B2:B5)');
    /* Choosing a result closes the expanded box. */
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('supports keyboard selection: arrows, Enter and Escape', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.type(searchBox(), 'lookup');
    await user.keyboard('{ArrowDown}{ArrowDown}');
    const active = searchBox().getAttribute('aria-activedescendant');
    expect(active).toBeTruthy();
    expect(document.getElementById(active!)).toHaveAttribute('aria-selected', 'true');

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();

    await user.keyboard('{ArrowDown}');
    expect(screen.getByRole('listbox')).toBeInTheDocument();

    await user.keyboard('{Enter}');
    expect(screen.getByRole('article')).toBeInTheDocument();
  });

  it('only the arguments are editable; the name, brackets and commas are fixed', async () => {
    const user = userEvent.setup();
    render(<App />);

    await open(user, 'xlookup', /^XLOOKUP/);

    /* One input per argument in the formula, and nothing else can be typed into. */
    const inputs = within(formulaGroup()).getAllByRole('textbox');
    expect(inputs.map((i) => i.getAttribute('aria-label'))).toEqual(['lookup_value', 'lookup_array', 'return_array']);
    /* The fixed text is still part of the formula line. */
    expect(formulaGroup()).toHaveTextContent('=XLOOKUP(');
    expect(formulaGroup()).toHaveTextContent(')');

    /* Clearing every argument leaves the function name and brackets in place */
    /* (XLOOKUP has three required slots, so three empty arguments remain). */
    for (const input of inputs) await user.clear(input);
    expect(formulaGroup()).toHaveTextContent('=XLOOKUP(');
    expect(await copied(user)).toBe('=XLOOKUP(,,)');
  });

  it('copies the edited formula, and Reset restores the original', async () => {
    const user = userEvent.setup();
    render(<App />);

    await open(user, 'trim', /^TRIM/);

    const reset = screen.getByRole('button', { name: 'Reset' });
    expect(reset).toBeDisabled(); /* always visible, but nothing to reset yet */

    const field = screen.getByLabelText('text');
    await user.clear(field);
    await user.type(field, 'B5');
    expect(await copied(user)).toBe('=TRIM(B5)');

    expect(reset).toBeEnabled();
    await user.click(reset);
    expect(field).toHaveValue('A2');
    expect(reset).toBeDisabled();
  });

  it('jumps to an argument when its row is clicked', async () => {
    const user = userEvent.setup();
    render(<App />);

    await open(user, 'xlookup', /^XLOOKUP/);
    await user.click(screen.getByRole('button', { name: /lookup_array/ }));

    const input = screen.getByLabelText('lookup_array') as HTMLInputElement;
    expect(input).toHaveFocus();
    expect(input.value.slice(input.selectionStart!, input.selectionEnd!)).toBe('A2:A5');
  });

  it('adds an optional part with a default value and selects it', async () => {
    const user = userEvent.setup();
    render(<App />);

    await open(user, 'xlookup', /^XLOOKUP/);
    expect(screen.queryByLabelText('match_mode')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Add match_mode' }));
    const input = screen.getByLabelText('match_mode') as HTMLInputElement;
    expect(input).toHaveValue('0');
    /* The inserted value is selected and focused, ready to overwrite. */
    expect(input).toHaveFocus();
    expect(input.value.slice(input.selectionStart!, input.selectionEnd!)).toBe('0');
    /* if_not_found is not in the formula, so it stays as an empty slot before match_mode. */
    expect(await copied(user)).toBe('=XLOOKUP(E2, A2:A5, B2:B5,, 0)');
    expect(screen.getByRole('button', { name: 'Remove match_mode' })).toBeInTheDocument();
  });

  it('removes an optional part, keeping an empty slot when a later part is still used', async () => {
    const user = userEvent.setup();
    render(<App />);

    await open(user, 'xlookup', /^XLOOKUP/);

    await user.click(screen.getByRole('button', { name: 'Add if_not_found' }));
    await user.click(screen.getByRole('button', { name: 'Add match_mode' }));
    expect(await copied(user)).toBe('=XLOOKUP(E2, A2:A5, B2:B5, "Not found", 0)');

    await user.click(screen.getByRole('button', { name: 'Remove if_not_found' }));
    expect(screen.queryByLabelText('if_not_found')).not.toBeInTheDocument();
    expect(await copied(user)).toBe('=XLOOKUP(E2, A2:A5, B2:B5,, 0)');

    await user.click(screen.getByRole('button', { name: 'Remove match_mode' }));
    expect(await copied(user)).toBe('=XLOOKUP(E2, A2:A5, B2:B5)');
    expect(screen.getByRole('button', { name: 'Add if_not_found' })).toBeInTheDocument();
  });

  it('starts with the simplest useful formula, and keeps unused parts readable', async () => {
    const user = userEvent.setup();
    render(<App />);

    /* XLOOKUP starts without its optional parts, but their explanations are still on screen. */
    await open(user, 'xlookup', /^XLOOKUP/);
    expect(screen.getByRole('button', { name: 'Add match_mode' })).toBeInTheDocument();
    expect(screen.getByText(/How to match: 0 exact/)).toBeVisible();

    /* VLOOKUP keeps FALSE, because leaving it out means an approximate match. */
    await user.click(screen.getByRole('button', { name: /ExcelDex home/ }));
    await open(user, 'vlookup', /^VLOOKUP/);
    expect(await copied(user)).toBe('=VLOOKUP(E2, A2:C5, 3, FALSE)');
  });

  it('shows sample data and the result, and the result hides once you change something', async () => {
    const user = userEvent.setup();
    render(<App />);

    await open(user, 'xlookup', /^XLOOKUP/);

    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(screen.getByText('Result with the sample data:')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Add match_mode' }));
    expect(screen.queryByText('Result with the sample data:')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Reset' }));
    expect(screen.getByText('Result with the sample data:')).toBeInTheDocument();
  });

  it('rewrites the explanation as the formula changes', async () => {
    const user = userEvent.setup();
    render(<App />);

    await open(user, 'xlookup', /^XLOOKUP/);

    expect(screen.getByText(/Looks for E2 in A2:A5/)).toBeInTheDocument();
    expect(screen.queryByText(/If there is no match/)).not.toBeInTheDocument();

    /* Adding a part adds its sentence, and removing it takes the sentence away again. */
    await user.click(screen.getByRole('button', { name: 'Add if_not_found' }));
    expect(screen.getByText(/If there is no match, it shows "Not found"/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Remove if_not_found' }));
    expect(screen.queryByText(/If there is no match/)).not.toBeInTheDocument();

    /* Editing a value updates the main sentence. */
    const lookup = screen.getByLabelText('lookup_value');
    await user.clear(lookup);
    await user.type(lookup, 'H7');
    expect(screen.getByText(/Looks for H7 in A2:A5/)).toBeInTheDocument();
  });

  it('switches theme with the toggle and remembers the choice', async () => {
    const user = userEvent.setup();
    const { unmount } = render(<App />);

    /* jsdom has no system preference, so it starts light. */
    expect(document.documentElement.dataset.theme).toBe('light');
    await user.click(screen.getByRole('button', { name: 'Switch to dark theme' }));
    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(localStorage.getItem('exceldex-theme')).toBe('dark');
    expect(screen.getByRole('button', { name: 'Switch to light theme' })).toBeInTheDocument();

    /* A fresh visit picks the saved theme up. */
    unmount();
    document.documentElement.removeAttribute('data-theme');
    render(<App />);
    expect(document.documentElement.dataset.theme).toBe('dark');
  });

  it('shows a tip with keycaps for each platform and numbered steps', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: /^AutoSum\s*tip/i }));

    const article = screen.getByRole('article');
    expect(within(article).getByText('Windows')).toBeInTheDocument();
    expect(within(article).getByText('Mac')).toBeInTheDocument();
    /* Keys are shown as separate keycaps. */
    expect(article.querySelectorAll('kbd')).toHaveLength(2 + 3); /* Alt + =  and  Shift + Cmd + T */
    expect(within(article).getAllByRole('listitem').length).toBeGreaterThanOrEqual(3);
    /* A tip has no formula builder. */
    expect(within(article).queryByRole('group', { name: 'Formula' })).not.toBeInTheDocument();
    expect(within(article).queryByRole('button', { name: /copy/i })).not.toBeInTheDocument();
  });

  it('shows a tip with two labelled shortcut groups', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.type(searchBox(), 'select a whole column');
    await user.click(screen.getByRole('option', { name: /^Select a row or column/ }));

    const article = screen.getByRole('article');
    expect(within(article).getByText('Select the row')).toBeInTheDocument();
    expect(within(article).getByText('Select the column')).toBeInTheDocument();
    /* Shift + Space and Ctrl + Space, each for Windows and Mac: four combos of two keycaps. */
    expect(article.querySelectorAll('kbd')).toHaveLength(8);
    /* The table behaviour that Microsoft does not document is flagged. */
    expect(within(article).getByRole('note')).toHaveTextContent(/not in microsoft/i);
  });

  it('shows the formula-to-references tip with its bracket keys and an unofficial warning', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.type(searchBox(), 'which cells does a formula use');
    await user.click(screen.getByRole('option', { name: /^Jump between a formula and its references/ }));

    const article = screen.getByRole('article');
    expect(within(article).getByText('Select the cells a formula refers to')).toBeInTheDocument();
    expect(within(article).getByText('Select the formulas that refer to a cell')).toBeInTheDocument();
    /* The bracket keys are ordinary keycaps. */
    const caps = [...article.querySelectorAll('kbd')].map((k) => k.textContent);
    expect(caps).toEqual(expect.arrayContaining(['Ctrl', '[', ']']));
    expect(within(article).getByRole('note')).toHaveTextContent(/not listed/i);
  });

  it('says whether to hold the keys together or press them one at a time', async () => {
    const user = userEvent.setup();
    render(<App />);

    /* A held shortcut. */
    await user.click(screen.getByRole('button', { name: /^AutoSum\s*tip/i }));
    expect(screen.getAllByText('Hold together')).toHaveLength(2); /* Windows and Mac rows */
    expect(screen.queryByText(/one at a time/i)).not.toBeInTheDocument();

    /* A press-in-order shortcut. */
    await user.click(screen.getByRole('button', { name: /ExcelDex home/ }));
    await user.click(screen.getByRole('button', { name: /^Show or hide gridlines\s*tip/i }));
    const article = screen.getByRole('article');
    expect([...article.querySelectorAll('kbd')].map((k) => k.textContent)).toEqual(['Alt', 'W', 'V', 'G']);
    expect(within(article).getByText(/one at a time, in order/i)).toBeInTheDocument();
    expect(within(article).queryByText('Hold together')).not.toBeInTheDocument();
    /* The connectors between keys say "then", not "+". */
    expect(article.querySelectorAll('.keys__join')).toHaveLength(3);
    expect([...article.querySelectorAll('.keys__join')].every((j) => j.textContent === 'then')).toBe(true);
  });

  it('shows the border tip with separate add and remove sequences', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.type(searchBox(), 'remove borders');
    await user.click(screen.getByRole('option', { name: /^Add or remove borders/ }));

    const article = screen.getByRole('article');
    expect(within(article).getByText('Add borders to every cell')).toBeInTheDocument();
    expect(within(article).getByText('Remove borders')).toBeInTheDocument();
    expect(within(article).getByText(/^More borders/)).toBeInTheDocument();
    const caps = [...article.querySelectorAll('kbd')].map((k) => k.textContent);
    expect(caps).toEqual(['Alt', 'H', 'B', 'A', 'Alt', 'H', 'B', 'N', 'Alt', 'H', 'B', 'M']);
    expect(within(article).getByRole('note')).toHaveTextContent(/not listed/i);
  });

  it('warns when part of a tip is not in the official documentation', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: /^Data entry form\s*tip/i }));
    expect(screen.getByRole('note')).toHaveTextContent(/not in microsoft/i);
  });

  it('finds tips by searching in plain words', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.type(searchBox(), 'jump to the bottom of a column');
    expect(screen.getByRole('option', { name: /^Jump to the edge of your data/ })).toBeInTheDocument();
  });

  it('filters the home page with a topic pill that holds tips', async () => {
    const user = userEvent.setup();
    render(<App />);
    const home = screen.getByRole('region', { name: 'All functions and tips' });

    await user.click(
      within(screen.getByRole('group', { name: 'Filter by topic' })).getByRole('button', { name: /^Navigation/ })
    );
    const shown = within(home).getAllByRole('listitem');
    expect(shown.length).toBe(entries.filter((e) => e.topic === 'Navigation').length);
    expect(within(home).getByRole('button', { name: /^Jump to the edge of your data/ })).toBeInTheDocument();
    expect(within(home).queryByRole('button', { name: /^XLOOKUP/ })).not.toBeInTheDocument();
  });

  it('has no separate Shortcuts topic: tips are shortcuts, so the Tips pill covers them', () => {
    render(<App />);
    const topics = within(screen.getByRole('group', { name: 'Filter by topic' })).getAllByRole('button');
    expect(topics.some((b) => /^Shortcuts/.test(b.textContent ?? ''))).toBe(false);
  });

  it('returns to the homepage from the logo', async () => {
    const user = userEvent.setup();
    render(<App />);

    await open(user, 'trim', /^TRIM/);
    await user.click(screen.getByRole('button', { name: /ExcelDex home/ }));

    expect(searchBox()).toHaveValue('');
    expect(screen.queryByRole('article')).not.toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'All functions and tips' })).toBeInTheDocument();
  });

  it('says on every page that it is not affiliated with Microsoft', async () => {
    const user = userEvent.setup();
    render(<App />);

    const footer = screen.getByRole('contentinfo');
    expect(footer).toHaveTextContent(/not affiliated with, endorsed by or sponsored by Microsoft/i);
    expect(footer).toHaveTextContent(/trademarks of the Microsoft group of companies/i);

    /* It is still there once an answer is open. */
    await open(user, 'xlookup', /^XLOOKUP/);
    expect(screen.getByRole('contentinfo')).toBeInTheDocument();
  });

  it('shows a helpful message when nothing matches', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.type(searchBox(), 'zzzzqqq');
    expect(screen.getByText(/No matches for/)).toBeInTheDocument();
  });
});
