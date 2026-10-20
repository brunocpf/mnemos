"use client";

import { useForm } from "@tanstack/react-form";
import { useTranslations } from "next-intl";
import { z } from "zod";

import { FOLDER_NAME_MAX_LENGTH, folderNameSchema } from "@/client-data/folder";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldError } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { folderNameKey } from "@/lib/folder-tree";

interface FolderNameDialogProps {
  mode: "create" | "rename";
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialName?: string;
  /** Names already used by sibling folders, to reject duplicates inline. */
  siblingNames: readonly string[];
  onSubmit: (name: string) => void;
}

export function FolderNameDialog({
  mode,
  open,
  onOpenChange,
  initialName = "",
  siblingNames,
  onSubmit,
}: FolderNameDialogProps) {
  const t = useTranslations("Folders");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <FolderNameForm
          mode={mode}
          initialName={initialName}
          siblingNames={siblingNames}
          onSubmit={(name) => {
            onOpenChange(false);
            onSubmit(name);
          }}
          title={t(`dialogs.${mode}.title`)}
          description={t(`dialogs.${mode}.description`)}
        />
      </DialogContent>
    </Dialog>
  );
}

// Lives inside DialogContent, which only mounts while open, so each opening
// starts from a fresh form.
function FolderNameForm({
  mode,
  initialName,
  siblingNames,
  onSubmit,
  title,
  description,
}: Pick<FolderNameDialogProps, "mode" | "siblingNames" | "onSubmit"> & {
  initialName: string;
  title: string;
  description: string;
}) {
  const t = useTranslations("Folders");

  const formSchema = z.object({
    name: folderNameSchema
      .min(1, t("validation.nameRequired"))
      .max(FOLDER_NAME_MAX_LENGTH, t("validation.nameTooLong"))
      .refine(
        (name) =>
          !siblingNames.some(
            (sibling) =>
              folderNameKey(sibling) === folderNameKey(name) &&
              !(mode === "rename" && sibling === initialName),
          ),
        t("validation.duplicate"),
      ),
  });

  const form = useForm({
    defaultValues: { name: initialName },
    validators: { onChange: formSchema, onSubmit: formSchema },
    onSubmit: ({ value }) => onSubmit(value.name.trim()),
  });

  return (
    <form
      onSubmit={(e: React.FormEvent) => {
        e.preventDefault();
        form.handleSubmit();
      }}
      className="flex flex-col gap-4"
    >
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>{description}</DialogDescription>
      </DialogHeader>
      <form.Field name="name">
        {(field) => {
          const isInvalid =
            field.state.meta.isTouched && !field.state.meta.isValid;

          return (
            <Field data-invalid={isInvalid}>
              <Input
                className="mt-2"
                id={field.name}
                name={field.name}
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
                aria-invalid={isInvalid}
                placeholder={t("placeholders.folderName")}
                autoComplete="off"
                autoFocus
              />
              {isInvalid && <FieldError errors={field.state.meta.errors} />}
            </Field>
          );
        }}
      </form.Field>
      <DialogFooter>
        <form.Subscribe selector={(state) => state.canSubmit}>
          {(canSubmit) => (
            <Button
              className="cursor-pointer"
              type="submit"
              disabled={!canSubmit}
            >
              {t(`dialogs.${mode}.confirm`)}
            </Button>
          )}
        </form.Subscribe>
      </DialogFooter>
    </form>
  );
}
