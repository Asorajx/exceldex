import { Fragment, useEffect, useRef, useState } from 'react';
import { copyText } from './clipboard';
import { keyMode, keyModeLabel } from './keyMode';
import { explainFormula } from '../formula/explainFormula';
import { buildFormula, initialState } from '../formula/formulaState';
import { isFunction } from '../types/excelEntry';
import type { ExcelEntry, ExcelExample, FunctionEntry, TipEntry } from '../types/excelEntry';

/* =========================
   Answer Panel
   ========================= */

interface Props {
  entry: ExcelEntry;
  related: ExcelEntry[];
  onSelect: (id: string) => void;
}

function RequiredTag({ optional }: { optional: boolean }) {
  return (
    <span className={optional ? 'tag tag--optional' : 'tag tag--required'}>{optional ? 'Optional' : 'Required'}</span>
  );
}

const COLUMN_LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

/* Shows stray spaces as dots so "extra spaces" examples are visible. */
function showCell(text: string) {
  if (!/^ | $| {2,}/.test(text)) return text;
  return <span className="sheet__spaces">{text.replace(/ /g, '·')}</span>;
}

/* A small spreadsheet-style table, so cell references like A2:A5 mean something. */
function SampleSheet({ rows }: { rows: string[][] }) {
  const columns = Math.max(...rows.map((r) => r.length));
  const letters = Array.from({ length: columns }, (_, i) => COLUMN_LETTERS[i]);

  return (
    <div className="sheet-block">
      <p className="sheet__label" id="sheet-label">
        Sample data
      </p>
      {/* A wide sheet scrolls inside this box. The box is focusable so the keyboard can scroll it. */}
      <div className="sheet__scroll" role="region" aria-labelledby="sheet-label" tabIndex={0}>
        <table className="sheet">
          <thead>
            <tr>
              <th>
                <span className="sr-only">Row</span>
              </th>
              {letters.map((l) => (
                <th key={l} scope="col">
                  {l}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, r) => (
              <tr key={r}>
                <th scope="row">{r + 1}</th>
                {letters.map((l, c) => (
                  <td key={l} className={r === 0 ? 'sheet__head' : undefined}>
                    {showCell(row[c] ?? '')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* The formula and its explanation as one card. */
/*  - Only the arguments are editable. The function name, brackets and commas are fixed text, */
/*    so the formula can never be broken or emptied. */
/*  - Each argument has one row: its value, what it means, and (if optional) an Add or Remove button. */
/*  - Clicking a row jumps to that argument's input and selects it. */
/* Copy builds the final formula from the arguments, so it always matches what you see. */
function FormulaCard({ entry, example }: { entry: FunctionEntry; example: ExcelExample }) {
  const [start] = useState(() => initialState(entry, example));
  const [values, setValues] = useState(start.values);
  const [included, setIncluded] = useState(start.included);
  const inputs = useRef<Array<HTMLInputElement | null>>([]);
  /* An argument to jump to after the next render (used right after Add creates its input). */
  const pendingFocus = useRef<number | null>(null);

  const formula = buildFormula(entry, { values, included });
  const changed = formula !== buildFormula(entry, start);
  /* The sentence is rebuilt from the current arguments, so it always matches the formula. */
  const explanation = explainFormula(
    entry,
    entry.arguments.map((_, i) => (included[i] ? values[i].trim() : ''))
  );
  /* Show inputs up to the last included argument; skipped ones in between become empty slots. */
  const lastIncluded = included.lastIndexOf(true);

  function focusArgument(index: number) {
    const input = inputs.current[index];
    if (!input) return;
    input.focus();
    input.select();
  }

  useEffect(() => {
    if (pendingFocus.current === null) return;
    focusArgument(pendingFocus.current);
    pendingFocus.current = null;
  });

  function setValue(index: number, value: string) {
    setValues((prev) => prev.map((v, i) => (i === index ? value : v)));
  }

  function add(index: number) {
    if (values[index].trim() === '') setValue(index, entry.arguments[index].defaultValue ?? '');
    setIncluded((prev) => prev.map((on, i) => (i === index ? true : on)));
    pendingFocus.current = index;
  }

  function remove(index: number) {
    setIncluded((prev) => prev.map((on, i) => (i === index ? false : on)));
  }

  function reset() {
    setValues(start.values);
    setIncluded(start.included);
  }

  return (
    <>
      <SampleSheet rows={example.sheet} />
      {explanation && (
        <p className="answer__explain" aria-live="polite">
          {explanation}
        </p>
      )}
      <div className="formula">
        <div className="formula__line" role="group" aria-label="Formula">
          <span className="locked">={entry.title}(</span>
          {entry.arguments.map((a, i) =>
            i > lastIncluded ? null : (
              <Fragment key={a.name}>
                {i > 0 && <span className="locked">,</span>}
                {included[i] && (
                  <input
                    ref={(el) => {
                      inputs.current[i] = el;
                    }}
                    className="arg-input"
                    type="text"
                    aria-label={a.name}
                    value={values[i]}
                    /* Sized to its text (monospace, so ch is exact). The extra 18px covers padding and border. */
                    style={{ width: `calc(${Math.max(values[i].length, 3)}ch + 18px)` }}
                    spellCheck={false}
                    autoCapitalize="off"
                    autoCorrect="off"
                    autoComplete="off"
                    onChange={(e) => setValue(i, e.target.value)}
                  />
                )}
              </Fragment>
            )
          )}
          <span className="locked">)</span>
        </div>

        <div className="formula__actions">
          <p className="formula__result">
            {!changed && (
              <>
                Result with the sample data: <strong>{example.result}</strong>
              </>
            )}
          </p>
          <div className="formula__buttons">
            <button type="button" className="reset" disabled={!changed} onClick={reset}>
              Reset
            </button>
            <CopyButton text={formula} />
          </div>
        </div>

        <p className="syntax-line" aria-label="Syntax">
          <code>{entry.syntax}</code>
        </p>

        <ol className="parts" aria-label="What each part of the formula does">
          {entry.arguments.map((a, i) => {
            const on = included[i];
            const info = (
              <>
                <code className={on ? 'part__value' : 'part__value part__value--off'}>
                  {on ? values[i].trim() || '(empty)' : 'not used'}
                </code>
                <span className="part__body">
                  <span className="arg__head">
                    <code>{a.name}</code>
                    <RequiredTag optional={a.optional} />
                  </span>
                  <span className="part__desc">{a.description}</span>
                </span>
              </>
            );

            return (
              <li key={a.name} className="part">
                {on ? (
                  <button
                    type="button"
                    className="part__main"
                    title="Jump to this argument"
                    onClick={() => focusArgument(i)}
                  >
                    {info}
                  </button>
                ) : (
                  <div className="part__main part__main--off">{info}</div>
                )}
                {/* Always rendered, even when empty, so every row keeps the same column widths. */}
                <div className="part__action">
                  {a.optional && (
                    <button
                      type="button"
                      className={on ? 'part__toggle part__toggle--remove' : 'part__toggle'}
                      aria-label={`${on ? 'Remove' : 'Add'} ${a.name}`}
                      onClick={() => (on ? remove(i) : add(i))}
                    >
                      {on ? 'Remove' : '+ Add'}
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </>
  );
}

function CopyButton({ text }: { text: string }) {
  const [state, setState] = useState<'idle' | 'copied' | 'failed'>('idle');
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  async function copy() {
    const ok = await copyText(text);
    setState(ok ? 'copied' : 'failed');
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setState('idle'), ok ? 1800 : 3500);
  }

  const label = { idle: 'Copy', copied: 'Copied', failed: 'Copy failed' }[state];
  const announcement = {
    idle: '',
    copied: 'Formula copied to clipboard',
    failed: 'Could not copy. Select the formula in the box and copy it by hand.'
  }[state];

  return (
    <button type="button" className="copy" onClick={copy}>
      {label}
      <span className="sr-only" role="status">
        {announcement}
      </span>
    </button>
  );
}

/* "2026-11-13" -> "13 Nov 2026". Parsed as UTC so the day never shifts with the viewer's timezone. */
function formatDate(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC'
  });
}

/* "Alt + =" -> keycaps. " + " means pressed together, " then " means one after another. */
function Keys({ combo }: { combo: string }) {
  const parts = combo.split(/( \+ | then )/);
  const mode = keyMode(combo);
  return (
    <span className={`keys keys--${mode}`}>
      {parts.map((part, i) =>
        i % 2 === 0 ? (
          <kbd key={i}>{part}</kbd>
        ) : (
          <span key={i} className="keys__join">
            {part.trim()}
          </span>
        )
      )}
      {/* Says out loud whether to hold the keys or press them in turn. */}
      <span className="keys__how">{keyModeLabel(combo)}</span>
    </span>
  );
}

/* The body of a tip: the keys for each platform, any warning, and the steps. */
function TipBody({ entry }: { entry: TipEntry }) {
  const groups = entry.keys ?? [];

  return (
    <>
      {groups.length > 0 && (
        <div className="keycard">
          {groups.map((group, g) => {
            const rows = [
              ['Windows', group.windows],
              ['Mac', group.mac]
            ].filter((row): row is [string, string] => Boolean(row[1]));

            return (
              <div key={group.label ?? g} className="keygroup">
                {group.label && <p className="keygroup__label">{group.label}</p>}
                <dl>
                  {rows.map(([os, combo]) => (
                    <div key={os} className="keycard__row">
                      <dt>{os}</dt>
                      <dd>
                        <Keys combo={combo} />
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
            );
          })}
        </div>
      )}

      {entry.unofficial && (
        <p className="callout" role="note">
          <strong>Not in Microsoft&rsquo;s documentation.</strong> {entry.unofficial}
        </p>
      )}

      <h3>How to</h3>
      <ol className="steps">
        {entry.steps.map((step) => (
          <li key={step}>{step}</li>
        ))}
      </ol>

      {entry.options && (
        <>
          <h3>What each option does</h3>
          <dl className="options">
            {entry.options.map((option) => (
              <div key={option.name}>
                <dt>{option.name}</dt>
                <dd>{option.text}</dd>
              </div>
            ))}
          </dl>
        </>
      )}
    </>
  );
}

export function AnswerPanel({ entry, related, onSelect }: Props) {
  const example = isFunction(entry) ? entry.examples[0] : undefined;

  return (
    <article className={`answer answer--${entry.category}`} aria-labelledby="answer-title">
      <header className="answer__header">
        <h2 id="answer-title">{entry.title}</h2>
        <span className={`badge badge--${entry.category}`}>{entry.category}</span>
      </header>
      <p className="answer__lead">{entry.description}</p>

      {isFunction(entry) && example && (
        <>
          <FormulaCard entry={entry} example={example} />
          <p className="hint">Change the values to match your sheet, then copy and paste into a cell.</p>
        </>
      )}

      {entry.category === 'tip' && <TipBody entry={entry} />}

      {entry.notes.length > 0 && (
        <details>
          <summary>Notes &amp; caveats</summary>
          <ul>
            {entry.notes.map((n) => (
              <li key={n}>{n}</li>
            ))}
          </ul>
        </details>
      )}

      {related.length > 0 && (
        <p className="related">
          Related:{' '}
          {related.map((r) => (
            <button key={r.id} type="button" className="chip" onClick={() => onSelect(r.id)}>
              {r.title}
            </button>
          ))}
        </p>
      )}

      <p className="source">
        Checked against{' '}
        <a href={entry.sourceUrl} target="_blank" rel="noreferrer">
          Microsoft Support
        </a>{' '}
        on {formatDate(entry.lastVerified)}.
      </p>
    </article>
  );
}
