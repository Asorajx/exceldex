import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/* Every file under a folder, so the checks cover code added later. */
function filesUnder(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? filesUnder(path) : [path];
  });
}

const read = (path: string) => readFileSync(path, 'utf8');

describe('privacy: the site makes no requests to third parties', () => {
  it('loads no styles or fonts from another origin', () => {
    for (const file of filesUnder('src').filter((f) => f.endsWith('.css'))) {
      const css = read(file);
      expect(css, `${file} imports from the network`).not.toMatch(/@import\s+(url\()?['"]?https?:/i);
      expect(css, `${file} loads a resource from the network`).not.toMatch(/url\(\s*['"]?https?:/i);
    }
  });

  it('loads no scripts, styles or fonts from another origin in index.html', () => {
    const html = read('index.html');
    expect(html).not.toMatch(/<(script|link)[^>]+(src|href)=["']https?:\/\//i);
    expect(html).not.toMatch(/fonts\.(googleapis|gstatic)\.com/i);
  });

  it('has no network calls in the app code', () => {
    const code = filesUnder('src')
      .filter((f) => /\.(ts|tsx)$/.test(f) && !f.endsWith('.test.ts') && !f.endsWith('.test.tsx'))
      .map((f) => [f, read(f)] as const);
    for (const [file, text] of code) {
      expect(text, `${file} uses fetch`).not.toMatch(/\bfetch\(/);
      expect(text, `${file} uses XMLHttpRequest`).not.toMatch(/XMLHttpRequest/);
      expect(text, `${file} opens a WebSocket`).not.toMatch(/new\s+WebSocket/);
      expect(text, `${file} sends a beacon`).not.toMatch(/sendBeacon/);
    }
  });

  it('serves the fonts from the package, not from a CDN', () => {
    const main = read('src/main.tsx');
    expect(main).toMatch(/@fontsource\/ibm-plex-sans/);
    expect(main).toMatch(/@fontsource\/jetbrains-mono/);
  });
});

describe('security basics', () => {
  it('never injects raw HTML or evaluates strings as code', () => {
    const code = filesUnder('src').filter(
      (f) => /\.(ts|tsx)$/.test(f) && !f.includes('.test.') && !f.endsWith('privacy.test.ts')
    );
    for (const file of code) {
      const text = read(file);
      expect(text, `${file} uses dangerouslySetInnerHTML`).not.toMatch(/dangerouslySetInnerHTML/);
      expect(text, `${file} assigns innerHTML`).not.toMatch(/\.innerHTML\s*=/);
      expect(text, `${file} uses eval`).not.toMatch(/\beval\(/);
      expect(text, `${file} uses new Function`).not.toMatch(/new\s+Function\(/);
    }
  });

  it('opens every external link safely', () => {
    const text = read('src/components/AnswerPanel.tsx');
    /* Each link that opens a new tab must also say noreferrer (which implies noopener). */
    const blank = text.match(/target="_blank"/g) ?? [];
    const safe = text.match(/rel="noreferrer"/g) ?? [];
    expect(blank.length).toBeGreaterThan(0);
    expect(safe.length).toBe(blank.length);
  });
});
