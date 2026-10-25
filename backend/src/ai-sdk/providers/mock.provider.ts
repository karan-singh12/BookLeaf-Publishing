import type { AiProvider, ProviderCall, ProviderResult } from '../core/types';

export type MockHandler = (call: ProviderCall, callNumber: number) => string | ProviderResult | Promise<string | ProviderResult>;

/**
 * A scriptable provider for tests and offline demos. The handler can return text, or throw an
 * `AiError` to simulate outages, rate limits and bad output.
 */
export class MockProvider implements AiProvider {
  readonly calls: ProviderCall[] = [];

  constructor(
    readonly name: string,
    /** A fixed reply, or a function that decides per call (and may throw to simulate failures). */
    private readonly handler: MockHandler | string,
    readonly defaultModel = 'mock-model',
    private readonly configured = true,
  ) {}

  isConfigured(): boolean {
    return this.configured;
  }

  async generate(call: ProviderCall): Promise<ProviderResult> {
    this.calls.push(call);
    const result = typeof this.handler === 'string' ? this.handler : await this.handler(call, this.calls.length);
    return typeof result === 'string' ? { text: result, usage: { promptTokens: 10, outputTokens: 5 } } : result;
  }
}
