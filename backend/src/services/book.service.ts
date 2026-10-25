import { presentBook } from '../presenters/book.presenter';
import { bookRepository } from '../repositories/book.repository';
import type { AuthContext } from '../types/express';
import { AppError } from '../utils/errors';

export const bookService = {
  /** Authors see only their own books. Admins see all, optionally narrowed to one author. */
  async list(auth: AuthContext, authorId?: string) {
    const filter = auth.role === 'admin' ? (authorId ? { author: authorId } : {}) : { author: auth.userId };
    const books = await bookRepository.find(filter);
    return books.map(presentBook);
  },

  async get(auth: AuthContext, bookId: string) {
    const book = await bookRepository.findOne({
      _id: bookId,
      ...(auth.role === 'admin' ? {} : { author: auth.userId }),
    });
    // 404 (not 403) for another author's book, so ids cannot be probed for existence.
    if (!book) throw AppError.notFound('Book');
    return presentBook(book);
  },
};
