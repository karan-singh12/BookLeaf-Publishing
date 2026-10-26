import { User, UserDocument } from '../models';

export const userRepository = {
  findById: (id: string): Promise<UserDocument | null> => User.findById(id),

  findByEmail: (email: string): Promise<UserDocument | null> =>
    User.findOne({ email: email.toLowerCase().trim() }),

  /** Includes the password hash, which is excluded from every other query. */
  findByEmailWithPassword: (email: string): Promise<UserDocument | null> =>
    User.findOne({ email: email.toLowerCase().trim() }).select('+passwordHash'),

  create: (data: Partial<UserDocument> & { passwordHash: string }): Promise<UserDocument> =>
    User.create(data),

  countAuthors: (): Promise<number> => User.countDocuments({ role: 'author' }),
};
