import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import jwt from 'jsonwebtoken';
import { startServer } from './helpers'; // sets NODE_ENV=test; must be imported before the app
import { app } from '../src/app';
import { env } from '../src/config/env';
import type { Role } from '../src/constants/domain';
import { signAccessToken } from '../src/services/token.service';

const ID = '507f1f77bcf86cd799439011';
const API = env.api.prefix;

const tokenFor = (role: Role) => signAccessToken({ userId: ID, role });

type Endpoint = { method: string; path: string; roles: Role[] | 'public' | 'any' };

/** The authorisation contract of the whole API, in one table. */
const ENDPOINTS: Endpoint[] = [
  { method: 'GET', path: '/auth/me', roles: 'any' },
  { method: 'GET', path: '/books', roles: 'any' },
  { method: 'GET', path: `/books/${ID}`, roles: 'any' },
  { method: 'POST', path: '/tickets', roles: ['author'] },
  { method: 'GET', path: '/tickets', roles: 'any' },
  { method: 'GET', path: '/tickets/stats', roles: ['admin'] },
  { method: 'GET', path: `/tickets/${ID}`, roles: 'any' },
  { method: 'PATCH', path: `/tickets/${ID}`, roles: ['admin'] },
  { method: 'POST', path: `/tickets/${ID}/messages`, roles: 'any' },
  { method: 'POST', path: `/tickets/${ID}/notes`, roles: ['admin'] },
  { method: 'POST', path: `/tickets/${ID}/draft`, roles: ['admin'] },
  { method: 'GET', path: '/ai/status', roles: ['admin'] },
  { method: 'GET', path: '/realtime/stream', roles: 'any' },
];

describe('access control', () => {
  let server: Awaited<ReturnType<typeof startServer>>;
  before(async () => {
    server = await startServer(app);
  });
  after(() => server.stop());

  const call = (endpoint: Endpoint, token?: string, body?: unknown) =>
    server.request(`${API}${endpoint.path}`, {
      method: endpoint.method,
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      ...(body === undefined || endpoint.method === 'GET' ? {} : { body: JSON.stringify(body) }),
    });

  it('rejects every protected endpoint without a token (401)', async () => {
    for (const endpoint of ENDPOINTS) {
      const { status, body } = await call(endpoint);
      assert.equal(status, 401, `${endpoint.method} ${endpoint.path}`);
      assert.equal(body.error.code, 'UNAUTHENTICATED');
    }
  });

  it('rejects the wrong role with 403 on every restricted endpoint', async () => {
    for (const endpoint of ENDPOINTS) {
      if (endpoint.roles === 'any' || endpoint.roles === 'public') continue;
      for (const role of ['author', 'admin'] as Role[]) {
        if (endpoint.roles.includes(role)) continue;
        const { status, body } = await call(endpoint, tokenFor(role), {});
        assert.equal(status, 403, `${role} on ${endpoint.method} ${endpoint.path}`);
        assert.equal(body.error.code, 'FORBIDDEN');
      }
    }
  });

  it('lets the right role through authorisation (it then stops at validation, before any database access)', async () => {
    const reachesValidation: Array<[Endpoint, Role, unknown]> = [
      [{ method: 'POST', path: '/tickets', roles: ['author'] }, 'author', {}],
      [{ method: 'PATCH', path: `/tickets/${ID}`, roles: ['admin'] }, 'admin', {}],
      [{ method: 'POST', path: `/tickets/${ID}/notes`, roles: ['admin'] }, 'admin', {}],
      [{ method: 'POST', path: `/tickets/${ID}/messages`, roles: 'any' }, 'author', {}],
      [{ method: 'POST', path: `/tickets/${ID}/messages`, roles: 'any' }, 'admin', {}],
      [{ method: 'POST', path: `/tickets/${ID}/draft`, roles: ['admin'] }, 'admin', { refresh: 'maybe' }],
      [{ method: 'GET', path: '/tickets?limit=1000', roles: 'any' }, 'author', undefined],
      [{ method: 'GET', path: '/tickets?limit=1000', roles: 'any' }, 'admin', undefined],
      [{ method: 'GET', path: '/books/not-an-id', roles: 'any' }, 'author', undefined],
    ];
    for (const [endpoint, role, body] of reachesValidation) {
      const { status, body: response } = await call(endpoint, tokenFor(role), body);
      assert.equal(status, 422, `${role} on ${endpoint.method} ${endpoint.path}`);
      assert.equal(response.error.code, 'VALIDATION_ERROR');
    }
  });

  it('forbids admins from creating tickets even with a valid body', async () => {
    const { status } = await call(
      { method: 'POST', path: '/tickets', roles: ['author'] },
      tokenFor('admin'),
      { subject: 'A real subject', description: 'A description that is long enough.' },
    );
    assert.equal(status, 403);
  });

  it('does not let an author set their own triage fields: unknown keys are stripped, not applied', async () => {
    // An author cannot even reach the admin PATCH endpoint...
    const patch = await call({ method: 'PATCH', path: `/tickets/${ID}`, roles: ['admin'] }, tokenFor('author'), { priority: 'Critical' });
    assert.equal(patch.status, 403);
  });

  describe('bad credentials', () => {
    const endpoint: Endpoint = { method: 'GET', path: '/auth/me', roles: 'any' };

    it('rejects a token signed with the wrong secret', async () => {
      const forged = jwt.sign({ role: 'admin' }, 'not-the-real-secret', { subject: ID });
      const { status, body } = await call(endpoint, forged);
      assert.equal(status, 401);
      assert.equal(body.message, 'Invalid token. Please sign in again.');
    });

    it('rejects an expired token with a message that tells the user to sign in again', async () => {
      const expired = jwt.sign({ role: 'author' }, env.jwt.secret, { subject: ID, expiresIn: -10 });
      const { status, body } = await call(endpoint, expired);
      assert.equal(status, 401);
      assert.match(body.message, /expired/i);
    });

    it('rejects a token carrying an unknown role', async () => {
      const odd = jwt.sign({ role: 'superuser' }, env.jwt.secret, { subject: ID });
      assert.equal((await call(endpoint, odd)).status, 401);
    });

    it('rejects a token with no subject', async () => {
      const anonymous = jwt.sign({ role: 'admin' }, env.jwt.secret);
      assert.equal((await call(endpoint, anonymous)).status, 401);
    });

    it('rejects garbage and non-bearer schemes', async () => {
      assert.equal((await call(endpoint, 'garbage')).status, 401);
      const basic = await server.request(`${API}/auth/me`, { headers: { Authorization: 'Basic abc' } });
      assert.equal(basic.status, 401);
    });
  });

  describe('public endpoints', () => {
    it('login validates its input and does not require a token', async () => {
      const { status, body } = await server.request(`${API}/auth/login`, { method: 'POST', body: JSON.stringify({ email: 'nope' }) });
      assert.equal(status, 422);
      assert.equal(body.message, 'Please enter a valid email address.');
    });

    it('serves the service banner at / and 404s unknown API routes in the standard envelope', async () => {
      assert.equal((await server.request('/')).body.data.health, `${API}/health`);
      const missing = await server.request(`${API}/nope`);
      assert.equal(missing.status, 404);
      assert.equal(missing.body.success, false);
    });
  });
});

describe('credentials never travel in URLs', () => {
  it('ignores a ?token= query parameter, even a valid one', async () => {
    const server = await startServer(app);
    try {
      const valid = signAccessToken({ userId: ID, role: 'admin' });
      const { status } = await server.request(`${API}/auth/me?token=${valid}`);
      assert.equal(status, 401);
    } finally {
      await server.stop();
    }
  });
});

describe('CORS', () => {
  const allowed = env.corsOrigins[0] ?? 'http://localhost:3000';

  it('lets the configured frontend origin call the API', async () => {
    const server = await startServer(app);
    try {
      const { headers } = await server.request(`${API}/health`, { headers: { Origin: allowed } });
      assert.equal(headers.get('access-control-allow-origin'), allowed);
      assert.equal(headers.get('access-control-allow-credentials'), null, 'bearer tokens, not cookies');
    } finally {
      await server.stop();
    }
  });

  it('does not grant any other website access', async () => {
    const server = await startServer(app);
    try {
      const { headers } = await server.request(`${API}/health`, { headers: { Origin: 'https://evil.example' } });
      assert.equal(headers.get('access-control-allow-origin'), null);

      const preflight = await server.request(`${API}/tickets`, {
        method: 'OPTIONS',
        headers: { Origin: 'https://evil.example', 'Access-Control-Request-Method': 'GET' },
      });
      assert.equal(preflight.headers.get('access-control-allow-origin'), null);
    } finally {
      await server.stop();
    }
  });

  it('still serves tools that send no Origin header (curl, Postman, the Swagger page)', async () => {
    const server = await startServer(app);
    try {
      assert.equal((await server.request(`${API}/auth/me`)).status, 401); // reaches the route, not blocked by CORS
    } finally {
      await server.stop();
    }
  });
});
