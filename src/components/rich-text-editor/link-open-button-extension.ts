import { Extension } from "@tiptap/core";
import { Node as ProseMirrorNode } from "@tiptap/pm/model";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";

const linkOpenButtonPluginKey = new PluginKey("linkOpenButton");

type LinkOpenButtonState = {
  decorations: DecorationSet;
};

export const LinkOpenButtonExtension = Extension.create({
  name: "linkOpenButton",

  addProseMirrorPlugins() {
    return [
      new Plugin<LinkOpenButtonState>({
        key: linkOpenButtonPluginKey,
        state: {
          init: (_, { doc }) => ({
            decorations: buildDecorations(doc),
          }),
          apply: (tr, prev, _oldState, newState) => {
            if (tr.docChanged) {
              return {
                decorations: buildDecorations(newState.doc),
              };
            }

            return prev;
          },
        },
        props: {
          decorations(state) {
            return linkOpenButtonPluginKey.getState(state)?.decorations ?? null;
          },
        },
      }),
    ];
  },
});

function buildDecorations(doc: ProseMirrorNode) {
  const decorations: Decoration[] = [];

  doc.descendants((node, pos) => {
    if (!node.isText) return true;

    const linkMark = node.marks.find((mark) => mark.type.name === "link");
    if (!linkMark) return true;

    const href = (linkMark.attrs?.href as string | undefined) ?? "";
    const trimmed = href.trim();
    if (!trimmed) return true;

    const endPos = pos + node.nodeSize;

    const nextNode = doc.nodeAt(endPos);
    const nextLink =
      nextNode?.isText &&
      nextNode.marks.find((mark) => mark.type.name === "link");

    const continues =
      !!nextLink &&
      ((nextLink.attrs?.href as string | undefined) ?? "").trim() === trimmed;

    if (continues) return true;

    decorations.push(
      Decoration.widget(
        endPos,
        () => {
          const el = document.createElement("button");
          el.type = "button";
          el.setAttribute("aria-label", "Open link");
          el.setAttribute("title", "Open link");
          el.setAttribute("contenteditable", "false");
          el.dataset.linkOpenButton = "true";
          el.className =
            "ml-1 inline-flex size-6 items-center justify-center rounded-md border border-border/50 bg-background/50 text-muted-foreground hover:bg-muted hover:text-foreground";

          const svg = document.createElementNS(
            "http://www.w3.org/2000/svg",
            "svg",
          );
          svg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
          svg.setAttribute("viewBox", "0 0 24 24");
          svg.setAttribute("fill", "none");
          svg.setAttribute("stroke", "currentColor");
          svg.setAttribute("stroke-width", "2");
          svg.setAttribute("stroke-linecap", "round");
          svg.setAttribute("stroke-linejoin", "round");
          svg.setAttribute("aria-hidden", "true");
          svg.setAttribute("focusable", "false");
          svg.classList.add("size-4");

          const path1 = document.createElementNS(
            "http://www.w3.org/2000/svg",
            "path",
          );
          path1.setAttribute(
            "d",
            "M11 7h-5a2 2 0 0 0 -2 2v9a2 2 0 0 0 2 2h9a2 2 0 0 0 2 -2v-5",
          );

          const path2 = document.createElementNS(
            "http://www.w3.org/2000/svg",
            "path",
          );
          path2.setAttribute("d", "M10 14l10 -10");

          const path3 = document.createElementNS(
            "http://www.w3.org/2000/svg",
            "path",
          );
          path3.setAttribute("d", "M15 4h5v5");

          svg.appendChild(path1);
          svg.appendChild(path2);
          svg.appendChild(path3);
          el.appendChild(svg);

          el.addEventListener("mousedown", (event) => {
            event.preventDefault();
            event.stopPropagation();
          });

          el.addEventListener("click", (event) => {
            event.preventDefault();
            event.stopPropagation();
            window.open(trimmed, "_blank", "noopener,noreferrer");
          });

          return el;
        },
        {
          key: `link-open-${endPos}-${trimmed}`,
          side: 1,
        },
      ),
    );

    return true;
  });

  return DecorationSet.create(doc, decorations);
}
