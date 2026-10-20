import { afterEach, describe, expect, it, vi } from "vitest";

async function load(env: Record<string, string>) {
  vi.resetModules();
  for (const [k, v] of Object.entries(env)) vi.stubEnv(k, v);
  return await import("@/lib/embedding-config");
}

afterEach(() => vi.unstubAllEnvs());

describe("embedding-config", () => {
  it("defaults to multilingual-e5-small with e5 prefixes", async () => {
    const c = await load({});
    expect(c.EMBEDDING_MODEL_ID).toBe("Xenova/multilingual-e5-small");
    expect(c.EMBEDDING_QUERY_PREFIX).toBe("query: ");
    expect(c.EMBEDDING_DOCUMENT_PREFIX).toBe("passage: ");
  });

  it("uses no prefixes for other models unless set", async () => {
    const c = await load({
      NEXT_PUBLIC_EMBEDDING_MODEL_ID: "Supabase/gte-small",
    });
    expect(c.EMBEDDING_QUERY_PREFIX).toBe("");
    const d = await load({
      NEXT_PUBLIC_EMBEDDING_MODEL_ID: "Supabase/gte-small",
      NEXT_PUBLIC_EMBEDDING_QUERY_PREFIX: "q: ",
    });
    expect(d.EMBEDDING_QUERY_PREFIX).toBe("q: ");
  });
});
