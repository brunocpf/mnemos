"use client";

import {
  IconAlignCenter,
  IconAlignJustified,
  IconAlignLeft,
  IconAlignRight,
  IconArrowBackUp,
  IconArrowForwardUp,
  IconBold,
  IconChevronDown,
  IconClearFormatting,
  IconCode,
  IconH1,
  IconH2,
  IconH3,
  IconItalic,
  IconLink,
  IconList,
  IconListNumbers,
  IconPhoto,
  IconQuote,
  IconStrikethrough,
  IconUnderline,
  IconUnlink,
} from "@tabler/icons-react";
import type { Editor } from "@tiptap/react";
import { useTranslations } from "next-intl";
import { redoDepth, undoDepth } from "prosemirror-history";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

interface RichTextEditorToolbarProps {
  editor: Editor | null;
}

export function RichTextEditorToolbar({ editor }: RichTextEditorToolbarProps) {
  const t = useTranslations("RichTextEditorToolbar");
  const [, forceRender] = useState(0);

  useEffect(() => {
    if (!editor) return;

    const handle = () => {
      forceRender((value) => (value + 1) % 1_000_000);
    };

    editor.on("selectionUpdate", handle);
    editor.on("transaction", handle);

    return () => {
      editor.off("selectionUpdate", handle);
      editor.off("transaction", handle);
    };
  }, [editor]);

  const preventMouseDown = (event: React.MouseEvent) => {
    event.preventDefault();
  };

  const headingValue = !editor
    ? "paragraph"
    : editor.isActive("heading", { level: 1 })
      ? "h1"
      : editor.isActive("heading", { level: 2 })
        ? "h2"
        : editor.isActive("heading", { level: 3 })
          ? "h3"
          : "paragraph";

  const headingLabel =
    headingValue === "h1"
      ? "H1"
      : headingValue === "h2"
        ? "H2"
        : headingValue === "h3"
          ? "H3"
          : t("textStyle.options.normal");

  const alignValue = !editor
    ? "left"
    : editor.isActive({ textAlign: "center" })
      ? "center"
      : editor.isActive({ textAlign: "right" })
        ? "right"
        : editor.isActive({ textAlign: "justify" })
          ? "justify"
          : "left";

  const canUndo = !!editor && undoDepth(editor.state) > 1;
  const canRedo = !!editor && redoDepth(editor.state) > 0;

  const isLinkActive = !!editor && editor.isActive("link");

  return (
    <div className="isolate mx-auto flex w-full max-w-5xl items-center gap-2 overflow-x-auto px-6 py-2 sm:justify-center">
      <div className="flex shrink-0 items-center gap-1">
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label={t("actions.undo")}
          title={t("actions.undo")}
          disabled={!editor || !canUndo}
          onMouseDown={preventMouseDown}
          onClick={() => {
            if (!editor || !canUndo) return;
            editor.chain().focus().undo().run();
          }}
        >
          <IconArrowBackUp />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label={t("actions.redo")}
          title={t("actions.redo")}
          disabled={!editor || !canRedo}
          onMouseDown={preventMouseDown}
          onClick={() => {
            if (!editor || !canRedo) return;
            editor.chain().focus().redo().run();
          }}
        >
          <IconArrowForwardUp />
        </Button>
      </div>

      <Separator orientation="vertical" className="h-6" />

      <div className="flex shrink-0 items-center gap-1">
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="gap-1.5"
                aria-label={t("textStyle.label")}
                title={t("textStyle.label")}
                onMouseDown={preventMouseDown}
              >
                <span className="min-w-12 text-left">{headingLabel}</span>
                <IconChevronDown className="size-4" />
              </Button>
            }
          />
          <DropdownMenuContent align="start" side="top" sideOffset={8}>
            <DropdownMenuItem
              onMouseDown={preventMouseDown}
              onClick={() => editor?.chain().focus().setParagraph().run()}
            >
              <span className="flex items-center gap-2">
                <span className="text-muted-foreground inline-flex size-5 items-center justify-center">
                  <span className="text-xs font-semibold">Aa</span>
                </span>
                {t("textStyle.options.normal")}
              </span>
              <span
                className={cn(
                  "text-muted-foreground ml-auto text-xs",
                  headingValue === "paragraph" && "text-foreground",
                )}
              >
                {headingValue === "paragraph" ? "✓" : ""}
              </span>
            </DropdownMenuItem>
            <DropdownMenuItem
              onMouseDown={preventMouseDown}
              onClick={() =>
                editor?.chain().focus().toggleHeading({ level: 1 }).run()
              }
            >
              <IconH1 /> {t("textStyle.options.heading1")}
              <span
                className={cn(
                  "text-muted-foreground ml-auto text-xs",
                  headingValue === "h1" && "text-foreground",
                )}
              >
                {headingValue === "h1" ? "✓" : ""}
              </span>
            </DropdownMenuItem>
            <DropdownMenuItem
              onMouseDown={preventMouseDown}
              onClick={() =>
                editor?.chain().focus().toggleHeading({ level: 2 }).run()
              }
            >
              <IconH2 /> {t("textStyle.options.heading2")}
              <span
                className={cn(
                  "text-muted-foreground ml-auto text-xs",
                  headingValue === "h2" && "text-foreground",
                )}
              >
                {headingValue === "h2" ? "✓" : ""}
              </span>
            </DropdownMenuItem>
            <DropdownMenuItem
              onMouseDown={preventMouseDown}
              onClick={() =>
                editor?.chain().focus().toggleHeading({ level: 3 }).run()
              }
            >
              <IconH3 /> {t("textStyle.options.heading3")}
              <span
                className={cn(
                  "text-muted-foreground ml-auto text-xs",
                  headingValue === "h3" && "text-foreground",
                )}
              >
                {headingValue === "h3" ? "✓" : ""}
              </span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label={t("actions.clearFormatting")}
          title={t("actions.clearFormatting")}
          disabled={!editor}
          onMouseDown={preventMouseDown}
          onClick={() =>
            editor?.chain().focus().unsetAllMarks().clearNodes().run()
          }
        >
          <IconClearFormatting />
        </Button>
      </div>

      <Separator orientation="vertical" className="h-6" />

      <div className="flex shrink-0 items-center gap-1">
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label={t("marks.bold")}
          title={t("marks.bold")}
          disabled={!editor}
          aria-pressed={!!editor && editor.isActive("bold")}
          className={cn(!!editor && editor.isActive("bold") && "bg-muted")}
          onMouseDown={preventMouseDown}
          onClick={() => editor?.chain().focus().toggleBold().run()}
        >
          <IconBold />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label={t("marks.italic")}
          title={t("marks.italic")}
          disabled={!editor}
          aria-pressed={!!editor && editor.isActive("italic")}
          className={cn(!!editor && editor.isActive("italic") && "bg-muted")}
          onMouseDown={preventMouseDown}
          onClick={() => editor?.chain().focus().toggleItalic().run()}
        >
          <IconItalic />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label={t("marks.underline")}
          title={t("marks.underline")}
          disabled={!editor}
          aria-pressed={!!editor && editor.isActive("underline")}
          className={cn(!!editor && editor.isActive("underline") && "bg-muted")}
          onMouseDown={preventMouseDown}
          onClick={() => editor?.chain().focus().toggleUnderline().run()}
        >
          <IconUnderline />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label={t("marks.strikethrough")}
          title={t("marks.strikethrough")}
          disabled={!editor}
          aria-pressed={!!editor && editor.isActive("strike")}
          className={cn(!!editor && editor.isActive("strike") && "bg-muted")}
          onMouseDown={preventMouseDown}
          onClick={() => editor?.chain().focus().toggleStrike().run()}
        >
          <IconStrikethrough />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label={t("marks.inlineCode")}
          title={t("marks.inlineCode")}
          disabled={!editor}
          aria-pressed={!!editor && editor.isActive("code")}
          className={cn(!!editor && editor.isActive("code") && "bg-muted")}
          onMouseDown={preventMouseDown}
          onClick={() => editor?.chain().focus().toggleCode().run()}
        >
          <IconCode />
        </Button>
      </div>

      <Separator orientation="vertical" className="h-6" />

      <div className="flex shrink-0 items-center gap-1">
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label={t("lists.bulletList")}
          title={t("lists.bulletList")}
          disabled={!editor}
          aria-pressed={!!editor && editor.isActive("bulletList")}
          className={cn(
            !!editor && editor.isActive("bulletList") && "bg-muted",
          )}
          onMouseDown={preventMouseDown}
          onClick={() => editor?.chain().focus().toggleBulletList().run()}
        >
          <IconList />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label={t("lists.numberedList")}
          title={t("lists.numberedList")}
          disabled={!editor}
          aria-pressed={!!editor && editor.isActive("orderedList")}
          className={cn(
            !!editor && editor.isActive("orderedList") && "bg-muted",
          )}
          onMouseDown={preventMouseDown}
          onClick={() => editor?.chain().focus().toggleOrderedList().run()}
        >
          <IconListNumbers />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label={t("blocks.blockquote")}
          title={t("blocks.blockquote")}
          disabled={!editor}
          aria-pressed={!!editor && editor.isActive("blockquote")}
          className={cn(
            !!editor && editor.isActive("blockquote") && "bg-muted",
          )}
          onMouseDown={preventMouseDown}
          onClick={() => editor?.chain().focus().toggleBlockquote().run()}
        >
          <IconQuote />
        </Button>
      </div>

      <Separator orientation="vertical" className="h-6" />

      <div className="flex shrink-0 items-center gap-1">
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={t("alignment.label")}
                title={t("alignment.label")}
                onMouseDown={preventMouseDown}
              >
                {alignValue === "center" ? (
                  <IconAlignCenter />
                ) : alignValue === "right" ? (
                  <IconAlignRight />
                ) : alignValue === "justify" ? (
                  <IconAlignJustified />
                ) : (
                  <IconAlignLeft />
                )}
              </Button>
            }
          />
          <DropdownMenuContent align="start" side="top" sideOffset={8}>
            <DropdownMenuItem
              onMouseDown={preventMouseDown}
              onClick={() => editor?.chain().focus().setTextAlign("left").run()}
            >
              <IconAlignLeft /> {t("alignment.options.left")}
              <span
                className={cn(
                  "text-muted-foreground ml-auto text-xs",
                  alignValue === "left" && "text-foreground",
                )}
              >
                {alignValue === "left" ? "✓" : ""}
              </span>
            </DropdownMenuItem>
            <DropdownMenuItem
              onMouseDown={preventMouseDown}
              onClick={() =>
                editor?.chain().focus().setTextAlign("center").run()
              }
            >
              <IconAlignCenter /> {t("alignment.options.center")}
              <span
                className={cn(
                  "text-muted-foreground ml-auto text-xs",
                  alignValue === "center" && "text-foreground",
                )}
              >
                {alignValue === "center" ? "✓" : ""}
              </span>
            </DropdownMenuItem>
            <DropdownMenuItem
              onMouseDown={preventMouseDown}
              onClick={() =>
                editor?.chain().focus().setTextAlign("right").run()
              }
            >
              <IconAlignRight /> {t("alignment.options.right")}
              <span
                className={cn(
                  "text-muted-foreground ml-auto text-xs",
                  alignValue === "right" && "text-foreground",
                )}
              >
                {alignValue === "right" ? "✓" : ""}
              </span>
            </DropdownMenuItem>
            <DropdownMenuItem
              onMouseDown={preventMouseDown}
              onClick={() =>
                editor?.chain().focus().setTextAlign("justify").run()
              }
            >
              <IconAlignJustified /> {t("alignment.options.justify")}
              <span
                className={cn(
                  "text-muted-foreground ml-auto text-xs",
                  alignValue === "justify" && "text-foreground",
                )}
              >
                {alignValue === "justify" ? "✓" : ""}
              </span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <Separator orientation="vertical" className="h-6" />

      <div className="flex shrink-0 items-center gap-1">
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label={
            isLinkActive ? t("link.actions.remove") : t("link.actions.add")
          }
          title={
            isLinkActive ? t("link.actions.remove") : t("link.actions.add")
          }
          disabled={!editor}
          aria-pressed={isLinkActive}
          className={cn(isLinkActive && "bg-muted")}
          onMouseDown={preventMouseDown}
          onClick={() => {
            if (!editor) return;

            if (editor.isActive("link")) {
              editor.chain().focus().unsetLink().run();
              return;
            }

            const previousUrl = editor.getAttributes("link").href as
              | string
              | undefined;
            const url = window.prompt(
              t("link.prompts.enterUrl"),
              previousUrl ?? "https://",
            );
            if (url === null) return;

            const trimmed = url.trim();
            if (!trimmed) {
              editor.chain().focus().unsetLink().run();
              return;
            }

            editor
              .chain()
              .focus()
              .extendMarkRange("link")
              .setLink({ href: trimmed })
              .run();
          }}
        >
          {isLinkActive ? <IconUnlink /> : <IconLink />}
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={t("image.actions.insert")}
                title={t("image.actions.insert")}
                disabled={!editor}
                onMouseDown={preventMouseDown}
              >
                <IconPhoto />
              </Button>
            }
          />
          <DropdownMenuContent align="start" side="top" sideOffset={8}>
            <DropdownMenuItem
              onMouseDown={preventMouseDown}
              onClick={() => {
                if (!editor) return;
                const url = window.prompt(t("image.prompts.url"));
                if (!url) return;

                editor.chain().focus().setImage({ src: url.trim() }).run();
              }}
            >
              <IconPhoto /> {t("image.actions.insertFromUrl")}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onMouseDown={preventMouseDown}
              onClick={() => {
                if (!editor) return;
                const url = window.prompt(t("image.prompts.urlAdvanced"));
                if (!url) return;

                editor.chain().focus().setImage({ src: url.trim() }).run();
              }}
            >
              <IconPhoto /> {t("image.actions.insertAdvanced")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
