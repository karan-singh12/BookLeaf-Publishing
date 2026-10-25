import { UserAttrs } from '../models';

type UserRecord = UserAttrs & { _id: unknown };

export const presentUser = (user: UserRecord) => ({
  id: String(user._id),
  name: user.name,
  email: user.email,
  role: user.role,
  authorCode: user.authorCode ?? null,
  phone: user.phone ?? null,
  city: user.city ?? null,
});
