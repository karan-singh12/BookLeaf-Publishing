import { MESSAGES } from '../constants/messages';
import { authService } from '../services/auth.service';
import { created, ok } from '../utils/response';
import { handle, handlePublic, None } from './handler';

export const authController = {
  login: handlePublic<None, None, { email: string; password: string }>(async ({ body }, res) => {
    const result = await authService.login(body.email, body.password);
    return ok(res, MESSAGES.auth.loginSuccess, result);
  }),

  getProfile: handle(async ({ auth }, res) => {
    const profile = await authService.getProfile(auth.userId);
    return ok(res, MESSAGES.common.fetched('Profile'), profile);
  }),

  onboardAuthor: handle(async ({ body }, res) => {
    const author = await authService.onboardAuthor(body as any);
    return created(res, 'Author onboarded successfully.', author);
  }),
};
