"use client";
import { useForm } from "@tanstack/react-form";
import { Activity, useState } from "react";
import { toast } from "sonner";
import z from "zod";

import { noteSchema } from "@/client-data/note";
import { addNote, updateNote, useNoteById } from "@/client-data/notes-dal";

import { Field, FieldError } from "./ui/field";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";

interface NoteViewProps {
  noteId?: string;
}

const formSchema = z.object({
  title: noteSchema.shape.title,
  content: noteSchema.shape.content,
});

export function NoteView({ noteId }: NoteViewProps) {
  const [currentNoteId, setCurrentNoteId] = useState(noteId);
  const { data: note, isLoading } = useNoteById(currentNoteId);
  const [isSaving, setIsSaving] = useState(false);

  const form = useForm({
    defaultValues: {
      title: note?.title ?? "",
      content: note?.content ?? "",
    },
    validators: {
      onChange: formSchema,
    },
  });

  const isNewNote = currentNoteId === undefined;
  const noteDoesNotExist =
    !isLoading &&
    noteId !== undefined &&
    currentNoteId !== undefined &&
    note === undefined;

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
          onSubmit={(e: React.FormEvent) => {
            e.preventDefault();
            form.handleSubmit(e);
          }}
        >
          <form.Field
            name="title"
            listeners={{
              onChangeDebounceMs: 200,
              onChange: async ({ fieldApi, value }) => {
                const isValid = fieldApi.state.meta.isValid;
                if (!isValid) return;

                if (!currentNoteId) return;

                try {
                  setIsSaving(true);
                  await updateNote(currentNoteId, {
                    content: form.state.values.content,
                    title: value,
                  });
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
                <Field data-invalid={isInvalid}>
                  <Input
                    id={field.name}
                    name={field.name}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    aria-invalid={isInvalid}
                    placeholder="Title"
                    autoComplete="off"
                  />
                  {isInvalid && <FieldError errors={field.state.meta.errors} />}
                </Field>
              );
            }}
          </form.Field>
          <form.Field
            name="content"
            listeners={{
              onChangeDebounceMs: 200,
              onChange: async ({ fieldApi, value }) => {
                const isValid = fieldApi.state.meta.isValid;

                if (!isValid) return;

                try {
                  setIsSaving(true);
                  const title = form.state.values.title.trim() || "Untitled";
                  form.setFieldValue("title", title);

                  if (isNewNote && !currentNoteId) {
                    const newId = await addNote({
                      content: value,
                      title,
                    });
                    toast("Note created");
                    setCurrentNoteId(newId);
                  } else {
                    await updateNote(currentNoteId, {
                      content: value,
                      title,
                    });
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
                  <Textarea
                    id={field.name}
                    name={field.name}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    aria-invalid={isInvalid}
                    placeholder="Write your note here..."
                    className="field-sizing-fixed resize-none"
                    autoFocus
                    rows={10}
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
