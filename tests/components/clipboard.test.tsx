import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import App from '../../src/App';
import { copyText } from '../../src/components/clipboard';

/* Replaces the browser's clipboard API with one we control. */
function stubClipboard(writeText: (text: string) => Promise<void> | undefined) {
  Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
}

/* jsdom has no execCommand, so give it one to see whether the fallback is used. */
function stubExecCommand(result: boolean | 'throw') {
  const fn = vi.fn(() => {
    if (result === 'throw') throw new Error('blocked');
    return result;
  });
  Object.assign(document, { execCommand: fn });
  return fn;
}

afterEach(() => {
  Reflect.deleteProperty(document, 'execCommand');
});

describe('copyText', () => {
  it('uses the clipboard API when it works, and nothing else', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    stubClipboard(writeText);
    const exec = stubExecCommand(true);

    expect(await copyText('=SUM(A1:A3)')).toBe(true);
    expect(writeText).toHaveBeenCalledWith('=SUM(A1:A3)');
    expect(exec).not.toHaveBeenCalled();
  });

  it('falls back to select-and-copy when the clipboard API is refused', async () => {
    stubClipboard(() => Promise.reject(new Error('refused')));
    const exec = stubExecCommand(true);

    expect(await copyText('=SUM(A1:A3)')).toBe(true);
    expect(exec).toHaveBeenCalledWith('copy');
    /* The temporary text box is cleaned up afterwards. */
    expect(document.querySelector('textarea[readonly]')).toBeNull();
  });

  it('falls back when the clipboard API does not exist at all (an insecure page)', async () => {
    Object.defineProperty(navigator, 'clipboard', { value: undefined, configurable: true });
    stubExecCommand(true);
    expect(await copyText('x')).toBe(true);
  });

  it('reports failure when both methods fail', async () => {
    stubClipboard(() => Promise.reject(new Error('refused')));
    stubExecCommand(false);
    expect(await copyText('x')).toBe(false);

    stubExecCommand('throw');
    expect(await copyText('x')).toBe(false);
    expect(document.querySelector('textarea[readonly]')).toBeNull();
  });
});

describe('Copy button feedback', () => {
  it('tells the person when copying did not work, instead of doing nothing', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: /^XLOOKUP/ }));

    /* user.setup() installs its own clipboard, so replace it after rendering. */
    stubClipboard(() => Promise.reject(new Error('refused')));
    stubExecCommand(false);

    await user.click(screen.getByRole('button', { name: /^Copy$/ }));
    expect(screen.getByRole('button', { name: /Copy failed/ })).toBeInTheDocument();
    expect(screen.getByRole('status', { name: '' })).toBeDefined();
  });
});
