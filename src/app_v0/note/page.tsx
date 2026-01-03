import { BackButton } from "@/components/back-button";
import { NoteView } from "@/components/note-view";
import { decodeSearchHighlight } from "@/lib/search-highlight";

export default async function NotePage({
  searchParams,
}: {
  searchParams:
    | { [key: string]: string | undefined }
    | Promise<{ [key: string]: string | undefined } | null>;
}) {
  const searchParamsResolved = await searchParams;
  const noteId =
    typeof searchParamsResolved?.noteId === "string"
      ? searchParamsResolved.noteId
      : undefined;
  const highlightParam =
    typeof searchParamsResolved?.highlight === "string"
      ? decodeSearchHighlight(searchParamsResolved.highlight)
      : null;

  return (
    <div className="relative pb-32">
      <BackButton className="absolute top-4 left-4" />
      <NoteView noteId={noteId} highlight={highlightParam ?? undefined} />
    </div>
  );
}
