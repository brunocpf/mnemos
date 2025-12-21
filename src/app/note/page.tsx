import { NoteView } from "@/components/note-view";

export default async function NotePage({ searchParams }: PageProps<"/note">) {
  const searchParamsResolved = await searchParams;
  const noteId =
    typeof searchParamsResolved?.noteId === "string"
      ? searchParamsResolved.noteId
      : undefined;

  return (
    <div className="relative pb-32">
      <NoteView noteId={noteId} />
    </div>
  );
}
