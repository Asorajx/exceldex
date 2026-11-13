import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/* The page-level settings that live in index.html, which component tests never see. */
const html = readFileSync('index.html', 'utf8');

describe('index.html', () => {
  it('declares the page language, which screen readers use to pick a voice', () => {
    expect(html).toMatch(/<html[^>]+lang="en"/);
  });

  it('has a descriptive title and meta description', () => {
    expect(html).toMatch(/<title>ExcelDex<\/title>/);
    expect(html).toMatch(/<meta name="description" content="[^"]{20,}"/);
  });

  it('lets people zoom: the viewport does not disable scaling', () => {
    const viewport = html.match(/<meta name="viewport" content="([^"]*)"/)?.[1] ?? '';
    expect(viewport).toContain('width=device-width');
    expect(viewport).not.toMatch(/user-scalable\s*=\s*(no|0)/i);
    expect(viewport).not.toMatch(/maximum-scale\s*=\s*1(\.0)?\b/i);
  });

  it('links an icon, so the browser does not request a missing /favicon.ico', () => {
    expect(html).toMatch(/<link rel="icon"[^>]+href="\.\/assets\/icons\/[^"]+\.svg"/);
  });
});
