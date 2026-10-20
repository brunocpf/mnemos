// Summarization eval: same prompt as src/workers/summarization.worker.ts.
// Run with node >= 22.18 (type stripping for the shared prompt module).
// Usage: node scripts/eval/summaries.mjs <candidateKey> [...]  -> writes JSON lines to stdout
import { pipeline, env } from "@huggingface/transformers";
import { performance } from "node:perf_hooks";

import {
  buildSummaryMessages,
  stripThinking,
} from "../../src/lib/summary-prompt.ts";
import { summaryNotes } from "./summary-notes.mjs";

env.cacheDir = process.env.EVAL_CACHE_DIR || "./.cache/eval-models";

export const models = {
  phi35: {
    id: "onnx-community/Phi-3.5-mini-instruct-onnx-web",
    dtype: "q4f16",
  },
  qwen3_17: { id: "onnx-community/Qwen3-1.7B-ONNX", dtype: "q4f16" },
  qwen3_06: { id: "onnx-community/Qwen3-0.6B-ONNX", dtype: "q4f16" },
  qwen35_08: { id: "onnx-community/Qwen3.5-0.8B-ONNX", dtype: "q4f16" },
  gemma270: { id: "onnx-community/gemma-3-270m-it-ONNX", dtype: "q4f16" },
  llama32_1: {
    id: "onnx-community/Llama-3.2-1B-Instruct-ONNX",
    dtype: "q4f16",
  },
  qwen25_15: { id: "onnx-community/Qwen2.5-1.5B-Instruct", dtype: "q4f16" },
  qwen25_05: { id: "onnx-community/Qwen2.5-0.5B-Instruct", dtype: "q4f16" },
  gemma1b: { id: "onnx-community/gemma-3-1b-it-ONNX", dtype: "q4f16" },
};

const buildMessages = (text) =>
  buildSummaryMessages(text, Math.random().toString(36).substring(7));
const cleanOutput = stripThinking;

const key = process.argv[2];
const m = models[key];
let dtype = m.dtype;
const t0 = performance.now();
let gen;
try {
  gen = await pipeline("text-generation", m.id, { dtype });
} catch (e) {
  console.error("q4f16 failed:", String(e.message).slice(0, 150));
  dtype = "q4";
  gen = await pipeline("text-generation", m.id, { dtype });
}
const loadSec = (performance.now() - t0) / 1000;
const results = [];
for (const n of summaryNotes) {
  const prompt = gen.tokenizer.apply_chat_template(buildMessages(n.text), {
    add_generation_prompt: true,
    tokenize: false,
    enable_thinking: false,
  });
  const t = performance.now();
  const out = await gen(prompt, {
    max_new_tokens: 200,
    temperature: 0.3,
    do_sample: true,
    return_full_text: false,
  });
  const sec = (performance.now() - t) / 1000;
  const raw = out[0].generated_text;
  const toks = gen.tokenizer(raw).input_ids.size ?? 0;
  results.push({
    id: n.id,
    raw,
    summary: cleanOutput(raw),
    sec: +sec.toFixed(1),
    tokens: Number(toks),
    tps: +(Number(toks) / sec).toFixed(1),
  });
  console.error(n.id, sec.toFixed(1), "s");
}
console.log(
  JSON.stringify({
    key,
    id: m.id,
    dtype,
    loadSec: +loadSec.toFixed(1),
    results,
  }),
);
