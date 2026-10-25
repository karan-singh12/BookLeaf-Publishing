import { Router } from 'express';
import { authController } from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth.middleware';
import { loginLimiter } from '../middleware/rate-limit.middleware';
import { validate } from '../middleware/validate.middleware';
import { loginBody } from '../validators/auth.validator';

const router = Router();

router.post('/login', loginLimiter, validate({ body: loginBody }), authController.login);
router.get('/me', authenticate, authController.getProfile);

export const authRouter = router;
