"use client";

import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import TextAlign from "@tiptap/extension-text-align";
import Underline from "@tiptap/extension-underline";
import { Markdown } from "@tiptap/markdown";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";

interface RichTextEditorProps {
  value?: string;
  onChange?: (value: string) => void;
  onBlur?: (event: FocusEvent) => void;
  autoFocus?: boolean;
}

export function RichTextEditor({
  value,
  onChange,
  onBlur,
  autoFocus,
}: RichTextEditorProps) {
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
    ],
    content: value,
    contentType: "markdown",
    editorProps: {
      attributes: {
        class:
          "ProseMirror prose prose-sm dark:prose-invert max-w-none focus:outline-none",
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

  return <EditorContent editor={editor} />;
}
