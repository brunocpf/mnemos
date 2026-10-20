"use client";

import { useTranslations } from "next-intl";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { buildNotesArchive, exportFileName } from "@/client-data/export-notes";
import {
  applyImport,
  IMPORT_LIMITS,
  ImportError,
  type ImportStrategy,
  type ParsedImport,
  parseImportFiles,
} from "@/client-data/import-notes";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Progress, ProgressLabel } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useEmbedder } from "@/providers/embedder-provider";

const STRATEGIES: {
  value: ImportStrategy;
  key: "new" | "mergeNewer" | "mergeSkip";
}[] = [
  { value: "new", key: "new" },
  { value: "merge-newer", key: "mergeNewer" },
  { value: "merge-skip", key: "mergeSkip" },
];

type Busy = { kind: "export" | "read" | "import"; value: number | null };

function downloadBytes(bytes: Uint8Array<ArrayBuffer>, fileName: string) {
  const url = URL.createObjectURL(
    new Blob([bytes], { type: "application/zip" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

export function ImportExportCard() {
  const t = useTranslations("SettingsView.dataTransfer");
  const { reindexNotes } = useEmbedder();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<Busy | null>(null);
  const [pending, setPending] = useState<ParsedImport | null>(null);
  const [strategy, setStrategy] = useState<ImportStrategy>("new");

  const errorMessage = (error: unknown) => {
    if (error instanceof ImportError) {
      return t(`errors.${error.code}`, {
        detail: error.detail ?? "",
        entries: IMPORT_LIMITS.maxEntries,
        entryMb: IMPORT_LIMITS.maxEntryBytes / 1024 / 1024,
        totalMb: IMPORT_LIMITS.maxTotalBytes / 1024 / 1024,
      });
    }
    return t("errors.unknown");
  };

  const handleExport = async () => {
    setBusy({ kind: "export", value: 0 });
    try {
      const archive = await buildNotesArchive(({ done, total }) =>
        setBusy({ kind: "export", value: (done / total) * 100 }),
      );
      if (archive.noteCount === 0 && archive.folderCount === 0) {
        toast.info(t("export.empty"), { position: "top-center" });
        return;
      }
      downloadBytes(archive.bytes, exportFileName());
      toast.success(
        t("export.success", {
          notes: archive.noteCount,
          folders: archive.folderCount,
        }),
        { position: "top-center" },
      );
    } catch (error) {
      console.error("Export failed:", error);
      toast.error(t("export.error"), { position: "top-center" });
    } finally {
      setBusy(null);
    }
  };

  const handleFilesChosen = async (files: File[]) => {
    if (files.length === 0) return;
    setBusy({ kind: "read", value: null });
    try {
      setPending(await parseImportFiles(files));
    } catch (error) {
      if (!(error instanceof ImportError)) console.error(error);
      toast.error(errorMessage(error), { position: "top-center" });
    } finally {
      setBusy(null);
    }
  };

  const handleImport = async () => {
    if (!pending) return;
    const parsed = pending;
    setPending(null);
    setBusy({ kind: "import", value: 0 });
    try {
      const result = await applyImport(parsed, strategy, ({ done, total }) =>
        setBusy({ kind: "import", value: (done / total) * 100 }),
      );
      reindexNotes(result.indexedNoteIds);
      toast.success(
        t("result", {
          created: result.created,
          updated: result.updated,
          skipped: result.skipped,
          foldersCreated: result.foldersCreated,
        }),
        { position: "top-center" },
      );
    } catch (error) {
      console.error("Import failed:", error);
      toast.error(errorMessage(error), { position: "top-center" });
    } finally {
      setBusy(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            disabled={busy !== null}
            onClick={handleExport}
          >
            {t("export.button")}
          </Button>
          <Button
            variant="outline"
            disabled={busy !== null}
            onClick={() => inputRef.current?.click()}
          >
            {t("import.button")}
          </Button>
          <input
            ref={inputRef}
            type="file"
            multiple
            hidden
            data-testid="import-input"
            accept=".zip,.md,.markdown,.txt,application/zip,text/markdown,text/plain"
            onChange={(event) => {
              const files = Array.from(event.target.files ?? []);
              event.target.value = "";
              void handleFilesChosen(files);
            }}
          />
        </div>

        {busy && (
          <Progress value={busy.value} aria-label={t(`progress.${busy.kind}`)}>
            <ProgressLabel className="text-xs font-medium">
              {t(`progress.${busy.kind}`)}
            </ProgressLabel>
          </Progress>
        )}
      </CardContent>

      <Dialog
        open={pending !== null}
        onOpenChange={(open) => !open && setPending(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("dialog.title")}</DialogTitle>
            <DialogDescription>
              {t("dialog.description", {
                notes: pending?.notes.length ?? 0,
                folders: pending?.folders.length ?? 0,
              })}
            </DialogDescription>
          </DialogHeader>
          <RadioGroup
            value={strategy}
            onValueChange={(value) => setStrategy(value as ImportStrategy)}
            aria-label={t("dialog.strategyLabel")}
          >
            {STRATEGIES.map(({ value, key }) => (
              <Label
                key={value}
                htmlFor={`import-strategy-${value}`}
                className="items-start gap-3 font-normal"
              >
                <RadioGroupItem id={`import-strategy-${value}`} value={value} />
                <span className="flex flex-col gap-0.5">
                  <span className="font-medium">
                    {t(`dialog.strategies.${key}.label`)}
                  </span>
                  <span className="text-muted-foreground text-xs">
                    {t(`dialog.strategies.${key}.description`)}
                  </span>
                </span>
              </Label>
            ))}
          </RadioGroup>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPending(null)}>
              {t("dialog.cancel")}
            </Button>
            <Button onClick={handleImport}>{t("dialog.confirm")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
