/// <reference lib="webworker" />
import { expose } from "comlink";

import { HfModelWorkerService } from "@/lib/hf-model-worker-service";
import {
  SUMMARIZATION_DTYPE,
  SUMMARIZATION_MODEL_ID,
} from "@/lib/summarization-config";
import { buildSummaryMessages, stripThinking } from "@/lib/summary-prompt";

const modelId = SUMMARIZATION_MODEL_ID;
const dtype = SUMMARIZATION_DTYPE;

class SummarizationWorkerService extends HfModelWorkerService<"text-generation"> {
  constructor() {
    super(modelId, "text-generation", {
      device: "gpu" in navigator ? "webgpu" : "wasm",
      dtype,
    });
  }

  get model() {
    return this.modelId;
  }

  async summarize(text: string) {
    const salt = Math.random().toString(36).substring(7);

    try {
      if (!this.pipelinePromise) {
        this.init();
      }

      const generator = await this.pipelinePromise;

      if (!generator) {
        throw new Error("Summarization pipeline is not initialized.");
      }

      // Render the chat template ourselves so reasoning ("thinking") can be
      // switched off for models that support it (Qwen3); other templates ignore it.
      const prompt = generator.tokenizer.apply_chat_template(
        buildSummaryMessages(text, salt),
        {
          add_generation_prompt: true,
          tokenize: false,
          enable_thinking: false,
        } as Record<string, unknown>,
      ) as unknown as string;

      const result = (await generator(prompt, {
        max_new_tokens: 200,
        temperature: 0.3,
        do_sample: true,
        return_full_text: false,
      })) as { generated_text: string }[];

      const content = result[0]?.generated_text;
      if (typeof content !== "string") {
        throw new Error("Summarization pipeline returned an invalid response.");
      }

      return stripThinking(content);
    } catch (error) {
      console.error("Worker Error:", error);
      throw error;
    }
  }
}

export type SummarizationWorkerApi = SummarizationWorkerService;

expose(new SummarizationWorkerService());
