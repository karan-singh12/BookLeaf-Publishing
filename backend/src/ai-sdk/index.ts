/**
 * AI SDK: provider-agnostic LLM access with task-based routing, fallback chains, retries,
 * circuit breakers, concurrency limits and metrics. Knows nothing about BookLeaf.
 *
 * Application code should import from here only, never from the sub-folders.
 */
export { AiClient, createAiClient } from './client';
export type { AiClientExtras, AiSdkConfig } from './client';

export { AiError, toAiError } from './core/errors';
export type { AiFailureReason, AttemptRecord } from './core/errors';
export type { AiProvider, AiRequest, AiResult, JsonSchema, ProviderCall, ProviderResult, TokenUsage } from './core/types';

export { AnthropicProvider } from './providers/anthropic.provider';
export { GeminiProvider, toGeminiSchema } from './providers/gemini.provider';
export { MockProvider } from './providers/mock.provider';
export { OpenAiCompatibleProvider } from './providers/openai.provider';

export { parseRouteSpec } from './routing/route-spec';
export type { RouteTarget } from './routing/route-spec';
export type { AiCallEvent, AiEventListener, ModelMetrics } from './observability/metrics';
