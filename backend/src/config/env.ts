import dotenv from 'dotenv';

dotenv.config();

const nodeEnv = process.env.NODE_ENV ?? 'development';
const isProduction = nodeEnv === 'production';

const readString = (name: string, fallback?: string): string => {
  const value = process.env[name]?.trim();
  if (value) return value;
  if (fallback !== undefined) return fallback;
  throw new Error(`Missing required environment variable: ${name}`);
};

const readNumber = (name: string, fallback: number): number => {
  const raw = process.env[name]?.trim();
  if (!raw) return fallback;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) throw new Error(`Environment variable ${name} must be a number`);
  return parsed;
};

export const env = {
  nodeEnv,
  isProduction,
  isTest: nodeEnv === 'test',
  port: readNumber('PORT', 5000),
  api: { version: 'v1', prefix: '/api/v1' },
  mongodbUri: readString('MONGODB_URI', 'mongodb://localhost:27017/bookleaf'),
  corsOrigins: readString('CORS_ORIGIN', 'http://localhost:3000')
    .split(',')
    .map((origin) => origin.trim().replace(/\/$/, ''))
    .filter(Boolean),
  jwt: {
    // A hard failure in production: a guessable signing key defeats authentication entirely.
    secret: isProduction ? readString('JWT_SECRET') : readString('JWT_SECRET', 'dev-only-insecure-secret'),
    expiresIn: readString('JWT_EXPIRES_IN', '8h'),
  },
  ai: {
    // API keys are read server-side only and never serialised into any API response.
    // A provider with no key is simply skipped by the router.
    providers: {
      gemini: {
        apiKey: process.env.GEMINI_API_KEY?.trim() ?? '',
        baseUrl: readString('GEMINI_API_BASE_URL', 'https://generativelanguage.googleapis.com'),
        defaultModel: readString('GEMINI_MODEL', 'gemini-2.5-flash'),
        // 0 = no hidden "thinking" tokens: short, predictable, cheaper answers. Set -1 to leave the model default.
        thinkingBudget: readNumber('GEMINI_THINKING_BUDGET', 0) < 0 ? undefined : readNumber('GEMINI_THINKING_BUDGET', 0),
      },
      openai: {
        apiKey: process.env.OPENAI_API_KEY?.trim() ?? '',
        baseUrl: readString('OPENAI_BASE_URL', 'https://api.openai.com/v1'),
        defaultModel: readString('OPENAI_MODEL', 'gpt-4o-mini'),
      },
      anthropic: {
        apiKey: process.env.ANTHROPIC_API_KEY?.trim() ?? '',
        baseUrl: readString('ANTHROPIC_BASE_URL', 'https://api.anthropic.com'),
        defaultModel: readString('ANTHROPIC_MODEL', 'claude-haiku-5-5'),
      },
      openrouter: {
        apiKey: process.env.OPENROUTER_API_KEY?.trim() ?? '',
        baseUrl: readString('OPENROUTER_BASE_URL', 'https://openrouter.ai/api/v1'),
        defaultModel: readString('OPENROUTER_MODEL', 'meta-llama/llama-3.3-70b-instruct'),
      },
    },
    // Fallback chains as "provider:model,provider:model". Unset tasks use the default route;
    // an unset default route tries every configured provider in priority order.
    defaultRoute: process.env.AI_ROUTE_DEFAULT?.trim() || undefined,
    routes: {
      classify: process.env.AI_ROUTE_CLASSIFY?.trim() || undefined,
      draft: process.env.AI_ROUTE_DRAFT?.trim() || undefined,
    },
    timeoutMs: readNumber('AI_TIMEOUT_MS', 12000),
    retries: readNumber('AI_RETRIES', 1),
    temperature: readNumber('AI_TEMPERATURE', 0.3),
    maxConcurrent: readNumber('AI_MAX_CONCURRENT', 4),
    maxQueued: readNumber('AI_MAX_QUEUED', 50),
  },
} as const;
