export interface SharedParams {
  title?: string | null;
  text?: string | null;
  url?: string | null;
}

// Share Target payloads are untrusted input from other apps; cap them so a
// huge share can't freeze the editor.
export const MAX_SHARED_LENGTH = 100_000;

const clean = (value?: string | null) =>
  (value ?? "").replace(/\r\n?/g, "\n").trim();

/**
 * Turns the title/text/url a Share Target hands us into note content
 * (markdown). Android browsers often put the page URL in `text` (and
 * sometimes repeat the title there), so only the parts that add something
 * are kept. Returns an empty string when there is nothing to save.
 */
export function buildSharedContent({ title, text, url }: SharedParams) {
  const t = clean(title);
  let body = clean(text);
  const u = clean(url);

  // A text that is only the title repeated adds nothing.
  if (t && body === t) body = "";

  const parts: string[] = [];
  if (t) parts.push(`# ${t.replace(/\n+/g, " ")}`);
  if (body) parts.push(body);
  if (u && !body.includes(u)) parts.push(u);

  return parts.join("\n\n").slice(0, MAX_SHARED_LENGTH);
}
