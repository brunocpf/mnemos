import { Extension } from "@tiptap/core";
import { Node as ProseMirrorNode } from "@tiptap/pm/model";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";

const searchHighlightPluginKey = new PluginKey("searchHighlight");

type SearchHighlightState = {
  terms: string[];
  decorations: DecorationSet;
};

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    searchHighlight: {
      setSearchHighlights(terms: string[]): ReturnType;
      clearSearchHighlights(): ReturnType;
    };
  }
}

export const SearchHighlightExtension = Extension.create({
  name: "searchHighlight",

  addOptions() {
    return {
      terms: [] as string[],
      className: "search-highlight",
    };
  },

  addCommands() {
    return {
      setSearchHighlights:
        (terms: string[]) =>
        ({ tr, dispatch }) => {
          dispatch?.(tr.setMeta(searchHighlightPluginKey, { terms }));
          return true;
        },
      clearSearchHighlights:
        () =>
        ({ tr, dispatch }) => {
          dispatch?.(tr.setMeta(searchHighlightPluginKey, { terms: [] }));
          return true;
        },
    };
  },

  addProseMirrorPlugins() {
    return [
      new Plugin<SearchHighlightState>({
        key: searchHighlightPluginKey,
        state: {
          init: (_, { doc }) => ({
            terms: this.options.terms,
            decorations: buildDecorations(
              doc,
              this.options.terms,
              this.options.className,
            ),
          }),
          apply: (tr, prev, _oldState, newState) => {
            const meta = tr.getMeta(searchHighlightPluginKey);
            const hasNewTerms = Boolean(
              meta && Object.prototype.hasOwnProperty.call(meta, "terms"),
            );
            const terms = hasNewTerms
              ? ((meta?.terms as string[]) ?? [])
              : prev.terms;

            if (hasNewTerms || tr.docChanged) {
              return {
                terms,
                decorations: buildDecorations(
                  newState.doc,
                  terms,
                  this.options.className,
                ),
              };
            }

            return prev;
          },
        },
        props: {
          decorations(state) {
            return (
              searchHighlightPluginKey.getState(state)?.decorations ?? null
            );
          },
        },
      }),
    ];
  },
});

function buildDecorations(
  doc: ProseMirrorNode,
  terms: string[],
  className: string,
) {
  const normalized = Array.from(
    new Set(terms.map((term) => term.toLowerCase()).filter(Boolean)),
  );
  if (!normalized.length) return DecorationSet.empty;

  const decorations: Decoration[] = [];

  doc.descendants((node, pos) => {
    if (!node.isText || !node.text) return true;
    const text = node.text;
    const lower = text.toLowerCase();

    for (const term of normalized) {
      let index = lower.indexOf(term);
      while (index !== -1) {
        const from = pos + index;
        const to = from + term.length;
        decorations.push(
          Decoration.inline(from, to, {
            class: className,
          }),
        );
        index = lower.indexOf(term, index + term.length);
      }
    }

    return true;
  });

  return DecorationSet.create(doc, decorations);
}
