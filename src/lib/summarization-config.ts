export const SUMMARIZATION_MODEL_ID =
  process.env.NEXT_PUBLIC_SUMMARIZATION_MODEL_ID ||
  "onnx-community/Qwen3-0.6B-ONNX";

export const SUMMARIZATION_DTYPE = (process.env
  .NEXT_PUBLIC_SUMMARIZATION_DTYPE || "q4f16") as
  "fp32" | "fp16" | "q8" | "q4" | "q4f16";
