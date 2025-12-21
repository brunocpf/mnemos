import { ActionFooter } from "@/components/action-footer";
import { NoteList } from "@/components/note-list";

export default function Home() {
  return (
    <div className="relative pb-32">
      <main className="mx-auto flex max-w-5xl flex-col gap-12 px-6 py-16">
        <section className="space-y-4">
          <p className="text-muted-foreground text-xs font-semibold tracking-[0.4em] uppercase">
            Your Notes
          </p>
          <NoteList />
        </section>
      </main>

      <ActionFooter
        placeholder="Search notes..."
        buttonLabel="New Note"
        buttonHref="/note"
      />
    </div>
  );
}
