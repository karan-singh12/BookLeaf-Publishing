import { MESSAGES } from '../constants/messages';
import { bookService } from '../services/book.service';
import { ok } from '../utils/response';
import { handle, None } from './handler';

export const bookController = {
  list: handle<None, { authorId?: string }>(async ({ auth, query }, res) => {
    const books = await bookService.list(auth, query.authorId);
    return ok(res, MESSAGES.common.fetched('Books'), books);
  }),

  get: handle<{ bookId: string }>(async ({ auth, params }, res) => {
    const book = await bookService.get(auth, params.bookId);
    return ok(res, MESSAGES.common.fetched('Book'), book);
  }),
};
