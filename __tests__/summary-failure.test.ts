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

describe("getSummaryFailureReason with a failed model load", () => {
  const failed = {
    isReady: false,
    error: "Could not locate file",
    fileStates: { a: { status: "progress" as const, loaded: 5, total: 5 } },
  };

  it("reports the load failure instead of a stuck download", () => {
    expect(
      getSummaryFailureReason({
        host: "local-only",
        modelDownloadState: failed,
        online: true,
      }),
    ).toEqual({ kind: "modelFailed", detail: "Could not locate file" });
  });

  it("reports the load failure when offline with fallback", () => {
    expect(
      getSummaryFailureReason({
        host: "allow-fallback",
        modelDownloadState: failed,
        online: false,
      }).kind,
    ).toBe("modelFailed");
  });

  it("stays generic when the cloud fallback was available", () => {
    expect(
      getSummaryFailureReason({
        host: "allow-fallback",
        modelDownloadState: failed,
        online: true,
      }),
    ).toEqual({ kind: "failed" });
  });

  it("ignores the model error for cloud-only summaries", () => {
    expect(
      getSummaryFailureReason({
        host: "server-only",
        modelDownloadState: failed,
        online: true,
      }),
    ).toEqual({ kind: "failed" });
  });
});
