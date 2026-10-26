import { Router } from 'express';
import { authController } from '../controllers/auth.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { loginLimiter } from '../middleware/rate-limit.middleware';
import { validate } from '../middleware/validate.middleware';
import { loginBody, onboardAuthorBody } from '../validators/auth.validator';

const router = Router();

router.post('/login', loginLimiter, validate({ body: loginBody }), authController.login);
router.get('/me', authenticate, authController.getProfile);
router.post('/authors', authenticate, authorize('admin'), validate({ body: onboardAuthorBody }), authController.onboardAuthor);

export const authRouter = router;
