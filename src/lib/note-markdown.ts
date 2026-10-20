import { z } from "zod";

const FRONT_MATTER_KEYS = ["id", "title", "createdAt", "updatedAt"] as const;

export type NoteFileMetadata = {
  id?: string;
  title?: string;
  createdAt?: Date;
  updatedAt?: Date;
};

export const NOTE_TITLE_MAX_LENGTH = 100;

/**
 * Serialises a note as a Markdown file with a YAML front matter header.
 * String values are JSON-quoted (valid YAML double-quoted scalars), so any
 * title round-trips without bespoke escaping.
 */
export function serializeNoteFile(note: {
  id: string;
  title?: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
}) {
  const lines = ["---", `id: ${JSON.stringify(note.id)}`];
  if (note.title) lines.push(`title: ${JSON.stringify(note.title)}`);
  lines.push(
    `createdAt: ${JSON.stringify(note.createdAt.toISOString())}`,
    `updatedAt: ${JSON.stringify(note.updatedAt.toISOString())}`,
    "---",
    "",
  );
  return `${lines.join("\n")}\n${note.content}`;
}

function parseScalar(raw: string) {
  const value = raw.trim();
  if (value.startsWith('"')) {
    try {
      const parsed: unknown = JSON.parse(value);
      if (typeof parsed === "string") return parsed;
    } catch {
      // fall through to the raw text
    }
  }
  if (value.length >= 2 && value.startsWith("'") && value.endsWith("'")) {
    return value.slice(1, -1).replaceAll("''", "'");
  }
  return value;
}

function parseDate(value: string | undefined) {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

/**
 * Splits a Markdown file into its Mnemos front matter (when present) and body.
 * A leading `---` block that carries none of the known keys is left alone: it
 * is probably a horizontal rule or someone else's front matter.
 */
export function parseNoteFile(text: string): {
  metadata: NoteFileMetadata | null;
  content: string;
} {
  const match = /^---[ \t]*\r?\n([\s\S]*?\r?\n)?---[ \t]*(?:\r?\n|$)/.exec(
    text,
  );
  if (!match) return { metadata: null, content: text };

  const values: Record<string, string> = {};
  for (const line of (match[1] ?? "").split(/\r?\n/)) {
    const separator = line.indexOf(":");
    if (separator <= 0) continue;
    const key = line.slice(0, separator).trim();
    if ((FRONT_MATTER_KEYS as readonly string[]).includes(key)) {
      values[key] = parseScalar(line.slice(separator + 1));
    }
  }
  if (Object.keys(values).length === 0)
    return { metadata: null, content: text };

  const id = z.uuid().safeParse(values.id);
  const title = values.title?.trim().slice(0, NOTE_TITLE_MAX_LENGTH).trim();
  let content = text.slice(match[0].length);
  // The serializer puts one blank line between the header and the body.
  if (content.startsWith("\r\n")) content = content.slice(2);
  else if (content.startsWith("\n")) content = content.slice(1);

  return {
    metadata: {
      id: id.success ? id.data : undefined,
      title: title || undefined,
      createdAt: parseDate(values.createdAt),
      updatedAt: parseDate(values.updatedAt),
    },
    content,
  };
}

const RESERVED_NAMES = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(\..*)?$/i;

/**
 * Turns arbitrary text into a name that is safe as a file or directory name on
 * every major OS and can't introduce path separators or traversal.
 */
export function sanitizePathSegment(
  name: string,
  { fallback = "Untitled", maxLength = 100 } = {},
) {
  let safe = name
    .replace(/[\\/:*?"<>|\u0000-\u001f\u007f]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
  safe = Array.from(safe).slice(0, maxLength).join("");
  // Windows strips trailing dots/spaces; leading dots would hide the file.
  safe = safe.replace(/^[.\s]+|[.\s]+$/g, "");
  if (!safe || /^-+$/.test(safe)) return fallback;
  return RESERVED_NAMES.test(safe) ? `_${safe}` : safe;
}

/** A readable file stem for a note: its title, else its first line of text. */
export function noteFileStem(note: { title?: string; content: string }) {
  if (note.title?.trim()) return sanitizePathSegment(note.title);
  const firstLine = note.content
    .split(/\r?\n/)
    .map((line) => line.replace(/^[\s#>*+\-\d.]+/, "").trim())
    .find(Boolean);
  return sanitizePathSegment(firstLine ?? "", { maxLength: 60 });
}

/**
 * Claims `stem + extension` in `taken` (a set of lower-cased names, since
 * common file systems are case-insensitive), appending " (2)", " (3)", … on
 * collision. Returns the claimed name.
 */
export function claimUniqueName(
  taken: Set<string>,
  stem: string,
  extension = "",
) {
  for (let n = 1; ; n++) {
    const name = `${stem}${n === 1 ? "" : ` (${n})`}${extension}`;
    const key = name.toLowerCase();
    if (!taken.has(key)) {
      taken.add(key);
      return name;
    }
  }
}
