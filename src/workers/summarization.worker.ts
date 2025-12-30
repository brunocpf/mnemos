import {
  Chat,
  pipeline,
  TextGenerationPipeline,
} from "@huggingface/transformers";
import * as Comlink from "comlink";

export type SummarizationResultItem = string;

export type SummarizationResult = SummarizationResultItem[];

class SummarizationWorkerService {
  private instance: Promise<TextGenerationPipeline> | null = null;

  private async getInstance(): Promise<TextGenerationPipeline> {
    if (!this.instance) {
      this.instance = pipeline<"text-generation">(
        "text-generation",
        "onnx-community/Phi-3.5-mini-instruct-onnx-web",
        {
          device: "gpu" in navigator ? "webgpu" : "wasm",
          dtype: "q4f16",
        },
      );
    }
    return this.instance;
  }

  async summarizeText(text: string): Promise<SummarizationResult> {
    try {
      const generator = await this.getInstance();

      const messages = [
        {
          role: "system",
          content:
            "You are a professional assistant that provides concise summaries for the user's personal notes.",
        },
        {
          role: "user",
          content: `Provide a short and concise summary for the following personal notes I wrote with no more than 3 short, single-sentence bullet points:\n\n"""\n${text}\n"""`,
        },
      ];

      const result = (await generator(messages, {
        max_new_tokens: 200,
        temperature: 0.3,
        return_full_text: false,
      })) as { generated_text: Chat }[];

      const firstEntry = result[0];

      if (!firstEntry) {
        throw new Error("Summarization pipeline returned no data.");
      }

      const chat = firstEntry.generated_text;

      return JSON.parse(JSON.stringify(chat[2].content)) as SummarizationResult;
    } catch (error) {
      console.error("Worker Error:", error);
      throw error;
    }
  }
}

export type SummarizationService = SummarizationWorkerService;

Comlink.expose(new SummarizationWorkerService());
