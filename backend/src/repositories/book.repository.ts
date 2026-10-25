import { Book, BookDocument } from '../models';

type BookFilter = Record<string, unknown>;

export const bookRepository = {
  find: (filter?: BookFilter): Promise<BookDocument[]> =>
    Book.find(filter ?? {}).sort({ bookCode: 1 }),

  findOne: (filter: BookFilter): Promise<BookDocument | null> => Book.findOne(filter),

  findById: (id: string): Promise<BookDocument | null> => Book.findById(id),
};
