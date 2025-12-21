import { BackButton } from "@/components/back-button";
import { NoteView } from "@/components/note-view";

export default async function NotePage({ searchParams }: PageProps<"/note">) {
  const searchParamsResolved = await searchParams;
  const noteId =
    typeof searchParamsResolved?.noteId === "string"
      ? searchParamsResolved.noteId
      : undefined;

  return (
    <div className="relative pb-32">
      <BackButton className="absolute top-4 left-4" />
      <NoteView noteId={noteId} />
    </div>
  );
}
