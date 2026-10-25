import { AiError } from '../core/errors';
import type { AiProvider, JsonSchema, ProviderCall, ProviderResult } from '../core/types';
import { postJson } from './http';

export interface GeminiConfig {
  apiKey: string;
  baseUrl: string;
  defaultModel: string;
  /**
   * Gemini 2.5 Flash "thinks" before answering, and thinking tokens count against the output limit,
   * which can truncate short answers. 0 turns thinking off (supported on 2.5 Flash / Flash-Lite).
   * Undefined leaves the model's default. Ignored for models that can't disable thinking.
   */
  thinkingBudget?: number;
}

interface GeminiResponse {
  candidates?: Array<{ finishReason?: string; content?: { parts?: Array<{ text?: string }> } }>;
  usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number; thoughtsTokenCount?: number };
}

/**
 * Gemini's `responseSchema` is an OpenAPI subset: upper-case type names and no
 * `additionalProperties`. Accepting standard JSON Schema in the SDK and converting here keeps
 * that quirk out of the application.
 */
export const toGeminiSchema = (schema: JsonSchema): JsonSchema => {
  const convert = (node: unknown): unknown => {
    if (Array.isArray(node)) return node.map(convert);
    if (node && typeof node === 'object') {
      return Object.fromEntries(
        Object.entries(node as Record<string, unknown>)
          .filter(([key]) => key !== 'additionalProperties' && key !== '$schema')
          .map(([key, value]) => [key, key === 'type' && typeof value === 'string' ? value.toUpperCase() : convert(value)]),
      );
    }
    return node;
  };
  return convert(schema) as JsonSchema;
};

/** Only these families accept `thinkingBudget: 0`; sending it to others is a 400. */
const canDisableThinking = (model: string): boolean => /^gemini-2.5-flash/.test(model);

export class GeminiProvider implements AiProvider {
  readonly name = 'gemini';

  constructor(private readonly config: GeminiConfig) {}

  get defaultModel(): string {
    return this.config.defaultModel;
  }

  isConfigured(): boolean {
    return this.config.apiKey.length > 0;
  }

  async generate(call: ProviderCall): Promise<ProviderResult> {
    const payload = await postJson<GeminiResponse>(`${this.config.baseUrl}/v1beta/models/${call.model}:generateContent`, {
      provider: this.name,
      model: call.model,
      signal: call.signal,
      // The key travels in a header, never the URL, so it cannot end up in access logs.
      headers: { 'x-goog-api-key': this.config.apiKey },
      body: {
        ...(call.system ? { systemInstruction: { parts: [{ text: call.system }] } } : {}),
        contents: [{ role: 'user', parts: [{ text: call.prompt }] }],
        generationConfig: {
          temperature: call.temperature,
          maxOutputTokens: call.maxOutputTokens,
          ...(this.config.thinkingBudget !== undefined && canDisableThinking(call.model)
            ? { thinkingConfig: { thinkingBudget: this.config.thinkingBudget } }
            : {}),
          ...(call.jsonSchema
            ? { responseMimeType: 'application/json', responseSchema: toGeminiSchema(call.jsonSchema) }
            : {}),
        },
      },
    });

    const candidate = payload.candidates?.[0];
    const text = candidate?.content?.parts?.map((part) => part.text ?? '').join('').trim() ?? '';
    // A cut-off answer must never be passed on as if it were complete (a half-written reply to an author).
    if (text && candidate?.finishReason === 'MAX_TOKENS') {
      throw new AiError('invalid_output', 'Gemini output was cut off (MAX_TOKENS).', { provider: this.name, model: call.model });
    }
    if (!text) {
      throw new AiError('invalid_output', `Gemini returned no text (finishReason=${candidate?.finishReason ?? 'none'}).`, {
        provider: this.name,
        model: call.model,
      });
    }

    return {
      text,
      usage: payload.usageMetadata
        ? {
            promptTokens: payload.usageMetadata.promptTokenCount ?? 0,
            // Thinking tokens are billed as output, so they belong in the cost figures.
            outputTokens: (payload.usageMetadata.candidatesTokenCount ?? 0) + (payload.usageMetadata.thoughtsTokenCount ?? 0),
          }
        : undefined,
    };
  }
}
