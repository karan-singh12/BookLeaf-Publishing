import { Request, RequestHandler, Response } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import type { AuthContext } from '../types/express';

/** Placeholder for a request part an endpoint doesn't use. */
export type None = Record<string, never>;

export interface PublicContext<TParams, TQuery, TBody> {
  params: TParams;
  query: TQuery;
  body: TBody;
}

export interface RequestContext<TParams, TQuery, TBody> extends PublicContext<TParams, TQuery, TBody> {
  auth: AuthContext;
}

type Action<Ctx> = (context: Ctx, res: Response) => Response | Promise<Response>;

const parts = <TParams, TQuery, TBody>(req: Request): PublicContext<TParams, TQuery, TBody> => ({
  // `validate()` middleware has already checked and normalised these against Joi schemas
  // on the route, so the generics below describe what the schema guarantees. This is the one
  // place the framework's loose types are narrowed, instead of a cast in every handler.
  params: req.params as unknown as TParams,
  query: req.query as unknown as TQuery,
  body: req.body as TBody,
});

/**
 * Wraps a controller action for a protected route: hands it the authenticated user and typed,
 * already-validated params/query/body. Errors (sync or async) propagate to the error middleware.
 *
 *   handle<{ ticketId: string }, None, MessageInput>(({ auth, params, body }, res) => ...)
 */
export const handle =
  <TParams = None, TQuery = None, TBody = None>(
    action: Action<RequestContext<TParams, TQuery, TBody>>,
  ): RequestHandler =>
  async (req, res) => {
    await action({ auth: requireAuth(req), ...parts<TParams, TQuery, TBody>(req) }, res);
  };

/** Same, for routes anyone can call (login). */
export const handlePublic =
  <TParams = None, TQuery = None, TBody = None>(
    action: Action<PublicContext<TParams, TQuery, TBody>>,
  ): RequestHandler =>
  async (req, res) => {
    await action(parts<TParams, TQuery, TBody>(req), res);
  };
