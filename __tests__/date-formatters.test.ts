import { describe, expect, it } from "vitest";

import { getDateFormatter } from "@/lib/dateFormatters";

describe("getDateFormatter", () => {
  const date = new Date("2026-10-20T12:00:00Z");

  it("formats per locale", () => {
    expect(getDateFormatter("en-US").format(date)).toBe("Oct 20, 2026");
    expect(getDateFormatter("pt-BR").format(date)).toBe("20 de out. de 2026");
  });

  it("caches formatters", () => {
    expect(getDateFormatter("pt-BR")).toBe(getDateFormatter("pt-BR"));
  });
});
