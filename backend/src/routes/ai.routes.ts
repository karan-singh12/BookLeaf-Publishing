import { Router } from 'express';
import { aiController } from '../controllers/ai.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticate, authorize('admin'));
router.get('/status', aiController.status);

export const aiRouter = router;
