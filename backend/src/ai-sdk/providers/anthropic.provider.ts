import { AiError } from '../core/errors';
import type { AiProvider, ProviderCall, ProviderResult } from '../core/types';
import { postJson } from './http';

export interface AnthropicConfig {
  apiKey: string;
  baseUrl: string;
  defaultModel: string;
}

type ContentBlock = { type: 'text'; text: string } | { type: 'tool_use'; input: unknown } | { type: string };

interface MessagesResponse {
  content?: ContentBlock[];
  stop_reason?: string | null;
  usage?: { input_tokens?: number; output_tokens?: number };
}

const API_VERSION = '2023-06-01';
const STRUCTURED_TOOL = 'respond';

/**
 * Claude via the Messages API. Structured output is done the reliable way: the schema becomes a
 * tool the model is forced to call, and the tool's input is the JSON we return.
 */
export class AnthropicProvider implements AiProvider {
  readonly name = 'anthropic';

  constructor(private readonly config: AnthropicConfig) {}

  get defaultModel(): string {
    return this.config.defaultModel;
  }

  isConfigured(): boolean {
    return this.config.apiKey.length > 0;
  }

  async generate(call: ProviderCall): Promise<ProviderResult> {
    const payload = await postJson<MessagesResponse>(`${this.config.baseUrl}/v1/messages`, {
      provider: this.name,
      model: call.model,
      signal: call.signal,
      headers: { 'x-api-key': this.config.apiKey, 'anthropic-version': API_VERSION },
      body: {
        model: call.model,
        max_tokens: call.maxOutputTokens,
        temperature: call.temperature,
        ...(call.system ? { system: call.system } : {}),
        messages: [{ role: 'user', content: call.prompt }],
        ...(call.jsonSchema
          ? {
              tools: [{ name: STRUCTURED_TOOL, description: 'Return the structured answer.', input_schema: call.jsonSchema }],
              tool_choice: { type: 'tool', name: STRUCTURED_TOOL },
            }
          : {}),
      },
    });

    const blocks = payload.content ?? [];
    const toolUse = blocks.find((block): block is { type: 'tool_use'; input: unknown } => block.type === 'tool_use');
    const text = toolUse
      ? JSON.stringify(toolUse.input)
      : blocks
          .filter((block): block is { type: 'text'; text: string } => block.type === 'text')
          .map((block) => block.text)
          .join('')
          .trim();

    if (text && payload.stop_reason === 'max_tokens') {
      throw new AiError('invalid_output', 'Anthropic output was cut off (max_tokens).', { provider: this.name, model: call.model });
    }
    if (!text) {
      throw new AiError('invalid_output', 'Anthropic returned no content.', { provider: this.name, model: call.model });
    }

    return {
      text,
      usage: payload.usage
        ? { promptTokens: payload.usage.input_tokens ?? 0, outputTokens: payload.usage.output_tokens ?? 0 }
        : undefined,
    };
  }
}
