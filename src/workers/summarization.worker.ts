import {
  pipeline,
  SummarizationPipeline,
  TextGenerationConfig,
} from "@huggingface/transformers";
import * as Comlink from "comlink";

export type SummarizationResultItem =
  | { summary_text?: string }
  | { generated_text?: string }
  | string;

export type SummarizationResult = SummarizationResultItem[];

class SummarizationWorkerService {
  private instance: Promise<SummarizationPipeline> | null = null;

  private async getInstance(): Promise<SummarizationPipeline> {
    if (!this.instance) {
      this.instance = pipeline("summarization", "Xenova/t5-small", {
        device: "gpu" in navigator ? "webgpu" : "wasm",
        dtype: "fp32",
      });
    }
    return this.instance;
  }

  async summarizeText(text: string): Promise<SummarizationResult> {
    try {
      const generator = await this.getInstance();

      const result = await generator(text, {
        max_length: 200,
        min_length: 20,
        num_beams: 4,
      } as TextGenerationConfig);

      return JSON.parse(JSON.stringify(result));
    } catch (error) {
      console.error("Worker Error:", error);
      throw error;
    }
  }
}

export type SummarizationService = SummarizationWorkerService;

Comlink.expose(new SummarizationWorkerService());
