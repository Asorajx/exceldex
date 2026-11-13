/* =========================
   Clipboard
   ========================= */

/* Copies text to the clipboard and says whether it worked. */

/* The modern clipboard API only works on secure pages (https or localhost) and can be refused by */
/* the browser. When it fails, this tries the older select-and-copy method, which still works in */
/* browsers and embedded views that block the new one. If both fail it returns false, so the */
/* caller can tell the person instead of silently doing nothing. */
export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    /* Fall through to the older method. */
  }

  const area = document.createElement('textarea');
  try {
    area.value = text;
    area.setAttribute('readonly', '');
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    return document.execCommand('copy');
  } catch {
    return false;
  } finally {
    area.remove();
  }
}
