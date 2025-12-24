import { useForm } from "@tanstack/react-form";
import z from "zod";

import { noteSchema } from "@/client-data/note";
import { RichTextEditor } from "@/components/rich-text-editor";
import { Field, FieldError } from "@/components/ui/field";

const formSchema = z.object({
  content: noteSchema.shape.content,
});

interface NoteEditorFormProps {
  noteId?: string;
  initialContent: string;
  onChange?: (noteId: string | undefined, value: string) => void;
  onBlur?: (noteId: string | undefined, content: string) => void;
}

export function NoteEditorForm({
  noteId,
  initialContent,
  onChange,
  onBlur,
}: NoteEditorFormProps) {
  const form = useForm({
    defaultValues: { content: initialContent },
    validators: { onChange: formSchema },
  });

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        form.handleSubmit(event);
      }}
    >
      <form.Field
        name="content"
        listeners={{
          onChangeDebounceMs: 200,
          onChange: async ({ fieldApi, value }) => {
            if (!fieldApi.state.meta.isValid) return;
            onChange?.(noteId, value);
          },
          onBlur: ({ fieldApi, value }) => {
            if (!fieldApi.state.meta.isValid) return;
            onBlur?.(noteId, value);
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
                autoFocus={initialContent === ""}
              />
              {isInvalid && <FieldError errors={field.state.meta.errors} />}
            </Field>
          );
        }}
      </form.Field>
    </form>
  );
}
