import { Request, Response } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import { eventHub } from '../realtime/event-hub';

export const realtimeController = {
  stream(req: Request, res: Response) {
    const auth = requireAuth(req);
    eventHub.subscribe(auth.userId, auth.role, res);
  },
};
