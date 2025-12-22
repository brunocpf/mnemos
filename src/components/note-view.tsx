"use client";
import { useForm } from "@tanstack/react-form";
import { Activity, useState } from "react";
import { toast } from "sonner";
import z from "zod";

import { noteSchema } from "@/client-data/note";
import {
  addNote,
  updateNoteContent,
  useNoteById,
} from "@/client-data/notes-dal";

import { RichTextEditor } from "./rich-text-editor";
import { Field, FieldError } from "./ui/field";

interface NoteViewProps {
  noteId?: string;
}

const formSchema = z.object({
  content: noteSchema.shape.content,
});

export function NoteView({ noteId }: NoteViewProps) {
  const [currentNoteId, setCurrentNoteId] = useState(noteId);
  const { data: note, isLoading } = useNoteById(currentNoteId);
  const [isSaving, setIsSaving] = useState(false);

  const isNewNote = currentNoteId === undefined;
  const noteDoesNotExist =
    !isLoading &&
    noteId !== undefined &&
    currentNoteId !== undefined &&
    note === undefined;

  const form = useForm({
    defaultValues: {
      content: note?.content ?? "",
    },
    validators: {
      onChange: formSchema,
    },
  });

  return (
    <section className="mx-auto flex max-w-3xl flex-col gap-6 px-6 py-16">
      <Activity mode={noteDoesNotExist ? "visible" : "hidden"}>
        <h1 className="text-3xl font-semibold">Note not found</h1>
        <p className="text-muted-foreground">
          It may have been deleted or never existed.
        </p>
      </Activity>
      <Activity mode={!noteDoesNotExist || isNewNote ? "visible" : "hidden"}>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            form.handleSubmit(e);
          }}
        >
          <form.Field
            name="content"
            listeners={{
              onChangeDebounceMs: 200,
              onChange: async ({ fieldApi, value }) => {
                const isValid = fieldApi.state.meta.isValid;

                if (!isValid) return;

                try {
                  setIsSaving(true);

                  if (isNewNote && value.trim() !== "") {
                    const newId = await addNote({
                      content: value,
                    });
                    toast.info("Note created");
                    setCurrentNoteId(newId);
                  } else if (currentNoteId) {
                    await updateNoteContent(currentNoteId, value);
                  }
                } finally {
                  setIsSaving(false);
                }
              },
            }}
          >
            {(field) => {
              const isInvalid =
                field.state.meta.isTouched && !field.state.meta.isValid;
              return (
                <Field className="mt-4" data-invalid={isInvalid}>
                  <RichTextEditor
                    value={field.state.value}
                    onChange={field.handleChange}
                    onBlur={field.handleBlur}
                    placeholder="Write your note here..."
                    autoFocus
                  />
                  {isInvalid && <FieldError errors={field.state.meta.errors} />}
                </Field>
              );
            }}
          </form.Field>
        </form>
        <div>
          <Activity mode={isNewNote ? "hidden" : "visible"}>
            <p className="text-muted-foreground text-sm">
              {isSaving ? "Saving..." : "All changes saved."}
            </p>
          </Activity>
        </div>
      </Activity>
    </section>
  );
}
