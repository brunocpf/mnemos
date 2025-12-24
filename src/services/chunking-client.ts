import { TypedEventTarget } from "@/lib/typed-event-target";
import type {
  ChunkingRequest,
  ChunkingResponse,
} from "@/workers/chunking.worker";

type ChunkingCallbacks = {
  onResult?: (response: Omit<ChunkingResponse, "type">) => void;
};

export type ChunkingResultEvent = CustomEvent<Omit<ChunkingResponse, "type">>;

export class ChunkingClient extends TypedEventTarget<{
  result: ChunkingResultEvent;
}> {
  private timers = new Map<string, number>();
  private versions = new Map<string, number>();
  private latestVersion = new Map<string, number>();

  constructor(
    private worker: Worker,
    options: { callbacks?: ChunkingCallbacks } = {},
  ) {
    super();

    this.worker.onmessage = (ev: MessageEvent<ChunkingResponse>) => {
      const res = ev.data;

      if (res.type !== "CHUNK_RESULT") return;

      const latest = this.latestVersion.get(res.noteId);
      if (latest !== res.version) return;

      this.dispatchTypedEvent(
        "result",
        new CustomEvent("result", { detail: res }),
      );

      options.callbacks?.onResult?.(res);
    };
  }

  schedule(
    data: {
      id: string;
      title?: string;
      content: string;
    },
    delayMs = 1000,
  ) {
    const version = (this.versions.get(data.id) ?? 0) + 1;
    this.versions.set(data.id, version);
    this.latestVersion.set(data.id, version);

    const existing = this.timers.get(data.id);
    if (existing) window.clearTimeout(existing);

    const timer = window.setTimeout(() => {
      this.postIndexJob(data, version);
    }, delayMs);

    this.timers.set(data.id, timer);
  }

  flush(data: { id: string; title?: string; content: string }) {
    const version = (this.versions.get(data.id) ?? 0) + 1;
    this.versions.set(data.id, version);
    this.latestVersion.set(data.id, version);

    const existing = this.timers.get(data.id);
    if (existing) window.clearTimeout(existing);

    this.postIndexJob(data, version);
  }

  private postIndexJob(
    data: { id: string; title?: string; content: string },
    version: number,
  ) {
    const req: ChunkingRequest = {
      type: "CHUNK_NOTE",
      noteId: data.id,
      version,
      title: data.title,
      content: data.content,
      settings: {
        targetChars: 800,
        maxChars: 1200,
      },
    };

    this.worker.postMessage(req);
  }

  dispose() {
    for (const timer of this.timers.values()) window.clearTimeout(timer);

    this.timers.clear();
    this.worker.terminate();
  }
}
