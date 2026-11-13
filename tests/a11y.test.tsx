import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axe, { type Result } from 'axe-core';
import { describe, expect, it } from 'vitest';
import App from '../src/App';

/* Automated accessibility checks with axe-core, run against the real screens. */

/* jsdom has no layout engine, so three rules cannot run here, and each is covered another way: */
/*  - color-contrast: checked from the colour tokens in checks/contrast.test.ts */
/*  - document-title and html-has-lang: belong to index.html, checked in checks/pageShell.test.ts */
/* Everything else axe knows about (names and roles, labels, ARIA validity, landmarks, headings, */
/* lists, tables, duplicate IDs, and so on) runs on each screen below. */
async function violationsOf(): Promise<Result[]> {
  const results = await axe.run(document, {
    rules: {
      'color-contrast': { enabled: false },
      'document-title': { enabled: false },
      'html-has-lang': { enabled: false }
    }
  });
  return results.violations;
}

/* A readable failure message: which rule, why, and the first element that broke it. */
function describeViolations(violations: Result[]): string {
  return violations
    .map(
      (v) =>
        `${v.id} (${v.impact}): ${v.help}\n  ${v.nodes
          .slice(0, 3)
          .map((n) => n.html.slice(0, 120))
          .join('\n  ')}`
    )
    .join('\n');
}

async function expectAccessible() {
  const violations = await violationsOf();
  expect(violations, describeViolations(violations)).toEqual([]);
}

const searchBox = () => screen.getByRole('combobox');

describe('accessibility (axe-core)', () => {
  it('home page', async () => {
    render(<App />);
    await expectAccessible();
  });

  it('home page with filters switched on', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(
      within(screen.getByRole('group', { name: 'Filter by type' })).getByRole('button', { name: /^Tips/ })
    );
    await user.click(
      within(screen.getByRole('group', { name: 'Filter by topic' })).getByRole('button', { name: /^Data/ })
    );
    await expectAccessible();
  });

  it('home page when the filters match nothing', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(
      within(screen.getByRole('group', { name: 'Filter by type' })).getByRole('button', { name: /^Functions/ })
    );
    await user.click(
      within(screen.getByRole('group', { name: 'Filter by topic' })).getByRole('button', { name: /^Navigation/ })
    );
    expect(screen.getByText(/Nothing matches those filters/)).toBeInTheDocument();
    await expectAccessible();
  });

  it('search box open with popular lookups', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(searchBox());
    expect(screen.getByRole('listbox')).toBeInTheDocument();
    await expectAccessible();
  });

  it('search box open with results and a highlighted option', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.type(searchBox(), 'lookup');
    await user.keyboard('{ArrowDown}');
    expect(searchBox()).toHaveAttribute('aria-activedescendant');
    await expectAccessible();
  });

  it('search box with no matches', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.type(searchBox(), 'zzzzqqq');
    await expectAccessible();
  });

  it('a function answer, with the formula builder', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: /^XLOOKUP/ }));
    expect(screen.getByRole('article')).toBeInTheDocument();
    await expectAccessible();
  });

  it('a function answer after adding and removing optional parts', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: /^XLOOKUP/ }));
    await user.click(screen.getByRole('button', { name: 'Add match_mode' }));
    await user.click(screen.getByRole('button', { name: 'Add if_not_found' }));
    await user.click(screen.getByRole('button', { name: 'Remove match_mode' }));
    await expectAccessible();
  });

  it('the function with the most arguments (IFS)', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.type(searchBox(), 'assign a grade based on a score');
    await user.keyboard('{Enter}');
    expect(screen.getByRole('article')).toHaveTextContent('IFS');
    await expectAccessible();
  });

  it('a tip with keys held together (AutoSum)', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: /^AutoSum\s*tip/i }));
    await expectAccessible();
  });

  it('a tip with two key groups and an unofficial warning (borders)', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.type(searchBox(), 'remove borders');
    await user.keyboard('{Enter}');
    expect(screen.getByRole('note')).toBeInTheDocument();
    await expectAccessible();
  });

  it('in the dark theme too', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: 'Switch to dark theme' }));
    await user.click(screen.getByRole('button', { name: /^XLOOKUP/ }));
    await expectAccessible();
  });
});
