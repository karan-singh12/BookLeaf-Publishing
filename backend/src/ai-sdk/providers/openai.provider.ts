import { AiError } from '../core/errors';
import type { AiProvider, JsonSchema, ProviderCall, ProviderResult } from '../core/types';
import { postJson } from './http';

export interface OpenAiCompatibleConfig {
  /** `openai`, or the name of any OpenAI-compatible host (`openrouter`, `groq`, ...). */
  name: string;
  apiKey: string;
  baseUrl: string;
  defaultModel: string;
  /**
   * True only for hosts that support `response_format: json_schema` (OpenAI itself). Others get
   * plain JSON mode with the schema spelled out in the prompt.
   */
  nativeStructuredOutput: boolean;
}

interface ChatCompletionResponse {
  choices?: Array<{ finish_reason?: string | null; message?: { content?: string | null } }>;
  usage?: { prompt_tokens?: number; completion_tokens?: number };
}

/** OpenAI strict mode demands `additionalProperties: false` on every object. */
const strictify = (schema: JsonSchema): JsonSchema => {
  const walk = (node: unknown): unknown => {
    if (Array.isArray(node)) return node.map(walk);
    if (node && typeof node === 'object') {
      const entries = Object.entries(node as Record<string, unknown>).map(([key, value]) => [key, walk(value)]);
      const copy = Object.fromEntries(entries) as Record<string, unknown>;
      if (copy.type === 'object') copy.additionalProperties = false;
      return copy;
    }
    return node;
  };
  return walk(schema) as JsonSchema;
};

/** Speaks the Chat Completions protocol: OpenAI, OpenRouter, Groq, Together, local servers... */
export class OpenAiCompatibleProvider implements AiProvider {
  constructor(private readonly config: OpenAiCompatibleConfig) {}

  get name(): string {
    return this.config.name;
  }

  get defaultModel(): string {
    return this.config.defaultModel;
  }

  isConfigured(): boolean {
    return this.config.apiKey.length > 0;
  }

  async generate(call: ProviderCall): Promise<ProviderResult> {
    const { nativeStructuredOutput } = this.config;

    // Without native schema support, state the schema in the prompt so JSON mode still conforms.
    const system = [
      call.system,
      call.jsonSchema && !nativeStructuredOutput
        ? `Respond with a single JSON object that matches this JSON Schema: ${JSON.stringify(call.jsonSchema)}`
        : undefined,
    ]
      .filter(Boolean)
      .join('\n\n');

    const payload = await postJson<ChatCompletionResponse>(`${this.config.baseUrl}/chat/completions`, {
      provider: this.name,
      model: call.model,
      signal: call.signal,
      headers: { Authorization: `Bearer ${this.config.apiKey}` },
      body: {
        model: call.model,
        messages: [...(system ? [{ role: 'system', content: system }] : []), { role: 'user', content: call.prompt }],
        temperature: call.temperature,
        // OpenAI's newer models reject `max_tokens`; compatible hosts still expect it.
        ...(this.config.name === 'openai'
          ? { max_completion_tokens: call.maxOutputTokens }
          : { max_tokens: call.maxOutputTokens }),
        ...(call.jsonSchema
          ? {
              response_format: nativeStructuredOutput
                ? { type: 'json_schema', json_schema: { name: 'response', strict: true, schema: strictify(call.jsonSchema) } }
                : { type: 'json_object' },
            }
          : {}),
      },
    });

    const choice = payload.choices?.[0];
    const text = choice?.message?.content?.trim() ?? '';
    if (text && choice?.finish_reason === 'length') {
      throw new AiError('invalid_output', `${this.name} output was cut off (length).`, { provider: this.name, model: call.model });
    }
    if (!text) {
      throw new AiError('invalid_output', `${this.name} returned an empty completion.`, { provider: this.name, model: call.model });
    }

    return {
      text,
      usage: payload.usage
        ? { promptTokens: payload.usage.prompt_tokens ?? 0, outputTokens: payload.usage.completion_tokens ?? 0 }
        : undefined,
    };
  }
}
