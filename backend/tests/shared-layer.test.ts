import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import express from 'express';
import Joi from 'joi';
import { startServer } from './helpers';
import { errorHandler, notFoundHandler } from '../src/middleware/error.middleware';
import { requestId } from '../src/middleware/request-id.middleware';
import { validate } from '../src/middleware/validate.middleware';
import { MESSAGES } from '../src/constants/messages';
import { AppError } from '../src/utils/errors';
import { created, ok } from '../src/utils/response';
import { objectId, paginationKeys, requiredText } from '../src/validators/common.validator';

/** A tiny app that exercises the shared response / error / validation layer in isolation. */
const buildTestApp = () => {
  const app = express();
  app.use(requestId);
  app.use(express.json({ limit: '1kb' }));

  app.get('/ok', (_req, res) => ok(res, 'All good.', { value: 1 }));
  app.post('/created', (_req, res) => created(res, MESSAGES.common.created('Thing'), { id: 'x' }));
  app.get('/app-error', () => {
    throw AppError.forbidden();
  });
  app.get('/not-found', () => {
    throw AppError.notFound('Ticket');
  });
  app.get('/boom', () => {
    throw new Error('database password is hunter2');
  });
  app.get('/mongoose-cast', () => {
    const error = new Error('cast failed') as Error & { path: string };
    error.name = 'CastError';
    error.path = '_id';
    throw error;
  });
  app.get('/duplicate-key', () => {
    throw Object.assign(new Error('E11000'), { code: 11000, keyPattern: { email: 1 } });
  });
  app.get('/version-conflict', () => {
    throw Object.assign(new Error('v'), { name: 'VersionError' });
  });
  app.post(
    '/validated',
    validate({
      body: Joi.object({ subject: requiredText('Subject', 3, 20), bookId: objectId.allow(null, '').label('Book') }),
    }),
    (req, res) => ok(res, 'valid', req.body),
  );
  app.get(
    '/paged',
    validate({ query: Joi.object({ ...paginationKeys }) }),
    (req, res) => ok(res, 'paged', req.query),
  );

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
};

describe('shared response / error / validation layer', () => {
  let server: Awaited<ReturnType<typeof startServer>>;
  before(async () => {
    server = await startServer(buildTestApp());
  });
  after(() => server.stop());

  it('wraps successes in the standard envelope', async () => {
    const { status, body } = await server.request('/ok');
    assert.equal(status, 200);
    assert.equal(body.success, true);
    assert.equal(body.message, 'All good.');
    assert.deepEqual(body.data, { value: 1 });
    assert.ok(body.requestId && body.timestamp);
  });

  it('uses 201 and a dynamic message for created resources', async () => {
    const { status, body } = await server.request('/created', { method: 'POST' });
    assert.equal(status, 201);
    assert.equal(body.message, 'Thing created successfully.');
  });

  it('echoes a sane incoming request id and ignores a hostile one', async () => {
    const good = await server.request('/ok', { headers: { 'x-request-id': 'trace-12345678' } });
    assert.equal(good.headers.get('x-request-id'), 'trace-12345678');
    assert.equal(good.body.requestId, 'trace-12345678');

    const hostile = '<script>alert(1)</script>';
    const bad = await server.request('/ok', { headers: { 'x-request-id': hostile } });
    assert.notEqual(bad.headers.get('x-request-id'), hostile);
    assert.match(bad.headers.get('x-request-id') ?? '', /^[\w-]{8,64}$/);
  });

  it('maps AppError to its status, code and message', async () => {
    const { status, body } = await server.request('/not-found');
    assert.equal(status, 404);
    assert.equal(body.success, false);
    assert.equal(body.message, 'Ticket not found.');
    assert.equal(body.error.code, 'NOT_FOUND');

    const forbidden = await server.request('/app-error');
    assert.equal(forbidden.status, 403);
    assert.equal(forbidden.body.error.code, 'FORBIDDEN');
  });

  it('never leaks internals on unexpected errors', async () => {
    const { status, body } = await server.request('/boom');
    assert.equal(status, 500);
    assert.equal(body.error.code, 'INTERNAL_ERROR');
    assert.equal(body.message, MESSAGES.common.internal);
    assert.ok(!JSON.stringify(body).includes('hunter2'));
  });

  it('translates database errors into client errors, not 500s', async () => {
    const cast = await server.request('/mongoose-cast');
    assert.equal(cast.status, 422);
    assert.equal(cast.body.message, 'Invalid value for _id.');

    const duplicate = await server.request('/duplicate-key');
    assert.equal(duplicate.status, 409);
    assert.equal(duplicate.body.message, 'A record with this email already exists.');

    const version = await server.request('/version-conflict');
    assert.equal(version.status, 409);
    assert.equal(version.body.message, MESSAGES.common.versionConflict);
  });

  it('answers unknown routes with the error envelope', async () => {
    const { status, body } = await server.request('/nope');
    assert.equal(status, 404);
    assert.equal(body.message, 'Route not found: GET /nope');
  });

  it('rejects malformed and oversized JSON cleanly', async () => {
    const malformed = await server.request('/validated', { method: 'POST', body: '{bad json' });
    assert.equal(malformed.status, 400);
    assert.equal(malformed.body.message, MESSAGES.common.badJson);

    const huge = await server.request('/validated', { method: 'POST', body: JSON.stringify({ subject: 'x'.repeat(5000) }) });
    assert.equal(huge.status, 413);
    assert.equal(huge.body.error.code, 'PAYLOAD_TOO_LARGE');
  });

  describe('validation', () => {
    it('returns every problem with friendly wording', async () => {
      const { status, body } = await server.request('/validated', {
        method: 'POST',
        body: JSON.stringify({ subject: 'ab', bookId: 'not-an-id' }),
      });
      assert.equal(status, 422);
      assert.equal(body.error.code, 'VALIDATION_ERROR');
      assert.equal(body.message, 'Subject must be at least 3 characters.');
      assert.deepEqual(
        body.error.details.map((d: { field: string }) => d.field).sort(),
        ['bookId', 'subject'],
      );
    });

    it('treats a missing body as empty and reports required fields', async () => {
      const { status, body } = await server.request('/validated', { method: 'POST' });
      assert.equal(status, 422);
      assert.equal(body.message, 'Subject is required.');
    });

    it('trims text, strips unknown keys and accepts an empty book id', async () => {
      const { status, body } = await server.request('/validated', {
        method: 'POST',
        body: JSON.stringify({ subject: '  Royalty question  ', bookId: '', status: 'Resolved', author: 'attacker' }),
      });
      assert.equal(status, 200);
      assert.equal(body.data.subject, 'Royalty question');
      assert.equal(body.data.status, undefined);
      assert.equal(body.data.author, undefined);
    });

    it('applies pagination defaults and coerces query strings to numbers', async () => {
      const defaults = await server.request('/paged');
      assert.deepEqual(defaults.body.data, { page: 1, limit: 20 });

      const coerced = await server.request('/paged?page=3&limit=50');
      assert.deepEqual(coerced.body.data, { page: 3, limit: 50 });
    });

    it('rejects out-of-range pagination', async () => {
      const { status, body } = await server.request('/paged?limit=1000');
      assert.equal(status, 422);
      assert.equal(body.message, 'limit must be at most 100.');
    });
  });
});

describe('message catalog', () => {
  it('builds dynamic messages from context', () => {
    assert.equal(MESSAGES.common.fetched('Books'), 'Books retrieved successfully.');
    assert.equal(MESSAGES.common.notFound('Book'), 'Book not found.');
    assert.equal(MESSAGES.common.notFound(), 'Resource not found.');
    assert.equal(MESSAGES.common.routeNotFound('GET', '/x'), 'Route not found: GET /x');
  });
});
