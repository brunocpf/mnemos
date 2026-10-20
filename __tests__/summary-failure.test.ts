import { describe, expect, it } from "vitest";

import {
  getDownloadProgress,
  getSummaryFailureReason,
} from "../src/lib/summary-failure";

const downloading = {
  isReady: false,
  fileStates: {
    a: { status: "done" as const, loaded: 50, total: 50 },
    b: { status: "progress" as const, loaded: 25, total: 150 },
  },
};

describe("getDownloadProgress", () => {
  it("aggregates bytes across files", () => {
    expect(getDownloadProgress(downloading)).toBe(37);
  });
  it("is undefined without totals", () => {
    expect(getDownloadProgress(undefined)).toBeUndefined();
  });
});

describe("getSummaryFailureReason", () => {
  it("reports a pending local model download", () => {
    expect(
      getSummaryFailureReason({
        host: "allow-fallback",
        modelDownloadState: downloading,
        online: true,
      }),
    ).toEqual({ kind: "downloading", progress: 37 });
  });

  it("ignores the local model when summaries run on the server", () => {
    expect(
      getSummaryFailureReason({
        host: "server-only",
        modelDownloadState: downloading,
        online: true,
      }),
    ).toEqual({ kind: "failed" });
  });

  it("reports offline when the model is not pending", () => {
    expect(
      getSummaryFailureReason({
        host: "allow-fallback",
        modelDownloadState: { isReady: true, fileStates: {} },
        online: false,
      }),
    ).toEqual({ kind: "offline" });
  });

  it("falls back to a generic failure", () => {
    expect(
      getSummaryFailureReason({ host: "local-only", online: true }),
    ).toEqual({ kind: "failed" });
  });
});
