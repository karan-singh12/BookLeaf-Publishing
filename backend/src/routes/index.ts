import { Router } from 'express';
import { aiRouter } from './ai.routes';
import { authRouter } from './auth.routes';
import { bookRouter } from './book.routes';
import { healthRouter } from './health.routes';
import { realtimeRouter } from './realtime.routes';
import { ticketRouter } from './ticket.routes';

interface RouteModule {
  /** Mount path, relative to the versioned API prefix (e.g. `/tickets` -> `/api/v1/tickets`). */
  path: string;
  router: Router;
}

/**
 * The route table. Adding an endpoint group is one line here; `app.ts` mounts the whole
 * table under the versioned prefix, so a future `/api/v2` is a second table, not a rewrite.
 */
export const ROUTE_MODULES: readonly RouteModule[] = [
  { path: '/health', router: healthRouter },
  { path: '/auth', router: authRouter },
  { path: '/books', router: bookRouter },
  { path: '/tickets', router: ticketRouter },
  { path: '/realtime', router: realtimeRouter },
  { path: '/ai', router: aiRouter },
];

export const apiRouter = Router();
for (const { path, router } of ROUTE_MODULES) {
  apiRouter.use(path, router);
}
