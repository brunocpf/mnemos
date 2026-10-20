import { describe, expect, it } from "vitest";

import enUS from "../messages/en-US.json";
import ptBR from "../messages/pt-BR.json";

function collectKeys(value: unknown, prefix = ""): string[] {
  if (Array.isArray(value)) {
    return value.flatMap((item, index) =>
      collectKeys(item, `${prefix}[${index}]`),
    );
  }
  if (value && typeof value === "object") {
    return Object.entries(value).flatMap(([key, child]) =>
      collectKeys(child, prefix ? `${prefix}.${key}` : key),
    );
  }
  return [prefix];
}

describe("messages", () => {
  it("keeps en-US and pt-BR keys in sync", () => {
    const en = new Set(collectKeys(enUS));
    const pt = new Set(collectKeys(ptBR));

    expect([...en].filter((key) => !pt.has(key))).toEqual([]);
    expect([...pt].filter((key) => !en.has(key))).toEqual([]);
  });

  it("keeps ICU placeholders consistent", () => {
    const placeholders = (text: string) =>
      [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

    const walk = (a: unknown, b: unknown, path: string): void => {
      if (typeof a === "string" && typeof b === "string") {
        expect(placeholders(b), path).toEqual(placeholders(a));
      } else if (a && b && typeof a === "object" && typeof b === "object") {
        for (const key of Object.keys(a)) {
          walk(
            (a as Record<string, unknown>)[key],
            (b as Record<string, unknown>)[key],
            `${path}.${key}`,
          );
        }
      }
    };

    walk(enUS, ptBR, "messages");
  });
});
