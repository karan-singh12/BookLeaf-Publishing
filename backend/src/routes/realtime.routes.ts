import { Router } from 'express';
import { realtimeController } from '../controllers/realtime.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// SSE endpoint: authenticated with the Authorization header like every other route
router.get('/stream', authenticate, realtimeController.stream);

export const realtimeRouter = router;
