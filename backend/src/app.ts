import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import fs from 'fs';
import path from 'path';
import YAML from 'yaml';
import swaggerUi from 'swagger-ui-express';
import { env } from './config/env';
import { errorHandler, notFoundHandler } from './middleware/error.middleware';
import { requestId } from './middleware/request-id.middleware';
import { ok } from './utils/response';
import { apiRouter } from './routes';

export const app = express();

// Behind Render/Railway/Vercel proxies: needed for correct client IPs (rate limiting).
app.set('trust proxy', 1);
app.use(requestId);

// Security and utility middleware
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  }),
);

// Browsers may only call the API from the origins listed in CORS_ORIGIN. Requests with no Origin
// header (curl, Postman, server-to-server, same-origin pages like /api/docs) are not browser
// cross-origin calls, so CORS doesn't apply to them. Auth uses bearer tokens, not cookies, so
// credentialed CORS is deliberately off.
app.use(
  cors({
    origin: (origin, callback) => callback(null, !origin || env.corsOrigins.includes(origin)),
    methods: ['GET', 'POST', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    exposedHeaders: ['X-Request-Id'],
  }),
);

app.use(express.json({ limit: '2mb' }));

if (!env.isTest) {
  morgan.token('id', (req) => (req as express.Request).id);
  app.use(morgan(':id :method :url :status :res[content-length] - :response-time ms'));
}

// Swagger / OpenAPI documentation
const specPath = path.resolve(__dirname, '../docs/openapi.yaml');
if (fs.existsSync(specPath)) {
  try {
    const file = fs.readFileSync(specPath, 'utf8');
    const swaggerDoc = YAML.parse(file);
    app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerDoc, {
      customSiteTitle: 'BookLeaf Support API Docs',
    }));
  } catch (err) {
    console.warn('[swagger] Could not load openapi.yaml:', (err as Error).message);
  }
}

// API Routes
app.get('/', (_req, res) =>
  ok(res, 'BookLeaf Author Support API', {
    version: env.api.version,
    health: `${env.api.prefix}/health`,
    docs: '/api/docs',
  }),
);
app.use(env.api.prefix, apiRouter);

// Fallthrough & Error handling
app.use(notFoundHandler);
app.use(errorHandler);
