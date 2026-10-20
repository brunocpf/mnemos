"use client";

import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import TextAlign from "@tiptap/extension-text-align";
import Underline from "@tiptap/extension-underline";
import { Markdown } from "@tiptap/markdown";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useTranslations } from "next-intl";
import { useEffect } from "react";

import { AppFooterSlot } from "@/components/app-footer-slot";
import { LinkOpenButtonExtension } from "@/components/rich-text-editor/link-open-button-extension";
import { RichTextEditorToolbar } from "@/components/rich-text-editor/rich-text-editor-toolbar";
import { SearchHighlightExtension } from "@/components/rich-text-editor/search-highlight-extension";

interface RichTextEditorProps {
  value?: string;
  onChange?: (value: string) => void;
  onBlur?: (event: FocusEvent) => void;
  autoFocus?: boolean;
  highlightTerms?: string[];
}

export function RichTextEditor({
  value,
  onChange,
  onBlur,
  autoFocus,
  highlightTerms,
}: RichTextEditorProps) {
  const tToolbar = useTranslations("RichTextEditorToolbar");
  const tNote = useTranslations("NoteView");
  const editor = useEditor({
    autofocus: autoFocus,
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        underline: false,
        link: false,
      }),
      Markdown,
      Underline,
      Link.configure({
        openOnClick: false,
        autolink: true,
        linkOnPaste: true,
        HTMLAttributes: {
          class: "text-primary underline underline-offset-4",
          rel: "noopener noreferrer nofollow",
          target: "_blank",
        },
      }),
      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),
      Image.configure({
        inline: false,
        allowBase64: true,
      }),
      Placeholder.configure({ placeholder: tNote("editor.placeholder") }),
      LinkOpenButtonExtension.configure({
        label: tToolbar("link.actions.open"),
      }),
      SearchHighlightExtension.configure({ terms: [] }),
    ],
    content: value,
    contentType: "markdown",
    editorProps: {
      attributes: {
        "aria-label": tNote("editor.label"),
        role: "textbox",
        "aria-multiline": "true",
        class:
          "ProseMirror prose prose-sm dark:prose-invert max-w-none focus:outline-none min-h-dvh prose-li:marker:text-foreground/70 prose-code:before:content-none prose-code:after:content-none",
      },
    },
    onUpdate: ({ editor }) => {
      onChange?.(editor.getMarkdown());
    },
    onBlur: ({ event }) => {
      onBlur?.(event);
    },
    parseOptions: {
      preserveWhitespace: false,
    },
  });

  useEffect(() => {
    if (!editor) return;
    const normalized =
      highlightTerms?.map((term) => term.toLowerCase()).filter(Boolean) ?? [];

    if (normalized.length) {
      editor.commands.setSearchHighlights(normalized);
    } else {
      editor.commands.clearSearchHighlights();
    }

    return () => {
      editor.commands.clearSearchHighlights();
    };
  }, [editor, highlightTerms]);

  return (
    <>
      <EditorContent editor={editor} />
      <AppFooterSlot>
        <RichTextEditorToolbar editor={editor} />
      </AppFooterSlot>
    </>
  );
}
