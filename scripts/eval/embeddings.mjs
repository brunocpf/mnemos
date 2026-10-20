// Retrieval eval for embedding models (node, onnxruntime-node via transformers.js).
// Usage: node scripts/eval/embeddings.mjs [candidateKey ...]
import { AutoModel, AutoTokenizer, env } from "@huggingface/transformers";
import { performance } from "node:perf_hooks";

import { notes, queries } from "./dataset.mjs";

env.cacheDir = process.env.EVAL_CACHE_DIR || "./.cache/eval-models";

// kind: "sentence" -> model outputs `sentence_embedding` (pooling baked in); "mean" -> mean-pool last_hidden_state.
export const candidates = {
  "gte-small:fp32": { id: "Supabase/gte-small", dtype: "fp32", kind: "mean" },
  "gte-small:q8": { id: "Supabase/gte-small", dtype: "q8", kind: "mean" },
  "e5-small:q8": {
    id: "Xenova/multilingual-e5-small",
    dtype: "q8",
    kind: "mean",
    q: "query: ",
    d: "passage: ",
  },
  "e5-small:fp32": {
    id: "Xenova/multilingual-e5-small",
    dtype: "fp32",
    kind: "mean",
    q: "query: ",
    d: "passage: ",
  },
  "minilm-ml:q8": {
    id: "Xenova/paraphrase-multilingual-MiniLM-L12-v2",
    dtype: "q8",
    kind: "mean",
  },
  "gemma:fp32": {
    id: "onnx-community/embeddinggemma-300m-ONNX",
    dtype: "fp32",
    kind: "sentence",
    q: "task: search result | query: ",
    d: "title: none | text: ",
  },
  "gemma:q8": {
    id: "onnx-community/embeddinggemma-300m-ONNX",
    dtype: "q8",
    kind: "sentence",
    q: "task: search result | query: ",
    d: "title: none | text: ",
  },
  "gemma:q4": {
    id: "onnx-community/embeddinggemma-300m-ONNX",
    dtype: "q4",
    kind: "sentence",
    q: "task: search result | query: ",
    d: "title: none | text: ",
  },
  "gemma:q8-256": {
    id: "onnx-community/embeddinggemma-300m-ONNX",
    dtype: "q8",
    kind: "sentence",
    q: "task: search result | query: ",
    d: "title: none | text: ",
    dim: 256,
  },
  "arctic-m-v2:q8": {
    id: "Snowflake/snowflake-arctic-embed-m-v2.0",
    dtype: "q8",
    kind: "cls",
    q: "query: ",
    d: "",
  },
};

function normalize(v) {
  let n = 0;
  for (const x of v) n += x * x;
  n = Math.sqrt(n) || 1;
  return v.map((x) => x / n);
}

async function embedAll(c, model, tok, texts) {
  const out = [];
  for (const t of texts) {
    const inputs = await tok(t, {
      padding: true,
      truncation: true,
      max_length: 512,
    });
    const res = await model(inputs);
    let v;
    if (c.kind === "sentence") v = Array.from(res.sentence_embedding.data);
    else {
      const h = res.last_hidden_state;
      const [, L, D] = h.dims;
      v = new Array(D).fill(0);
      if (c.kind === "cls") for (let j = 0; j < D; j++) v[j] = h.data[j];
      else {
        for (let i = 0; i < L; i++)
          for (let j = 0; j < D; j++) v[j] += h.data[i * D + j] / L;
      }
    }
    if (c.dim) v = v.slice(0, c.dim);
    out.push(normalize(v));
  }
  return out;
}

export async function evaluate(key) {
  const c = candidates[key];
  const t0 = performance.now();
  const tok = await AutoTokenizer.from_pretrained(c.id);
  const model = await AutoModel.from_pretrained(c.id, { dtype: c.dtype });
  const loadMs = performance.now() - t0;
  const t1 = performance.now();
  const docs = await embedAll(
    c,
    model,
    tok,
    notes.map((n) => (c.d ?? "") + n.text),
  );
  const embedMs = (performance.now() - t1) / notes.length;
  const qs = await embedAll(
    c,
    model,
    tok,
    queries.map((q) => (c.q ?? "") + q.q),
  );
  let r1 = 0,
    r3 = 0,
    mrr = 0;
  for (let i = 0; i < queries.length; i++) {
    const scored = docs.map((d, j) => ({
      id: notes[j].id,
      s: d.reduce((a, x, k) => a + x * qs[i][k], 0),
    }));
    scored.sort((a, b) => b.s - a.s);
    const rel = new Set(queries[i].rel);
    const rank = scored.findIndex((x) => rel.has(x.id)) + 1;
    if (rank === 1) r1++;
    if (rank <= 3) r3++;
    mrr += 1 / rank;
  }
  const n = queries.length;
  return {
    key,
    dim: docs[0].length,
    loadSec: +(loadMs / 1000).toFixed(1),
    msPerDoc: +embedMs.toFixed(0),
    recall1: +(r1 / n).toFixed(3),
    recall3: +(r3 / n).toFixed(3),
    mrr: +(mrr / n).toFixed(3),
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const keys = process.argv.slice(2).length
    ? process.argv.slice(2)
    : Object.keys(candidates);
  const rows = [];
  for (const k of keys) {
    try {
      const r = await evaluate(k);
      rows.push(r);
      console.log(JSON.stringify(r));
    } catch (e) {
      console.log(
        JSON.stringify({ key: k, error: String(e.message || e).slice(0, 200) }),
      );
    }
  }
}
