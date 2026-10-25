import { Role } from '../constants/domain';

export interface AuthContext {
  userId: string;
  role: Role;
}

declare global {
  namespace Express {
    interface Request {
      /** Correlation id, set by `requestId` middleware; echoed in every response and log line. */
      id: string;
      /** Populated by the `authenticate` middleware on every protected route. */
      auth?: AuthContext;
    }
  }
}
