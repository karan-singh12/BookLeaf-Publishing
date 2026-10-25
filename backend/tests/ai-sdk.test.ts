import assert from 'node:assert/strict';
import http from 'node:http';
import { AddressInfo } from 'node:net';
import { after, describe, it } from 'node:test';
import {
  AiError,
  AnthropicProvider,
  GeminiProvider,
  MockProvider,
  OpenAiCompatibleProvider,
  createAiClient,
  parseRouteSpec,
  toGeminiSchema,
  type AiSdkConfig,
  type ProviderCall,
} from '../src/ai-sdk';
import { Bulkhead } from '../src/ai-sdk/resilience/bulkhead';
import { CircuitBreaker } from '../src/ai-sdk/resilience/circuit-breaker';

const blank = { apiKey: '', baseUrl: 'http://unused', defaultModel: 'm' };
const baseConfig = (overrides: Partial<AiSdkConfig> = {}): AiSdkConfig => ({
  providers: { gemini: blank, openai: blank, anthropic: blank, openrouter: blank },
  routes: {},
  timeoutMs: 2000,
  retries: 0,
  temperature: 0.3,
  maxConcurrent: 4,
  maxQueued: 10,
  ...overrides,
});

const noWait = { router: { retry: { sleep: async () => undefined } }, silent: true } as const;
const request = { task: 'draft', prompt: 'hello', maxOutputTokens: 50 };
const fail = (reason: ConstructorParameters<typeof AiError>[0]) => () => {
  throw new AiError(reason, `${reason} (simulated)`);
};

describe('route spec', () => {
  it('parses an ordered chain, defaulting models and keeping colons inside model ids', () => {
    assert.deepEqual(parseRouteSpec('gemini:gemini-2.0-flash, openai , openrouter:meta/llama:free', ['gemini', 'openai', 'openrouter']), [
      { provider: 'gemini', model: 'gemini-2.0-flash' },
      { provider: 'openai', model: undefined },
      { provider: 'openrouter', model: 'meta/llama:free' },
    ]);
  });

  it('fails loudly on an unknown provider or an empty route', () => {
    assert.throws(() => parseRouteSpec('gemin:flash', ['gemini']), /Unknown AI provider "gemin"/);
    assert.throws(() => parseRouteSpec(' , ', ['gemini']), /no providers/);
  });
});

describe('model router', () => {
  it('falls back to the next provider and records every attempt', async () => {
    const primary = new MockProvider('primary', fail('upstream_error'));
    const backup = new MockProvider('backup', 'from backup');
    const client = createAiClient(baseConfig({ defaultRoute: 'primary,backup' }), { providers: [primary, backup], ...noWait });

    const result = await client.generate(request);
    assert.equal(result.value, 'from backup');
    assert.equal(result.provider, 'backup');
    assert.equal(result.fallbackUsed, true);
    assert.deepEqual(result.attempts.map((a) => [a.provider, a.ok, a.reason]), [
      ['primary', false, 'upstream_error'],
      ['backup', true, undefined],
    ]);
  });

  it('retries transient errors on the same provider before giving up', async () => {
    const flaky = new MockProvider('flaky', (_call, n) => {
      if (n < 3) throw new AiError('rate_limited', '429');
      return 'finally';
    });
    const client = createAiClient(baseConfig({ defaultRoute: 'flaky', retries: 2 }), { providers: [flaky], ...noWait });

    const result = await client.generate(request);
    assert.equal(result.value, 'finally');
    assert.equal(flaky.calls.length, 3);
    assert.equal(result.fallbackUsed, false);
  });

  it('does not retry errors that cannot succeed on retry (bad key), but still falls back', async () => {
    const badKey = new MockProvider('bad-key', fail('auth_error'));
    const good = new MockProvider('good', 'ok');
    const client = createAiClient(baseConfig({ defaultRoute: 'bad-key,good', retries: 3 }), { providers: [badKey, good], ...noWait });

    await client.generate(request);
    assert.equal(badKey.calls.length, 1);
  });

  it('skips unconfigured providers without calling them', async () => {
    const missingKey = new MockProvider('missing', 'never', 'm', false);
    const good = new MockProvider('good', 'ok');
    const client = createAiClient(baseConfig({ defaultRoute: 'missing,good' }), { providers: [missingKey, good], ...noWait });

    const result = await client.generate(request);
    assert.equal(missingKey.calls.length, 0);
    assert.equal(result.attempts[0]?.reason, 'not_configured');
    assert.equal(result.fallbackUsed, true);
  });

  it('opens the circuit after repeated failures, then probes again after the cooldown', async () => {
    let now = 0;
    const down = new MockProvider('down', fail('upstream_error'));
    const backup = new MockProvider('backup', 'ok');
    const client = createAiClient(baseConfig({ defaultRoute: 'down,backup' }), {
      providers: [down, backup],
      silent: true,
      router: { retry: { sleep: async () => undefined }, breaker: { failureThreshold: 3, cooldownMs: 60_000, now: () => now } },
    });

    for (let i = 0; i < 3; i += 1) await client.generate(request);
    assert.equal(down.calls.length, 3);

    const skipped = await client.generate(request);
    assert.equal(down.calls.length, 3, 'open circuit must not call the provider');
    assert.equal(skipped.attempts[0]?.reason, 'circuit_open');

    now = 61_000;
    await client.generate(request);
    assert.equal(down.calls.length, 4, 'one probe is allowed after the cooldown');
  });

  it('treats a rejected answer as invalid_output: tries the next model, never trips the breaker', async () => {
    const sloppy = new MockProvider('sloppy', 'not json');
    const careful = new MockProvider('careful', '{"ok":true}');
    const client = createAiClient(baseConfig({ defaultRoute: 'sloppy,careful' }), {
      providers: [sloppy, careful],
      silent: true,
      router: { retry: { sleep: async () => undefined }, breaker: { failureThreshold: 2 } },
    });

    const ask = () => client.generate({ ...request, parse: (text) => JSON.parse(text) as { ok: boolean } });
    for (let i = 0; i < 4; i += 1) {
      const result = await ask();
      assert.deepEqual(result.value, { ok: true });
    }
    assert.equal(sloppy.calls.length, 4, 'a bad answer is not an outage, so the provider keeps being tried');
  });

  it('throws one error with the full history when nothing can answer', async () => {
    const a = new MockProvider('a', fail('timeout'));
    const b = new MockProvider('b', fail('rate_limited'));
    const client = createAiClient(baseConfig({ defaultRoute: 'a,b' }), { providers: [a, b], ...noWait });

    await assert.rejects(client.generate(request), (error: AiError) => {
      assert.equal(error.reason, 'rate_limited');
      assert.deepEqual(error.attempts.map((x) => x.provider), ['a', 'b']);
      return true;
    });
  });

  it('reports not_configured when no key is set anywhere, and isConfigured() is false', async () => {
    const client = createAiClient(baseConfig(), { silent: true });
    assert.equal(client.isConfigured(), false);
    await assert.rejects(client.generate(request), (error: AiError) => error.reason === 'not_configured');
  });

  it('routes each task through its own chain and honours a per-request model', async () => {
    const cheap = new MockProvider('cheap', 'cheap answer', 'tiny');
    const strong = new MockProvider('strong', 'strong answer', 'big');
    const client = createAiClient(baseConfig({ routes: { classify: 'cheap', draft: 'strong:big-v2' } }), {
      providers: [cheap, strong],
      ...noWait,
    });

    assert.equal((await client.generate({ ...request, task: 'classify' })).value, 'cheap answer');
    const draft = await client.generate({ ...request, task: 'draft' });
    assert.equal(draft.value, 'strong answer');
    assert.equal(draft.model, 'big-v2');
    assert.equal(strong.calls[0]?.model, 'big-v2');

    await client.generate({ ...request, task: 'draft', model: 'override' });
    assert.equal(strong.calls[1]?.model, 'override');
  });

  it('collects per-model usage and exposes it in status() without leaking keys', async () => {
    const provider = new MockProvider('p', 'ok');
    const client = createAiClient(baseConfig({ defaultRoute: 'p' }), { providers: [provider], ...noWait });
    await client.generate(request);
    await client.generate(request);

    const status = client.status();
    assert.equal(status.metrics['p:mock-model']?.successes, 2);
    assert.equal(status.metrics['p:mock-model']?.promptTokens, 20);
    assert.ok(!JSON.stringify(status).includes('apiKey'));
  });
});

describe('resilience primitives', () => {
  it('bulkhead caps concurrency, queues the rest, and rejects when the queue is full', async () => {
    const bulkhead = new Bulkhead(1, 1);
    let release!: () => void;
    const gate = new Promise<void>((resolve) => (release = resolve));

    const first = bulkhead.run(() => gate);
    const second = bulkhead.run(async () => 'second');
    assert.deepEqual(bulkhead.stats, { running: 1, queued: 1 });
    await assert.rejects(bulkhead.run(async () => 'third'), (error: AiError) => error.reason === 'rate_limited');

    release();
    await first;
    assert.equal(await second, 'second');
    assert.deepEqual(bulkhead.stats, { running: 0, queued: 0 });
  });

  it('circuit breaker closes again after a successful probe', () => {
    let now = 0;
    const breaker = new CircuitBreaker(2, 1000, () => now);
    breaker.recordFailure();
    breaker.recordFailure();
    assert.equal(breaker.canRequest(), false);
    now = 1001;
    assert.equal(breaker.canRequest(), true);
    breaker.recordSuccess();
    assert.equal(breaker.isOpen, false);
  });
});

/** Runs a tiny HTTP server that records the last request and replies as scripted. */
const fakeApi = async (reply: (body: any, req: http.IncomingMessage) => { status?: number; headers?: Record<string, string>; json?: unknown; text?: string }) => {
  const seen: { url?: string; headers?: http.IncomingHttpHeaders; body?: any } = {};
  const server = http.createServer((req, res) => {
    let raw = '';
    req.on('data', (chunk) => (raw += chunk));
    req.on('end', () => {
      seen.url = req.url;
      seen.headers = req.headers;
      seen.body = raw ? JSON.parse(raw) : undefined;
      const { status = 200, headers = {}, json, text } = reply(seen.body, req);
      res.writeHead(status, { 'Content-Type': 'application/json', ...headers });
      res.end(text ?? JSON.stringify(json ?? {}));
    });
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  return { seen, baseUrl, close: () => new Promise<void>((resolve) => server.close(() => resolve())) };
};

const call = (overrides: Partial<ProviderCall> = {}): ProviderCall => ({
  model: 'test-model',
  system: 'be brief',
  prompt: 'hi',
  maxOutputTokens: 100,
  temperature: 0.2,
  signal: AbortSignal.timeout(3000),
  ...overrides,
});

const schema = { type: 'object', properties: { answer: { type: 'string' } }, required: ['answer'], additionalProperties: false };

describe('providers over HTTP', () => {
  const closers: Array<() => Promise<void>> = [];
  after(async () => {
    for (const close of closers) await close();
  });
  const serve = async (...args: Parameters<typeof fakeApi>) => {
    const api = await fakeApi(...args);
    closers.push(api.close);
    return api;
  };

  it('Gemini: key in header not URL, schema converted, usage parsed', async () => {
    const api = await serve(() => ({
      json: { candidates: [{ content: { parts: [{ text: '{"answer":"x"}' }] } }], usageMetadata: { promptTokenCount: 12, candidatesTokenCount: 3 } },
    }));
    const provider = new GeminiProvider({ apiKey: 'SECRET', baseUrl: api.baseUrl, defaultModel: 'g' });

    const result = await provider.generate(call({ jsonSchema: schema }));
    assert.equal(result.text, '{"answer":"x"}');
    assert.deepEqual(result.usage, { promptTokens: 12, outputTokens: 3 });
    assert.equal(api.seen.url, '/v1beta/models/test-model:generateContent');
    assert.ok(!api.seen.url?.includes('SECRET'));
    assert.equal(api.seen.headers?.['x-goog-api-key'], 'SECRET');
    assert.equal(api.seen.body.generationConfig.responseMimeType, 'application/json');
    assert.equal(api.seen.body.generationConfig.responseSchema.type, 'OBJECT');
    assert.equal('additionalProperties' in api.seen.body.generationConfig.responseSchema, false);
    assert.equal(api.seen.body.systemInstruction.parts[0].text, 'be brief');
  });

  it('Gemini: an empty candidate is invalid_output', async () => {
    const api = await serve(() => ({ json: { candidates: [{ finishReason: 'SAFETY' }] } }));
    const provider = new GeminiProvider({ apiKey: 'k', baseUrl: api.baseUrl, defaultModel: 'g' });
    await assert.rejects(provider.generate(call()), (e: AiError) => e.reason === 'invalid_output' && /SAFETY/.test(e.message));
  });

  it('Gemini: disables thinking on 2.5 Flash only, and counts thinking tokens as output', async () => {
    const api = await serve(() => ({
      json: { candidates: [{ content: { parts: [{ text: 'ok' }] } }], usageMetadata: { promptTokenCount: 5, candidatesTokenCount: 4, thoughtsTokenCount: 30 } },
    }));
    const provider = new GeminiProvider({ apiKey: 'k', baseUrl: api.baseUrl, defaultModel: 'g', thinkingBudget: 0 });

    const result = await provider.generate(call({ model: 'gemini-2.5-flash' }));
    assert.deepEqual(api.seen.body.generationConfig.thinkingConfig, { thinkingBudget: 0 });
    assert.deepEqual(result.usage, { promptTokens: 5, outputTokens: 34 }, 'thinking tokens are billed as output');

    await provider.generate(call({ model: 'gemini-3.1-flash-lite' }));
    assert.equal('thinkingConfig' in api.seen.body.generationConfig, false, 'other models must not receive thinkingBudget');
  });

  it('never passes on a truncated answer: every provider reports invalid_output', async () => {
    const gemini = await serve(() => ({ json: { candidates: [{ finishReason: 'MAX_TOKENS', content: { parts: [{ text: 'Hi Priya, I understand that it' }] } }] } }));
    const openai = await serve(() => ({ json: { choices: [{ finish_reason: 'length', message: { content: 'Hi Priya, I understand that it' } }] } }));
    const claude = await serve(() => ({ json: { stop_reason: 'max_tokens', content: [{ type: 'text', text: 'Hi Priya, I understand that it' }] } }));

    const providers = [
      new GeminiProvider({ apiKey: 'k', baseUrl: gemini.baseUrl, defaultModel: 'g' }),
      new OpenAiCompatibleProvider({ name: 'openai', apiKey: 'k', baseUrl: openai.baseUrl, defaultModel: 'o', nativeStructuredOutput: true }),
      new AnthropicProvider({ apiKey: 'k', baseUrl: claude.baseUrl, defaultModel: 'c' }),
    ];
    for (const provider of providers) {
      await assert.rejects(provider.generate(call()), (e: AiError) => e.reason === 'invalid_output' && /cut off/.test(e.message), provider.name);
    }
  });

  it('OpenAI: bearer auth, strict json_schema, max_completion_tokens', async () => {
    const api = await serve(() => ({
      json: { choices: [{ message: { content: '{"answer":"y"}' } }], usage: { prompt_tokens: 9, completion_tokens: 4 } },
    }));
    const provider = new OpenAiCompatibleProvider({ name: 'openai', apiKey: 'sk-test', baseUrl: api.baseUrl, defaultModel: 'o', nativeStructuredOutput: true });

    const result = await provider.generate(call({ jsonSchema: schema }));
    assert.deepEqual(result.usage, { promptTokens: 9, outputTokens: 4 });
    assert.equal(api.seen.url, '/chat/completions');
    assert.equal(api.seen.headers?.authorization, 'Bearer sk-test');
    assert.equal(api.seen.body.max_completion_tokens, 100);
    assert.equal(api.seen.body.response_format.type, 'json_schema');
    assert.equal(api.seen.body.response_format.json_schema.strict, true);
    assert.equal(api.seen.body.response_format.json_schema.schema.additionalProperties, false);
  });

  it('OpenAI-compatible host without schema support: JSON mode plus the schema in the system prompt', async () => {
    const api = await serve(() => ({ json: { choices: [{ message: { content: '{"answer":"z"}' } }] } }));
    const provider = new OpenAiCompatibleProvider({ name: 'openrouter', apiKey: 'k', baseUrl: api.baseUrl, defaultModel: 'r', nativeStructuredOutput: false });

    await provider.generate(call({ jsonSchema: schema }));
    assert.equal(api.seen.body.response_format.type, 'json_object');
    assert.equal(api.seen.body.max_tokens, 100);
    assert.equal('max_completion_tokens' in api.seen.body, false);
    assert.match(api.seen.body.messages[0].content, /JSON Schema/);
  });

  it('Anthropic: headers, forced tool for structured output, tool input returned as JSON', async () => {
    const api = await serve(() => ({
      json: { content: [{ type: 'tool_use', input: { answer: 'c' } }], usage: { input_tokens: 20, output_tokens: 6 } },
    }));
    const provider = new AnthropicProvider({ apiKey: 'ak', baseUrl: api.baseUrl, defaultModel: 'c' });

    const result = await provider.generate(call({ jsonSchema: schema }));
    assert.deepEqual(JSON.parse(result.text), { answer: 'c' });
    assert.deepEqual(result.usage, { promptTokens: 20, outputTokens: 6 });
    assert.equal(api.seen.url, '/v1/messages');
    assert.equal(api.seen.headers?.['x-api-key'], 'ak');
    assert.equal(api.seen.headers?.['anthropic-version'], '2023-06-01');
    assert.deepEqual(api.seen.body.tool_choice, { type: 'tool', name: 'respond' });
    assert.equal(api.seen.body.system, 'be brief');
  });

  it('Anthropic: plain text answers are joined', async () => {
    const api = await serve(() => ({ json: { content: [{ type: 'text', text: 'Hello ' }, { type: 'text', text: 'there' }] } }));
    const provider = new AnthropicProvider({ apiKey: 'ak', baseUrl: api.baseUrl, defaultModel: 'c' });
    assert.equal((await provider.generate(call())).text, 'Hello there');
  });

  it('maps HTTP failures to the shared failure vocabulary', async () => {
    const cases: Array<[number, string, Record<string, string>?]> = [
      [429, 'rate_limited', { 'retry-after': '2' }],
      [401, 'auth_error'],
      [403, 'auth_error'],
      [400, 'bad_request'],
      [404, 'bad_request'],
      [503, 'upstream_error'],
    ];
    for (const [status, reason, headers] of cases) {
      const api = await serve(() => ({ status, headers, text: 'nope' }));
      const provider = new GeminiProvider({ apiKey: 'k', baseUrl: api.baseUrl, defaultModel: 'g' });
      await assert.rejects(provider.generate(call()), (e: AiError) => {
        assert.equal(e.reason, reason, `HTTP ${status}`);
        if (status === 429) assert.equal(e.retryAfterMs, 2000);
        return true;
      });
    }
  });

  it('reports a timeout when the provider is too slow', async () => {
    const api = await serve(() => ({ json: {} }));
    const slow = http.createServer(() => undefined); // never answers
    await new Promise<void>((resolve) => slow.listen(0, '127.0.0.1', resolve));
    closers.push(() => new Promise((resolve) => (slow.closeAllConnections(), slow.close(() => resolve()))));
    void api;

    const provider = new GeminiProvider({ apiKey: 'k', baseUrl: `http://127.0.0.1:${(slow.address() as AddressInfo).port}`, defaultModel: 'g' });
    await assert.rejects(provider.generate(call({ signal: AbortSignal.timeout(150) })), (e: AiError) => e.reason === 'timeout');
  });

  it('toGeminiSchema upper-cases types recursively and drops unsupported keys', () => {
    const converted = toGeminiSchema({
      type: 'object',
      additionalProperties: false,
      properties: { tags: { type: 'array', items: { type: 'string' } }, n: { type: 'number' } },
    }) as any;
    assert.equal(converted.type, 'OBJECT');
    assert.equal(converted.properties.tags.type, 'ARRAY');
    assert.equal(converted.properties.tags.items.type, 'STRING');
    assert.equal('additionalProperties' in converted, false);
  });
});
