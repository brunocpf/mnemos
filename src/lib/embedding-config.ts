// Shared by the embedding worker, the embedder provider and the server fallback
// so that every vector in the index comes from the same model and recipe.
// Changing the model id changes the key of stored vectors: old rows are
// ignored and dropped, and notes are re-indexed (see embedder-provider).

export const EMBEDDING_MODEL_ID =
  process.env.NEXT_PUBLIC_EMBEDDING_MODEL_ID || "Xenova/multilingual-e5-small";

export const EMBEDDING_DTYPE = (process.env.NEXT_PUBLIC_EMBEDDING_DTYPE ||
  "q8") as "fp32" | "fp16" | "q8" | "int8" | "uint8" | "q4" | "q4f16";

// Asymmetric-retrieval models need different prefixes for queries and passages.
// An explicitly set env var (even empty) wins over the per-model preset.
const preset = /e5/i.test(EMBEDDING_MODEL_ID)
  ? { query: "query: ", document: "passage: " }
  : { query: "", document: "" };

export const EMBEDDING_QUERY_PREFIX =
  process.env.NEXT_PUBLIC_EMBEDDING_QUERY_PREFIX ?? preset.query;
export const EMBEDDING_DOCUMENT_PREFIX =
  process.env.NEXT_PUBLIC_EMBEDDING_DOCUMENT_PREFIX ?? preset.document;

/**
 * Hosted counterpart used by the server fallback. It must be the same
 * underlying model (just served by the HF Inference API), otherwise vectors
 * would not be comparable with the on-device ones.
 */
export const SERVER_EMBEDDING_MODEL_ID =
  process.env.SERVER_EMBEDDING_MODEL || "intfloat/multilingual-e5-small";
