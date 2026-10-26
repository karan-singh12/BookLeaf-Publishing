import bcrypt from 'bcryptjs';
import { presentUser } from '../presenters/user.presenter';
import { userRepository } from '../repositories/user.repository';
import { MESSAGES } from '../constants/messages';
import { AppError } from '../utils/errors';
import { signAccessToken } from './token.service';

/** Compared against when the email is unknown, so response time doesn't reveal which emails exist. */
const TIMING_EQUALISER_HASH = bcrypt.hashSync('timing-equaliser', 10);

export const authService = {
  async login(email: string, password: string) {
    const user = await userRepository.findByEmailWithPassword(email);
    const passwordMatches = await bcrypt.compare(password, user?.passwordHash ?? TIMING_EQUALISER_HASH);

    if (!user || !passwordMatches) {
      throw AppError.unauthenticated(MESSAGES.auth.invalidCredentials);
    }
    if (!user.isActive) {
      throw AppError.forbidden(MESSAGES.auth.accountDisabled);
    }

    const token = signAccessToken({ userId: String(user._id), role: user.role });
    return { token, user: presentUser(user) };
  },

  async getProfile(userId: string) {
    const user = await userRepository.findById(userId);
    if (!user || !user.isActive) {
      throw AppError.unauthenticated(MESSAGES.auth.accountUnavailable);
    }
    return presentUser(user);
  },

  async onboardAuthor(data: {
    name: string;
    email: string;
    password?: string;
    phone?: string;
    city?: string;
    authorCode?: string;
  }) {
    const existing = await userRepository.findByEmail(data.email);
    if (existing) {
      throw AppError.conflict('An author with this email address already exists.');
    }

    let code = data.authorCode?.trim().toUpperCase();
    if (!code) {
      const count = await userRepository.countAuthors();
      code = `AUTH${String(count + 1).padStart(3, '0')}`;
    }

    const rawPassword = data.password?.trim() || 'Password123!';
    const passwordHash = await bcrypt.hash(rawPassword, 10);

    const user = await userRepository.create({
      name: data.name.trim(),
      email: data.email.toLowerCase().trim(),
      authorCode: code,
      role: 'author',
      phone: data.phone?.trim() ?? '',
      city: data.city?.trim() ?? '',
      passwordHash,
      isActive: true,
      joinedDate: new Date(),
    });

    return presentUser(user);
  },
};
