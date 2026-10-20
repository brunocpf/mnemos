import { describe, expect, it } from "vitest";

import { buildSummaryMessages, stripThinking } from "@/lib/summary-prompt";

describe("buildSummaryMessages", () => {
  it("wraps the note in salted tags and names them in the system prompt", () => {
    const [system, user] = buildSummaryMessages("hello", "abc");
    expect(system?.content).toContain("<notes_abc>");
    expect(user?.content).toContain("<notes_abc>\nhello\n</notes_abc>");
  });
});

describe("stripThinking", () => {
  it("removes closed and unterminated-prefix think blocks", () => {
    expect(stripThinking("<think>x</think>\n- a")).toBe("- a");
    expect(stripThinking("reasoning</think>- a")).toBe("- a");
    expect(stripThinking("- a")).toBe("- a");
  });
});
