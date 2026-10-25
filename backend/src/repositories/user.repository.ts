import { User, UserDocument } from '../models';

export const userRepository = {
  findById: (id: string): Promise<UserDocument | null> => User.findById(id),

  /** Includes the password hash, which is excluded from every other query. */
  findByEmailWithPassword: (email: string): Promise<UserDocument | null> =>
    User.findOne({ email: email.toLowerCase().trim() }).select('+passwordHash'),
};
